/**
 * Testes determinísticos para a integração Idealista/Lobstr.
 * Não dependem da rede nem do Lobstr ao correr em CI/local.
 */

const assert = require('assert');
const {
  analyzePhoneSignal,
  classifyIdealistaFsbo
} = require('../src/scrapers/idealista_lobstr/idealista.parse');
const {
  findActiveIdealistaRun,
  shouldUsePartialResults
} = require('../src/scrapers/idealista_lobstr/idealista.extract');

console.log('\nIdealista Lobstr tests');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

runTest('phone rule treats 96 as strong FSBO signal', () => {
  const signal = analyzePhoneSignal('+351 961 234 567');
  assert.equal(signal.phone_signal, 'mobile_prefix_96');
  assert.equal(signal.fsbo_points, 3);
  assert.equal(signal.agency_points, 0);
});

runTest('phone rule treats landline as non-private leaning signal', () => {
  const signal = analyzePhoneSignal('+351 258 123 456');
  assert.equal(signal.phone_signal, 'landline_prefix');
  assert.equal(signal.fsbo_points, 0);
  assert.equal(signal.agency_points, 1);
});

runTest('hybrid classifier marks explicit private listing as fsbo', () => {
  const result = classifyIdealistaFsbo({
    title: 'Apartamento T2 em Ponte de Lima',
    description: 'Venda particular. Sem imobiliárias. Contacto direto do proprietário.',
    phone: '+351961234567',
    mainImage: null
  });

  assert.equal(result.fsbo_decision, 'fsbo');
  assert.equal(result.is_agency, false);
});

runTest('hybrid classifier marks strong agency evidence as agency', () => {
  const result = classifyIdealistaFsbo({
    title: 'Century 21 apartment in Lisbon',
    description: 'Consultor imobiliário. AMI 1234. Real estate broker.',
    phone: '+351961234567',
    mainImage: 'https://example.com/image?width=2048'
  });

  assert.equal(result.fsbo_decision, 'agency');
  assert.equal(result.is_agency, true);
});

runTest('hybrid classifier leaves weak evidence as uncertain', () => {
  const result = classifyIdealistaFsbo({
    title: 'T2 flat in city center',
    description: 'Bright apartment with balcony and garage.',
    phone: '+351258123456',
    mainImage: null
  });

  assert.equal(result.fsbo_decision, 'uncertain');
});

runTest('active run guard finds running Lobstr job', () => {
  const activeRun = findActiveIdealistaRun([
    { id: 'done-1', status: 'completed' },
    { id: 'run-2', status: 'running' }
  ]);

  assert.ok(activeRun);
  assert.equal(activeRun.id, 'run-2');
});

runTest('strict mode never allows partial results', () => {
  const shouldUsePartial = shouldUsePartialResults(new Error('Timeout: run did not finish'), false);
  assert.equal(shouldUsePartial, false);
});

runTest('diagnostic mode may allow partial results after timeout', () => {
  const shouldUsePartial = shouldUsePartialResults(new Error('Timeout: run did not finish'), true);
  assert.equal(shouldUsePartial, true);
});

