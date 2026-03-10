/**
 * Pure-logic price drop detection — no I/O.
 */

function computeDropMetrics(entry, threshold = 0.15) {
  const { first_seen_price, current_price, price_history, first_seen_at, last_seen_at } = entry;

  if (!first_seen_price || first_seen_price <= 0) return null;
  if (!current_price || current_price <= 0) return null;
  if (!price_history || price_history.length < 2) return null;

  const dropAbsolute = first_seen_price - current_price;
  if (dropAbsolute <= 0) return null;

  const dropPercent = dropAbsolute / first_seen_price;

  const daysSinceFirst = Math.floor(
    (new Date(last_seen_at).getTime() - new Date(first_seen_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    hasDrop: dropPercent >= threshold,
    dropPercent: Math.round(dropPercent * 10000) / 100,
    dropAbsolute,
    firstPrice: first_seen_price,
    currentPrice: current_price,
    daysSinceFirst,
  };
}

function detectDrops(state, threshold = 0.15) {
  const drops = [];

  for (const [canonicalUrl, entry] of Object.entries(state.listings || {})) {
    const metrics = computeDropMetrics(entry, threshold);
    if (!metrics || !metrics.hasDrop) continue;

    // Skip if this drop was already notified at this price level
    if (entry.last_notified_price != null && entry.current_price >= entry.last_notified_price) {
      continue;
    }

    drops.push({
      canonical_url: canonicalUrl,
      entry,
      metrics,
    });

    // Mark as notified so the same drop is not re-emitted next run
    entry.last_notified_price = entry.current_price;
  }

  return drops;
}

module.exports = { detectDrops, computeDropMetrics };
