/**
 * Benchmark cache — persistent listing data for valuation comparables.
 *
 * Accumulates cleaned listing data across scrape runs so that benchmarks
 * are built from hundreds of comparables rather than a single batch.
 *
 * One JSON file per config: data/benchmark-cache/<configId>.json
 * Uses fileStateStore for atomic writes and file locking.
 */

const path = require('path');
const { readJson, writeJsonAtomic, withFileLock } = require('../../core/state/fileStateStore');
const { calculatePricePerSqm } = require('./pricePerSqm');
const { canonicalizeAdUrl } = require('../../utils/canonicalizeUrl');
const { BENCHMARK_CACHE_MAX_AGE_DAYS } = require('./constants');

const BENCHMARK_CACHE_DIR = path.resolve(__dirname, '../../../data/benchmark-cache');

function stateFilePath(configId) {
  return path.join(BENCHMARK_CACHE_DIR, `${configId}.json`);
}

function lockFilePath(configId) {
  return path.join(BENCHMARK_CACHE_DIR, `${configId}.lock`);
}

function emptyState() {
  return { version: 1, updated_at: null, listings: {} };
}

function loadBenchmarkCache(configId) {
  return readJson(stateFilePath(configId), emptyState());
}

/**
 * Upsert cleaned items into the benchmark cache.
 * Only stores fields needed for benchmarking (~200 bytes per entry).
 *
 * @param {Object} state - cache state (mutated in place)
 * @param {Object[]} items - cleaned listing items
 * @param {string} [now] - ISO timestamp
 * @returns {{ newCount: number, updatedCount: number }}
 */
function upsertToBenchmarkCache(state, items, now) {
  if (!now) now = new Date().toISOString();
  let newCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    const key = canonicalizeAdUrl(item.url);
    if (!key) continue;

    const ppsm = calculatePricePerSqm(item);
    if (!ppsm.valid) continue;

    const loc = item.location || {};
    const prop = item.property || {};

    const record = {
      url: item.url,
      price: typeof item.price === 'number' ? item.price : null,
      area: ppsm.area_used,
      area_source: ppsm.area_source,
      type: prop.type || null,
      tipology: prop.tipology || null,
      district: loc.district || null,
      municipality: loc.municipality || null,
      parish: loc.parish || null,
      condition: prop.condition || null,
      year: typeof prop.year === 'number' ? prop.year : null,
      floor: prop.floor || null,
      bathrooms: typeof prop.bathrooms === 'number' ? prop.bathrooms : null,
      price_per_sqm: ppsm.price_per_sqm,
      scraped_at: now,
      source: item.source || null,
    };

    if (!state.listings[key]) {
      newCount++;
    } else {
      updatedCount++;
    }

    state.listings[key] = record;
  }

  state.updated_at = now;
  return { newCount, updatedCount };
}

/**
 * Remove entries older than maxAgeDays.
 * @returns {number} count of pruned entries
 */
function pruneStaleBenchmarks(state, maxAgeDays = BENCHMARK_CACHE_MAX_AGE_DAYS) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const [key, entry] of Object.entries(state.listings)) {
    const scrapedAt = new Date(entry.scraped_at).getTime();
    if (scrapedAt < cutoff) {
      delete state.listings[key];
      pruned++;
    }
  }

  return pruned;
}

function saveBenchmarkCache(configId, state) {
  writeJsonAtomic(stateFilePath(configId), state);
}

/**
 * Load-mutate-save cycle under file lock.
 * @param {string} configId
 * @param {Function} fn - receives state, may mutate, returns result
 * @returns {Promise<*>} result of fn
 */
async function withBenchmarkCacheLock(configId, fn) {
  const lock = lockFilePath(configId);
  return withFileLock(lock, async () => {
    const state = loadBenchmarkCache(configId);
    const result = await fn(state);
    saveBenchmarkCache(configId, state);
    return result;
  });
}

/**
 * Convert cache listings map to array format compatible with buildBenchmarks.
 * Each entry gets location/property nested structure that buildBenchmarks expects.
 */
function getCacheListingsAsArray(state) {
  const arr = [];
  for (const record of Object.values(state.listings)) {
    arr.push({
      url: record.url,
      price: record.price,
      source: record.source,
      scraped_at: record.scraped_at,
      location: {
        district: record.district,
        municipality: record.municipality,
        parish: record.parish,
      },
      property: {
        type: record.type,
        tipology: record.tipology,
        area_useful: record.area_source === 'area_useful' ? record.area : null,
        area_total: record.area_source === 'area_total' ? record.area : null,
        condition: record.condition,
        year: record.year,
        floor: record.floor,
        bathrooms: record.bathrooms,
      },
    });
  }
  return arr;
}

module.exports = {
  loadBenchmarkCache,
  upsertToBenchmarkCache,
  pruneStaleBenchmarks,
  saveBenchmarkCache,
  withBenchmarkCacheLock,
  getCacheListingsAsArray,
  emptyState,
  BENCHMARK_CACHE_DIR,
};
