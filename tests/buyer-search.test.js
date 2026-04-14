/**
 * Tests for buyer search URL builder and orchestrator.
 */

const assert = require('assert');
const { buildSearchUrls, toSlug, buildImovirtualUrls, buildOlxUrls, buildCustoJustoUrls, buildCasaSapoUrls, buildIdealistaUrls } = require('../src/buyer-search/urlBuilder');
const { parseCliArgs, shouldRunJob, assessExtractionQuality, processJob, main, DEFAULT_COOLDOWN_HOURS } = require('../scripts/buyer-search-scraper');

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

function testAsync(name, fn) {
  return fn().then(() => {
    console.log(`  PASS  ${name}`);
  }).catch(err => {
    console.error(`  FAIL  ${name}: ${err.message}`);
    process.exitCode = 1;
  });
}

console.log('\n--- buyer-search: urlBuilder ---');

test('toSlug: basic conversion', () => {
  assert.strictEqual(toSlug('Ponte de Lima'), 'ponte-de-lima');
  assert.strictEqual(toSlug('Viana do Castelo'), 'viana-do-castelo');
  assert.strictEqual(toSlug('Arcos de Valdevez'), 'arcos-de-valdevez');
});

test('toSlug: handles accents', () => {
  assert.strictEqual(toSlug('Monção'), 'moncao');
  assert.strictEqual(toSlug('São João da Madeira'), 'sao-joao-da-madeira');
  assert.strictEqual(toSlug('Valença'), 'valenca');
});

test('toSlug: handles null/empty', () => {
  assert.strictEqual(toSlug(null), '');
  assert.strictEqual(toSlug(''), '');
  assert.strictEqual(toSlug(undefined), '');
});

test('buildSearchUrls: returns empty for missing criteria', () => {
  assert.deepStrictEqual(buildSearchUrls(null), []);
  assert.deepStrictEqual(buildSearchUrls({}), []);
  assert.deepStrictEqual(buildSearchUrls({ municipalities: [] }), []);
  assert.deepStrictEqual(buildSearchUrls({ municipalities: ['Ponte de Lima'] }), []);
});

const SAMPLE_CRITERIA = {
  propertyTypes: ['apartamento'],
  tipologies: ['T3'],
  district: 'Viana do Castelo',
  municipalities: ['Ponte de Lima'],
  priceMax: 300000,
};

test('buildSearchUrls: generates URLs for all 5 portals', () => {
  const urls = buildSearchUrls(SAMPLE_CRITERIA);
  const platforms = [...new Set(urls.map(u => u.platform))];
  assert.ok(platforms.includes('imovirtual'), 'should include imovirtual');
  assert.ok(platforms.includes('olx'), 'should include olx');
  assert.ok(platforms.includes('custojusto'), 'should include custojusto');
  assert.ok(platforms.includes('casasapo'), 'should include casasapo');
  assert.ok(platforms.includes('idealista'), 'should include idealista');
});

test('buildSearchUrls: respects portals filter', () => {
  const urls = buildSearchUrls({ ...SAMPLE_CRITERIA, portals: ['imovirtual', 'olx'] });
  const platforms = [...new Set(urls.map(u => u.platform))];
  assert.deepStrictEqual(platforms.sort(), ['imovirtual', 'olx']);
});

test('buildImovirtualUrls: correct URL format with filters', () => {
  const urls = buildImovirtualUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('/comprar/apartamento/viana-do-castelo/ponte-de-lima'), `URL path: ${url}`);
  assert.ok(url.includes('priceMax=300000'), `priceMax: ${url}`);
  assert.ok(url.includes('roomsNumber=%5BTHREE%5D'), `rooms: ${url}`);
});

test('buildOlxUrls: correct URL format with filters', () => {
  const urls = buildOlxUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('/imoveis/apartamento-casa-a-venda/q-ponte-de-lima/'), `URL path: ${url}`);
  assert.ok(url.includes('300000'), `price: ${url}`);
});

test('buildCustoJustoUrls: correct URL format with filters', () => {
  const urls = buildCustoJustoUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('/viana-do-castelo/ponte-de-lima/imobiliario/apartamentos'), `URL path: ${url}`);
  assert.ok(url.includes('pe=300000'), `price: ${url}`);
});

test('buildCasaSapoUrls: correct URL format', () => {
  const urls = buildCasaSapoUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('casa.sapo.pt/comprar-apartamentos/ponte-de-lima'), `URL: ${url}`);
  assert.ok(url.includes('pmax=300000'), `price: ${url}`);
});

test('buildIdealistaUrls: correct URL format', () => {
  const urls = buildIdealistaUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('idealista.pt/comprar-apartamentos/ponte-de-lima'), `URL: ${url}`);
});

test('buildSearchUrls: multiple property types generate multiple URLs per portal', () => {
  const criteria = { ...SAMPLE_CRITERIA, propertyTypes: ['apartamento', 'moradia'] };
  const urls = buildSearchUrls(criteria);
  const imovirtualUrls = urls.filter(u => u.platform === 'imovirtual');
  assert.strictEqual(imovirtualUrls.length, 2);
  assert.ok(imovirtualUrls.some(u => u.url.includes('/apartamento/')));
  assert.ok(imovirtualUrls.some(u => u.url.includes('/moradia/')));
});

