/**
 * Tests for buyer search URL builder and orchestrator.
 */

const assert = require('assert');
const { buildSearchUrls, toSlug, buildImovirtualUrls, buildOlxUrls, buildCustoJustoUrls, buildCasaSapoUrls, buildIdealistaUrls, custoJustoPriceToIndex, custoJustoTipologyRange } = require('../src/buyer-search/urlBuilder');
const { parseCliArgs, shouldRunJob, buildCriteriaFromJob, assessExtractionQuality, processJob, main, DEFAULT_COOLDOWN_HOURS } = require('../scripts/buyer-search-scraper');

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
  assert.ok(url.includes('/comprar/apartamento,t3/viana-do-castelo/ponte-de-lima'), `URL path: ${url}`);
  assert.ok(url.includes('priceMax=300000'), `priceMax: ${url}`);
  assert.ok(url.includes('ownerTypeSingleSelect=ALL'), `ownerType: ${url}`);
  assert.ok(!url.includes('roomsNumber'), `should not have roomsNumber: ${url}`);
});

test('buildOlxUrls: correct URL format with filters', () => {
  const urls = buildOlxUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('/imoveis/apartamento-casa-a-venda/q-Ponte-de-Lima/'), `URL path (original casing): ${url}`);
  assert.ok(url.includes('filter_float_price%3Ato'), `price: ${url}`);
  assert.ok(url.includes('filter_enum_tipologia'), `tipologia: ${url}`);
  assert.ok(url.includes('t3'), `t3 value: ${url}`);
  assert.ok(!url.includes('filter_enum_rooms'), `should not have rooms filter: ${url}`);
});

test('buildCustoJustoUrls: correct URL format with indexed scale', () => {
  const urls = buildCustoJustoUrls(SAMPLE_CRITERIA);
  assert.strictEqual(urls.length, 1);
  const url = urls[0].url;
  assert.ok(url.includes('/viana-do-castelo/ponte-de-lima/imobiliario/apartamentos-venda'), `URL path: ${url}`);
  assert.ok(url.includes('pe=14'), `priceMax index 14=300k: ${url}`);
  assert.ok(url.includes('ros=6'), `ros=6 (T3 min): ${url}`);
  assert.ok(url.includes('roe=6'), `roe=6 (T3 max): ${url}`);
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
  assert.ok(imovirtualUrls.some(u => u.url.includes('/apartamento,')));
  assert.ok(imovirtualUrls.some(u => u.url.includes('/moradia,')));
});

console.log('\n--- buyer-search: CustoJusto price/tipology helpers ---');

test('custoJustoPriceToIndex: exact matches', () => {
  assert.strictEqual(custoJustoPriceToIndex(300000, 'max'), 14);
  assert.strictEqual(custoJustoPriceToIndex(150000, 'min'), 9);
  assert.strictEqual(custoJustoPriceToIndex(50000, 'max'), 5);
  assert.strictEqual(custoJustoPriceToIndex(1000000, 'max'), 25);
});

test('custoJustoPriceToIndex: rounding — max rounds UP, min rounds DOWN', () => {
  // 280k is between 250k (13) and 300k (14) → max rounds UP to 14
  assert.strictEqual(custoJustoPriceToIndex(280000, 'max'), 14);
  // 280k → min rounds DOWN to 13 (250k)
  assert.strictEqual(custoJustoPriceToIndex(280000, 'min'), 13);
  // 60k is between 50k (5) and 75k (6) → max rounds UP to 6
  assert.strictEqual(custoJustoPriceToIndex(60000, 'max'), 6);
});

test('custoJustoPriceToIndex: edge cases', () => {
  assert.strictEqual(custoJustoPriceToIndex(null, 'max'), null);
  assert.strictEqual(custoJustoPriceToIndex(0, 'max'), null);
  assert.strictEqual(custoJustoPriceToIndex(2000000, 'max'), 25);
});

test('custoJustoTipologyRange: single tipology', () => {
  const r = custoJustoTipologyRange(['T3']);
  assert.deepStrictEqual(r, { ros: 6, roe: 6 });
});

test('custoJustoTipologyRange: range T2-T3', () => {
  const r = custoJustoTipologyRange(['T2', 'T3']);
  assert.deepStrictEqual(r, { ros: 5, roe: 6 });
});

test('custoJustoTipologyRange: null/empty', () => {
  assert.strictEqual(custoJustoTipologyRange(null), null);
  assert.strictEqual(custoJustoTipologyRange([]), null);
});

console.log('\n--- buyer-search: buildCriteriaFromJob ---');

test('buildCriteriaFromJob: infers district from municipality when districts empty', () => {
  const criteria = buildCriteriaFromJob({
    districts: [],
    municipalities: ['Ponte de Lima'],
    tipologies: ['T3'],
    propertyTypes: ['apartamento'],
    priceMin: 150000,
    priceMax: 300000,
  });
  assert.strictEqual(criteria.district, 'Viana do Castelo');
  assert.deepStrictEqual(criteria.municipalities, ['Ponte de Lima']);
  assert.deepStrictEqual(criteria.tipologies, ['T3']);
  assert.strictEqual(criteria.priceMax, 300000);
});

test('buildCriteriaFromJob: uses districts[0] when available', () => {
  const criteria = buildCriteriaFromJob({
    districts: ['Porto'],
    municipalities: ['Vila Nova de Gaia'],
    tipologies: ['T2'],
    propertyTypes: ['moradia'],
    priceMax: 500000,
  });
  assert.strictEqual(criteria.district, 'Porto');
});

test('buildCriteriaFromJob: generates valid URLs end-to-end', () => {
  const criteria = buildCriteriaFromJob({
    districts: [],
    municipalities: ['Ponte de Lima'],
    tipologies: ['T3'],
    propertyTypes: ['apartamento', 'moradia'],
    priceMax: 300000,
  });
  const urls = buildSearchUrls(criteria);
  assert.ok(urls.length >= 8, `expected >= 8 URLs (2 types × 4+ portals), got ${urls.length}`);
  assert.ok(urls.some(u => u.platform === 'imovirtual'));
  assert.ok(urls.some(u => u.platform === 'olx'));
  assert.ok(urls.some(u => u.platform === 'custojusto'));
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
