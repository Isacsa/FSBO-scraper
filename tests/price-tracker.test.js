/**
 * Price Tracker — unit + integration tests.
 *
 * Run: node tests/price-tracker.test.js
 */

const assert = require('assert');
const path = require('path');

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

function summary() {
  console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  if (failed > 0) process.exit(1);
}

// ── priceStore ───────────────────────────────────────────────────────────────

const {
  loadPriceState,
  upsertListings,
  pruneStale,
  parsePrice,
  emptyState,
  MAX_HISTORY_ENTRIES,
} = require('../src/price-tracker/priceStore');

console.log('\n--- priceStore ---');

test('parsePrice: numeric', () => {
  assert.strictEqual(parsePrice(250000), 250000);
});

test('parsePrice: string with euro sign', () => {
  assert.strictEqual(parsePrice('250 000 €'), 250000);
});

test('parsePrice: string with dots', () => {
  assert.strictEqual(parsePrice('250.000€'), 250000);
});

test('parsePrice: Portuguese decimal format "1.500,50"', () => {
  assert.strictEqual(parsePrice('1.500,50'), 1501);  // 1500.50 rounded
});

test('parsePrice: decimal comma "250.000,00"', () => {
  assert.strictEqual(parsePrice('250.000,00'), 250000);
});

test('parsePrice: null/undefined', () => {
  assert.strictEqual(parsePrice(null), null);
  assert.strictEqual(parsePrice(undefined), null);
  assert.strictEqual(parsePrice(''), null);
});

test('parsePrice: zero returns null', () => {
  assert.strictEqual(parsePrice(0), null);
  assert.strictEqual(parsePrice('0'), null);
});

test('emptyState creates valid structure', () => {
  const s = emptyState();
  assert.strictEqual(s.version, 1);
  assert.strictEqual(s.updated_at, null);
  assert.deepStrictEqual(s.listings, {});
});

test('upsert first batch — all new', () => {
  const state = emptyState();
  const items = [
    { url: 'https://www.olx.pt/d/anuncio/moradia-t3-123', price: '250000', title: 'T3', source: 'olx', location: { district: 'Porto' }, property: { type: 'moradia' }, advertiser: {} },
    { url: 'https://www.olx.pt/d/anuncio/apartamento-456', price: 180000, title: 'T2', source: 'olx', location: { district: 'Lisboa' }, property: { type: 'apartamento' }, advertiser: {} },
  ];
  const now = '2026-01-15T10:00:00.000Z';
  const result = upsertListings(state, items, now);

  assert.strictEqual(result.newCount, 2);
  assert.strictEqual(result.priceChanged, 0);
  assert.strictEqual(Object.keys(state.listings).length, 2);

  const entry = Object.values(state.listings)[0];
  assert.strictEqual(entry.first_seen_price, 250000);
  assert.strictEqual(entry.current_price, 250000);
  assert.strictEqual(entry.price_history.length, 1);
  assert.strictEqual(entry.first_seen_at, now);
});

test('upsert second batch with changed prices — price_history grows', () => {
  const state = emptyState();
  const url = 'https://www.olx.pt/d/anuncio/moradia-t3-123';
  const t1 = '2026-01-15T10:00:00.000Z';
  const t2 = '2026-02-15T10:00:00.000Z';

  upsertListings(state, [{ url, price: 250000, source: 'olx' }], t1);
  const result = upsertListings(state, [{ url, price: 210000, source: 'olx' }], t2);

  assert.strictEqual(result.newCount, 0);
  assert.strictEqual(result.priceChanged, 1);

  const key = Object.keys(state.listings)[0];
  const entry = state.listings[key];
  assert.strictEqual(entry.first_seen_price, 250000);
  assert.strictEqual(entry.current_price, 210000);
  assert.strictEqual(entry.price_history.length, 2);
  assert.strictEqual(entry.price_history[1].price, 210000);
});

