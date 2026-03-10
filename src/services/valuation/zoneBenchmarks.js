/**
 * Zone benchmark aggregation with hierarchical fallback.
 * Groups listings by zone + type + tipology and calculates
 * median, percentiles, and confidence metrics.
 */

const { calculatePricePerSqm } = require('./pricePerSqm');
const { MIN_COMPARABLES, CONFIDENCE_LEVELS } = require('./constants');

/**
 * Calculate median of a sorted array.
 * @param {number[]} sorted
 * @returns {number}
 */
function median(sorted) {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Calculate percentile (0-100) of a sorted array.
 * @param {number[]} sorted
 * @param {number} p - percentile (0-100)
 * @returns {number}
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Remove outliers using IQR method.
 * @param {number[]} values - unsorted array
 * @returns {number[]} filtered values (sorted)
 */
function removeOutliers(values) {
  if (values.length < 4) return [...values].sort((a, b) => a - b);

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return sorted.filter(v => v >= lowerBound && v <= upperBound);
}

/**
 * Get confidence level based on sample size.
 * @param {number} count
 * @returns {'high'|'medium'|'low'|'insufficient'}
 */
function getConfidence(count) {
  if (count >= CONFIDENCE_LEVELS.high) return 'high';
  if (count >= CONFIDENCE_LEVELS.medium) return 'medium';
  if (count >= MIN_COMPARABLES) return 'low';
  return 'insufficient';
}

/**
 * Build a benchmark key from location parts.
 * @param {Object} params
 * @returns {string}
 */
function buildKey({ district, municipality, parish, type, tipology }) {
  return [district, municipality, parish, type, tipology]
    .map(v => (v || '').toLowerCase().trim())
    .join('|');
}

/**
 * Calculate stats for a group of price/sqm values.
 * @param {number[]} values
 * @returns {Object|null}
 */
function calculateStats(values) {
  const filtered = removeOutliers(values);
  if (filtered.length < MIN_COMPARABLES) return null;

  const sum = filtered.reduce((a, b) => a + b, 0);
  return {
    median: Math.round(median(filtered)),
    mean: Math.round(sum / filtered.length),
    p25: Math.round(percentile(filtered, 25)),
    p75: Math.round(percentile(filtered, 75)),
    min: filtered[0],
    max: filtered[filtered.length - 1],
    count: filtered.length,
    count_before_outlier_removal: values.length,
    confidence: getConfidence(filtered.length),
  };
}

/**
 * Build benchmark map from a list of cleaned listings.
 *
 * @param {Object[]} listings - cleaned listing items
 * @param {Object} [options]
 * @param {string} [options.excludeUrl] - URL to exclude (leave-one-out)
 * @returns {Map<string, Object>} - key -> stats
 */
function buildBenchmarks(listings, options = {}) {
  const groups = new Map();
  const excludeUrl = options.excludeUrl || null;

  for (const item of listings) {
    if (excludeUrl && item.url === excludeUrl) continue;

    const ppsm = calculatePricePerSqm(item);
    if (!ppsm.valid) continue;

    const loc = item.location || {};
    const prop = item.property || {};
    const district = loc.district || '';
    const municipality = loc.municipality || '';
    const parish = loc.parish || '';
    const type = prop.type || '';
    const tipology = prop.tipology || '';

    // Add to multiple aggregation levels for fallback
    const keys = [
      buildKey({ district, municipality, parish, type, tipology }),
      buildKey({ district, municipality, parish, type, tipology: '' }),
      buildKey({ district, municipality, parish: '', type, tipology }),
      buildKey({ district, municipality, parish: '', type, tipology: '' }),
      buildKey({ district, municipality: '', parish: '', type, tipology: '' }),
    ];

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(ppsm.price_per_sqm);
    }
  }

  // Calculate stats for each group
  const benchmarks = new Map();
  for (const [key, values] of groups) {
    const stats = calculateStats(values);
    if (stats) {
      benchmarks.set(key, stats);
    }
  }

  return benchmarks;
}

/**
 * Lookup benchmark for a specific property using hierarchical fallback.
 *
 * @param {Object} location - { district, municipality, parish }
 * @param {string} type - property type
 * @param {string} tipology - property tipology (T0, T1, etc.)
 * @param {Map} benchmarkMap - from buildBenchmarks
 * @returns {{ stats: Object|null, level: string, key: string }|null}
 */
function lookupBenchmark(location, type, tipology, benchmarkMap) {
  const loc = location || {};
  const district = loc.district || '';
  const municipality = loc.municipality || '';
  const parish = loc.parish || '';

  const lookups = [
    { key: buildKey({ district, municipality, parish, type, tipology }), level: 'freguesia+tipo+tipologia' },
    { key: buildKey({ district, municipality, parish, type, tipology: '' }), level: 'freguesia+tipo' },
    { key: buildKey({ district, municipality, parish: '', type, tipology }), level: 'concelho+tipo+tipologia' },
    { key: buildKey({ district, municipality, parish: '', type, tipology: '' }), level: 'concelho+tipo' },
    { key: buildKey({ district, municipality: '', parish: '', type, tipology: '' }), level: 'distrito+tipo' },
  ];

  for (const lookup of lookups) {
    const stats = benchmarkMap.get(lookup.key);
    if (stats) {
      return { stats, level: lookup.level, key: lookup.key };
    }
  }

  return null;
}

module.exports = {
  buildBenchmarks,
  lookupBenchmark,
  buildKey,
  // Exported for testing
  median,
  percentile,
  removeOutliers,
  calculateStats,
  getConfidence,
};
