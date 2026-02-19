/**
 * Incremental detection (NEW / UPDATED / UNCHANGED / REMOVED) without DB.
 *
 * - Keeps the current output shape.
 * - Adds optional fields with "_" prefix on each item:
 *   _status, _first_seen, _last_seen, _changed_fields
 * - Adds meta stats for orchestration (n8n).
 */

const crypto = require('crypto');
const path = require('path');
const { readJson, writeJsonAtomic, withFileLock } = require('../src/core/state/fileStateStore');
const { fingerprint } = require('./deduplicate');

function stableItemKey(item) {
  const source = (item?.source || '').trim();
  const adId = (item?.ad_id || '').trim();
  if (source && adId) return `id:${source}:${adId}`;

  const fp = item?._fingerprint || (item ? fingerprint(item) : null);
  if (source && fp) return `fp:${source}:${fp}`;
  if (fp) return `fp:${fp}`;

  const url = (item?.url || '').trim();
  if (url) return `url:${url}`;

  return null;
}

function summaryForHash(item) {
  return {
    title: item.title || '',
    description: item.description || '',
    price: item.price || '',
    published_date: item.published_date || '',
    updated_date: item.updated_date || '',
    days_online: item.days_online || '',
    location: item.location || {},
    property: item.property || {},
    advertiser: item.advertiser || {},
    photos_count: Array.isArray(item.photos) ? item.photos.length : 0,
    features_count: Array.isArray(item.features) ? item.features.length : 0
  };
}

function hashObject(obj) {
  const s = JSON.stringify(obj);
  return crypto.createHash('sha1').update(s).digest('hex');
}

function changedFields(prevSummary, nextSummary) {
  const changed = [];
  const keys = new Set([...Object.keys(prevSummary || {}), ...Object.keys(nextSummary || {})]);
  for (const k of keys) {
    const a = prevSummary?.[k];
    const b = nextSummary?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed.push(k);
    }
  }
  return changed;
}

/**
 * @param {Array<Object>} items
 * @param {Object} opts
 * @param {string} opts.scopeKey - scope identifier (e.g. `${platform}|${listingUrl}`)
 * @param {string} [opts.stateFile] - relative or absolute path
 * @param {boolean} [opts.coverageFull] - if true, compute REMOVED within scope
 * @returns {Promise<{items: Array, meta: Object}>}
 */
async function applyIncremental(items, opts = {}) {
  const now = new Date().toISOString();
  const scopeKey = opts.scopeKey || 'default';

  const stateFile = path.isAbsolute(opts.stateFile || '')
    ? opts.stateFile
    : path.join(process.cwd(), opts.stateFile || 'data/incremental_state.json');

  const lockFile = `${stateFile}.lock`;

  const defaultState = { version: 1, scopes: {} };

  return await withFileLock(lockFile, async () => {
    const state = readJson(stateFile, defaultState);
    if (!state.scopes) state.scopes = {};

    const scope = state.scopes[scopeKey] || { last_run: null, items: {} };
    if (!scope.items) scope.items = {};

    const seenThisRun = new Set();

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const item of items) {
      const key = stableItemKey(item);
      if (!key) continue;

      seenThisRun.add(key);

      const prev = scope.items[key] || null;
      const nextSummary = summaryForHash(item);
      const nextHash = hashObject(nextSummary);

      let status = 'UNCHANGED';
      let firstSeen = prev?.first_seen || now;
      let changed = [];

      if (!prev) {
        status = 'NEW';
        newCount += 1;
      } else if (prev.content_hash !== nextHash) {
        status = 'UPDATED';
        updatedCount += 1;
        changed = changedFields(prev.summary, nextSummary);
      } else {
        unchangedCount += 1;
      }

      const record = {
        first_seen: firstSeen,
        last_seen: now,
        content_hash: nextHash,
        summary: nextSummary
      };
      scope.items[key] = record;

      // Annotate item (underscore fields are allowed)
      item._status = status;
      item._first_seen = record.first_seen;
      item._last_seen = record.last_seen;
      item._changed_fields = changed;
    }

    let removedKeys = [];
    if (opts.coverageFull === true) {
      removedKeys = Object.keys(scope.items).filter(k => !seenThisRun.has(k));
    }

    scope.last_run = now;
    state.scopes[scopeKey] = scope;

    writeJsonAtomic(stateFile, state);

    return {
      items,
      meta: {
        scope_key: scopeKey,
        state_file: stateFile,
        timestamp: now,
        new: newCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        removed: removedKeys.length,
        removed_keys: removedKeys
      }
    };
  });
}

module.exports = {
  applyIncremental
};

