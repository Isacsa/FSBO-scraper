const assert = require('assert');
const { detectPlatform, extractPhone, cleanText } = require('../src/utils/selectors');

console.log('🧪 Running FSBO Scraper tests...\n');

assert.equal(detectPlatform('https://www.olx.pt/d/anuncio/teste-ID123.html'), 'olx');
assert.equal(detectPlatform('https://www.imovirtual.com/pt/anuncio/teste/'), 'imovirtual');
assert.equal(detectPlatform('https://www.idealista.pt/imovel/123/'), 'idealista');
assert.equal(detectPlatform('https://www.custojusto.pt/teste'), 'custojusto');
assert.equal(detectPlatform('https://casa.sapo.pt/comprar-casa/teste'), 'casasapo');
assert.equal(detectPlatform('https://example.com/unknown'), null);

assert.equal(extractPhone('+351 912 345 678'), '+351912345678');
assert.equal(extractPhone('No phone here'), null);
assert.equal(cleanText('  Texto   com  espacos  '), 'Texto com espacos');
assert.equal(cleanText(null), null);

console.log('✅ Core selector smoke tests passed');

// CLI / run-scraper tests
require('./run-scraper.test');
require('./scraper-http-flow.test');
require('./scrape-and-push.test');

// Pipeline tests
require('./pipeline-score.test');
require('./pipeline-dedupe.test');
require('./precision-gate.test');
require('./portal-safe-fixes.test');
require('./fsbo-confidence-model.test');
require('./test-idealista-lobstr');
require('./valuation.test');
require('./price-tracker.test');
require('./broad-scraper.test');
require('./buyer-search.test');
require('./alto-minho-urls.test');

