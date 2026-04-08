#!/usr/bin/env node

/**
 * Stateless orchestrator: pull configs → scrape → clean → push
 *
 * Usage:
 *   node scripts/scrape-and-push.js                         # normal (respects scheduling threshold)
 *   node scripts/scrape-and-push.js --run-now               # force run all configs
 *   node scripts/scrape-and-push.js --config-id=<uuid>      # run a specific config only
 *   node scripts/scrape-and-push.js --dry-run               # scrape + clean but don't push
 *   node scripts/scrape-and-push.js --legacy                # disable incremental tracking (push all items)
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
const { applyIncremental } = require('../pipeline/incremental');
const { calculateFsboScores } = require('../pipeline/fsboScore');
const { analyzeBatch } = require('../src/services/valuation');
const { loadPriceState, upsertListings, pruneStale, withPriceStateLock, PRICE_HISTORY_DIR } = require('../src/price-tracker/priceStore');
const { computeDropMetrics } = require('../src/price-tracker/priceComparator');
const { canonicalizeAdUrl } = require('../src/utils/canonicalizeUrl');

/**
 * Enrich items with price history data from a pre-loaded price state.
 * Called inside withPriceStateLock after upsert, so state is fresh.
 *
 * Adds _price_insights with drop detection from computeDropMetrics.
 */
function enrichWithPriceHistory(items, state, deps = defaultDeps) {
  if (!state?.listings || Object.keys(state.listings).length === 0) return;

  const now = Date.now();
  for (const item of items) {
    const key = canonicalizeAdUrl(item.url);
    if (!key) continue;

    const entry = state.listings[key];
    if (!entry) continue;

    const firstSeen = new Date(entry.first_seen_at).getTime();
    const daysOnMarket = Math.max(0, Math.round((now - firstSeen) / (1000 * 60 * 60 * 24)));

    let priceTrend = 'stable';
    if (entry.price_history && entry.price_history.length >= 2) {
      const first = entry.price_history[0].price;
      const last = entry.price_history[entry.price_history.length - 1].price;
      if (last < first) priceTrend = 'dropping';
      else if (last > first) priceTrend = 'rising';
    }

    const dropMetrics = deps.computeDropMetrics(entry);

    item._price_insights = {
      days_on_market: daysOnMarket,
      price_trend: priceTrend,
      price_changes: entry.price_history ? entry.price_history.length - 1 : 0,
      first_seen_price: entry.first_seen_price || null,
      current_price: entry.current_price || null,
      ...(dropMetrics ? {
        has_drop: true,
        drop_percent: dropMetrics.dropPercent,
        drop_absolute: dropMetrics.dropAbsolute,
        drop_type: dropMetrics.dropType,
        step_drop_percent: dropMetrics.stepDropPercent,
        prev_price: dropMetrics.prevPrice,
      } : {
        has_drop: false,
      }),
    };
  }
}

