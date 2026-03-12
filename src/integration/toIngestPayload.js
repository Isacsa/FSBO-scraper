/**
 * Converts scraper output schema to the APP Fastify ingest API contract.
 * Applies dataCleaner first, then maps field names and types.
 *
 * Scraper output schema (strings, empty strings, flat):
 *   { source, ad_id, url, title, description, price: "390", location: { district: "...", ... }, ... }
 *
 * APP ingest contract (native types, nulls, nested):
 *   { external_id, canonical_url, title, price: 390, location: { district, ... }, ... }
 */

const { cleanItem } = require('./dataCleaner');

/**
 * Convert a single raw scraper item to the APP ingest payload format.
 *
 * @param {Object} rawItem - raw scraper output item
 * @param {string} source - portal name (olx, custojusto, casasapo, imovirtual, idealista)
 * @returns {Object} item conforming to POST /api/scraper/ingest items[] schema
 */
function toIngestItem(rawItem, source) {
  const item = cleanItem(rawItem, source);

  return {
    external_id: item.ad_id || null,
    canonical_url: item.url,
    title: item.title || null,
    description: item.description || null,
    price: typeof item.price === 'number' ? item.price : null,
    location: {
      district: item.location?.district || null,
      municipality: item.location?.municipality || null,
      parish: item.location?.parish || null,
      lat: typeof item.location?.lat === 'number' ? item.location.lat : null,
      lng: typeof item.location?.lng === 'number' ? item.location.lng : null,
    },
    property: {
      type: item.property?.type || null,
      tipology: item.property?.tipology || null,
      area_total: typeof item.property?.area_total === 'number' ? item.property.area_total : null,
      area_useful: typeof item.property?.area_useful === 'number' ? item.property.area_useful : null,
      year: typeof item.property?.year === 'number' ? item.property.year : null,
      floor: item.property?.floor || null,
      condition: item.property?.condition || null,
    },
    advertiser: {
      name: item.advertiser?.name || null,
      is_agency: typeof item.advertiser?.is_agency === 'boolean' ? item.advertiser.is_agency : null,
      url: item.advertiser?.url || null,
    },
    photos: Array.isArray(item.photos) ? item.photos.filter(p => typeof p === 'string' && p.length > 0) : [],
    features: Array.isArray(item.features) ? item.features.filter(f => typeof f === 'string' && f.length > 0) : [],
    fsbo_score: typeof item.fsbo_score === 'number'
      ? item.fsbo_score
      : (typeof item.signals?.fsbo_score === 'number' ? item.signals.fsbo_score : null),
    fingerprint: item.fingerprint || item._fingerprint || null,
    signals: item.signals && typeof item.signals === 'object' ? item.signals : null,
    // Incremental tracking metadata (when present)
    ...(item._status ? {
      change_status: item._status,
      first_seen: item._first_seen || null,
      last_seen: item._last_seen || null,
      ...(item._changed_fields?.length ? { changed_fields: item._changed_fields } : {}),
    } : {}),
  };
}

/**
 * Build the full ingest request body for a batch of items from one source.
 *
 * @param {Object} options
 * @param {string} options.runId - UUID v4 for this run
 * @param {string} options.configId - scraper_config UUID
 * @param {string} options.source - portal name
 * @param {string} options.areaQuery - area label (e.g. "Viana do Castelo")
 * @param {Object[]} options.rawItems - raw scraper output items
 * @param {number} options.durationMs - scraping duration in ms
 * @param {number} [options.dedupeRemovedLocal] - items removed by local dedupe
 * @param {number} [options.totalScraped] - original item count before precision gate
 * @param {'COMPLETED'|'PARTIAL'|'FAILED'} [options.runStatus] - source coverage state
 * @param {Object[]} [options.errors] - source-level errors/warnings
 * @returns {Object} full ingest payload for POST /api/scraper/ingest
 */
function buildIngestPayload({
  runId,
  configId,
  source,
  areaQuery,
  rawItems,
  durationMs,
  dedupeRemovedLocal = 0,
  totalScraped = rawItems.length,
  runStatus = 'COMPLETED',
  errors = [],
  incrementalMeta = null,
}) {
  const items = rawItems.map(item => toIngestItem(item, source));

  return {
    run_id: runId,
    config_id: configId,
    source,
    area_query: areaQuery || null,
    scraped_at: new Date().toISOString(),
    duration_ms: durationMs,
    run_status: runStatus,
    items,
    ...(errors.length > 0 ? { errors } : {}),
    meta: {
      total_scraped: totalScraped,
      dedupe_removed_local: dedupeRemovedLocal,
      scraper_version: require('../../package.json').version,
      ...(incrementalMeta ? {
        incremental: {
          new: incrementalMeta.new,
          updated: incrementalMeta.updated,
          unchanged: incrementalMeta.unchanged,
        },
      } : {}),
    },
  };
}

module.exports = { toIngestItem, buildIngestPayload };
