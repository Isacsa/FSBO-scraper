/**
 * Broad Scraper — unit + integration tests.
 *
 * Run: node tests/broad-scraper.test.js
 */

const assert = require('assert');

const { main, parseCliArgs, shouldRunConfig, assessExtractionQuality, BROAD_STATE_FILE } = require('../scripts/broad-scraper');

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

// ── CLI & config ────────────────────────────────────────────────────────────

console.log('\n--- broad-scraper: CLI ---');

test('parseCliArgs: defaults', () => {
  const args = parseCliArgs([]);
  assert.strictEqual(args.runNow, false);
  assert.strictEqual(args.dryRun, false);
  assert.strictEqual(args.forceAll, false);
  assert.strictEqual(args.incremental, true);
  assert.strictEqual(args.configId, null);
});

test('parseCliArgs: all flags', () => {
  const args = parseCliArgs(['--run-now', '--dry-run', '--force-all', '--config-id=abc-123', '--legacy']);
  assert.strictEqual(args.runNow, true);
  assert.strictEqual(args.dryRun, true);
  assert.strictEqual(args.forceAll, true);
  assert.strictEqual(args.incremental, false);
  assert.strictEqual(args.configId, 'abc-123');
});

test('shouldRunConfig: runNow=true always runs', () => {
  assert.strictEqual(shouldRunConfig({ last_run_at: new Date().toISOString() }, { runNow: true }), true);
});

test('shouldRunConfig: no last_run_at always runs', () => {
  assert.strictEqual(shouldRunConfig({}, {}), true);
});

test('assessExtractionQuality returns OK for good data', () => {
  const items = [
    { title: 'A', price: '200000', location: { district: 'Porto', municipality: 'Porto' }, property: { area_useful: 80 }, photos: ['img.jpg'] },
    { title: 'B', price: '300000', location: { district: 'Porto', municipality: 'Porto' }, property: { area_useful: 120 }, photos: ['img.jpg'] },
  ];
  assert.strictEqual(assessExtractionQuality(items).verdict, 'OK');
});

test('assessExtractionQuality returns EMPTY for empty array', () => {
  assert.strictEqual(assessExtractionQuality([]).verdict, 'EMPTY');
});

test('BROAD_STATE_FILE is separate from FSBO state', () => {
  assert.ok(BROAD_STATE_FILE.includes('broad'), 'state file should contain "broad"');
  assert.notStrictEqual(BROAD_STATE_FILE, 'data/incremental_state.json', 'must not be the FSBO state file');
});

// ── Orchestrator ────────────────────────────────────────────────────────────

console.log('\n--- broad-scraper: orchestrator ---');

