const assert = require('assert');
const {
  normalizeOlxListingUrl,
  looksLikeRealEstateCard,
  parseCardData,
} = require('../src/scrapers/olx/olx.listings');
const normalizeCustoJustoAd = require('../src/scrapers/custojusto/custojusto.normalize').normalizeAd;
const normalizeCasaSapoAd = require('../src/scrapers/casasapo/casasapo.normalize').normalizeAd;
const normalizeImovirtualAd = require('../src/scrapers/imovirtual/normalize');
const { canonicalizeAdUrl } = require('../pipeline/deduplicate');

console.log('\nPortal safe fixes tests');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

(async () => {
  await runTest('OLX only keeps canonical olx.pt ad URLs', async () => {
    assert.equal(
      normalizeOlxListingUrl('https://www.olx.pt/d/anuncio/apartamento-t2-ID123.html?isPreviewActive=0'),
      'https://www.olx.pt/d/anuncio/apartamento-t2-ID123.html'
    );
    assert.equal(normalizeOlxListingUrl('https://www.standvirtual.com/anuncio/teste'), null);
  });

  await runTest('OLX card filter rejects obvious non real estate cards', async () => {
    assert.equal(looksLikeRealEstateCard('BMW 320d impecável, 190cv, 2019'), false);
    assert.equal(looksLikeRealEstateCard('Apartamento T2 com varanda e 92 m2'), true);
  });

  await runTest('CustoJusto no longer hardcodes unknown advertisers as private', async () => {
    const normalized = await normalizeCustoJustoAd({
      ad_id: 'cj-1',
      url: 'https://www.custojusto.pt/braga/imobiliario/apartamentos/t2-braga-44325290',
      title: 'Apartamento T2',
      description: 'Apartamento com varanda',
      price: '150000',
      photos: [],
      features: [],
      specifications: {},
      advertiser: null,
      phone: null,
    });

    assert.equal(normalized.advertiser.name, null);
    assert.equal(normalized.advertiser.is_agency, null);
  });

  await runTest('CasaSapo placeholder advertiser names stay unknown', async () => {
    const normalized = await normalizeCasaSapoAd({
      ad_id: 'cs-1',
      url: 'https://casa.sapo.pt/comprar-apartamento/lisboa/teste.html',
      title: 'Apartamento T1',
      description: 'Boa oportunidade.',
      price: '120000',
      features: [],
      photos: [],
      specifications: {},
      advertiser_name: 'Email SMS',
      phone: null,
      published_date: null,
      updated_date: null,
    });

    assert.equal(normalized.advertiser.name, null);
    assert.equal(normalized.advertiser.is_agency, null);
  });

  await runTest('Imovirtual keeps unknown advertiser agency state until signals', async () => {
    const normalized = await normalizeImovirtualAd(
      {
        ad_id: 'imo-1',
        title: 'Moradia T3',
        description: 'Moradia com jardim',
        price: '320000',
        published_date: null,
        updated_date: null,
        advertiser: { name: 'Maria Lopes', url: null },
        photos: [],
        features: { _raw: {} },
      },
      'https://www.imovirtual.com/pt/anuncio/teste-ID123456.html',
      'imovirtual'
    );

    assert.equal(normalized.advertiser.is_agency, null);
  });

  await runTest('withFileLock removes stale locks and throws on exhausted retries', async () => {
    const fs = require('fs');
    const path = require('path');
    const { withFileLock } = require('../src/core/state/fileStateStore');
    const lockPath = path.join(__dirname, '.test-lock-stale');

    // Clean up from previous runs
    try { fs.unlinkSync(lockPath); } catch (e) {}

    // Create a stale lock file with old mtime
    fs.writeFileSync(lockPath, '99999');
    const past = new Date(Date.now() - 60000);
    fs.utimesSync(lockPath, past, past);

    // withFileLock should detect stale lock, remove it, and succeed
    let called = false;
    await withFileLock(lockPath, async () => { called = true; }, { retries: 3, retryDelayMs: 10, staleLockMs: 5000 });
    assert.ok(called, 'Function should have been called after stale lock removal');
    assert.ok(!fs.existsSync(lockPath), 'Lock file should be cleaned up');

    // Now test that an active lock (not stale) causes throw after retries
    fs.writeFileSync(lockPath, String(process.pid));
    try {
      await withFileLock(lockPath, async () => {}, { retries: 2, retryDelayMs: 10, staleLockMs: 300000 });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('Failed to acquire file lock'));
    }
    try { fs.unlinkSync(lockPath); } catch (e) {}
  });

  await runTest('Deduplication canonicalizes Imovirtual hpr URLs', async () => {
    assert.equal(
      canonicalizeAdUrl('https://www.imovirtual.com/hpr/pt/anuncio/teste-ID123.html?foo=bar#section'),
      'https://www.imovirtual.com/pt/anuncio/teste-ID123.html'
    );
  });
  // --- Area from Description Tests ---
  const { extractAreaFromDescription, cleanItem } = require('../src/integration/dataCleaner');

  await runTest('extractAreaFromDescription: "120m2"', async () => {
    const r = extractAreaFromDescription('Moradia com 120m2 e garagem');
    assert.ok(r);
    assert.equal(r.area, 120);
    assert.equal(r.source, 'description');
  });

  await runTest('extractAreaFromDescription: "80 m²"', async () => {
    const r = extractAreaFromDescription('Apartamento com 80 m² remodelado');
    assert.ok(r);
    assert.equal(r.area, 80);
  });

  await runTest('extractAreaFromDescription: "área útil: 65m2"', async () => {
    const r = extractAreaFromDescription('O imóvel tem área útil: 65m2, cozinha equipada');
    assert.ok(r);
    assert.equal(r.area, 65);
  });

  await runTest('extractAreaFromDescription: "150 metros quadrados"', async () => {
    const r = extractAreaFromDescription('Moradia de 150 metros quadrados');
    assert.ok(r);
    assert.equal(r.area, 150);
  });

  await runTest('extractAreaFromDescription: rejects outlier (5m2)', async () => {
    const r = extractAreaFromDescription('Sala com 5m2 de despensa');
    assert.equal(r, null);
  });

  await runTest('extractAreaFromDescription: rejects no match', async () => {
    const r = extractAreaFromDescription('Moradia bonita em Lisboa');
    assert.equal(r, null);
  });

  await runTest('cleanItem fills area_useful from description when both areas are empty', async () => {
    const item = {
      source: 'olx',
      title: 'Apt',
      description: 'Apartamento com 95m2 em Porto',
      price: '200000',
      location: { district: 'Porto' },
      property: { type: 'apartamento', area_total: '', area_useful: '' },
      advertiser: {},
      photos: [],
      features: [],
    };
    const result = cleanItem(item, 'olx');
    assert.equal(result.property.area_useful, 95);
    assert.equal(result.property._area_source, 'description');
  });

  // --- parseCardData tests ---

  await runTest('parseCardData extracts title, price, location, area from OLX card', async () => {
    const card = parseCardData({
      titleText: 'Moradia T4 com Terreno375.000 €',
      priceText: '375.000 €',
      smallTexts: ['375.000 €', 'Argela - Para o topo a 26 de março de 2026', '250 m²'],
      thumbnail: 'https://ireland.apollo.olxcdn.com/v1/files/test/image;s=216x152',
    });
    assert.equal(card.title, 'Moradia T4 com Terreno');
    assert.equal(card.price, 375000);
    assert.equal(card.location, 'Argela');
    assert.equal(card.area, 250);
    assert.ok(card.thumbnail.includes('olxcdn.com'));
  });

  await runTest('parseCardData handles price with Negociável suffix', async () => {
    const card = parseCardData({
      titleText: 'Armazém 300m²299.000 €Negociável',
      priceText: '299.000 €Negociável',
      smallTexts: ['299.000 €Negociável', 'Negociável', 'Valença, Cristelo Covo E Arão - Para o topo hoje às 07:19', '685 m²'],
      thumbnail: '',
    });
    assert.equal(card.price, 299000);
    assert.equal(card.location, 'Valença, Cristelo Covo E Arão');
    assert.equal(card.area, 685);
  });

  await runTest('parseCardData handles card with no area', async () => {
    const card = parseCardData({
      titleText: 'T1 Centro600 €',
      priceText: '600 €',
      smallTexts: ['600 €', 'Viana do Castelo - 21 de março de 2026'],
      thumbnail: '',
    });
    assert.equal(card.price, 600);
    assert.equal(card.area, null);
    assert.equal(card.location, 'Viana do Castelo');
  });

  // --- HttpError tests ---
  const { HttpError } = require('../src/utils/browser');

  await runTest('HttpError carries status code and URL', async () => {
    const err = new HttpError(403, 'https://www.olx.pt/d/anuncio/test-ID123.html');
    assert.equal(err.status, 403);
    assert.equal(err.name, 'HttpError');
    assert.ok(err.message.includes('403'));
    assert.ok(err.message.includes('olx.pt'));
    assert.ok(err instanceof Error);
  });

  await runTest('cleanItem does NOT override existing area_useful from description', async () => {
    const item = {
      source: 'olx',
      title: 'Apt',
      description: 'Apartamento com 95m2 em Porto',
      price: '200000',
      location: { district: 'Porto' },
      property: { type: 'apartamento', area_total: '', area_useful: '80' },
      advertiser: {},
      photos: [],
      features: [],
    };
    const result = cleanItem(item, 'olx');
    assert.equal(result.property.area_useful, 80);
  });

  // --- Municipality-to-District Map Tests ---
  const { getDistrictForMunicipality } = require('../src/utils/municipalityDistrictMap');

  await runTest('getDistrictForMunicipality: Ponte de Lima -> Viana do Castelo', async () => {
    assert.equal(getDistrictForMunicipality('Ponte de Lima'), 'Viana do Castelo');
  });

  await runTest('getDistrictForMunicipality: case insensitive', async () => {
    assert.equal(getDistrictForMunicipality('ponte de lima'), 'Viana do Castelo');
  });

  await runTest('getDistrictForMunicipality: accented input', async () => {
    assert.equal(getDistrictForMunicipality('Monção'), 'Viana do Castelo');
    assert.equal(getDistrictForMunicipality('moncao'), 'Viana do Castelo');
  });

  await runTest('getDistrictForMunicipality: returns null for unknown', async () => {
    assert.equal(getDistrictForMunicipality('Atlantis'), null);
    assert.equal(getDistrictForMunicipality(null), null);
    assert.equal(getDistrictForMunicipality(''), null);
  });

  // --- District Inference in dataCleaner ---

  await runTest('cleanItem infers district from municipality when missing (CustoJusto)', async () => {
    const item = {
      title: 'Moradia T3',
      price: '270000',
      location: { district: '', municipality: 'Ponte de Lima', parish: 'Anais' },
      property: { type: 'moradia', tipology: 'T3' },
      advertiser: {},
      photos: [],
      features: [],
    };
    const result = cleanItem(item, 'custojusto');
    assert.equal(result.location.district, 'Viana do Castelo');
  });

  await runTest('cleanItem does NOT override existing district', async () => {
    const item = {
      title: 'Moradia T3',
      price: '270000',
      location: { district: 'Viana do Castelo', municipality: 'Ponte de Lima' },
      property: { type: 'moradia', tipology: 'T3' },
      advertiser: {},
      photos: [],
      features: [],
    };
    const result = cleanItem(item, 'custojusto');
    assert.equal(result.location.district, 'Viana do Castelo');
  });
})().catch((error) => {
  process.exitCode = 1;
  throw error;
});
