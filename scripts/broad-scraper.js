#!/usr/bin/env node

/**
 * Broad scraper: scrapes ALL property listings (agencies + private) for buyer search matching.
 *
 * Unlike scrape-and-push.js (FSBO-only), this skips FSBO scoring and precision gate.
 * Pushes full listing data to /api/scraper/ingest with scrape_mode: "broad".
 *
 * Usage:
 *   node scripts/broad-scraper.js                         # respects scheduling threshold
 *   node scripts/broad-scraper.js --run-now               # force immediate run
 *   node scripts/broad-scraper.js --config-id=<uuid>      # single config
 *   node scripts/broad-scraper.js --dry-run               # no push to API
 *   node scripts/broad-scraper.js --legacy                # disable incremental tracking
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
const { cleanItem } = require('../src/integration/dataCleaner');
const { dedupeListInMemory } = require('../pipeline/deduplicate');
const { applyIncremental } = require('../pipeline/incremental');
const { filterSalesOnly } = require('../src/price-tracker/salesFilter');

const SOURCES = ['olx', 'imovirtual', 'custojusto', 'casasapo', 'idealista'];
const BROAD_STATE_FILE = 'data/broad_incremental_state.json';

const defaultDeps = {
  pullConfigs,
  buildIngestPayload,
  pushBatch,
  runPlatform,
  cleanItem,
  dedupeListInMemory,
  applyIncremental,
  filterSalesOnly,
  randomUUID: () => crypto.randomUUID(),
};

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    runNow: argv.includes('--run-now'),
    dryRun: argv.includes('--dry-run'),
    incremental: !argv.includes('--legacy'),
    configId: (() => {
      const flag = argv.find(a => a.startsWith('--config-id='));
      return flag ? flag.split('=').slice(1).join('=') : null;
    })(),
  };
}

function getConnectionOptions(env = process.env) {
  return {
    apiUrl: env.APP_API_URL,
    apiKey: env.SCRAPER_API_KEY,
    tenantId: env.SCRAPER_TENANT_ID,
  };
}

function createLogger(stderr = process.stderr) {
  return function log(level, msg, data = {}) {
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      message: msg,
      ...data,
    };
    stderr.write(JSON.stringify(entry) + '\n');
  };
}

function shouldRunConfig(config, { runNow = false, now = Date.now() } = {}) {
  if (runNow) return true;
  if (!config.last_run_at) return true;

  const lastRun = new Date(config.last_run_at);
  const threshold = (config.schedule_interval_hours || 96) * 60 * 60 * 1000;
  const elapsed = now - lastRun.getTime();
  return elapsed >= threshold;
}

function assessExtractionQuality(items) {
  if (!items || items.length === 0) {
    return { fields_coverage: {}, item_count: 0, verdict: 'EMPTY' };
  }

  const total = items.length;
  const filled = (arr, p) => {
    let count = 0;
    for (const item of arr) {
      const val = p.split('.').reduce((o, k) => o?.[k], item);
      if (val !== null && val !== undefined && val !== '' && val !== 0) count++;
    }
    return Math.round((count / total) * 100);
  };

  const coverage = {
    title: filled(items, 'title'),
    price: filled(items, 'price'),
    location_district: filled(items, 'location.district'),
    location_municipality: filled(items, 'location.municipality'),
    area: items.filter(i =>
      (i.property?.area_total && i.property.area_total !== '' && i.property.area_total !== 0) ||
      (i.property?.area_useful && i.property.area_useful !== '' && i.property.area_useful !== 0)
    ).length / total * 100 | 0,
    photos: items.filter(i => Array.isArray(i.photos) && i.photos.length > 0).length / total * 100 | 0,
  };

  let verdict = 'OK';
  if (coverage.title < 50 || coverage.price < 50) {
    verdict = 'DEGRADED';
  } else if (coverage.location_district === 0 && coverage.location_municipality === 0) {
    verdict = 'DEGRADED';
  } else if (coverage.title < 80 || coverage.price < 80) {
    verdict = 'PARTIAL';
  }

  return { fields_coverage: coverage, item_count: total, verdict };
}

async function scrapeSource(platform, url, options, deps) {
  const startMs = Date.now();
  try {
    const raw = await deps.runPlatform({
      platform,
      url,
      options: {
        maxPages: options?.maxPages ?? 5,
        maxAds: options?.maxAds ?? 50,
        maxWait: options?.maxWait ?? null,
        headless: true,
        filterAgencies: false,
        filterPrivateOnly: false,
      },
      outputShape: 'cli',
      normalize: true,
    });

    const items = raw.results || [];
    const durationMs = Date.now() - startMs;
    return { items, durationMs, error: null };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    return { items: [], durationMs, error: err.message || String(err) };
  }
}

async function processConfig(config, connOpts, runtime = {}) {
  const {
    deps = defaultDeps,
    flags = { dryRun: false, incremental: true },
    log = createLogger(),
    stdout = process.stdout,
  } = runtime;
  const configId = config.id;
  const sources = config.sources || {};
  const options = config.options || {};

  log('info', `[broad] Processing config: ${config.area_label}`, {
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
    if (!SOURCES.includes(platform)) continue;

    runResults.sourcesAttempted++;
    const runId = deps.randomUUID();

    log('info', `[broad] Scraping ${platform}`, { configId, platform, url });

    const { items, durationMs, error } = await scrapeSource(platform, url, options, deps);

    if (error) {
      log('error', `[broad] Scraper failed for ${platform}`, { configId, platform, error });
      runResults.errors.push({ source: platform, error_type: 'scrape_failed', message: error });
      continue;
    }

    if (items.length === 0) {
      log('warn', `[broad] No items scraped from ${platform}`, { configId, platform });
      continue;
    }

    // Clean items
    const cleaned = items.map(i => deps.cleanItem(i, platform));

    // Dedupe
    const { unique: deduped, duplicates } = deps.dedupeListInMemory(cleaned);
    const dedupeRemoved = duplicates ? duplicates.length : 0;

    // Sales filter (no FSBO, no precision gate — just valid URL + not rent + not forbidden)
    const salesOnly = deps.filterSalesOnly(deduped, platform);

    log('info', `[broad] ${platform}: ${items.length} scraped, ${deduped.length} deduped, ${salesOnly.length} sales`, {
      configId,
      platform,
      scraped: items.length,
      deduped: deduped.length,
      salesOnly: salesOnly.length,
      durationMs,
    });

    if (salesOnly.length === 0) {
      log('warn', `[broad] No sales items from ${platform}`, { configId, platform });
      continue;
    }

    // Extraction quality
    const quality = assessExtractionQuality(salesOnly);

    // Incremental tracking (separate state file from FSBO pipeline)
    let itemsToPush = salesOnly;
    let incrementalMeta = null;

    if (flags.incremental) {
      try {
        const scopeKey = `broad|${configId}|${platform}`;
        const result = await deps.applyIncremental(salesOnly, {
          scopeKey,
          stateFile: BROAD_STATE_FILE,
          coverageFull: false,
        });
        incrementalMeta = result.meta;
        itemsToPush = result.items.filter(i => i._status === 'NEW' || i._status === 'UPDATED');

        log('info', `[broad] Incremental: ${result.meta.new} new, ${result.meta.updated} updated, ${result.meta.unchanged} unchanged`, {
          configId,
          platform,
        });
      } catch (incErr) {
        log('warn', `[broad] Incremental failed, full push: ${incErr.message}`, { configId, platform });
        itemsToPush = salesOnly;
      }
    }

    if (itemsToPush.length === 0) {
      log('info', `[broad] No new/updated items for ${platform}, skipping push`, { configId, platform });
      runResults.sourcesSucceeded++;
      continue;
    }

    // Build payload
    const effectiveRunStatus = quality.verdict === 'DEGRADED' ? 'DEGRADED' : 'COMPLETED';
    const payload = deps.buildIngestPayload({
      runId,
      configId,
      source: platform,
      areaQuery: config.area_label,
      rawItems: itemsToPush,
      durationMs,
      dedupeRemovedLocal: dedupeRemoved,
      totalScraped: deduped.length,
      runStatus: effectiveRunStatus,
      incrementalMeta,
      extractionQuality: quality,
    });

    // Mark as broad scrape
    payload.scrape_mode = 'broad';

    if (flags.dryRun) {
      log('info', `[broad] [DRY RUN] Would push ${payload.items.length} items for ${platform}`, { configId, platform });
      stdout.write(JSON.stringify(payload, null, 2) + '\n');
    } else {
      try {
        await deps.pushBatch(payload, {
          apiUrl: connOpts.apiUrl,
          apiKey: connOpts.apiKey,
          tenantId: connOpts.tenantId,
          logger: (msg) => log('warn', msg),
        });

        log('info', `[broad] Pushed ${payload.items.length} items for ${platform}`, { configId, platform });
      } catch (pushErr) {
        log('error', `[broad] Failed to push ${platform}`, {
          configId,
          platform,
          error: pushErr.message || String(pushErr),
        });
        runResults.errors.push({ source: platform, error_type: 'push_failed', message: pushErr.message });
        continue;
      }
    }

    runResults.sourcesSucceeded++;
    runResults.totalItems += payload.items.length;
  }

  return runResults;
}

async function main(runtime = {}) {
  const argv = runtime.argv || process.argv.slice(2);
  const env = runtime.env || process.env;
  const deps = { ...defaultDeps, ...(runtime.deps || {}) };
  const stdout = runtime.stdout || process.stdout;
  const stderr = runtime.stderr || process.stderr;
  const exit = runtime.exit || ((code) => process.exit(code));
  const now = typeof runtime.now === 'number' ? runtime.now : Date.now();
  const flags = parseCliArgs(argv);
  const connOpts = getConnectionOptions(env);
  const log = createLogger(stderr);

  // Validate environment
  if (!connOpts.apiUrl) {
    log('error', '[broad] APP_API_URL environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.apiKey) {
    log('error', '[broad] SCRAPER_API_KEY environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.tenantId) {
    log('error', '[broad] SCRAPER_TENANT_ID environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }

  log('info', '[broad] Starting broad scraper', {
    runNow: flags.runNow,
    dryRun: flags.dryRun,
    incremental: flags.incremental,
    configId: flags.configId,
    apiUrl: connOpts.apiUrl,
  });

  // Pull configs
  let configs;
  try {
    configs = await deps.pullConfigs(connOpts);
    log('info', `[broad] Fetched ${configs.length} configs`);
  } catch (err) {
    log('error', `[broad] Failed to pull configs: ${err.message}`);
    exit(1);
    return { exitCode: 1 };
  }

  // Filter by config ID
  if (flags.configId) {
    configs = configs.filter(c => c.id === flags.configId);
    if (configs.length === 0) {
      log('error', `[broad] Config ${flags.configId} not found`);
      exit(1);
      return { exitCode: 1 };
    }
  }

  // Filter configs with broadScraper enabled
  configs = configs.filter(c => c.options?.broadScraper?.enabled === true);

  if (configs.length === 0) {
    log('info', '[broad] No configs with broadScraper enabled. Exiting.');
    return { exitCode: 0, summary: { configsProcessed: 0, totalItems: 0 } };
  }

  // Schedule filtering
  const toRun = configs.filter(config =>
    shouldRunConfig(config, { runNow: flags.runNow, now })
  );
  const skipped = configs.length - toRun.length;

  if (skipped > 0) {
    log('info', `[broad] Skipping ${skipped} configs (threshold not reached)`);
  }

  if (toRun.length === 0) {
    log('info', '[broad] No configs to run. Exiting.');
    return {
      exitCode: 0,
      summary: { configsProcessed: 0, configsSkipped: skipped, totalItems: 0, totalErrors: 0 },
    };
  }

  // Process configs
  const allResults = [];
  for (const config of toRun) {
    try {
      const result = await processConfig(config, connOpts, { deps, flags, log, stdout });
      allResults.push(result);
    } catch (err) {
      log('error', `[broad] Config ${config.id} failed`, { configId: config.id, error: err.message });
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
  const summary = {
    configsProcessed: toRun.length,
    configsSkipped: skipped,
    sourcesAttempted: allResults.reduce((s, r) => s + r.sourcesAttempted, 0),
    sourcesSucceeded: allResults.reduce((s, r) => s + r.sourcesSucceeded, 0),
    totalItems: allResults.reduce((s, r) => s + r.totalItems, 0),
    totalErrors: allResults.reduce((s, r) => s + r.errors.length, 0),
  };

  log('info', '[broad] Complete', { event: 'broad_scraper_complete', ...summary, dryRun: flags.dryRun });

  if (summary.totalErrors > 0) {
    exit(2);
    return { exitCode: 2, summary, results: allResults };
  }

  return { exitCode: 0, summary, results: allResults };
}

if (require.main === module) {
  main().catch(err => {
    const log = createLogger(process.stderr);
    log('error', `[broad] Fatal error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

module.exports = {
  createLogger,
  parseCliArgs,
  shouldRunConfig,
  scrapeSource,
  processConfig,
  assessExtractionQuality,
  main,
  BROAD_STATE_FILE,
};
