/**
 * Pure-logic price drop detection — no I/O.
 *
 * Two detection modes:
 *  - cumulative: (first_seen_price - current_price) / first_seen_price >= threshold
 *  - step:       (prev_observation - current_price) / prev_observation >= stepThreshold
 *
 * A drop is flagged when either condition is met.
 */

function computeDropMetrics(entry, threshold = 0.15, stepThreshold = 0.03) {
  const { first_seen_price, current_price, price_history, first_seen_at, last_seen_at } = entry;

  if (!first_seen_price || first_seen_price <= 0) return null;
  if (!current_price || current_price <= 0) return null;
  if (!price_history || price_history.length < 2) return null;

  // Cumulative drop: first ever price → current price
  const dropAbsolute = first_seen_price - current_price;
  const dropPercent = dropAbsolute > 0 ? dropAbsolute / first_seen_price : 0;
  const hasCumulativeDrop = dropPercent >= threshold;

  // Step drop: previous observation → current price
  const prevEntry = price_history[price_history.length - 2];
  const prevPrice = prevEntry ? prevEntry.price : null;
  let stepDropAbsolute = 0;
  let stepDropPercent = 0;
  let hasStepDrop = false;

  if (prevPrice && prevPrice > 0 && prevPrice > current_price) {
    stepDropAbsolute = prevPrice - current_price;
    stepDropPercent = stepDropAbsolute / prevPrice;
    hasStepDrop = stepDropPercent >= stepThreshold;
  }

  if (!hasCumulativeDrop && !hasStepDrop) return null;

  const daysSinceFirst = Math.floor(
    (new Date(last_seen_at).getTime() - new Date(first_seen_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  let dropType;
  if (hasCumulativeDrop && hasStepDrop) dropType = 'both';
  else if (hasCumulativeDrop) dropType = 'cumulative';
  else dropType = 'step';

  return {
    hasDrop: true,
    dropPercent: Math.round(dropPercent * 10000) / 100,
    dropAbsolute: Math.max(0, dropAbsolute),
    firstPrice: first_seen_price,
    currentPrice: current_price,
    daysSinceFirst,
    stepDropPercent: Math.round(stepDropPercent * 10000) / 100,
    stepDropAbsolute,
    prevPrice,
    dropType,
  };
}

function detectDrops(state, threshold = 0.15, stepThreshold = 0.03) {
  const drops = [];

  for (const [canonicalUrl, entry] of Object.entries(state.listings || {})) {
    const metrics = computeDropMetrics(entry, threshold, stepThreshold);
    if (!metrics) continue;

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
