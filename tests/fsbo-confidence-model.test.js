const assert = require('assert');
const { analyzeFsboSignals } = require('../src/services/fsboSignals');
const { normalizeFinalObject } = require('../src/utils/finalNormalizer');
const { toIngestItem } = require('../src/integration/toIngestPayload');

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
