/**
 * Builds the payload for the downstream price-drops endpoint.
 */

function build({ runId, configId, source, areaLabel, drops, durationMs, meta, now }) {
  return {
    run_id: runId,
    config_id: configId,
    source,
    event_type: 'price_drops',
    area_label: areaLabel || null,
    detected_at: now || new Date().toISOString(),
    duration_ms: durationMs || 0,
    events: drops.map(drop => ({
      canonical_url: drop.canonical_url,
      external_id: drop.entry.external_id || null,
      source: drop.entry.source || source,
      title: drop.entry.title || null,
      location: drop.entry.location || {},
      property: drop.entry.property || {},
      advertiser: drop.entry.advertiser || {},
      price_data: {
        first_seen_price: drop.metrics.firstPrice,
        current_price: drop.metrics.currentPrice,
        drop_percent: drop.metrics.dropPercent,
        drop_absolute: drop.metrics.dropAbsolute,
        drop_type: drop.metrics.dropType,
        step_drop_percent: drop.metrics.stepDropPercent,
        prev_price: drop.metrics.prevPrice,
        first_seen_at: drop.entry.first_seen_at,
        last_seen_at: drop.entry.last_seen_at,
        days_tracked: drop.metrics.daysSinceFirst,
        price_history: drop.entry.price_history || [],
      },
    })),
    meta: meta || {},
  };
}

module.exports = { build };
