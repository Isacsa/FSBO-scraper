/**
 * Valuation module public API.
 *
 * Usage:
 *   const { analyzeBatch, analyzeProperty } = require('./src/services/valuation');
 *   const results = analyzeBatch(cleanedListings);
 */

const { calculatePricePerSqm } = require('./pricePerSqm');
const { buildBenchmarks, lookupBenchmark, getAreaBand } = require('./zoneBenchmarks');
const { applyAdjustments, calculateAdjustments } = require('./adjustmentFactors');
const { calculateOpportunityScore } = require('./opportunityScore');
const { generateReport } = require('./reportGenerator');
const {
  withBenchmarkCacheLock,
  upsertToBenchmarkCache,
  pruneStaleBenchmarks,
  getCacheListingsAsArray,
} = require('./benchmarkCache');

/**
 * Analyze a single property against an existing benchmark map.
 *
 * @param {Object} item - cleaned listing item
 * @param {Map} benchmarkMap - from buildBenchmarks
 * @param {Object[]} [allListings] - for leave-one-out (optional)
 * @returns {Object} valuation report
 */
function analyzeProperty(item, benchmarkMap, allListings = null) {
  return generateReport(item, benchmarkMap, allListings);
}

/**
 * Analyze a batch of listings: build benchmarks from the batch itself,
 * then evaluate every item.
 *
 * @param {Object[]} items - cleaned listing items
 * @returns {{ reports: Object[], stats: Object }}
 */
function analyzeBatch(items) {
  const benchmarkMap = buildBenchmarks(items);

  const reports = [];
  let evaluated = 0;
  let skipped = 0;
  let opportunities = 0;

  for (const item of items) {
    const report = generateReport(item, benchmarkMap, items);
    reports.push(report);

    if (report.evaluable) {
      evaluated++;
      if (report.summary.score >= 6) opportunities++;
    } else {
      skipped++;
    }
  }

  // Sort by score descending (evaluable first)
  reports.sort((a, b) => {
    if (a.evaluable && !b.evaluable) return -1;
    if (!a.evaluable && b.evaluable) return 1;
    if (a.evaluable && b.evaluable) return (b.summary.score || 0) - (a.summary.score || 0);
    return 0;
  });

  return {
    reports,
    stats: {
      total: items.length,
      evaluated,
      skipped,
      opportunities,
      benchmark_zones: benchmarkMap.size,
    },
  };
}

/**
 * Analyze a batch with extra diagnostics: group counts, fallback levels,
 * score distribution, and warnings.
 *
 * @param {Object[]} items - cleaned listing items
 * @returns {{ reports: Object[], stats: Object, diagnostics: Object }}
 */
