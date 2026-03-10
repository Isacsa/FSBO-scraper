const assert = require('assert');
const {
  normalizeOlxListingUrl,
  looksLikeRealEstateCard,
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
})().catch((error) => {
  process.exitCode = 1;
  throw error;
});
