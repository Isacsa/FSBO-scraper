#!/usr/bin/env node

/**
 * Price-tracker orchestrator: pull configs -> scrape ALL listings -> track prices -> detect drops -> push
 *
 * Usage:
 *   node scripts/price-tracker.js                          # respects schedule
 *   node scripts/price-tracker.js --run-now                # force run
 *   node scripts/price-tracker.js --dry-run                # no push, output to stdout
 *   node scripts/price-tracker.js --config-id=<uuid>       # single config
 *   node scripts/price-tracker.js --drop-threshold=0.20    # override threshold
 *
 * Environment:
 *   APP_API_URL                    - Fastify API base URL (required)
 *   SCRAPER_API_KEY                - API key (required)
 *   SCRAPER_TENANT_ID              - tenant UUID (required)
 *   PRICE_TRACKER_DROP_THRESHOLD   - default 0.15 (optional)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const crypto = require('crypto');

const { version: SCRAPER_VERSION } = require('../package.json');
const { pullConfigs } = require('../src/integration/pullConfigs');
const { runPlatform, extractItemsFromRaw } = require('../src/core/runPlatform');
const { cleanItem } = require('../src/integration/dataCleaner');
const { dedupeListInMemory } = require('../pipeline/deduplicate');
const { filterSalesOnly } = require('../src/price-tracker/salesFilter');
const { loadPriceState, upsertListings, savePriceState, pruneStale, withPriceStateLock } = require('../src/price-tracker/priceStore');
const { detectDrops } = require('../src/price-tracker/priceComparator');
const { build: buildPriceDropPayload } = require('../src/price-tracker/toPriceDropPayload');
const { pushPriceDrops } = require('../src/price-tracker/pushPriceDrops');

const DEFAULT_DROP_THRESHOLD = 0.15;
const SOURCES = ['olx', 'imovirtual', 'custojusto', 'casasapo', 'idealista'];

const defaultDeps = {
  pullConfigs,
  runPlatform,
  extractItemsFromRaw,
  cleanItem,
  dedupeListInMemory,
  filterSalesOnly,
  loadPriceState,
  upsertListings,
  savePriceState,
  pruneStale,
  withPriceStateLock,
  detectDrops,
  buildPriceDropPayload,
  pushPriceDrops,
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
    dropThreshold: (() => {
      const flag = argv.find(a => a.startsWith('--drop-threshold='));
      if (!flag) return null;
      const val = parseFloat(flag.split('=')[1]);
      return isNaN(val) ? null : val;
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

function getDropThreshold(flags, env) {
  if (flags.dropThreshold !== null) return flags.dropThreshold;
  if (env.PRICE_TRACKER_DROP_THRESHOLD) {
    const val = parseFloat(env.PRICE_TRACKER_DROP_THRESHOLD);
    if (!isNaN(val)) return val;
  }
  return DEFAULT_DROP_THRESHOLD;
}

async function scrapeSource(platform, url, options, deps) {
  const startMs = Date.now();
  try {
    const raw = await deps.runPlatform({
      platform,
      url,
      options: {
        maxPages: options?.maxPages ?? 5,
        maxAds: options?.maxAds ?? 30,
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

async function processSource({ platform, url, config, connOpts, threshold, deps, flags, log, stdout, now }) {
  const runId = deps.randomUUID();
  const configId = config.id;
  const options = config.options || {};
  const startMs = Date.now();

  log('info', `[price-tracker] Scraping ${platform}`, { configId, platform, url });

  const { items, durationMs, error } = await scrapeSource(platform, url, options, deps);

  if (error) {
    log('error', `[price-tracker] Scraper failed for ${platform}`, { configId, platform, error });
    return { platform, scraped: 0, newCount: 0, priceChanges: 0, drops: 0, error };
  }

  if (items.length === 0) {
    log('warn', `[price-tracker] No items scraped from ${platform}`, { configId, platform });
    return { platform, scraped: 0, newCount: 0, priceChanges: 0, drops: 0, error: null };
  }

  // Clean items
  const cleaned = items.map(i => deps.cleanItem(i, platform));

  // Dedupe
  const { unique } = deps.dedupeListInMemory(cleaned);

  // Filter sales only (no FSBO filtering)
  const salesOnly = deps.filterSalesOnly(unique, platform);

  // Load → upsert → prune → detect drops → save (all under lock)
  const stateResult = await deps.withPriceStateLock(configId, (state) => {
    const upsertResult = deps.upsertListings(state, salesOnly, now);
    const prunedCount = deps.pruneStale(state, 90);
    const drops = deps.detectDrops(state, threshold);
    return { ...upsertResult, prunedCount, drops, totalTracked: Object.keys(state.listings).length };
  });
  const { newCount, priceChanged, prunedCount, drops } = stateResult;
  const totalTracked = stateResult.totalTracked;

  const totalDurationMs = Date.now() - startMs;

  log('info', `[price-tracker] ${platform} processed`, {
    configId,
    platform,
    scraped: items.length,
    salesOnly: salesOnly.length,
    newCount,
    priceChanged,
    pruned: prunedCount,
    drops: drops.length,
    totalTracked: totalTracked,
  });

  if (drops.length > 0) {
    const payload = deps.buildPriceDropPayload({
      runId,
      configId,
      source: platform,
      areaLabel: config.area_label,
      drops,
      durationMs: totalDurationMs,
      now,
      meta: {
        total_tracked: totalTracked,
        total_scraped_this_run: items.length,
        new_listings: newCount,
        price_changes: priceChanged,
        drops_detected: drops.length,
        scraper_version: SCRAPER_VERSION,
      },
    });

    if (flags.dryRun) {
      log('info', `[price-tracker] [DRY RUN] Would push ${drops.length} price drops for ${platform}`, {
        configId,
        platform,
      });
      stdout.write(JSON.stringify(payload, null, 2) + '\n');
    } else {
      await deps.pushPriceDrops(payload, {
        apiUrl: connOpts.apiUrl,
        apiKey: connOpts.apiKey,
        tenantId: connOpts.tenantId,
        logger: (msg) => log('warn', msg),
      });
      log('info', `[price-tracker] Pushed ${drops.length} price drops for ${platform}`, {
        configId,
        platform,
      });
    }
  }

  return {
    platform,
    scraped: items.length,
    newCount,
    priceChanges: priceChanged,
    drops: drops.length,
    error: null,
  };
}

async function main(runtime = {}) {
  const argv = runtime.argv || process.argv.slice(2);
  const env = runtime.env || process.env;
  const deps = { ...defaultDeps, ...(runtime.deps || {}) };
  const stdout = runtime.stdout || process.stdout;
  const stderr = runtime.stderr || process.stderr;
  const exit = runtime.exit || ((code) => process.exit(code));
  const now = runtime.now || new Date().toISOString();
  const flags = parseCliArgs(argv);
  const connOpts = getConnectionOptions(env);
  const log = createLogger(stderr);
  const threshold = getDropThreshold(flags, env);

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

  log('info', '[price-tracker] Starting', {
    runNow: flags.runNow,
    dryRun: flags.dryRun,
    configId: flags.configId,
    dropThreshold: threshold,
    apiUrl: connOpts.apiUrl,
  });

  // Pull configs
  let configs;
  try {
    configs = await deps.pullConfigs(connOpts);
    log('info', `[price-tracker] Fetched ${configs.length} configs`);
  } catch (err) {
    log('error', `[price-tracker] Failed to pull configs: ${err.message}`);
    exit(1);
    return { exitCode: 1 };
  }

  // Filter by config ID if specified
  if (flags.configId) {
    configs = configs.filter(c => c.id === flags.configId);
    if (configs.length === 0) {
      log('error', `[price-tracker] Config ${flags.configId} not found`);
      exit(1);
      return { exitCode: 1 };
    }
  }

  // Filter configs with priceTracker enabled
  configs = configs.filter(c => c.options?.priceTracker?.enabled === true);

  if (configs.length === 0) {
    log('info', '[price-tracker] No configs with priceTracker enabled. Exiting.');
    return { exitCode: 0, summary: { configsProcessed: 0, totalDrops: 0 } };
  }

  // Filter by scheduling threshold
  const nowMs = typeof runtime.nowMs === 'number' ? runtime.nowMs : Date.now();
  const toRun = configs.filter(config =>
    shouldRunConfig(config, { runNow: flags.runNow, now: nowMs })
  );
  const skipped = configs.length - toRun.length;

  if (skipped > 0) {
    log('info', `[price-tracker] Skipping ${skipped} configs (threshold not reached)`);
  }

  if (toRun.length === 0) {
    log('info', '[price-tracker] No configs to run. Exiting.');
    return {
      exitCode: 0,
      summary: { configsProcessed: 0, configsSkipped: skipped, totalDrops: 0 },
    };
  }

  // Process each config
  const allResults = [];
  for (const config of toRun) {
    const sources = config.sources || {};
    const configResults = [];

    for (const [platform, url] of Object.entries(sources)) {
      if (!url || typeof url !== 'string') continue;
      if (!SOURCES.includes(platform)) continue;

      try {
        const result = await processSource({
          platform,
          url,
          config,
          connOpts,
          threshold,
          deps,
          flags,
          log,
          stdout,
          now,
        });
        configResults.push(result);
      } catch (err) {
        log('error', `[price-tracker] Unexpected error processing ${platform}`, {
          configId: config.id,
          platform,
          error: err.message || String(err),
        });
        configResults.push({
          platform,
          scraped: 0,
          newCount: 0,
          priceChanges: 0,
          drops: 0,
          error: err.message,
        });
      }
    }

    allResults.push({
      configId: config.id,
      areaLabel: config.area_label,
      sources: configResults,
    });
  }

  // Summary
  const summary = {
    configsProcessed: toRun.length,
    configsSkipped: skipped,
    totalScraped: allResults.reduce(
      (s, r) => s + r.sources.reduce((ss, sr) => ss + sr.scraped, 0),
      0
    ),
    totalNewListings: allResults.reduce(
      (s, r) => s + r.sources.reduce((ss, sr) => ss + sr.newCount, 0),
      0
    ),
    totalPriceChanges: allResults.reduce(
      (s, r) => s + r.sources.reduce((ss, sr) => ss + sr.priceChanges, 0),
      0
    ),
    totalDrops: allResults.reduce(
      (s, r) => s + r.sources.reduce((ss, sr) => ss + sr.drops, 0),
      0
    ),
    totalErrors: allResults.reduce(
      (s, r) => s + r.sources.filter(sr => sr.error).length,
      0
    ),
  };

  log('info', '[price-tracker] Complete', {
    event: 'price_tracker_complete',
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
    log('error', `[price-tracker] Fatal error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

module.exports = {
  createLogger,
  parseCliArgs,
  shouldRunConfig,
  getDropThreshold,
  scrapeSource,
  processSource,
  main,
};
