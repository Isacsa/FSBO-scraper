const assert = require('assert');
const {
  applyPrecisionGate,
  classifyPrecisionDecision,
} = require('../src/integration/precisionGate');
const corpus = require('./fixtures/fsbo-corpus');

console.log('\nPrecision gate tests');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

runTest('rejects listings without a canonical portal URL', () => {
  const result = classifyPrecisionDecision(
    {
      url: 'nota-valid-url',
      title: 'Apartamento T2',
      advertiser: { name: 'Joao Silva', is_agency: false },
    },
    'olx'
  );

  assert.equal(result.decision, 'reject');
  assert.ok(result.reasons.includes('invalid_canonical_url'));
});

runTest('rejects forbidden categories like garage', () => {
  const result = classifyPrecisionDecision(
    {
      url: 'https://www.olx.pt/d/anuncio/garagem-no-centro-ID123.html',
      title: 'Garagem fechada no centro',
      property: { type: 'garagem' },
      advertiser: { name: 'Joao Silva', is_agency: false },
    },
    'olx'
  );

  assert.equal(result.decision, 'reject');
  assert.ok(result.reasons.includes('forbidden_category'));
});

runTest('blocks placeholder advertiser names without positive fsbo evidence', () => {
  const result = classifyPrecisionDecision(
    {
      url: 'https://www.custojusto.pt/braga/imobiliario/apartamentos/t2-braga-44325290',
      title: 'Apartamento T2',
      advertiser: { name: 'Particular', is_agency: null },
      description: 'Apartamento remodelado e com varanda.',
    },
    'custojusto'
  );

  assert.equal(result.decision, 'uncertain');
  assert.ok(result.reasons.includes('placeholder_advertiser_without_fsbo_signal'));
});

runTest('blocks listings that have no positive fsbo evidence yet', () => {
  const result = classifyPrecisionDecision(
    {
      url: 'https://www.custojusto.pt/lisboa/imobiliario/apartamentos/apartamento-t2-12345678',
      title: 'Apartamento T2 em Lisboa',
      description: 'Apartamento remodelado e pronto a habitar.',
      advertiser: { name: 'Jose Silva', is_agency: null },
      fsbo_score: 45,
    },
    'custojusto'
  );

  assert.equal(result.decision, 'uncertain');
  assert.ok(result.reasons.includes('missing_positive_fsbo_evidence'));
});

runTest('accepts listings with explicit fsbo evidence', () => {
  const gate = applyPrecisionGate([
    {
      url: 'https://www.idealista.pt/imovel/123456/',
      title: 'Apartamento T2 em Lisboa',
      description: 'Venda particular. Sem imobiliarias. Contacto direto do proprietario.',
      advertiser: { name: 'Maria Lopes', is_agency: false },
      fsbo_score: 74,
      fsbo_decision: 'fsbo',
    },
  ], 'idealista');

  assert.equal(gate.metrics.accepted_for_push, 1);
  assert.equal(gate.metrics.rejected_precision, 0);
  assert.equal(gate.metrics.uncertain_blocked, 0);
});

runTest('qa corpus stays partitioned into accept / uncertain / reject buckets', () => {
  corpus.accepted.forEach((entry) => {
    const result = classifyPrecisionDecision(entry.item, entry.source);
    assert.equal(result.decision, 'accept', `Expected accept for ${entry.name}`);
  });

  corpus.uncertain.forEach((entry) => {
    const result = classifyPrecisionDecision(entry.item, entry.source);
    assert.equal(result.decision, 'uncertain', `Expected uncertain for ${entry.name}`);
  });

  corpus.rejected.forEach((entry) => {
    const result = classifyPrecisionDecision(entry.item, entry.source);
    assert.equal(result.decision, 'reject', `Expected reject for ${entry.name}`);
  });
});
