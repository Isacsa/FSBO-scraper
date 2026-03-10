/**
 * Price history persistence — one JSON file per config in data/price-history/.
 *
 * Uses fileStateStore for atomic writes and file locking.
 */

const path = require('path');
const { readJson, writeJsonAtomic, withFileLock } = require('../core/state/fileStateStore');
const { canonicalizeAdUrl } = require('../utils/canonicalizeUrl');

const PRICE_HISTORY_DIR = path.resolve(__dirname, '../../data/price-history');
const MAX_HISTORY_ENTRIES = 20;
const DEFAULT_STALE_DAYS = 90;

function stateFilePath(configId) {
  return path.join(PRICE_HISTORY_DIR, `${configId}.json`);
}

function lockFilePath(configId) {
  return path.join(PRICE_HISTORY_DIR, `${configId}.lock`);
}

function emptyState() {
  return { version: 1, updated_at: null, listings: {} };
}

function parsePrice(priceStr) {
  if (typeof priceStr === 'number') return priceStr > 0 ? priceStr : null;
  if (!priceStr || typeof priceStr !== 'string') return null;

  // Handle Portuguese decimal format: "1.500,50" → strip dots, replace comma with dot
  let cleaned = priceStr.replace(/\./g, '');   // strip thousand separators (dots)
  cleaned = cleaned.replace(',', '.');          // decimal comma → decimal dot
  cleaned = cleaned.replace(/[^\d.]/g, '');     // strip non-numeric except decimal dot

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num);                       // round to nearest euro
}

function loadPriceState(configId) {
  const filePath = stateFilePath(configId);
  return readJson(filePath, emptyState());
}

function upsertListings(state, items, now) {
  if (!now) now = new Date().toISOString();
  let newCount = 0;
  let priceChanged = 0;
  const updated = [];

  for (const item of items) {
    const key = canonicalizeAdUrl(item.url);
    if (!key) continue;

    const price = parsePrice(item.price);
    if (price === null || price === 0) continue;

    const existing = state.listings[key];

    if (!existing) {
      state.listings[key] = {
        external_id: item.ad_id || item.external_id || null,
        source: item.source || null,
        title: item.title || null,
        first_seen_at: now,
        first_seen_price: price,
        last_seen_at: now,
        current_price: price,
        price_history: [{ price, seen_at: now }],
        location: item.location || {},
        property: item.property || {},
        advertiser: item.advertiser || {},
      };
      newCount++;
      updated.push(key);
    } else {
      existing.last_seen_at = now;

      if (item.title) existing.title = item.title;
      if (item.location) existing.location = item.location;
      if (item.property) existing.property = item.property;
      if (item.advertiser) existing.advertiser = item.advertiser;
      if (item.ad_id || item.external_id) existing.external_id = item.ad_id || item.external_id;
      if (item.source) existing.source = item.source;

      if (price !== existing.current_price) {
        existing.current_price = price;
        existing.price_history.push({ price, seen_at: now });

        if (existing.price_history.length > MAX_HISTORY_ENTRIES) {
          existing.price_history = existing.price_history.slice(-MAX_HISTORY_ENTRIES);
        }

        priceChanged++;
        updated.push(key);
      }
    }
  }

  state.updated_at = now;
  return { updated, newCount, priceChanged };
}

async function savePriceState(configId, state) {
  const filePath = stateFilePath(configId);
  writeJsonAtomic(filePath, state);
}

/**
 * Execute the full load→fn→save cycle under a single file lock.
 * `fn(state)` receives the loaded state, may mutate it, and should return its result.
 * The state is saved automatically after `fn` completes.
 */
async function withPriceStateLock(configId, fn) {
  const lock = lockFilePath(configId);
  return withFileLock(lock, async () => {
    const state = loadPriceState(configId);
    const result = await fn(state);
    savePriceState(configId, state);
    return result;
  });
}

function pruneStale(state, maxAgeDays = DEFAULT_STALE_DAYS) {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let prunedCount = 0;

  for (const [key, entry] of Object.entries(state.listings)) {
    const lastSeen = new Date(entry.last_seen_at).getTime();
    if (lastSeen < cutoff) {
      delete state.listings[key];
      prunedCount++;
    }
  }

  return prunedCount;
}

module.exports = {
  loadPriceState,
  upsertListings,
  savePriceState,
  pruneStale,
  parsePrice,
  emptyState,
  withPriceStateLock,
  PRICE_HISTORY_DIR,
  MAX_HISTORY_ENTRIES,
};