test('upsert with same price — only updates last_seen_at', () => {
  const state = emptyState();
  const url = 'https://www.olx.pt/d/anuncio/moradia-t3-123';
  const t1 = '2026-01-15T10:00:00.000Z';
  const t2 = '2026-02-15T10:00:00.000Z';

  upsertListings(state, [{ url, price: 250000, source: 'olx' }], t1);
  const result = upsertListings(state, [{ url, price: 250000, source: 'olx' }], t2);

  assert.strictEqual(result.priceChanged, 0);
  const entry = Object.values(state.listings)[0];
  assert.strictEqual(entry.last_seen_at, t2);
  assert.strictEqual(entry.price_history.length, 1);
});

test('price_history capped at MAX_HISTORY_ENTRIES', () => {
  const state = emptyState();
  const url = 'https://www.olx.pt/d/anuncio/moradia-t3-123';

  for (let i = 0; i <= MAX_HISTORY_ENTRIES + 5; i++) {
    const price = 250000 - i * 1000;
    upsertListings(state, [{ url, price, source: 'olx' }], `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`);
  }

  const entry = Object.values(state.listings)[0];
  assert.strictEqual(entry.price_history.length, MAX_HISTORY_ENTRIES);
  // Last entry should be the most recent price
  assert.strictEqual(entry.price_history[MAX_HISTORY_ENTRIES - 1].price, entry.current_price);
});

test('pruneStale removes old entries', () => {
  const state = emptyState();
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  const recentDate = new Date().toISOString();

  state.listings['https://old.example.com'] = {
    last_seen_at: oldDate,
    first_seen_at: oldDate,
    first_seen_price: 100000,
    current_price: 100000,
    price_history: [{ price: 100000, seen_at: oldDate }],
  };
  state.listings['https://recent.example.com'] = {
    last_seen_at: recentDate,
    first_seen_at: recentDate,
    first_seen_price: 200000,
    current_price: 200000,
    price_history: [{ price: 200000, seen_at: recentDate }],
  };

  const pruned = pruneStale(state, 90);
  assert.strictEqual(pruned, 1);
  assert.strictEqual(Object.keys(state.listings).length, 1);
  assert.ok(state.listings['https://recent.example.com']);
});

test('upsert skips items without valid URL', () => {
  const state = emptyState();
  const result = upsertListings(state, [
    { url: '', price: 100000, source: 'olx' },
    { url: null, price: 100000, source: 'olx' },
    { price: 100000, source: 'olx' },
  ], '2026-01-01T00:00:00Z');

  assert.strictEqual(result.newCount, 0);
  assert.strictEqual(Object.keys(state.listings).length, 0);
});

test('upsert skips items with null/zero price', () => {
  const state = emptyState();
  const result = upsertListings(state, [
    { url: 'https://www.olx.pt/d/anuncio/test-1', price: null, source: 'olx' },
    { url: 'https://www.olx.pt/d/anuncio/test-2', price: 0, source: 'olx' },
    { url: 'https://www.olx.pt/d/anuncio/test-3', price: '', source: 'olx' },
  ], '2026-01-01T00:00:00Z');

  assert.strictEqual(result.newCount, 0);
});

// ── priceComparator ──────────────────────────────────────────────────────────

const { detectDrops, computeDropMetrics } = require('../src/price-tracker/priceComparator');

console.log('\n--- priceComparator ---');

test('stable prices — no drops', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 250000,
        current_price: 250000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-02-01T00:00:00Z',
        price_history: [
          { price: 250000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 250000, seen_at: '2026-02-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 0);
});

test('drop of 14.9% — not flagged by cumulative threshold but flagged as step drop', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 100000,
        current_price: 85100,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-02-01T00:00:00Z',
        price_history: [
          { price: 100000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 85100, seen_at: '2026-02-01T00:00:00Z' },
        ],
      },
    },
  };
  // 14.9% step drop >= 3% step threshold → flagged
  const drops = detectDrops(state, 0.15, 0.03);
  assert.strictEqual(drops.length, 1);
  assert.strictEqual(drops[0].metrics.dropType, 'step');
});

test('drop of 2% — not flagged (below both thresholds)', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 100000,
        current_price: 98000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-02-01T00:00:00Z',
        price_history: [
          { price: 100000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 98000, seen_at: '2026-02-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15, 0.03);
  assert.strictEqual(drops.length, 0);
});

test('drop of exactly 15% — flagged', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 170000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-03-01T00:00:00Z',
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 170000, seen_at: '2026-03-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 1);
  assert.strictEqual(drops[0].metrics.dropPercent, 15);
  assert.strictEqual(drops[0].metrics.dropAbsolute, 30000);
});

