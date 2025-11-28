/**
 * Testes básicos para o FSBO Scraper
 */

const { detectPlatform, extractPhone, cleanText } = require('../src/utils/selectors');

console.log('🧪 Running FSBO Scraper tests...\n');

// Teste 1: Detecção de plataforma
console.log('Test 1: Platform detection');
const testUrls = [
  'https://fsbo.com/listing/123',
  'https://www.forsalebyowner.com/property/456',
  'https://example.com/unknown'
];

testUrls.forEach(url => {
  const platform = detectPlatform(url);
  console.log(`  ${url} -> ${platform || 'null'}`);
});

// Teste 2: Extração de telefone
console.log('\nTest 2: Phone extraction');
const phoneTests = [
  '(123) 456-7890',
  '123-456-7890',
  '123.456.7890',
  '+1 123 456 7890',
  '1-123-456-7890',
  'No phone here'
];

phoneTests.forEach(text => {
  const phone = extractPhone(text);
  console.log(`  "${text}" -> ${phone || 'null'}`);
});

// Teste 3: Limpeza de texto
console.log('\nTest 3: Text cleaning');
const textTests = [
  '  Hello   World  ',
  'Text\nwith\nnewlines',
  null,
  undefined
];

textTests.forEach(text => {
  const cleaned = cleanText(text);
  console.log(`  "${text}" -> "${cleaned || 'null'}"`);
});

console.log('\n✅ Tests completed!');

// CLI / run-scraper tests
require('./run-scraper.test');

// Pipeline tests
require('./pipeline-score.test');
require('./pipeline-dedupe.test');