console.log('\n--- buyer-search: CLI ---');

test('parseCliArgs: defaults', () => {
  const args = parseCliArgs([]);
  assert.strictEqual(args.runNow, false);
  assert.strictEqual(args.dryRun, false);
  assert.strictEqual(args.jobId, null);
});

test('parseCliArgs: all flags', () => {
  const args = parseCliArgs(['--run-now', '--dry-run', '--job-id=abc-123']);
  assert.strictEqual(args.runNow, true);
  assert.strictEqual(args.dryRun, true);
  assert.strictEqual(args.jobId, 'abc-123');
});

test('shouldRunJob: runNow=true always runs', () => {
  assert.strictEqual(shouldRunJob({ lastScrapedAt: new Date().toISOString() }, { runNow: true }), true);
});

test('shouldRunJob: no lastScrapedAt always runs', () => {
  assert.strictEqual(shouldRunJob({}, {}), true);
});

test('shouldRunJob: within cooldown does not run', () => {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  assert.strictEqual(shouldRunJob({ lastScrapedAt: oneHourAgo }, { cooldownMs: 12 * 3600000 }), false);
});

test('shouldRunJob: past cooldown runs', () => {
  const twentyHoursAgo = new Date(Date.now() - 20 * 3600000).toISOString();
  assert.strictEqual(shouldRunJob({ lastScrapedAt: twentyHoursAgo }, { cooldownMs: 12 * 3600000 }), true);
});

test('assessExtractionQuality: empty array', () => {
  const q = assessExtractionQuality([]);
  assert.strictEqual(q.verdict, 'EMPTY');
});

console.log('\n--- buyer-search: orchestrator ---');

(async () => {
  await testAsync('missing env vars — exits with code 1', async () => {
    const result = await main({
      argv: ['--run-now'],
      env: {},
      deps: {},
      stdout: { write: () => {} },
      stderr: { write: () => {} },
      exit: () => {},
    });
    assert.strictEqual(result.exitCode, 1);
  });

  await testAsync('no jobs — exits cleanly', async () => {
    const result = await main({
      argv: ['--run-now'],
      env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
      deps: {
        pullBuyerSearchJobs: async () => [],
      },
      stdout: { write: () => {} },
      stderr: { write: () => {} },
      exit: () => {},
    });
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.summary.jobsProcessed, 0);
  });

  await testAsync('dry-run processes job and outputs payload', async () => {
    let outputPayload = '';
    const result = await main({
      argv: ['--run-now', '--dry-run'],
      env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
      stdout: { write: (s) => { outputPayload += s; } },
      stderr: { write: () => {} },
      exit: () => {},
      deps: {
        pullBuyerSearchJobs: async () => [{
          id: 'job-1',
          criteria: {
            propertyTypes: ['apartamento'],
            tipologies: ['T3'],
            district: 'Viana do Castelo',
            municipalities: ['Ponte de Lima'],
            priceMax: 300000,
          },
          lastScrapedAt: null,
        }],
        buildSearchUrls: (criteria) => [
          { platform: 'imovirtual', url: 'https://www.imovirtual.com/test', propertyType: 'apartamento' },
        ],
        runPlatform: async () => ({
          results: [{
            url: 'https://www.imovirtual.com/pt/anuncio/test-ID123',
            title: 'Apartamento T3 Ponte de Lima',
            price: '250000',
            location: { district: 'Viana do Castelo', municipality: 'Ponte de Lima' },
            property: { type: 'apartamento', tipology: 'T3' },
            advertiser: { name: 'Teste' },
            photos: [],
            features: [],
          }],
        }),
        cleanItem: (i) => i,
        dedupeListInMemory: (items) => ({ unique: items, duplicates: [] }),
        filterSalesOnly: (items) => items,
        buildIngestPayload: (opts) => ({
          items: opts.rawItems,
          buyer_profile_id: opts.buyerProfileId,
          scrape_mode: 'buyer_search',
        }),
        randomUUID: () => 'test-uuid',
      },
    });

    assert.strictEqual(result.summary.jobsProcessed, 1);
    assert.strictEqual(result.summary.totalItems, 1);
    assert.ok(outputPayload.length > 0, 'should output payload in dry-run');
    const parsed = JSON.parse(outputPayload);
    assert.strictEqual(parsed.buyer_profile_id, 'job-1');
    assert.strictEqual(parsed.scrape_mode, 'buyer_search');
  });

  await testAsync('cooldown skips recently scraped jobs', async () => {
    const result = await main({
      argv: [],
      env: { APP_API_URL: 'http://test', SCRAPER_API_KEY: 'key', SCRAPER_TENANT_ID: 'tid' },
      deps: {
        pullBuyerSearchJobs: async () => [{
          id: 'job-1',
          criteria: { district: 'Test', municipalities: ['Test'] },
          lastScrapedAt: new Date().toISOString(),
        }],
      },
      stdout: { write: () => {} },
      stderr: { write: () => {} },
      exit: () => {},
    });
    assert.strictEqual(result.summary.jobsProcessed, 0);
    assert.strictEqual(result.summary.jobsSkipped, 1);
  });
})().catch(err => {
  process.exitCode = 1;
  throw err;
});
