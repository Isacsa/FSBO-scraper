/**
 * Zone benchmark aggregation with hierarchical fallback.
 * Groups listings by zone + type + tipology and calculates
 * median, percentiles, and confidence metrics.
 */

const { calculatePricePerSqm } = require('./pricePerSqm');
const { MIN_COMPARABLES, CONFIDENCE_LEVELS, AREA_BANDS, TEMPORAL_DECAY_DAYS } = require('./constants');

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
 * Get area band label for a given area in m².
 * @param {number} area
 * @returns {string} band label (xs, s, m, l, xl)
 */
function getAreaBand(area) {
  if (typeof area !== 'number' || area <= 0) return '';
  for (const band of AREA_BANDS) {
    if (area <= band.max) return band.label;
  }
  return '';
}

/**
 * Compute weighted median where weight = 1 / (1 + daysSince / TEMPORAL_DECAY_DAYS).
 * Falls back to simple median when entries lack scraped_at.
 *
 * @param {Array<{value: number, scraped_at?: string}>} entries - sorted by value
 * @param {number} [now] - timestamp in ms
 * @returns {number}
 */
function weightedMedian(entries, now) {
  if (entries.length === 0) return 0;
  if (entries.length === 1) return entries[0].value;

  const hasTimestamps = entries.some(e => e.scraped_at);
  if (!hasTimestamps || !now) {
    // Simple median fallback
    const mid = Math.floor(entries.length / 2);
    return entries.length % 2 === 0
      ? (entries[mid - 1].value + entries[mid].value) / 2
      : entries[mid].value;
  }

  let totalWeight = 0;
  const weighted = entries.map(e => {
    const scrapedMs = e.scraped_at ? new Date(e.scraped_at).getTime() : now;
    const daysSince = Math.max(0, (now - scrapedMs) / (1000 * 60 * 60 * 24));
    const w = 1 / (1 + daysSince / TEMPORAL_DECAY_DAYS);
    totalWeight += w;
    return { value: e.value, weight: w };
  });

  const halfWeight = totalWeight / 2;
  let cumWeight = 0;
  for (let i = 0; i < weighted.length; i++) {
    cumWeight += weighted[i].weight;
    if (cumWeight >= halfWeight) {
      return weighted[i].value;
    }
  }
  return weighted[weighted.length - 1].value;
}

/**
 * Get confidence level based on sample size.
 * @param {number} count
 * @returns {'high'|'medium'|'low'|'marginal'|'insufficient'}
 */
function getConfidence(count) {
  if (count >= CONFIDENCE_LEVELS.high) return 'high';
  if (count >= CONFIDENCE_LEVELS.medium) return 'medium';
  if (count >= CONFIDENCE_LEVELS.low) return 'low';
  if (count >= CONFIDENCE_LEVELS.marginal) return 'marginal';
  return 'insufficient';
}

/**
 * Build a benchmark key from location parts.
 * @param {Object} params
 * @returns {string}
 */
function buildKey({ district, municipality, parish, type, tipology, areaBand }) {
  return [district, municipality, parish, type, tipology, areaBand]
    .map(v => (v || '').toLowerCase().trim())
    .join('|');
}

/**
 * Calculate stats for a group of price/sqm entries.
 * Accepts either plain numbers or enriched entries with scraped_at.
 *
 * @param {Array<number|{value: number, scraped_at?: string}>} entries
 * @param {number} [now] - timestamp in ms for temporal weighting
 * @returns {Object|null}
 */
function calculateStats(entries, now) {
  // Normalize: support both plain numbers and enriched entries
  const enriched = entries.map(e =>
    typeof e === 'number' ? { value: e, scraped_at: null } : e
  );
  const values = enriched.map(e => e.value);

  // Outlier removal on raw values (unweighted)
  const filteredValues = removeOutliers(values);
  if (filteredValues.length < MIN_COMPARABLES) return null;

  // Rebuild enriched entries matching filtered values
  const filteredSet = new Set();
  const filteredSorted = [...filteredValues];
  const filteredEntries = [];
  for (const e of enriched) {
    if (filteredValues.includes(e.value) && !filteredSet.has(e)) {
      filteredEntries.push(e);
      filteredSet.add(e);
    }
  }
  // Sort by value for median/percentile
  filteredEntries.sort((a, b) => a.value - b.value);

  const sum = filteredEntries.reduce((a, e) => a + e.value, 0);
  const vals = filteredEntries.map(e => e.value);

  // Compute area range from entries if they carry area info
  let areaMin = null;
  let areaMax = null;
  let oldestScrapedAt = null;
  let newestScrapedAt = null;
  for (const e of filteredEntries) {
    if (e.area && typeof e.area === 'number') {
      if (areaMin === null || e.area < areaMin) areaMin = e.area;
      if (areaMax === null || e.area > areaMax) areaMax = e.area;
    }
    if (e.scraped_at) {
      if (!oldestScrapedAt || e.scraped_at < oldestScrapedAt) oldestScrapedAt = e.scraped_at;
      if (!newestScrapedAt || e.scraped_at > newestScrapedAt) newestScrapedAt = e.scraped_at;
    }
  }

  return {
    median: Math.round(weightedMedian(filteredEntries, now)),
    mean: Math.round(sum / filteredEntries.length),
    p25: Math.round(percentile(vals, 25)),
    p75: Math.round(percentile(vals, 75)),
    min: vals[0],
    max: vals[vals.length - 1],
    count: filteredEntries.length,
    count_before_outlier_removal: entries.length,
    confidence: getConfidence(filteredEntries.length),
    area_range: areaMin !== null ? { min: areaMin, max: areaMax } : null,
    date_range: oldestScrapedAt ? { oldest: oldestScrapedAt, newest: newestScrapedAt } : null,
  };
}