test('drop of 50% — flagged', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 300000,
        current_price: 150000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-03-01T00:00:00Z',
        price_history: [
          { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 150000, seen_at: '2026-03-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 1);
  assert.strictEqual(drops[0].metrics.dropPercent, 50);
});

test('price went up — not flagged', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 220000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-02-01T00:00:00Z',
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 220000, seen_at: '2026-02-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 0);
});

test('null/zero prices — ignored', () => {
  const state = {
    listings: {
      a: { first_seen_price: null, current_price: 100000, price_history: [{}, {}] },
      b: { first_seen_price: 0, current_price: 100000, price_history: [{}, {}] },
      c: { first_seen_price: 200000, current_price: null, price_history: [{}, {}] },
      d: { first_seen_price: 200000, current_price: 0, price_history: [{}, {}] },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 0);
});

test('listing seen only once — ignored', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 170000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-01-01T00:00:00Z',
        price_history: [{ price: 200000, seen_at: '2026-01-01T00:00:00Z' }],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 0);
});

test('detectDrops sets last_notified_price on emit', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 160000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-03-01T00:00:00Z',
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 160000, seen_at: '2026-03-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 1);
  assert.strictEqual(state.listings['https://example.com/1'].last_notified_price, 160000);
});

test('detectDrops skips already-notified drop at same price', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 160000,
        last_notified_price: 160000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-03-01T00:00:00Z',
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 160000, seen_at: '2026-03-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 0);
});

test('detectDrops re-emits when price drops further below last_notified_price', () => {
  const state = {
    listings: {
      'https://example.com/1': {
        first_seen_price: 200000,
        current_price: 140000,
        last_notified_price: 160000,
        first_seen_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-04-01T00:00:00Z',
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 160000, seen_at: '2026-03-01T00:00:00Z' },
          { price: 140000, seen_at: '2026-04-01T00:00:00Z' },
        ],
      },
    },
  };
  const drops = detectDrops(state, 0.15);
  assert.strictEqual(drops.length, 1);
  assert.strictEqual(state.listings['https://example.com/1'].last_notified_price, 140000);
});

