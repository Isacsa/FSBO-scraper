#!/usr/bin/env node

/**
 * Stateless orchestrator: pull configs → scrape → clean → push
 *
 * Usage:
 *   node scripts/scrape-and-push.js                         # normal (respects scheduling threshold)
 *   node scripts/scrape-and-push.js --run-now               # force run all configs
 *   node scripts/scrape-and-push.js --config-id=<uuid>      # run a specific config only
 *   node scripts/scrape-and-push.js --dry-run               # scrape + clean but don't push
 *
 * Environment:
 *   APP_API_URL       - Fastify API base URL (required)
 *   SCRAPER_API_KEY   - API key for authentication (required)
 *   SCRAPER_TENANT_ID - tenant UUID (required)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const crypto = require('crypto');
const { pullConfigs } = require('../src/integration/pullConfigs');
const { buildIngestPayload } = require('../src/integration/toIngestPayload');
const { pushBatch } = require('../src/integration/pushBatch');
const { runPlatform } = require('../src/core/runPlatform');
const { dedupeListInMemory } = require('../pipeline/deduplicate');

// ─── CLI args ───

const args = process.argv.slice(2);
const RUN_NOW = args.includes('--run-now');
const DRY_RUN = args.includes('--dry-run');
const CONFIG_ID = (() => {
  const flag = args.find(a => a.startsWith('--config-id='));
  return flag ? flag.split('=')[1] : null;
})();

// ─── Environment ───

const APP_API_URL = process.env.APP_API_URL;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const SCRAPER_TENANT_ID = process.env.SCRAPER_TENANT_ID;

function log(level, msg, data = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message: msg,
    ...data,
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

function shouldRunConfig(config) {
  if (RUN_NOW) return true;
  if (!config.last_run_at) return true;

  const lastRun = new Date(config.last_run_at);
  const threshold = (config.schedule_interval_hours || 96) * 60 * 60 * 1000;
  const elapsed = Date.now() - lastRun.getTime();
  return elapsed >= threshold;
}

async function scrapeSource(platform, url, options) {
  const startMs = Date.now();
  try {
    const { results } = await runPlatform({
      platform,
      url,
      options: {
        maxPages: options?.maxPages || 5,
        maxAds: options?.maxAds || 30,
        headless: true,
        filterAgencies: options?.filterAgencies !== false,
      },
      outputShape: 'cli',
      normalize: true,
    });

    const durationMs = Date.now() - startMs;
    return { items: results || [], durationMs, error: null };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    return { items: [], durationMs, error: err.message || String(err) };
  }
}

async function processConfig(config, { apiUrl, apiKey, tenantId }) {
  const configId = config.id;
  const sources = config.sources || {};
  const options = config.options || {};

  log('info', `Processing config: ${config.area_label}`, {
    configId,
    sources: Object.keys(sources),
  });

  const runResults = {
    configId,
    areaLabel: config.area_label,
    sourcesAttempted: 0,
    sourcesSucceeded: 0,
    totalItems: 0,
    errors: [],
  };

  for (const [platform, url] of Object.entries(sources)) {
    if (!url || typeof url !== 'string') continue;

    runResults.sourcesAttempted++;
    const runId = crypto.randomUUID();

    log('info', `Scraping ${platform}`, { configId, platform, url });

    const { items, durationMs, error } = await scrapeSource(platform, url, options);

    if (error) {
      log('error', `Scraper failed for ${platform}`, { configId, platform, error });
      runResults.errors.push({ source: platform, error_type: 'scrape_failed', message: error });
      continue;
    }

    if (items.length === 0) {
      log('warn', `No items scraped from ${platform}`, { configId, platform });
      runResults.errors.push({ source: platform, error_type: 'no_items', message: 'No items returned' });
      continue;
    }

    // In-memory dedupe within this batch
    const { unique: deduped, duplicates } = dedupeListInMemory(items);
    const dedupeRemoved = duplicates ? duplicates.length : 0;

    log('info', `Scraped ${items.length} items (${dedupeRemoved} dupes removed) from ${platform}`, {
      configId,
      platform,
      total: items.length,
      deduped: deduped.length,
      durationMs,
    });

    // Build payload (applies dataCleaner + type conversion internally)
    const payload = buildIngestPayload({
      runId,
      configId,
      source: platform,
      areaQuery: config.area_label,
      rawItems: deduped,
      durationMs,
      dedupeRemovedLocal: dedupeRemoved,
    });

    if (DRY_RUN) {
      log('info', `[DRY RUN] Would push ${payload.items.length} items for ${platform}`, {
        configId,
        platform,
        runId,
      });
      // Output payload to stdout for inspection
      process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
      runResults.sourcesSucceeded++;
      runResults.totalItems += payload.items.length;
      continue;
    }

    // Push to APP Fastify API
    try {
      const result = await pushBatch(payload, {
        apiUrl,
        apiKey,
        tenantId,
        logger: (msg) => log('warn', msg),
      });

      log('info', `Pushed ${platform} batch successfully`, {
        configId,
        platform,
        runId,
        ...result,
      });

      runResults.sourcesSucceeded++;
      runResults.totalItems += payload.items.length;
    } catch (pushErr) {
      log('error', `Failed to push ${platform} batch`, {
        configId,
        platform,
        runId,
        error: pushErr.message || String(pushErr),
      });
      runResults.errors.push({
        source: platform,
        error_type: 'push_failed',
        message: pushErr.message || String(pushErr),
      });
    }
  }

  return runResults;
}

async function main() {
  // Validate environment
  if (!APP_API_URL) {
    log('error', 'APP_API_URL environment variable is required');
    process.exit(1);
  }
  if (!SCRAPER_API_KEY) {
    log('error', 'SCRAPER_API_KEY environment variable is required');
    process.exit(1);
  }
  if (!SCRAPER_TENANT_ID) {
    log('error', 'SCRAPER_TENANT_ID environment variable is required');
    process.exit(1);
  }

  const connOpts = {
    apiUrl: APP_API_URL,
    apiKey: SCRAPER_API_KEY,
    tenantId: SCRAPER_TENANT_ID,
  };

  log('info', 'Scrape-and-push starting', {
    runNow: RUN_NOW,
    dryRun: DRY_RUN,
    configId: CONFIG_ID,
    apiUrl: APP_API_URL,
  });

  // Pull configs from APP
  let configs;
  try {
    configs = await pullConfigs(connOpts);
    log('info', `Fetched ${configs.length} configs from APP`);
  } catch (err) {
    log('error', `Failed to pull configs: ${err.message}`);
    process.exit(1);
  }

  // Filter by config ID if specified
  if (CONFIG_ID) {
    configs = configs.filter(c => c.id === CONFIG_ID);
    if (configs.length === 0) {
      log('error', `Config ${CONFIG_ID} not found`);
      process.exit(1);
    }
  }

  // Filter by scheduling threshold
  const toRun = configs.filter(shouldRunConfig);
  const skipped = configs.length - toRun.length;

  if (skipped > 0) {
    log('info', `Skipping ${skipped} configs (threshold not reached)`);
  }

  if (toRun.length === 0) {
    log('info', 'No configs to run. Exiting.');
    return;
  }

  // Process each config sequentially
  const allResults = [];
  for (const config of toRun) {
    try {
      const result = await processConfig(config, connOpts);
      allResults.push(result);
    } catch (err) {
      log('error', `Config ${config.id} failed unexpectedly`, {
        configId: config.id,
        error: err.message || String(err),
      });
      allResults.push({
        configId: config.id,
        areaLabel: config.area_label,
        sourcesAttempted: 0,
        sourcesSucceeded: 0,
        totalItems: 0,
        errors: [{ source: 'orchestrator', error_type: 'unexpected', message: err.message }],
      });
    }
  }

  // Summary
  const totalSources = allResults.reduce((s, r) => s + r.sourcesAttempted, 0);
  const totalSucceeded = allResults.reduce((s, r) => s + r.sourcesSucceeded, 0);
  const totalItems = allResults.reduce((s, r) => s + r.totalItems, 0);
  const totalErrors = allResults.reduce((s, r) => s + r.errors.length, 0);

  log('info', 'Scrape-and-push complete', {
    event: 'scrape_push_complete',
    configsProcessed: toRun.length,
    configsSkipped: skipped,
    sourcesAttempted: totalSources,
    sourcesSucceeded: totalSucceeded,
    totalItems,
    totalErrors,
    dryRun: DRY_RUN,
  });

  if (totalErrors > 0) {
    process.exit(2); // Partial failure
  }
}

main().catch(err => {
  log('error', `Fatal error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
