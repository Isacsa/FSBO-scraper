const assert = require('assert');

const { main, assessExtractionQuality, enrichWithPriceHistory } = require('../scripts/scrape-and-push');
const { upsertListings, emptyState } = require('../src/price-tracker/priceStore');
const { computeDropMetrics } = require('../src/price-tracker/priceComparator');

console.log('\nScrape-and-push orchestrator tests');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

function createWritableCapture() {
  const chunks = [];
  return {
    chunks,
    write(chunk) {
      chunks.push(String(chunk));
    },
    toString() {
      return chunks.join('');
    },
  };
}

function parseLogLines(stderrCapture) {
  return stderrCapture
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

(async () => {
  await runTest('main uses app configs, filters precision.accepted, and avoids push in dry-run', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    const exits = [];
    const calls = {
      pullConfigs: 0,
      runPlatform: 0,
      buildIngestPayload: 0,
      pushBatch: 0,
    };

    const acceptedItems = [
      { url: 'https://www.olx.pt/d/anuncio/apartamento-t2-ID123.html', title: 'Accepted item' },
    ];

    const result = await main({
      argv: ['--dry-run'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      now: new Date('2026-01-23T12:00:00.000Z').getTime(),
      stdout,
      stderr,
      exit: (code) => exits.push(code),
      deps: {
        randomUUID: () => 'run-123',
        async pullConfigs() {
          calls.pullConfigs++;
          return [
            {
              id: 'cfg-run',
              area_label: 'Viana do Castelo',
              last_run_at: '2026-01-01T00:00:00.000Z',
              schedule_interval_hours: 24,
              sources: {
                olx: 'https://www.olx.pt/imoveis/viana-do-castelo/',
              },
              options: {
                maxAds: 10,
              },
            },
            {
              id: 'cfg-skip',
              area_label: 'Skip me',
              last_run_at: '2026-01-23T10:00:00.000Z',
              schedule_interval_hours: 24,
              sources: {
                olx: 'https://www.olx.pt/imoveis/porto/',
              },
            },
          ];
        },
        async runPlatform() {
          calls.runPlatform++;
          return {
            results: [
              { id: 'raw-1', title: 'Candidate A' },
              { id: 'raw-2', title: 'Candidate B' },
            ],
          };
        },
        dedupeListInMemory(items) {
          return {
            unique: items,
            duplicates: [],
          };
        },
        applyPrecisionGate(items, platform) {
          assert.equal(platform, 'olx');
          assert.equal(items.length, 2);
          return {
            accepted: acceptedItems,
            rejected: [{ id: 'raw-2' }],
            uncertain: [],
            metrics: {
              accepted_for_push: 1,
              rejected_precision: 1,
              uncertain_blocked: 0,
            },
          };
        },
        async applyIncremental(items) {
          return {
            items: items.map(i => ({ ...i, _status: 'NEW' })),
            meta: { new: items.length, updated: 0, unchanged: 0, removed: 0 },
          };
        },
        buildIngestPayload(input) {
          calls.buildIngestPayload++;
          assert.equal(input.rawItems.length, acceptedItems.length);
          assert.equal(input.rawItems[0].url, acceptedItems[0].url);
          assert.equal(input.totalScraped, 2);
          return {
            run_id: input.runId,
            source: input.source,
            items: input.rawItems,
          };
        },
        async pushBatch() {
          calls.pushBatch++;
          return { ok: true };
        },
      },
    });

    assert.deepEqual(exits, []);
    assert.equal(calls.pullConfigs, 1);
    assert.equal(calls.runPlatform, 1);
    assert.equal(calls.buildIngestPayload, 1);
    assert.equal(calls.pushBatch, 0);
    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.configsProcessed, 1);
    assert.equal(result.summary.configsSkipped, 1);
    assert.equal(result.summary.totalItems, 1);

    const payload = JSON.parse(stdout.toString().trim());
    assert.equal(payload.items.length, 1);
    assert.equal(payload.run_id, 'run-123');

    const logs = parseLogLines(stderr);
    const scrapeLog = logs.find((entry) => entry.message.includes('Scraped 2 items'));
    assert.ok(scrapeLog);
    assert.equal(scrapeLog.accepted_for_push, 1);
    assert.equal(scrapeLog.rejected_precision, 1);
    assert.equal(scrapeLog.uncertain_blocked, 0);
  });

  await runTest('main pushes accepted payload in live mode', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    const pushedPayloads = [];

    const result = await main({
      argv: ['--run-now', '--config-id=cfg-live'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      stdout,
      stderr,
      exit: () => {
        throw new Error('exit should not be called');
      },
      deps: {
        randomUUID: () => 'run-live',
        async pullConfigs() {
          return [
            {
              id: 'cfg-live',
              area_label: 'Live config',
              sources: {
                olx: 'https://www.olx.pt/imoveis/lisboa/',
              },
            },
          ];
        },
        async runPlatform() {
          return {
            results: [{ id: 'raw-live', title: 'Accepted live item' }],
          };
        },
        dedupeListInMemory(items) {
          return { unique: items, duplicates: [] };
        },
        applyPrecisionGate(items) {
          return {
            accepted: items,
            rejected: [],
            uncertain: [],
            metrics: {
              accepted_for_push: items.length,
              rejected_precision: 0,
              uncertain_blocked: 0,
            },
          };
        },
        async applyIncremental(items) {
          return {
            items: items.map(i => ({ ...i, _status: 'NEW' })),
            meta: { new: items.length, updated: 0, unchanged: 0, removed: 0 },
          };
        },
        buildIngestPayload(input) {
          return {
            run_id: input.runId,
            source: input.source,
            items: input.rawItems,
          };
        },
        async pushBatch(payload, options) {
          pushedPayloads.push({ payload, options });
          return { items_new: payload.items.length };
        },
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(pushedPayloads.length, 1);
    assert.equal(pushedPayloads[0].payload.items.length, 1);
    assert.equal(pushedPayloads[0].options.apiUrl, 'https://app.example.com');
    assert.equal(pushedPayloads[0].options.apiKey, 'secret-key');
    assert.equal(pushedPayloads[0].options.tenantId, 'tenant-123');
    assert.equal(stdout.toString(), '');

    const logs = parseLogLines(stderr);
    assert.ok(logs.some((entry) => entry.message.includes('Pushed olx run successfully')));
  });

  await runTest('incremental mode filters UNCHANGED items and skips push', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    const pushedPayloads = [];

    const result = await main({
      argv: ['--run-now', '--config-id=cfg-inc'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      stdout,
      stderr,
      exit: () => {},
      deps: {
        randomUUID: () => 'run-inc',
        async pullConfigs() {
          return [{
            id: 'cfg-inc',
            area_label: 'Incremental test',
            sources: { olx: 'https://www.olx.pt/imoveis/viana/' },
          }];
        },
        async runPlatform() {
          return { results: [
            { id: 'item-1', title: 'Item A', source: 'olx', ad_id: '1' },
            { id: 'item-2', title: 'Item B', source: 'olx', ad_id: '2' },
            { id: 'item-3', title: 'Item C', source: 'olx', ad_id: '3' },
          ]};
        },
        dedupeListInMemory(items) {
          return { unique: items, duplicates: [] };
        },
        applyPrecisionGate(items) {
          return {
            accepted: items,
            rejected: [],
            uncertain: [],
            metrics: { accepted_for_push: items.length, rejected_precision: 0, uncertain_blocked: 0 },
          };
        },
        async applyIncremental(items) {
          // Simulate: item-1 is NEW, item-2 is UPDATED, item-3 is UNCHANGED
          items[0]._status = 'NEW';
          items[0]._first_seen = '2026-03-11T00:00:00Z';
          items[0]._last_seen = '2026-03-11T00:00:00Z';
          items[0]._changed_fields = [];
          items[1]._status = 'UPDATED';
          items[1]._first_seen = '2026-03-10T00:00:00Z';
          items[1]._last_seen = '2026-03-11T00:00:00Z';
          items[1]._changed_fields = ['price'];
          items[2]._status = 'UNCHANGED';
          items[2]._first_seen = '2026-03-09T00:00:00Z';
          items[2]._last_seen = '2026-03-11T00:00:00Z';
          items[2]._changed_fields = [];
          return {
            items,
            meta: { new: 1, updated: 1, unchanged: 1, removed: 0, removed_keys: [] },
          };
        },
        buildIngestPayload(input) {
          // Only NEW and UPDATED should arrive here
          assert.equal(input.rawItems.length, 2);
          assert.ok(input.rawItems.every(i => i._status === 'NEW' || i._status === 'UPDATED'));
          assert.ok(input.incrementalMeta);
          assert.equal(input.incrementalMeta.new, 1);
          assert.equal(input.incrementalMeta.updated, 1);
          assert.equal(input.incrementalMeta.unchanged, 1);
          return {
            run_id: input.runId,
            source: input.source,
            items: input.rawItems,
          };
        },
        async pushBatch(payload) {
          pushedPayloads.push(payload);
          return { ok: true };
        },
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(pushedPayloads.length, 1);
    assert.equal(pushedPayloads[0].items.length, 2);

    const logs = parseLogLines(stderr);
    const incLog = logs.find(e => e.message.includes('Incremental:'));
    assert.ok(incLog);
    assert.equal(incLog.incremental_new, 1);
    assert.equal(incLog.incremental_updated, 1);
    assert.equal(incLog.incremental_unchanged, 1);
  });

  await runTest('--legacy flag bypasses incremental tracking', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    let applyIncrementalCalled = false;

    const result = await main({
      argv: ['--run-now', '--config-id=cfg-leg', '--legacy'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      stdout,
      stderr,
      exit: () => {},
      deps: {
        randomUUID: () => 'run-leg',
        async pullConfigs() {
          return [{
            id: 'cfg-leg',
            area_label: 'Legacy test',
            sources: { olx: 'https://www.olx.pt/imoveis/porto/' },
          }];
        },
        async runPlatform() {
          return { results: [{ id: 'item-1', title: 'Item A' }] };
        },
        dedupeListInMemory(items) {
          return { unique: items, duplicates: [] };
        },
        applyPrecisionGate(items) {
          return {
            accepted: items,
            rejected: [],
            uncertain: [],
            metrics: { accepted_for_push: items.length, rejected_precision: 0, uncertain_blocked: 0 },
          };
        },
        async applyIncremental() {
          applyIncrementalCalled = true;
          return { items: [], meta: {} };
        },
        buildIngestPayload(input) {
          assert.equal(input.incrementalMeta, null);
          return { run_id: input.runId, source: input.source, items: input.rawItems };
        },
        async pushBatch() {
          return { ok: true };
        },
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(applyIncrementalCalled, false);

    const logs = parseLogLines(stderr);
    assert.ok(logs.some(e => e.incremental === false));
  });

  await runTest('incremental skips push when all items are UNCHANGED', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    let pushCalled = false;

    const result = await main({
      argv: ['--run-now', '--config-id=cfg-unch'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      stdout,
      stderr,
      exit: () => {},
      deps: {
        randomUUID: () => 'run-unch',
        async pullConfigs() {
          return [{
            id: 'cfg-unch',
            area_label: 'Unchanged test',
            sources: { olx: 'https://www.olx.pt/imoveis/braga/' },
          }];
        },
        async runPlatform() {
          return { results: [{ id: 'item-1', title: 'Old item' }] };
        },
        dedupeListInMemory(items) {
          return { unique: items, duplicates: [] };
        },
        applyPrecisionGate(items) {
          return {
            accepted: items,
            rejected: [],
            uncertain: [],
            metrics: { accepted_for_push: items.length, rejected_precision: 0, uncertain_blocked: 0 },
          };
        },
        async applyIncremental(items) {
          items[0]._status = 'UNCHANGED';
          items[0]._first_seen = '2026-03-09T00:00:00Z';
          items[0]._last_seen = '2026-03-11T00:00:00Z';
          items[0]._changed_fields = [];
          return {
            items,
            meta: { new: 0, updated: 0, unchanged: 1, removed: 0, removed_keys: [] },
          };
        },
        buildIngestPayload() {
          pushCalled = true;
          return { items: [] };
        },
        async pushBatch() {
          pushCalled = true;
          return {};
        },
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(pushCalled, false);

    const logs = parseLogLines(stderr);
    assert.ok(logs.some(e => e.message.includes('No new/updated items')));
  });

  await runTest('incremental metadata flows through to ingest payload', async () => {
    const { buildIngestPayload: realBuild } = require('../src/integration/toIngestPayload');

    const rawItems = [
      {
        source: 'olx',
        ad_id: '123',
        url: 'https://www.olx.pt/d/anuncio/test-ID123.html',
        title: 'Test property',
        price: 150000,
        _status: 'NEW',
        _first_seen: '2026-03-11T07:00:00Z',
        _last_seen: '2026-03-11T07:00:00Z',
        _changed_fields: [],
      },
      {
        source: 'olx',
        ad_id: '456',
        url: 'https://www.olx.pt/d/anuncio/test-ID456.html',
        title: 'Updated property',
        price: 200000,
        _status: 'UPDATED',
        _first_seen: '2026-03-10T07:00:00Z',
        _last_seen: '2026-03-11T07:00:00Z',
        _changed_fields: ['price'],
      },
    ];

    const payload = realBuild({
      runId: 'test-run',
      configId: 'test-cfg',
      source: 'olx',
      areaQuery: 'Test area',
      rawItems,
      durationMs: 5000,
      incrementalMeta: { new: 1, updated: 1, unchanged: 3 },
    });

    // Check item-level annotations
    assert.equal(payload.items[0].change_status, 'NEW');
    assert.equal(payload.items[0].first_seen, '2026-03-11T07:00:00Z');
    assert.equal(payload.items[0].changed_fields, undefined);

    assert.equal(payload.items[1].change_status, 'UPDATED');
    assert.deepEqual(payload.items[1].changed_fields, ['price']);

    // Check meta-level incremental summary
    assert.ok(payload.meta.incremental);
    assert.equal(payload.meta.incremental.new, 1);
    assert.equal(payload.meta.incremental.updated, 1);
    assert.equal(payload.meta.incremental.unchanged, 3);
  });
  // --- Extraction Quality Tests ---

  await runTest('assessExtractionQuality returns OK for good data', async () => {
    const items = [
      { title: 'Apt T2', price: '200000', location: { district: 'Porto', municipality: 'Porto' }, property: { area_useful: '80' }, photos: ['a.jpg'] },
      { title: 'Moradia', price: '350000', location: { district: 'Porto', municipality: 'Gaia' }, property: { area_total: '120' }, photos: ['b.jpg'] },
    ];
    const q = assessExtractionQuality(items);
    assert.equal(q.verdict, 'OK');
    assert.equal(q.fields_coverage.title, 100);
    assert.equal(q.fields_coverage.price, 100);
    assert.equal(q.item_count, 2);
  });

  await runTest('assessExtractionQuality returns DEGRADED when title/price mostly missing', async () => {
    const items = [
      { title: null, price: null, location: { district: 'Porto' }, property: {}, photos: [] },
      { title: null, price: '100000', location: { district: 'Porto' }, property: {}, photos: [] },
      { title: 'ok', price: null, location: { district: 'Porto' }, property: {}, photos: [] },
    ];
    const q = assessExtractionQuality(items);
    assert.equal(q.verdict, 'DEGRADED');
    assert.ok(q.fields_coverage.title < 50);
    assert.ok(q.fields_coverage.price < 50);
  });

  await runTest('assessExtractionQuality returns DEGRADED when no location at all', async () => {
    const items = [
      { title: 'A', price: '200000', location: { district: null, municipality: null }, property: {}, photos: [] },
      { title: 'B', price: '300000', location: {}, property: {}, photos: [] },
    ];
    const q = assessExtractionQuality(items);
    assert.equal(q.verdict, 'DEGRADED');
  });

  await runTest('assessExtractionQuality returns EMPTY for empty array', async () => {
    const q = assessExtractionQuality([]);
    assert.equal(q.verdict, 'EMPTY');
  });

  // ── Price tracking integration ──────────────────────────────────────────

  await runTest('enrichWithPriceHistory adds drop metrics when price dropped', async () => {
    const state = {
      version: 1,
      listings: {
        'https://www.olx.pt/d/anuncio/moradia-t3-123': {
          external_id: 'ID123',
          source: 'olx',
          first_seen_at: '2026-01-01T00:00:00Z',
          first_seen_price: 200000,
          last_seen_at: '2026-03-01T00:00:00Z',
          current_price: 160000,
          price_history: [
            { price: 200000, seen_at: '2026-01-01T00:00:00Z' },
            { price: 160000, seen_at: '2026-03-01T00:00:00Z' },
          ],
          location: {},
          property: {},
          advertiser: {},
        },
      },
    };

    const items = [{ url: 'https://www.olx.pt/d/anuncio/moradia-t3-123', title: 'T3' }];
    enrichWithPriceHistory(items, state, { computeDropMetrics });

    assert.ok(items[0]._price_insights, '_price_insights should be set');
    assert.strictEqual(items[0]._price_insights.has_drop, true);
    assert.strictEqual(items[0]._price_insights.drop_percent, 20);
    assert.strictEqual(items[0]._price_insights.drop_absolute, 40000);
    assert.strictEqual(items[0]._price_insights.first_seen_price, 200000);
    assert.strictEqual(items[0]._price_insights.current_price, 160000);
    assert.strictEqual(items[0]._price_insights.price_trend, 'dropping');
  });

  await runTest('enrichWithPriceHistory sets has_drop false when price is stable', async () => {
    const state = {
      version: 1,
      listings: {
        'https://www.olx.pt/d/anuncio/moradia-t3-456': {
          first_seen_at: '2026-01-01T00:00:00Z',
          first_seen_price: 200000,
          last_seen_at: '2026-02-01T00:00:00Z',
          current_price: 200000,
          price_history: [{ price: 200000, seen_at: '2026-01-01T00:00:00Z' }],
          location: {},
          property: {},
          advertiser: {},
        },
      },
    };

    const items = [{ url: 'https://www.olx.pt/d/anuncio/moradia-t3-456' }];
    enrichWithPriceHistory(items, state, { computeDropMetrics });

    assert.ok(items[0]._price_insights);
    assert.strictEqual(items[0]._price_insights.has_drop, false);
    assert.strictEqual(items[0]._price_insights.first_seen_price, 200000);
  });

  await runTest('pipeline upserts price state and detects drops in dry-run', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();

    // Simulate existing price state: listing seen before at 200k
    const priceState = emptyState();
    priceState.listings['https://www.olx.pt/d/anuncio/moradia-drop-1'] = {
      external_id: 'drop-1',
      source: 'olx',
      title: 'Moradia com drop',
      first_seen_at: '2026-01-01T00:00:00Z',
      first_seen_price: 200000,
      last_seen_at: '2026-02-01T00:00:00Z',
      current_price: 200000,
      price_history: [{ price: 200000, seen_at: '2026-01-01T00:00:00Z' }],
      location: { district: 'Porto' },
      property: { type: 'moradia' },
      advertiser: {},
    };

    let capturedPayload = null;

    const result = await main({
      argv: ['--run-now', '--dry-run', '--legacy'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'key',
        SCRAPER_TENANT_ID: 'tid',
      },
      stdout,
      stderr,
      exit: () => {},
      deps: {
        randomUUID: () => 'run-price-test',
        pullConfigs: async () => [{
          id: 'cfg-price',
          area_label: 'Price Drop Test',
          sources: { olx: 'https://www.olx.pt/imoveis/' },
          options: {},
        }],
        runPlatform: async () => ({
          results: [{
            url: 'https://www.olx.pt/d/anuncio/moradia-drop-1',
            title: 'Moradia com drop',
            price: 160000,
            source: 'olx',
            ad_id: 'drop-1',
            location: { district: 'Porto' },
            property: { type: 'moradia' },
            advertiser: {},
          }],
        }),
        dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
        calculateFsboScores: (items) => items,
        applyPrecisionGate: (items) => ({
          accepted: items,
          rejected: [],
          uncertain: [],
          metrics: { accepted_for_push: items.length, rejected_precision: 0, uncertain_blocked: 0 },
        }),
        withPriceStateLock: async (_configId, fn) => {
          return await fn(priceState);
        },
        upsertListings,
        pruneStale: () => 0,
        computeDropMetrics,
        buildIngestPayload: (input) => {
          capturedPayload = input;
          return { run_id: input.runId, items: input.rawItems, meta: {} };
        },
        pushBatch: async () => ({ ok: true }),
      },
    });

    assert.strictEqual(result.exitCode, 0);
    assert.ok(capturedPayload, 'buildIngestPayload should be called');

    const item = capturedPayload.rawItems[0];
    assert.ok(item._price_insights, 'item should have _price_insights');
    assert.strictEqual(item._price_insights.has_drop, true);
    assert.strictEqual(item._price_insights.drop_percent, 20);
    assert.strictEqual(item._price_insights.drop_absolute, 40000);
    assert.strictEqual(item._price_insights.first_seen_price, 200000);
    assert.strictEqual(item._price_insights.current_price, 160000);
    assert.strictEqual(item._price_insights.price_trend, 'dropping');
    assert.ok(capturedPayload.priceTrackingMeta, 'priceTrackingMeta should be passed');
    assert.strictEqual(capturedPayload.priceTrackingMeta.priceChanged, 1);
  });

  await runTest('pipeline continues gracefully when price tracking fails', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    let capturedPayload = null;

    const result = await main({
      argv: ['--run-now', '--dry-run', '--legacy'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'key',
        SCRAPER_TENANT_ID: 'tid',
      },
      stdout,
      stderr,
      exit: () => {},
      deps: {
        randomUUID: () => 'run-fail-price',
        pullConfigs: async () => [{
          id: 'cfg-fail-price',
          area_label: 'Fail Test',
          sources: { olx: 'https://www.olx.pt/imoveis/' },
          options: {},
        }],
        runPlatform: async () => ({
          results: [{
            url: 'https://www.olx.pt/d/anuncio/moradia-ok-1',
            title: 'Moradia OK',
            price: 150000,
            source: 'olx',
            location: { district: 'Porto' },
            property: { type: 'moradia' },
            advertiser: {},
          }],
        }),
        dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
        calculateFsboScores: (items) => items,
        applyPrecisionGate: (items) => ({
          accepted: items,
          rejected: [],
          uncertain: [],
          metrics: { accepted_for_push: items.length, rejected_precision: 0, uncertain_blocked: 0 },
        }),
        withPriceStateLock: async () => { throw new Error('lock failed'); },
        upsertListings,
        pruneStale: () => 0,
        computeDropMetrics,
        buildIngestPayload: (input) => {
          capturedPayload = input;
          return { run_id: input.runId, items: input.rawItems, meta: {} };
        },
        pushBatch: async () => ({ ok: true }),
      },
    });

    assert.strictEqual(result.exitCode, 0);
    assert.ok(capturedPayload, 'payload should still be built despite price tracking failure');
    assert.strictEqual(capturedPayload.rawItems[0]._price_insights, undefined);

    const logs = parseLogLines(stderr);
    const warnLog = logs.find(l => l.message.includes('Price tracking failed'));
    assert.ok(warnLog, 'should log price tracking failure warning');
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