test('computeDropMetrics returns daysSinceFirst', () => {
  const entry = {
    first_seen_price: 200000,
    current_price: 160000,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-02-24T00:00:00Z',
    price_history: [
      { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
      { price: 160000, seen_at: '2026-02-24T00:00:00Z' },
    ],
  };
  const m = computeDropMetrics(entry, 0.15);
  assert.ok(m.hasDrop);
  assert.strictEqual(m.daysSinceFirst, 54);
});

test('step drop >= stepThreshold — flagged as step, drop_type=step', () => {
  // First=300k, intermediate=295k (stable), then current=280k (-5.1% step, <15% cumulative)
  const entry = {
    first_seen_price: 300000,
    current_price: 280000,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-01T00:00:00Z',
    price_history: [
      { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
      { price: 295000, seen_at: '2026-02-01T00:00:00Z' },
      { price: 280000, seen_at: '2026-03-01T00:00:00Z' },
    ],
  };
  const m = computeDropMetrics(entry, 0.15, 0.03);
  assert.ok(m.hasDrop);
  assert.strictEqual(m.dropType, 'step');
  assert.ok(m.stepDropPercent > 5);
  assert.strictEqual(m.prevPrice, 295000);
});

test('both cumulative and step drop — drop_type=both', () => {
  const entry = {
    first_seen_price: 300000,
    current_price: 240000,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-01T00:00:00Z',
    price_history: [
      { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
      { price: 260000, seen_at: '2026-02-01T00:00:00Z' },
      { price: 240000, seen_at: '2026-03-01T00:00:00Z' },
    ],
  };
  const m = computeDropMetrics(entry, 0.15, 0.03);
  assert.ok(m.hasDrop);
  assert.strictEqual(m.dropType, 'both');
});

test('cumulative >= threshold but no step drop — drop_type=cumulative', () => {
  // Price went down significantly from first, but recovered and barely dropped
  const entry = {
    first_seen_price: 300000,
    current_price: 252000,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-01T00:00:00Z',
    price_history: [
      { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
      { price: 254000, seen_at: '2026-02-01T00:00:00Z' },
      { price: 252000, seen_at: '2026-03-01T00:00:00Z' },
    ],
  };
  // cumulative: (300k-252k)/300k = 16% >= 15% ✓
  // step: (254k-252k)/254k = 0.8% < 3% ✗
  const m = computeDropMetrics(entry, 0.15, 0.03);
  assert.ok(m.hasDrop);
  assert.strictEqual(m.dropType, 'cumulative');
});

test('step drop below stepThreshold — not flagged', () => {
  const entry = {
    first_seen_price: 300000,
    current_price: 294000,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-02-01T00:00:00Z',
    price_history: [
      { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
      { price: 294000, seen_at: '2026-02-01T00:00:00Z' },
    ],
  };
  // step: 2% < 3% threshold, cumulative 2% < 15% → no drop
  const m = computeDropMetrics(entry, 0.15, 0.03);
  assert.strictEqual(m, null);
});

// ── salesFilter ──────────────────────────────────────────────────────────────

const { filterSalesOnly } = require('../src/price-tracker/salesFilter');

console.log('\n--- salesFilter ---');

test('rejects rent-only items', () => {
  const items = [
    { url: 'https://www.olx.pt/d/anuncio/alugar-t2-123', title: 'Alugar T2', description: 'alugar apartamento' },
    { url: 'https://www.olx.pt/d/anuncio/arrendo-t1-456', title: 'Arrendo T1', description: 'arrendo quarto' },
  ];
  const result = filterSalesOnly(items, 'olx');
  assert.strictEqual(result.length, 0);
});

test('rejects forbidden categories', () => {
  const items = [
    { url: 'https://www.olx.pt/d/anuncio/garagem-123', title: 'Garagem para venda' },
    { url: 'https://www.olx.pt/d/anuncio/quarto-456', title: 'Quarto mobilado', description: 'venda quarto' },
  ];
  const result = filterSalesOnly(items, 'olx');
  assert.strictEqual(result.length, 0);
});

test('accepts normal sale item', () => {
  const items = [
    { url: 'https://www.olx.pt/d/anuncio/moradia-t3-789', title: 'Moradia T3 Viana', description: 'venda moradia' },
  ];
  const result = filterSalesOnly(items, 'olx');
  assert.strictEqual(result.length, 1);
});

test('rejects items with invalid URL for source', () => {
  const items = [
    { url: 'https://www.custojusto.pt/some-ad', title: 'Moradia T3' },
  ];
  const result = filterSalesOnly(items, 'olx');
  assert.strictEqual(result.length, 0);
});

// ── toPriceDropPayload ───────────────────────────────────────────────────────

const { build } = require('../src/price-tracker/toPriceDropPayload');

console.log('\n--- toPriceDropPayload ---');

test('builds valid payload', () => {
  const drops = [{
    canonical_url: 'https://www.olx.pt/d/anuncio/moradia-123',
    entry: {
      external_id: 'ID123',
      source: 'olx',
      title: 'Moradia T3',
      first_seen_at: '2026-01-01T00:00:00Z',
      last_seen_at: '2026-03-01T00:00:00Z',
      location: { district: 'Porto' },
      property: { type: 'moradia', tipology: 'T3' },
      advertiser: { name: 'Joao', is_agency: false },
      price_history: [
        { price: 250000, seen_at: '2026-01-01T00:00:00Z' },
        { price: 210000, seen_at: '2026-03-01T00:00:00Z' },
      ],
    },
    metrics: {
      firstPrice: 250000,
      currentPrice: 210000,
      dropPercent: 16,
      dropAbsolute: 40000,
      daysSinceFirst: 59,
    },
  }];

  const payload = build({
    runId: 'run-1',
    configId: 'cfg-1',
    source: 'olx',
    areaLabel: 'Viana do Castelo',
    drops,
    durationMs: 45000,
    now: '2026-03-01T12:00:00Z',
    meta: { total_tracked: 100 },
  });

  assert.strictEqual(payload.run_id, 'run-1');
  assert.strictEqual(payload.event_type, 'price_drops');
  assert.strictEqual(payload.events.length, 1);
  assert.strictEqual(payload.events[0].price_data.drop_percent, 16);
  assert.strictEqual(payload.events[0].price_data.first_seen_price, 250000);
  assert.strictEqual(payload.events[0].price_data.current_price, 210000);
  assert.strictEqual(payload.events[0].location.district, 'Porto');
  assert.strictEqual(payload.meta.total_tracked, 100);
});

// ── Orchestrator integration ─────────────────────────────────────────────────

const { main, parseCliArgs, getDropThreshold, getStepThreshold, shouldRunConfig } = require('../scripts/price-tracker');

// Helper: create a fake withPriceStateLock that uses the given deps
function fakeWithPriceStateLock(deps) {
  return async (configId, fn) => {
    const state = deps.loadPriceState(configId);
    const result = await fn(state);
    await deps.savePriceState(configId, state);
    return result;
  };
}

console.log('\n--- orchestrator ---');

test('parseCliArgs: defaults', () => {
  const args = parseCliArgs([]);
  assert.strictEqual(args.runNow, false);
  assert.strictEqual(args.dryRun, false);
  assert.strictEqual(args.configId, null);
  assert.strictEqual(args.dropThreshold, null);
  assert.strictEqual(args.stepThreshold, null);
});

test('parseCliArgs: all flags', () => {
  const args = parseCliArgs(['--run-now', '--dry-run', '--config-id=abc-123', '--drop-threshold=0.20', '--step-threshold=0.05']);
  assert.strictEqual(args.runNow, true);
  assert.strictEqual(args.dryRun, true);
  assert.strictEqual(args.configId, 'abc-123');
  assert.strictEqual(args.dropThreshold, 0.20);
  assert.strictEqual(args.stepThreshold, 0.05);
});

test('getDropThreshold: CLI flag takes precedence', () => {
  assert.strictEqual(getDropThreshold({ dropThreshold: 0.25 }, {}), 0.25);
});

test('getDropThreshold: env var fallback', () => {
  assert.strictEqual(getDropThreshold({ dropThreshold: null }, { PRICE_TRACKER_DROP_THRESHOLD: '0.20' }), 0.20);
});

test('getDropThreshold: default 0.15', () => {
  assert.strictEqual(getDropThreshold({ dropThreshold: null }, {}), 0.15);
});

test('getStepThreshold: CLI flag takes precedence', () => {
  assert.strictEqual(getStepThreshold({ stepThreshold: 0.05 }, {}), 0.05);
});

test('getStepThreshold: env var fallback', () => {
  assert.strictEqual(getStepThreshold({ stepThreshold: null }, { PRICE_TRACKER_STEP_THRESHOLD: '0.10' }), 0.10);
});

test('getStepThreshold: default 0.03', () => {
  assert.strictEqual(getStepThreshold({ stepThreshold: null }, {}), 0.03);
});

test('shouldRunConfig: runNow=true always runs', () => {
  assert.strictEqual(shouldRunConfig({ last_run_at: new Date().toISOString() }, { runNow: true }), true);
});

test('shouldRunConfig: no last_run_at always runs', () => {
  assert.strictEqual(shouldRunConfig({}, {}), true);
});

testAsync('orchestrator: dry-run with drops detected outputs to stdout', async () => {
  const output = [];
  const logs = [];

  const fakeConfig = {
    id: 'cfg-test',
    area_label: 'Teste',
    options: { priceTracker: { enabled: true } },
    sources: { olx: 'https://www.olx.pt/imoveis/' },
  };

  // Pre-seed state with a listing that has a price drop
  const seededState = {
    version: 1,
    updated_at: '2026-01-01T00:00:00Z',
    listings: {
      'https://www.olx.pt/d/anuncio/moradia-existing': {
        external_id: 'old-1',
        source: 'olx',
        title: 'Moradia existente',
        first_seen_at: '2026-01-01T00:00:00Z',
        first_seen_price: 300000,
        last_seen_at: '2026-02-01T00:00:00Z',
        current_price: 240000,
        price_history: [
          { price: 300000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 240000, seen_at: '2026-02-01T00:00:00Z' },
        ],
        location: { district: 'Porto' },
        property: { type: 'moradia' },
        advertiser: {},
      },
    },
  };

  const fakeDeps = {
    pullConfigs: async () => [fakeConfig],
    runPlatform: async (args) => {
      // Verify filterPrivateOnly is passed
      assert.strictEqual(args.options.filterPrivateOnly, false);
      assert.strictEqual(args.options.filterAgencies, false);
      return {
        results: [
          { url: 'https://www.olx.pt/d/anuncio/moradia-existing', price: 240000, title: 'Moradia existente', source: 'olx', location: { district: 'Porto' }, property: { type: 'moradia' }, advertiser: {} },
          { url: 'https://www.olx.pt/d/anuncio/moradia-new', price: 180000, title: 'Moradia nova', source: 'olx', location: { district: 'Lisboa' }, property: { type: 'moradia' }, advertiser: {} },
        ],
      };
    },
    cleanItem: (item) => item,
    dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
    filterSalesOnly: (items) => items,
    loadPriceState: () => JSON.parse(JSON.stringify(seededState)),
    upsertListings,
    pruneStale: () => 0,
    detectDrops,
    buildPriceDropPayload: build,
    pushPriceDrops: async () => { throw new Error('should not push in dry-run'); },
    savePriceState: async () => {},
    randomUUID: () => 'test-run-id',
  };
  fakeDeps.withPriceStateLock = fakeWithPriceStateLock(fakeDeps);

  const result = await main({
    argv: ['--run-now', '--dry-run'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    deps: fakeDeps,
    stdout: { write: (s) => output.push(s) },
    stderr: { write: (s) => logs.push(s) },
    exit: () => {},
    now: '2026-03-01T12:00:00Z',
  });

  assert.strictEqual(result.exitCode, 0);
  assert.ok(output.length > 0, 'should have stdout output');

  const payload = JSON.parse(output[0]);
  assert.strictEqual(payload.event_type, 'price_drops');
  assert.ok(payload.events.length >= 1);
  assert.strictEqual(payload.events[0].price_data.first_seen_price, 300000);
  assert.strictEqual(payload.events[0].price_data.current_price, 240000);
});

testAsync('orchestrator: no drops — does not push', async () => {
  let pushCalled = false;

  const fakeConfig = {
    id: 'cfg-nodrop',
    area_label: 'Sem Drops',
    options: { priceTracker: { enabled: true } },
    sources: { olx: 'https://www.olx.pt/imoveis/' },
  };

  const fakeDeps = {
    pullConfigs: async () => [fakeConfig],
    runPlatform: async () => ({
      results: [
        { url: 'https://www.olx.pt/d/anuncio/moradia-1', price: 200000, source: 'olx' },
      ],
    }),
    cleanItem: (item) => item,
    dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
    filterSalesOnly: (items) => items,
    loadPriceState: () => emptyState(),
    upsertListings,
    pruneStale: () => 0,
    detectDrops,
    buildPriceDropPayload: build,
    pushPriceDrops: async () => { pushCalled = true; },
    savePriceState: async () => {},
    randomUUID: () => 'run-2',
  };
  fakeDeps.withPriceStateLock = fakeWithPriceStateLock(fakeDeps);

  const result = await main({
    argv: ['--run-now'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    deps: fakeDeps,
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    now: '2026-03-01T12:00:00Z',
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(pushCalled, false);
  assert.strictEqual(result.summary.totalDrops, 0);
});

testAsync('orchestrator: live mode — calls pushPriceDrops with correct payload', async () => {
  const pushPayloads = [];

  const seededState = {
    version: 1,
    updated_at: '2026-01-01T00:00:00Z',
    listings: {
      'https://www.olx.pt/d/anuncio/moradia-drop': {
        external_id: 'drop-1',
        source: 'olx',
        title: 'Moradia com drop',
        first_seen_at: '2026-01-01T00:00:00Z',
        first_seen_price: 200000,
        last_seen_at: '2026-02-01T00:00:00Z',
        current_price: 160000,
        price_history: [
          { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
          { price: 160000, seen_at: '2026-02-01T00:00:00Z' },
        ],
        location: {},
        property: {},
        advertiser: {},
      },
    },
  };

  const fakeConfig = {
    id: 'cfg-live',
    area_label: 'Live Test',
    options: { priceTracker: { enabled: true } },
    sources: { olx: 'https://www.olx.pt/imoveis/' },
  };

  const fakeDeps = {
    pullConfigs: async () => [fakeConfig],
    runPlatform: async () => ({
      results: [
        { url: 'https://www.olx.pt/d/anuncio/moradia-drop', price: 160000, source: 'olx' },
      ],
    }),
    cleanItem: (item) => item,
    dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
    filterSalesOnly: (items) => items,
    loadPriceState: () => JSON.parse(JSON.stringify(seededState)),
    upsertListings,
    pruneStale: () => 0,
    detectDrops,
    buildPriceDropPayload: build,
    pushPriceDrops: async (payload) => { pushPayloads.push(payload); },
    savePriceState: async () => {},
    randomUUID: () => 'run-live',
  };
  fakeDeps.withPriceStateLock = fakeWithPriceStateLock(fakeDeps);

  const result = await main({
    argv: ['--run-now'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    deps: fakeDeps,
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    now: '2026-03-01T12:00:00Z',
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(pushPayloads.length, 1);
  assert.strictEqual(pushPayloads[0].event_type, 'price_drops');
  assert.strictEqual(pushPayloads[0].run_id, 'run-live');
  assert.ok(pushPayloads[0].events.length >= 1);
});

testAsync('orchestrator: no priceTracker-enabled configs — exits cleanly', async () => {
  const result = await main({
    argv: ['--run-now'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    deps: {
      pullConfigs: async () => [{ id: 'cfg-1', sources: { olx: 'url' }, options: {} }],
    },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    now: '2026-03-01T12:00:00Z',
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.summary.configsProcessed, 0);
});

testAsync('orchestrator: missing env vars — exits with code 1', async () => {
  let exitCode = null;
  const result = await main({
    argv: [],
    env: {},
    deps: {},
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: (code) => { exitCode = code; },
  });

  assert.strictEqual(exitCode, 1);
  assert.strictEqual(result.exitCode, 1);
});

// ── buildScraperOptions (filterPrivateOnly) ──────────────────────────────────

const { buildScraperOptions } = require('../src/core/runPlatform');

console.log('\n--- buildScraperOptions (filterPrivateOnly) ---');

test('OLX: filterPrivateOnly defaults to true', () => {
  const opts = buildScraperOptions('olx', {});
  assert.strictEqual(opts.filterPrivateOnly, true);
});

test('OLX: filterPrivateOnly=false propagates', () => {
  const opts = buildScraperOptions('olx', { filterPrivateOnly: false });
  assert.strictEqual(opts.filterPrivateOnly, false);
});

test('Imovirtual: filterPrivateOnly propagates', () => {
  const opts = buildScraperOptions('imovirtual', { filterPrivateOnly: false });
  assert.strictEqual(opts.filterPrivateOnly, false);
});

test('CasaSapo: filterPrivateOnly propagates', () => {
  const opts = buildScraperOptions('casasapo', { filterPrivateOnly: false });
  assert.strictEqual(opts.filterPrivateOnly, false);
});

test('Idealista: filterPrivateOnly=false forces filterAgencies=false', () => {
  const opts = buildScraperOptions('idealista', { filterPrivateOnly: false, filterAgencies: true });
  assert.strictEqual(opts.filterAgencies, false);
});

test('Idealista: filterPrivateOnly=true preserves filterAgencies', () => {
  const opts = buildScraperOptions('idealista', { filterPrivateOnly: true, filterAgencies: true });
  assert.strictEqual(opts.filterAgencies, true);
});

test('CustoJusto: does not include filterPrivateOnly (handled via URL)', () => {
  const opts = buildScraperOptions('custojusto', { filterPrivateOnly: false });
  assert.strictEqual(opts.filterPrivateOnly, undefined);
});

// ── Finish ───────────────────────────────────────────────────────────────────

// Wait for async tests to complete
setTimeout(summary, 500);