/**
 * Build benchmark map from a list of cleaned listings.
 *
 * @param {Object[]} listings - cleaned listing items
 * @param {Object} [options]
 * @param {string} [options.excludeUrl] - URL to exclude (leave-one-out)
 * @param {number} [options.now] - timestamp in ms for temporal weighting
 * @returns {Map<string, Object>} - key -> stats
 */
function buildBenchmarks(listings, options = {}) {
  const groups = new Map();
  const excludeUrl = options.excludeUrl || null;
  const now = options.now || Date.now();

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
    const areaBand = getAreaBand(ppsm.area_used);

    const entry = {
      value: ppsm.price_per_sqm,
      scraped_at: item.scraped_at || null,
      area: ppsm.area_used,
    };

    // 8-level fallback hierarchy with area bands
    const keys = [
      buildKey({ district, municipality, parish, type, tipology, areaBand }),     // 1. most specific
      buildKey({ district, municipality, parish, type, tipology, areaBand: '' }), // 2. drop area band
      buildKey({ district, municipality, parish, type, tipology: '', areaBand }), // 3. drop tipology, keep area
      buildKey({ district, municipality, parish: '', type, tipology, areaBand }), // 4. municipality + all
      buildKey({ district, municipality, parish: '', type, tipology, areaBand: '' }), // 5. municipality + type + tipology
      buildKey({ district, municipality, parish: '', type, tipology: '', areaBand }), // 6. municipality + type + area
      buildKey({ district, municipality, parish: '', type, tipology: '', areaBand: '' }), // 7. municipality + type
      buildKey({ district, municipality: '', parish: '', type, tipology: '', areaBand: '' }), // 8. district + type
    ];

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
  }

  // Calculate stats for each group
  const benchmarks = new Map();
  for (const [key, entries] of groups) {
    const stats = calculateStats(entries, now);
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
 * @param {Object} [options]
 * @param {number} [options.area] - property area in m² for area band matching
 * @returns {{ stats: Object|null, level: string, key: string, fallback_used: boolean }|null}
 */
function lookupBenchmark(location, type, tipology, benchmarkMap, options = {}) {
  const loc = location || {};
  const district = loc.district || '';
  const municipality = loc.municipality || '';
  const parish = loc.parish || '';
  const areaBand = options.area ? getAreaBand(options.area) : '';

  const allLookups = [
    { key: buildKey({ district, municipality, parish, type, tipology, areaBand }), level: 'freguesia+tipo+tipologia+area', needsArea: true },
    { key: buildKey({ district, municipality, parish, type, tipology, areaBand: '' }), level: 'freguesia+tipo+tipologia', needsArea: false },
    { key: buildKey({ district, municipality, parish, type, tipology: '', areaBand }), level: 'freguesia+tipo+area', needsArea: true },
    { key: buildKey({ district, municipality, parish: '', type, tipology, areaBand }), level: 'concelho+tipo+tipologia+area', needsArea: true },
    { key: buildKey({ district, municipality, parish: '', type, tipology, areaBand: '' }), level: 'concelho+tipo+tipologia', needsArea: false },
    { key: buildKey({ district, municipality, parish: '', type, tipology: '', areaBand }), level: 'concelho+tipo+area', needsArea: true },
    { key: buildKey({ district, municipality, parish: '', type, tipology: '', areaBand: '' }), level: 'concelho+tipo', needsArea: false },
    { key: buildKey({ district, municipality: '', parish: '', type, tipology: '', areaBand: '' }), level: 'distrito+tipo', needsArea: false },
  ];

  // Skip area-based levels when no area was provided
  const lookups = areaBand ? allLookups : allLookups.filter(l => !l.needsArea);
  const bestLevel = lookups[0].level;
  for (const lookup of lookups) {
    const stats = benchmarkMap.get(lookup.key);
    if (stats) {
      return {
        stats,
        level: lookup.level,
        key: lookup.key,
        fallback_used: lookup.level !== bestLevel,
      };
    }
  }

  return null;
}

module.exports = {
  buildBenchmarks,
  lookupBenchmark,
  buildKey,
  getAreaBand,
  // Exported for testing
  median,
  percentile,
  removeOutliers,
  calculateStats,
  getConfidence,
  weightedMedian,
};