testAsync('missing env vars — exits with code 1', async () => {
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

testAsync('no broadScraper-enabled configs — exits cleanly', async () => {
  const result = await main({
    argv: ['--run-now'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    deps: {
      pullConfigs: async () => [{ id: 'cfg-1', sources: { olx: 'url' }, options: {} }],
    },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.summary.configsProcessed, 0);
});

testAsync('--force-all runs configs without broadScraper.enabled', async () => {
  let pushed = false;
  const result = await main({
    argv: ['--run-now', '--force-all', '--dry-run', '--legacy'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    stdout: { write: () => { pushed = true; } },
    stderr: { write: () => {} },
    exit: () => {},
    deps: {
      pullConfigs: async () => [{ id: 'cfg-1', area_label: 'Test', sources: { olx: 'http://olx.pt/test' }, options: {} }],
      runPlatform: async () => ({ results: [{ url: 'https://www.olx.pt/d/anuncio/test-IDxyz.html', title: 'Test', price: '100000' }] }),
      cleanItem: (i) => i,
      dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
      filterSalesOnly: (items) => items,
      buildIngestPayload: (opts) => ({ items: opts.rawItems, scrape_mode: 'broad' }),
      randomUUID: () => 'test-uuid',
    },
  });

  assert.strictEqual(result.summary.configsProcessed, 1);
  assert.ok(pushed, 'dry-run should output payload');
});

testAsync('scrapes with filterPrivateOnly=false and filterAgencies=false', async () => {
  let capturedOptions = null;

  const result = await main({
    argv: ['--run-now', '--dry-run', '--legacy'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    deps: {
      randomUUID: () => 'run-test',
      pullConfigs: async () => [{
        id: 'cfg-broad',
        area_label: 'Broad Test',
        sources: { olx: 'https://www.olx.pt/imoveis/' },
        options: { broadScraper: { enabled: true } },
      }],
      runPlatform: async (args) => {
        capturedOptions = args.options;
        return { results: [] };
      },
      cleanItem: (item) => item,
      dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
      filterSalesOnly: (items) => items,
      buildIngestPayload: (input) => ({ run_id: input.runId, items: [], meta: {} }),
      pushBatch: async () => ({}),
    },
  });

  assert.ok(capturedOptions, 'runPlatform should have been called');
  assert.strictEqual(capturedOptions.filterPrivateOnly, false, 'must scrape all sellers');
  assert.strictEqual(capturedOptions.filterAgencies, false, 'must not filter agencies');
});

testAsync('dry-run outputs payload with scrape_mode=broad', async () => {
  const output = [];

  const result = await main({
    argv: ['--run-now', '--dry-run', '--legacy'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    stdout: { write: (s) => output.push(s) },
    stderr: { write: () => {} },
    exit: () => {},
    deps: {
      randomUUID: () => 'run-broad',
      pullConfigs: async () => [{
        id: 'cfg-broad-2',
        area_label: 'Viana do Castelo',
        sources: { olx: 'https://www.olx.pt/imoveis/' },
        options: { broadScraper: { enabled: true } },
      }],
      runPlatform: async () => ({
        results: [
          { url: 'https://www.olx.pt/d/anuncio/moradia-123', title: 'Moradia T3', price: 250000, source: 'olx', location: { district: 'Viana do Castelo' }, property: { type: 'moradia' }, advertiser: { name: 'Agencia X', is_agency: true } },
          { url: 'https://www.olx.pt/d/anuncio/apartamento-456', title: 'Apartamento T2', price: 180000, source: 'olx', location: { district: 'Viana do Castelo' }, property: { type: 'apartamento' }, advertiser: { name: 'Joao', is_agency: false } },
        ],
      }),
      cleanItem: (item) => item,
      dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
      filterSalesOnly: (items) => items,
      buildIngestPayload: (input) => ({
        run_id: input.runId,
        config_id: input.configId,
        source: input.source,
        items: input.rawItems.map(i => ({ canonical_url: i.url, title: i.title })),
        meta: {},
      }),
      pushBatch: async () => ({}),
    },
  });

  assert.strictEqual(result.exitCode, 0);
  assert.ok(output.length > 0, 'should have stdout output');

  const payload = JSON.parse(output[0]);
  assert.strictEqual(payload.scrape_mode, 'broad', 'payload must have scrape_mode=broad');
  assert.strictEqual(payload.items.length, 2, 'should include agency AND private listings');
});

testAsync('live mode pushes payload via pushBatch', async () => {
  const pushed = [];

  const result = await main({
    argv: ['--run-now', '--legacy'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    deps: {
      randomUUID: () => 'run-live',
      pullConfigs: async () => [{
        id: 'cfg-live',
        area_label: 'Live',
        sources: { olx: 'https://www.olx.pt/imoveis/' },
        options: { broadScraper: { enabled: true } },
      }],
      runPlatform: async () => ({
        results: [
          { url: 'https://www.olx.pt/d/anuncio/moradia-1', title: 'M1', price: 200000, source: 'olx', location: {}, property: {}, advertiser: {} },
        ],
      }),
      cleanItem: (item) => item,
      dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
      filterSalesOnly: (items) => items,
      buildIngestPayload: (input) => ({
        run_id: input.runId,
        scrape_mode: null,
        items: input.rawItems,
        meta: {},
      }),
      pushBatch: async (payload, opts) => {
        pushed.push({ payload, opts });
        return { ok: true };
      },
    },
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(pushed.length, 1);
  assert.strictEqual(pushed[0].payload.scrape_mode, 'broad');
});

testAsync('incremental mode uses broad-specific state file and scope key', async () => {
  let capturedIncrOpts = null;

  const result = await main({
    argv: ['--run-now', '--dry-run'],
    env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
    exit: () => {},
    deps: {
      randomUUID: () => 'run-inc',
      pullConfigs: async () => [{
        id: 'cfg-inc',
        area_label: 'Inc Test',
        sources: { olx: 'https://www.olx.pt/imoveis/' },
        options: { broadScraper: { enabled: true } },
      }],
      runPlatform: async () => ({
        results: [
          { url: 'https://www.olx.pt/d/anuncio/moradia-inc', title: 'M', price: 150000, source: 'olx', location: {}, property: {}, advertiser: {} },
        ],
      }),
      cleanItem: (item) => item,
      dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
      filterSalesOnly: (items) => items,
      applyIncremental: async (items, opts) => {
        capturedIncrOpts = opts;
        return {
          items: items.map(i => ({ ...i, _status: 'NEW' })),
          meta: { new: items.length, updated: 0, unchanged: 0, removed: 0 },
        };
      },
      buildIngestPayload: (input) => ({ run_id: input.runId, items: input.rawItems, meta: {} }),
      pushBatch: async () => ({}),
    },
  });

  assert.ok(capturedIncrOpts, 'applyIncremental should be called');
  assert.ok(capturedIncrOpts.stateFile.includes('broad'), 'state file should be broad-specific');
  assert.ok(capturedIncrOpts.scopeKey.startsWith('broad|'), 'scope key should have broad| prefix');
});

// ── Finish ──────────────────────────────────────────────────────────────────

setTimeout(summary, 500);
