#!/usr/bin/env node

/**
 * Buyer search scraper: on-demand scraping with portal-specific filtered URLs.
 *
 * Polls the APP for pending buyer search jobs, generates filtered URLs
 * for each portal based on buyer criteria, scrapes them, and pushes
 * results back to the APP associated with the buyer profile.
 *
 * Usage:
 *   node scripts/buyer-search-scraper.js                    # poll + scrape pending jobs
 *   node scripts/buyer-search-scraper.js --run-now          # ignore cooldown
 *   node scripts/buyer-search-scraper.js --dry-run          # no push to API
 *   node scripts/buyer-search-scraper.js --job-id=<uuid>    # single job
 *
 * Environment:
 *   APP_API_URL       - Fastify API base URL (required)
 *   SCRAPER_API_KEY   - API key for authentication (required)
 *   SCRAPER_TENANT_ID - tenant UUID (required)
 *   BUYER_SEARCH_COOLDOWN_HOURS - min hours between re-scrapes (default 12)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const crypto = require('crypto');

const { pullBuyerSearchJobs } = require('../src/buyer-search/pullBuyerSearchJobs');
const { buildSearchUrls } = require('../src/buyer-search/urlBuilder');
const { buildIngestPayload } = require('../src/integration/toIngestPayload');
const { pushBatch } = require('../src/integration/pushBatch');
const { runPlatform } = require('../src/core/runPlatform');
const { cleanItem } = require('../src/integration/dataCleaner');
const { dedupeListInMemory } = require('../pipeline/deduplicate');
const { filterSalesOnly } = require('../src/price-tracker/salesFilter');

const SCRAPE_OPTIONS = {
  maxPages: 5,
  maxAds: 50,
  headless: true,
  filterAgencies: false,
  filterPrivateOnly: false,
};

const DEFAULT_COOLDOWN_HOURS = 12;

const defaultDeps = {
  pullBuyerSearchJobs,
  buildSearchUrls,
  buildIngestPayload,
  pushBatch,
  runPlatform,
  cleanItem,
  dedupeListInMemory,
  filterSalesOnly,
  randomUUID: () => crypto.randomUUID(),
};

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    runNow: argv.includes('--run-now'),
    dryRun: argv.includes('--dry-run'),
    jobId: (() => {
      const flag = argv.find(a => a.startsWith('--job-id='));
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

function getCooldownMs(env = process.env) {
  const hours = parseFloat(env.BUYER_SEARCH_COOLDOWN_HOURS) || DEFAULT_COOLDOWN_HOURS;
  return hours * 60 * 60 * 1000;
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

function shouldRunJob(job, { runNow = false, cooldownMs = DEFAULT_COOLDOWN_HOURS * 3600000, now = Date.now() } = {}) {
  if (runNow) return true;
  if (!job.lastScrapedAt) return true;

  const lastScraped = new Date(job.lastScrapedAt);
  const elapsed = now - lastScraped.getTime();
  return elapsed >= cooldownMs;
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

async function scrapeSource(platform, url, deps, log) {
  const startMs = Date.now();
  try {
    const raw = await deps.runPlatform({
      platform,
      url,
      options: { ...SCRAPE_OPTIONS },
      outputShape: 'cli',
      normalize: true,
    });

    const items = raw.results || [];
    const durationMs = Date.now() - startMs;
    return { items, durationMs, error: null };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    log('error', `[buyer-search] Scraper failed for ${platform}`, { platform, error: err.message });
    return { items: [], durationMs, error: err.message || String(err) };
  }
}

async function processJob(job, connOpts, runtime = {}) {
  const {
    deps = defaultDeps,
    flags = { dryRun: false },
    log = createLogger(),
    stdout = process.stdout,
  } = runtime;

  const jobId = job.id;
  const criteria = job.criteria || {};

  log('info', `[buyer-search] Processing job`, {
    jobId,
    criteria: {
      municipalities: criteria.municipalities,
      tipologies: criteria.tipologies,
      priceMax: criteria.priceMax,
      propertyTypes: criteria.propertyTypes,
    },
  });

  // Generate filtered URLs for all portals
  const searchUrls = deps.buildSearchUrls(criteria);

  if (searchUrls.length === 0) {
    log('warn', `[buyer-search] No URLs generated for job`, { jobId });
    return { jobId, sourcesAttempted: 0, sourcesSucceeded: 0, totalItems: 0, errors: [] };
  }

  log('info', `[buyer-search] Generated ${searchUrls.length} URLs`, {
    jobId,
    urls: searchUrls.map(u => ({ platform: u.platform, url: u.url })),
  });

  const result = {
    jobId,
    sourcesAttempted: 0,
    sourcesSucceeded: 0,
    totalItems: 0,
    errors: [],
  };

  // Group URLs by platform for batched push
  const byPlatform = {};
  for (const entry of searchUrls) {
    if (!byPlatform[entry.platform]) byPlatform[entry.platform] = [];
    byPlatform[entry.platform].push(entry);
  }

  for (const [platform, entries] of Object.entries(byPlatform)) {
    // Scrape all URLs for this platform, merge results
    let allPlatformItems = [];
    let totalDurationMs = 0;

    for (const entry of entries) {
      result.sourcesAttempted++;

      log('info', `[buyer-search] Scraping ${platform}: ${entry.url}`, { jobId, platform });

      const { items, durationMs, error } = await scrapeSource(platform, entry.url, deps, log);
      totalDurationMs += durationMs;

      if (error) {
        result.errors.push({ source: platform, error_type: 'scrape_failed', message: error });
        continue;
      }

      if (items.length > 0) {
        allPlatformItems.push(...items);
      }
    }

    if (allPlatformItems.length === 0) {
      log('warn', `[buyer-search] No items from ${platform}`, { jobId, platform });
      continue;
    }

    // Clean
    const cleaned = allPlatformItems.map(i => deps.cleanItem(i, platform));

    // Dedupe within platform
    const { unique: deduped, duplicates } = deps.dedupeListInMemory(cleaned);
    const dedupeRemoved = duplicates ? duplicates.length : 0;

    // Sales filter
    const salesOnly = deps.filterSalesOnly(deduped, platform);

    log('info', `[buyer-search] ${platform}: ${allPlatformItems.length} scraped, ${deduped.length} deduped, ${salesOnly.length} sales`, {
      jobId, platform,
    });

    if (salesOnly.length === 0) continue;

    // Quality assessment
    const quality = assessExtractionQuality(salesOnly);
    const effectiveRunStatus = quality.verdict === 'DEGRADED' ? 'DEGRADED' : 'COMPLETED';

    // Build payload
    const runId = deps.randomUUID();
    const payload = deps.buildIngestPayload({
      runId,
      configId: null,
      source: platform,
      areaQuery: criteria.municipalities?.join(', ') || null,
      rawItems: salesOnly,
      durationMs: totalDurationMs,
      dedupeRemovedLocal: dedupeRemoved,
      totalScraped: deduped.length,
      runStatus: effectiveRunStatus,
      extractionQuality: quality,
      buyerProfileId: jobId,
    });

    payload.scrape_mode = 'buyer_search';

    if (flags.dryRun) {
      log('info', `[buyer-search] [DRY RUN] Would push ${payload.items.length} items for ${platform}`, { jobId, platform });
      stdout.write(JSON.stringify(payload, null, 2) + '\n');
    } else {
      try {
        await deps.pushBatch(payload, {
          apiUrl: connOpts.apiUrl,
          apiKey: connOpts.apiKey,
          tenantId: connOpts.tenantId,
          logger: (msg) => log('warn', msg),
        });
        log('info', `[buyer-search] Pushed ${payload.items.length} items for ${platform}`, { jobId, platform });
      } catch (pushErr) {
        log('error', `[buyer-search] Failed to push ${platform}`, {
          jobId, platform, error: pushErr.message,
        });
        result.errors.push({ source: platform, error_type: 'push_failed', message: pushErr.message });
        continue;
      }
    }

    result.sourcesSucceeded++;
    result.totalItems += payload.items.length;
  }

  return result;
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
  const cooldownMs = getCooldownMs(env);

  // Validate environment
  if (!connOpts.apiUrl) {
    log('error', '[buyer-search] APP_API_URL environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.apiKey) {
    log('error', '[buyer-search] SCRAPER_API_KEY environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }
  if (!connOpts.tenantId) {
    log('error', '[buyer-search] SCRAPER_TENANT_ID environment variable is required');
    exit(1);
    return { exitCode: 1 };
  }

  log('info', '[buyer-search] Starting buyer search scraper', {
    runNow: flags.runNow,
    dryRun: flags.dryRun,
    jobId: flags.jobId,
    cooldownHours: cooldownMs / 3600000,
  });

  // Pull jobs
  let jobs;
  try {
    jobs = await deps.pullBuyerSearchJobs(connOpts);
    log('info', `[buyer-search] Fetched ${jobs.length} jobs`);
  } catch (err) {
    log('error', `[buyer-search] Failed to pull jobs: ${err.message}`);
    exit(1);
    return { exitCode: 1 };
  }

  // Filter by job ID if specified
  if (flags.jobId) {
    jobs = jobs.filter(j => j.id === flags.jobId);
    if (jobs.length === 0) {
      log('error', `[buyer-search] Job ${flags.jobId} not found`);
      exit(1);
      return { exitCode: 1 };
    }
  }

  // Cooldown filtering
  const toRun = jobs.filter(job =>
    shouldRunJob(job, { runNow: flags.runNow, cooldownMs, now })
  );
  const skipped = jobs.length - toRun.length;

  if (skipped > 0) {
    log('info', `[buyer-search] Skipping ${skipped} jobs (cooldown not reached)`);
  }

  if (toRun.length === 0) {
    log('info', '[buyer-search] No jobs to run. Exiting.');
    return {
      exitCode: 0,
      summary: { jobsProcessed: 0, jobsSkipped: skipped, totalItems: 0, totalErrors: 0 },
    };
  }

  // Process jobs
  const allResults = [];
  for (const job of toRun) {
    try {
      const result = await processJob(job, connOpts, { deps, flags, log, stdout });
      allResults.push(result);
    } catch (err) {
      log('error', `[buyer-search] Job ${job.id} failed`, { jobId: job.id, error: err.message });
      allResults.push({
        jobId: job.id,
        sourcesAttempted: 0,
        sourcesSucceeded: 0,
        totalItems: 0,
        errors: [{ source: 'orchestrator', error_type: 'unexpected', message: err.message }],
      });
    }
  }

  // Summary
  const summary = {
    jobsProcessed: toRun.length,
    jobsSkipped: skipped,
    sourcesAttempted: allResults.reduce((s, r) => s + r.sourcesAttempted, 0),
    sourcesSucceeded: allResults.reduce((s, r) => s + r.sourcesSucceeded, 0),
    totalItems: allResults.reduce((s, r) => s + r.totalItems, 0),
    totalErrors: allResults.reduce((s, r) => s + r.errors.length, 0),
  };

  log('info', '[buyer-search] Complete', { event: 'buyer_search_complete', ...summary, dryRun: flags.dryRun });

  if (summary.totalErrors > 0) {
    exit(2);
    return { exitCode: 2, summary, results: allResults };
  }

  return { exitCode: 0, summary, results: allResults };
}

if (require.main === module) {
  main().catch(err => {
    const log = createLogger(process.stderr);
    log('error', `[buyer-search] Fatal error: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

module.exports = {
  createLogger,
  parseCliArgs,
  shouldRunJob,
  scrapeSource,
  processJob,
  assessExtractionQuality,
  main,
  DEFAULT_COOLDOWN_HOURS,
};