function analyzeBatchWithDiagnostics(items) {
  const { calculatePricePerSqm: calcPpsm } = require('./pricePerSqm');
  const result = analyzeBatch(items);

  // Group counts: zone+type+tipology
  const groupCounts = new Map();
  for (const item of items) {
    const loc = item.location || {};
    const prop = item.property || {};
    const ppsm = calcPpsm(item);
    if (!ppsm.valid) continue;
    const key = [loc.district, loc.municipality, loc.parish, prop.type, prop.tipology]
      .map(v => (v || '').toLowerCase().trim())
      .filter(Boolean)
      .join(' > ');
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  }

  // Fallback level distribution
  const fallbackLevels = {};
  const scoreDistribution = { '1-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
  const confidenceCounts = { high: 0, medium: 0, low: 0, insufficient: 0 };

  for (const r of result.reports) {
    if (!r.evaluable) continue;
    const level = r.benchmark_level || 'unknown';
    fallbackLevels[level] = (fallbackLevels[level] || 0) + 1;

    const s = r.summary.score;
    if (s >= 9) scoreDistribution['9-10']++;
    else if (s >= 7) scoreDistribution['7-8']++;
    else if (s >= 5) scoreDistribution['5-6']++;
    else if (s >= 3) scoreDistribution['3-4']++;
    else scoreDistribution['1-2']++;

    const conf = r.confidence || 'insufficient';
    confidenceCounts[conf] = (confidenceCounts[conf] || 0) + 1;
  }

  // Warnings
  const warnings = [];
  const lowConfCount = confidenceCounts.low + confidenceCounts.insufficient;
  if (lowConfCount > 0) {
    warnings.push(`${lowConfCount} items avaliados com confianca low/insufficient`);
  }
  const nonEvalCount = result.reports.filter(r => !r.evaluable).length;
  if (nonEvalCount > 0) {
    const reasons = {};
    for (const r of result.reports) {
      if (!r.evaluable && r.reason) {
        reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      }
    }
    warnings.push(`${nonEvalCount} items sem benchmark: ${JSON.stringify(reasons)}`);
  }

  // Small groups warning
  for (const [group, count] of groupCounts) {
    if (count < 5) {
      warnings.push(`Grupo "${group}" tem apenas ${count} items (min: 5)`);
    }
  }

  result.diagnostics = {
    group_counts: Object.fromEntries([...groupCounts].sort((a, b) => b[1] - a[1])),
    fallback_levels: fallbackLevels,
    score_distribution: scoreDistribution,
    confidence_counts: confidenceCounts,
    warnings,
  };

  return result;
}

/**
 * Analyze a batch with persistent benchmark cache.
 * Accumulates comparables across runs for better benchmark quality.
 *
 * @param {string} configId - config UUID for cache file
 * @param {Object[]} items - cleaned listing items from current batch
 * @param {Object} [deps] - overridable dependencies for testing
 * @returns {Promise<{ reports: Object[], stats: Object }>}
 */
async function analyzeBatchWithCache(configId, items, deps = {}) {
  const lockFn = deps.withBenchmarkCacheLock || withBenchmarkCacheLock;
  const upsertFn = deps.upsertToBenchmarkCache || upsertToBenchmarkCache;
  const pruneFn = deps.pruneStaleBenchmarks || pruneStaleBenchmarks;
  const getCacheFn = deps.getCacheListingsAsArray || getCacheListingsAsArray;

  const now = Date.now();

  const { reports, stats, cacheMeta } = await lockFn(configId, async (state) => {
    // Upsert current batch into cache
    const upsertResult = upsertFn(state, items);
    const pruned = pruneFn(state);

    // Build combined listing pool: cache + current batch
    const cachedListings = getCacheFn(state);
    const cacheSize = cachedListings.length;

    // Build benchmarks from the full cache (includes current batch)
    const benchmarkMap = buildBenchmarks(cachedListings, { now });

    // Generate reports only for current batch items
    const reports = [];
    let evaluated = 0;
    let skipped = 0;
    let opportunities = 0;

    for (const item of items) {
      const report = generateReport(item, benchmarkMap, null);
      reports.push(report);

      if (report.evaluable) {
        evaluated++;
        if (report.summary.score >= 6) opportunities++;
      } else {
        skipped++;
      }
    }

    // Sort by score descending (evaluable first)
    reports.sort((a, b) => {
      if (a.evaluable && !b.evaluable) return -1;
      if (!a.evaluable && b.evaluable) return 1;
      if (a.evaluable && b.evaluable) return (b.summary.score || 0) - (a.summary.score || 0);
      return 0;
    });

    return {
      reports,
      stats: {
        total: items.length,
        evaluated,
        skipped,
        opportunities,
        benchmark_zones: benchmarkMap.size,
      },
      cacheMeta: {
        cacheSize,
        newInCache: upsertResult.newCount,
        updatedInCache: upsertResult.updatedCount,
        pruned,
      },
    };
  });

  stats.cache = cacheMeta;
  return { reports, stats };
}

module.exports = {
  analyzeProperty,
  analyzeBatch,
  analyzeBatchWithCache,
  analyzeBatchWithDiagnostics,
  buildBenchmarks,
  lookupBenchmark,
  getAreaBand,
  calculatePricePerSqm,
  calculateOpportunityScore,
  applyAdjustments,
  calculateAdjustments,
  generateReport,
};