const defaultDeps = {
  pullConfigs,
  buildIngestPayload,
  pushBatch,
  applyPrecisionGate,
  runPlatform,
  dedupeListInMemory,
  applyIncremental,
  calculateFsboScores,
  upsertListings,
  pruneStale,
  withPriceStateLock,
  computeDropMetrics,
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

/**
 * Assess extraction quality of scraped items.
 * Returns field coverage percentages and a quality verdict.
 */
function assessExtractionQuality(items) {
  if (!items || items.length === 0) {
    return { fields_coverage: {}, item_count: 0, verdict: 'EMPTY' };
  }

  const total = items.length;
  const filled = (arr, path) => {
    let count = 0;
    for (const item of arr) {
      const val = path.split('.').reduce((o, k) => o?.[k], item);
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

  async function publishRun({
    platform,
    runId,
    durationMs,
    rawItems,
    totalScraped,
    dedupeRemoved = 0,
    runStatus = 'COMPLETED',
    errors = [],
    incrementalMeta = null,
    extractionQuality = null,
    priceTrackingMeta = null,
  }) {
    const payload = deps.buildIngestPayload({
      runId,
      configId,
      source: platform,
      areaQuery: config.area_label,
      rawItems,
      durationMs,
      dedupeRemovedLocal: dedupeRemoved,
      totalScraped,
      runStatus,
      errors,
      incrementalMeta,
      extractionQuality,
      priceTrackingMeta,
    });

    if (flags.dryRun) {
      log('info', `[DRY RUN] Would push ${payload.items.length} items for ${platform}`, {
        configId,
        platform,
        runId,
        runStatus,
      });
      stdout.write(JSON.stringify(payload, null, 2) + '\n');
      return { payload, result: null };
    }

    const result = await deps.pushBatch(payload, {
      apiUrl,
      apiKey,
      tenantId,
      logger: (msg) => log('warn', msg),
    });

    log('info', `Pushed ${platform} run successfully`, {
      configId,
      platform,
      runId,
      runStatus,
      ...result,
    });

    return { payload, result };
  }

  for (const [platform, url] of Object.entries(sources)) {
    if (!url || typeof url !== 'string') continue;

    runResults.sourcesAttempted++;
    const runId = deps.randomUUID();

    log('info', `Scraping ${platform}`, { configId, platform, url });

    const { items, durationMs, error } = await scrapeSource(platform, url, options, deps);

    if (error) {
      log('error', `Scraper failed for ${platform}`, { configId, platform, error });
      const runError = { source: platform, error_type: 'scrape_failed', message: error };
      runResults.errors.push(runError);
      try {
        await publishRun({
          platform,
          runId,
          durationMs,
          rawItems: [],
          totalScraped: 0,
          runStatus: 'FAILED',
          errors: [runError],
        });
      } catch (pushErr) {
        log('error', `Failed to publish failed run for ${platform}`, {
          configId,
          platform,
          runId,
          error: pushErr.message || String(pushErr),
        });
      }
      continue;
    }

    if (items.length === 0) {
      log('warn', `No items scraped from ${platform}`, { configId, platform });
      const runError = { source: platform, error_type: 'no_items', message: 'No items returned' };
      runResults.errors.push(runError);
      try {
        await publishRun({
          platform,
          runId,
          durationMs,
          rawItems: [],
          totalScraped: 0,
          runStatus: 'PARTIAL',
          errors: [runError],
        });
      } catch (pushErr) {
        log('error', `Failed to publish partial run for ${platform}`, {
          configId,
          platform,
          runId,
          error: pushErr.message || String(pushErr),
        });
      }
      continue;
    }

    // Assess extraction quality before processing
    const quality = assessExtractionQuality(items);

    if (quality.verdict === 'DEGRADED') {
      log('error', `Degraded extraction from ${platform}`, {
        configId,
        platform,
        extraction_quality: quality,
      });
    } else if (quality.verdict === 'PARTIAL') {
      log('warn', `Partial extraction quality from ${platform}`, {
        configId,
        platform,
        extraction_quality: quality,
      });
    }

    // In-memory dedupe within this batch
    const { unique: deduped, duplicates } = deps.dedupeListInMemory(items);
    const dedupeRemoved = duplicates ? duplicates.length : 0;

    // FSBO scoring — must run before precision gate so score/decision are available
    const scored = deps.calculateFsboScores(deduped);

    const precision = deps.applyPrecisionGate(scored, platform);

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
      const runError = {
        source: platform,
        error_type: 'precision_gate_blocked',
        message: 'No items passed the precision gate',
      };
      runResults.errors.push(runError);
      try {
        await publishRun({
          platform,
          runId,
          durationMs,
          rawItems: [],
          totalScraped: deduped.length,
          dedupeRemoved,
          runStatus: 'PARTIAL',
          errors: [runError],
        });
      } catch (pushErr) {
        log('error', `Failed to publish gated run for ${platform}`, {
          configId,
          platform,
          runId,
          error: pushErr.message || String(pushErr),
        });
      }
      continue;
    }

    // Valuation: score each accepted item against batch benchmarks
    try {
      const { reports, stats } = analyzeBatch(precision.accepted);
      // Map reports back to items by URL
      const reportByUrl = new Map();
      for (const report of reports) {
        const url = report.property?.url;
        if (url) reportByUrl.set(url, report);
      }
      for (const item of precision.accepted) {
        const report = reportByUrl.get(item.url);
        if (report && report.evaluable) {
          const bonuses = [];
          const itemFsbo = item.fsbo_score ?? item.signals?.fsbo_score;
          if (typeof itemFsbo === 'number' && itemFsbo >= 70) {
            bonuses.push('FSBO (sem comissao ~5%)');
          }
          item._valuation = {
            score: report.summary.score,
            label: report.summary.verdict,
            deviation_pct: report.summary.deviation_pct,
            benchmark_price_sqm: report.summary.benchmark_price_per_sqm,
            price_per_sqm: report.summary.price_per_sqm,
            confidence: report.confidence,
            benchmark_level: report.benchmark_level,
            bonuses,
          };
        } else {
          item._valuation = null;
        }
      }
      log('info', `Valuation: ${stats.evaluated} evaluated, ${stats.skipped} skipped, ${stats.opportunities} opportunities`, {
        configId,
        platform,
        valuation_stats: stats,
      });
    } catch (valErr) {
      log('warn', `Valuation failed, continuing without scores: ${valErr.message}`, {
        configId,
        platform,
      });
      for (const item of precision.accepted) {
        item._valuation = null;
      }
    }

    // Price tracking: upsert into state store, detect drops, enrich items
    let priceTrackingMeta = null;
    try {
      priceTrackingMeta = await deps.withPriceStateLock(configId, (state) => {
        const upsertResult = deps.upsertListings(state, precision.accepted);
        deps.pruneStale(state, 90);
        enrichWithPriceHistory(precision.accepted, state, deps);
        return upsertResult;
      });

      log('info', `Price tracking: ${priceTrackingMeta.newCount} new, ${priceTrackingMeta.priceChanged} price changes`, {
        configId,
        platform,
        price_new: priceTrackingMeta.newCount,
        price_changed: priceTrackingMeta.priceChanged,
      });
    } catch (ptErr) {
      log('warn', `Price tracking failed, continuing without price insights: ${ptErr.message}`, {
        configId,
        platform,
      });
    }

    // Incremental tracking: annotate NEW / UPDATED / UNCHANGED
    let itemsToPush = precision.accepted;
    let incrementalMeta = null;

    if (flags.incremental) {
      try {
        const scopeKey = `${configId}|${platform}`;
        const result = await deps.applyIncremental(precision.accepted, {
          scopeKey,
          stateFile: 'data/incremental_state.json',
          coverageFull: false,
        });
        incrementalMeta = result.meta;
        itemsToPush = result.items.filter(i => i._status === 'NEW' || i._status === 'UPDATED');

        log('info', `Incremental: ${result.meta.new} new, ${result.meta.updated} updated, ${result.meta.unchanged} unchanged`, {
          configId,
          platform,
          incremental_new: result.meta.new,
          incremental_updated: result.meta.updated,
          incremental_unchanged: result.meta.unchanged,
        });
      } catch (incErr) {
        log('warn', `Incremental tracking failed, falling back to full push: ${incErr.message}`, {
          configId,
          platform,
        });
        itemsToPush = precision.accepted;
      }
    }

    if (itemsToPush.length === 0) {
      log('info', `No new/updated items for ${platform}, skipping push`, { configId, platform });
      runResults.sourcesSucceeded++;
      continue;
    }

    // Push to APP Fastify API
    const effectiveRunStatus = quality.verdict === 'DEGRADED' ? 'DEGRADED' : 'COMPLETED';
    try {
      const { payload } = await publishRun({
        platform,
        runId,
        durationMs,
        rawItems: itemsToPush,
        totalScraped: deduped.length,
        dedupeRemoved,
        runStatus: effectiveRunStatus,
        incrementalMeta,
        extractionQuality: quality,
        priceTrackingMeta,
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
    incremental: flags.incremental,
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
  assessExtractionQuality,
  enrichWithPriceHistory,
  main,
};
