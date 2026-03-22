const assert = require('assert');
const { analyzeFsboSignals } = require('../src/services/fsboSignals');
const { normalizeFinalObject } = require('../src/utils/finalNormalizer');
const { toIngestItem } = require('../src/integration/toIngestPayload');
const corpus = require('./fixtures/fsbo-corpus');

console.log('\nFSBO confidence model tests');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

runTest('marks clear owner-direct listing as fsbo', () => {
  const signals = analyzeFsboSignals({
    title: 'Apartamento T2 em Braga',
    description: 'Venda particular. Sem imobiliarias. Contacto direto do proprietario.',
    advertiser: {
      name: 'Maria Lopes',
      is_agency: false,
      phone: '+351961234567',
      total_ads: '1',
    },
    photos: ['https://example.com/photo1.jpg'],
  }, 'olx');

  assert.equal(signals.fsbo_decision, 'fsbo');
  assert.equal(signals.is_agency, false);
  assert.ok(signals.fsbo_score >= 70);
});

runTest('marks strong agency evidence as agency', () => {
  const signals = analyzeFsboSignals({
    title: 'Moradia T4',
    description: 'Consultor imobiliario. AMI 1234. Visite o nosso escritorio.',
    advertiser: {
      name: 'REMAX Braga',
      is_agency: true,
      total_ads: '25',
    },
    photos: ['https://example.com/watermark-photo.jpg?watermark=true'],
  }, 'imovirtual');

  assert.equal(signals.fsbo_decision, 'agency');
  assert.equal(signals.is_agency, true);
  assert.ok(signals.fsbo_score <= 35);
});

runTest('keeps weak evidence as uncertain', () => {
  const signals = analyzeFsboSignals({
    title: 'T2 no centro',
    description: 'Apartamento renovado com varanda.',
    advertiser: {
      name: null,
      is_agency: null,
    },
    photos: [],
  }, 'casasapo');

  assert.equal(signals.fsbo_decision, 'uncertain');
  assert.equal(signals.is_agency, null);
});

runTest('final normalizer preserves fsbo score and extended signals', () => {
  const normalized = normalizeFinalObject({
    source: 'olx',
    ad_id: '123',
    url: 'https://www.olx.pt/d/anuncio/teste-ID123.html',
    published_date: null,
    updated_date: null,
    timestamp: new Date().toISOString(),
    days_online: null,
    title: 'Apartamento T2',
    description: 'Venda particular',
    location: {},
    price: '150000',
    property: {},
    features: [],
    photos: [],
    advertiser: {
      name: 'Maria Lopes',
      total_ads: null,
      is_agency: null,
      url: null,
    },
    fsbo_score: 78,
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: [],
      fsbo_decision: 'fsbo',
      positive_evidence: ['owner_direct_phrase'],
    },
  });

  assert.equal(normalized.fsbo_score, 78);
  assert.equal(normalized.signals.fsbo_decision, 'fsbo');
});

runTest('ingest payload propagates fsbo score and raw decision metadata', () => {
  const ingestItem = toIngestItem({
    source: 'olx',
    ad_id: '123',
    url: 'https://www.olx.pt/d/anuncio/teste-ID123.html',
    title: 'Apartamento T2',
    description: 'Venda particular',
    price: 150000,
    location: {},
    property: {},
    advertiser: {
      name: 'Maria Lopes',
      is_agency: false,
      url: null,
    },
    fsbo_score: 81,
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: [],
      fsbo_decision: 'fsbo',
    },
  }, 'olx');

  assert.equal(ingestItem.fsbo_score, 81);
  assert.equal(ingestItem.signals.fsbo_decision, 'fsbo');
});

runTest('ingest payload falls back to signals.fsbo_score when item.fsbo_score is missing', () => {
  const ingestItem = toIngestItem({
    source: 'olx',
    ad_id: '456',
    url: 'https://www.olx.pt/d/anuncio/teste-ID456.html',
    title: 'Moradia T3',
    description: 'Venda particular',
    price: 200000,
    location: {},
    property: {},
    advertiser: { name: 'Joao', is_agency: false, url: null },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: [],
      fsbo_score: 74,
      fsbo_decision: 'fsbo',
    },
    // NOTE: fsbo_score is NOT set at item level — only inside signals
  }, 'olx');

  assert.equal(ingestItem.fsbo_score, 74, 'Should fall back to signals.fsbo_score');
});

runTest('qa corpus examples keep score polarity aligned with decisions', () => {
  corpus.accepted.forEach(({ item, source, name }) => {
    const signals = analyzeFsboSignals(item, source);
    assert.ok(signals.fsbo_score >= 60, `Expected stronger FSBO score for ${name}`);
  });

  corpus.rejected.forEach(({ item, source, name }) => {
    const signals = analyzeFsboSignals(item, source);
    if (item.fsbo_decision === 'agency' || item.advertiser?.is_agency === true) {
      assert.ok(
        signals.fsbo_score <= 40 || signals.fsbo_decision === 'agency',
        `Expected low-confidence score for ${name}`
      );
    }
  });
});

runTest('ingest payload propagates valuation data when present', () => {
  const item = {
    source: 'olx',
    ad_id: 'VAL123',
    url: 'https://www.olx.pt/d/anuncio/test-IDval.html',
    title: 'Apt T2 Valuation Test',
    price: '200000',
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    property: { type: 'apartamento', tipology: 'T2', area_useful: '80' },
    advertiser: { name: 'João', is_agency: false },
    photos: [],
    features: [],
    _valuation: {
      score: 7.5,
      label: 'Boa oportunidade',
      deviation_pct: -15.3,
      benchmark_price_sqm: 1850,
      price_per_sqm: 2500,
      confidence: 'medium',
      benchmark_level: 'concelho+tipo',
      bonuses: ['FSBO (sem comissao ~5%)'],
    },
  };
  const result = toIngestItem(item, 'olx');
  assert.ok(result.valuation, 'valuation should be present');
  assert.equal(result.valuation.score, 7.5);
  assert.equal(result.valuation.deviation_pct, -15.3);
  assert.equal(result.valuation.confidence, 'medium');
  assert.deepEqual(result.valuation.bonuses, ['FSBO (sem comissao ~5%)']);
});

runTest('ingest payload propagates price insights when present', () => {
  const item = {
    source: 'olx',
    ad_id: 'PI123',
    url: 'https://www.olx.pt/d/anuncio/test-IDpi.html',
    title: 'Price Insights Test',
    price: '180000',
    location: { district: 'Porto' },
    property: {},
    advertiser: {},
    photos: [],
    features: [],
    _price_insights: {
      days_on_market: 45,
      price_trend: 'dropping',
      price_changes: 2,
      first_seen_price: 200000,
    },
  };
  const result = toIngestItem(item, 'olx');
  assert.ok(result.price_insights, 'price_insights should be present');
  assert.equal(result.price_insights.days_on_market, 45);
  assert.equal(result.price_insights.price_trend, 'dropping');
  assert.equal(result.price_insights.first_seen_price, 200000);
});

runTest('ingest payload sets valuation to null when not present', () => {
  const item = {
    source: 'olx',
    ad_id: 'VAL456',
    url: 'https://www.olx.pt/d/anuncio/test-IDval2.html',
    title: 'No Valuation',
    price: '100000',
    location: {},
    property: {},
    advertiser: {},
    photos: [],
    features: [],
  };
  const result = toIngestItem(item, 'olx');
  assert.equal(result.valuation, null);
});
