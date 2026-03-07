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
const { applyPrecisionGate } = require('../src/integration/precisionGate');
const { runPlatform } = require('../src/core/runPlatform');
const { dedupeListInMemory } = require('../pipeline/deduplicate');

const defaultDeps = {
  pullConfigs,
  buildIngestPayload,
  pushBatch,
  applyPrecisionGate,
  runPlatform,
  dedupeListInMemory,
  randomUUID: () => crypto.randomUUID(),
};

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    runNow: argv.includes('--run-now'),
    dryRun: argv.includes('--dry-run'),
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

async function scrapeSource(platform, url, options, deps = defaultDeps) {
  const startMs = Date.now();
  try {
    const { results } = await deps.runPlatform({
      platform,
      url,
      options: {
        maxPages: options?.maxPages || 5,
        maxAds: options?.maxAds || 30,
        maxWait: options?.maxWait || null,
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

async function processConfig(config, { apiUrl, apiKey, tenantId }, runtime = {}) {
  const {
    deps = defaultDeps,
    flags = { dryRun: false },
    log = createLogger(),
    stdout = process.stdout,
  } = runtime;
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
    const runId = deps.randomUUID();

    log('info', `Scraping ${platform}`, { configId, platform, url });

    const { items, durationMs, error } = await scrapeSource(platform, url, options, deps);

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
    const { unique: deduped, duplicates } = deps.dedupeListInMemory(items);
    const dedupeRemoved = duplicates ? duplicates.length : 0;

    const precision = deps.applyPrecisionGate(deduped, platform);

    log('info', `Scraped ${items.length} items (${dedupeRemoved} dupes removed) from ${platform}`, {
      configId,
      platform,
      scraped: items.length,
      deduped: deduped.length,
      rejected_precision: precision.metrics.rejected_precision,
      uncertain_blocked: precision.metrics.uncertain_blocked,
      accepted_for_push: precision.metrics.accepted_for_push,
      durationMs,
    });

    if (precision.accepted.length === 0) {
      log('warn', `Precision gate blocked all items from ${platform}`, {
        configId,
        platform,
        rejected_precision: precision.metrics.rejected_precision,
        uncertain_blocked: precision.metrics.uncertain_blocked,
      });
      runResults.errors.push({
        source: platform,
        error_type: 'precision_gate_blocked',
        message: 'No items passed the precision gate',
      });
      continue;
    }

    // Build payload (applies dataCleaner + type conversion internally)
    const payload = deps.buildIngestPayload({
      runId,
      configId,
      source: platform,
      areaQuery: config.area_label,
      rawItems: precision.accepted,
      durationMs,
      dedupeRemovedLocal: dedupeRemoved,
      totalScraped: deduped.length,
    });

    if (flags.dryRun) {
      log('info', `[DRY RUN] Would push ${payload.items.length} items for ${platform}`, {
        configId,
        platform,
        runId,
      });
      // Output payload to stdout for inspection
      stdout.write(JSON.stringify(payload, null, 2) + '\n');
      runResults.sourcesSucceeded++;
      runResults.totalItems += payload.items.length;
      continue;
    }

    // Push to APP Fastify API
    try {
      const result = await deps.pushBatch(payload, {
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
    log('error', 'APP_API_URL environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.apiKey) {
    log('error', 'SCRAPER_API_KEY environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.tenantId) {
    log('error', 'SCRAPER_TENANT_ID environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }

  log('info', 'Scrape-and-push starting', {
    runNow: flags.runNow,
    dryRun: flags.dryRun,
    configId: flags.configId,
    apiUrl: connOpts.apiUrl,
  });

  // Pull configs from APP
  let configs;
  try {
    configs = await deps.pullConfigs(connOpts);
    log('info', `Fetched ${configs.length} configs from APP`);
  } catch (err) {
    log('error', `Failed to pull configs: ${err.message}`);
    exit(1);
    return { exitCode: 1 };
  }

  // Filter by config ID if specified
  if (flags.configId) {
    configs = configs.filter(c => c.id === flags.configId);
    if (configs.length === 0) {
      log('error', `Config ${flags.configId} not found`);
      exit(1);
      return { exitCode: 1 };
    }
  }

  // Filter by scheduling threshold
  const toRun = configs.filter(config => shouldRunConfig(config, {
    runNow: flags.runNow,
    now,
  }));
  const skipped = configs.length - toRun.length;

  if (skipped > 0) {
    log('info', `Skipping ${skipped} configs (threshold not reached)`);
  }

  if (toRun.length === 0) {
    log('info', 'No configs to run. Exiting.');
    return {
      exitCode: 0,
      summary: {
        configsProcessed: 0,
        configsSkipped: skipped,
        sourcesAttempted: 0,
        sourcesSucceeded: 0,
        totalItems: 0,
        totalErrors: 0,
      },
    };
  }

  // Process each config sequentially
  const allResults = [];
  for (const config of toRun) {
    try {
      const result = await processConfig(config, connOpts, {
        deps,
        flags,
        log,
        stdout,
      });
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
  const summary = {
    configsProcessed: toRun.length,
    configsSkipped: skipped,
    sourcesAttempted: allResults.reduce((s, r) => s + r.sourcesAttempted, 0),
    sourcesSucceeded: allResults.reduce((s, r) => s + r.sourcesSucceeded, 0),
    totalItems: allResults.reduce((s, r) => s + r.totalItems, 0),
    totalErrors: allResults.reduce((s, r) => s + r.errors.length, 0),
  };

  log('info', 'Scrape-and-push complete', {
    event: 'scrape_push_complete',
    ...summary,
    dryRun: flags.dryRun,
  });

  if (summary.totalErrors > 0) {
    exit(2);
    return { exitCode: 2, summary, results: allResults };
  }

  return { exitCode: 0, summary, results: allResults };
}

if (require.main === module) {
  main().catch(err => {
    const log = createLogger(process.stderr);
    log('error', `Fatal error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

module.exports = {
  createLogger,
  parseCliArgs,
  shouldRunConfig,
  scrapeSource,
  processConfig,
  main,
};
