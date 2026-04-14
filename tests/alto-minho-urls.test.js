const assert = require('assert');
const {
  generateAltoMinhoSources,
  generateOlxUrls,
  generateImovirtualUrls,
  generateCustoJustoUrls,
  generateCasaSapoUrls,
  ALTO_MINHO_CONCELHOS,
  BORDER_CONCELHOS,
  BORDER_CONCELHO_DISTRICT,
} = require('../src/utils/altoMinhoUrls');

console.log('\n--- alto-minho-urls ---');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (error) {
    console.error(`  FAIL  ${name}`);
    throw error;
  }
}

runTest('ALTO_MINHO_CONCELHOS has all 10 Viana do Castelo municipalities', () => {
  assert.equal(ALTO_MINHO_CONCELHOS.length, 10);
  assert.ok(ALTO_MINHO_CONCELHOS.includes('Ponte de Lima'));
  assert.ok(ALTO_MINHO_CONCELHOS.includes('Arcos de Valdevez'));
  assert.ok(ALTO_MINHO_CONCELHOS.includes('Viana do Castelo'));
  assert.ok(ALTO_MINHO_CONCELHOS.includes('Caminha'));
  assert.ok(ALTO_MINHO_CONCELHOS.includes('Melgaço'));
});

runTest('BORDER_CONCELHOS has all 14 border municipalities (Cávado + Ave + Montalegre)', () => {
  assert.equal(BORDER_CONCELHOS.length, 14);
  // Cávado
  assert.ok(BORDER_CONCELHOS.includes('Barcelos'));
  assert.ok(BORDER_CONCELHOS.includes('Esposende'));
  assert.ok(BORDER_CONCELHOS.includes('Vila Verde'));
  assert.ok(BORDER_CONCELHOS.includes('Terras de Bouro'));
  assert.ok(BORDER_CONCELHOS.includes('Amares'));
  assert.ok(BORDER_CONCELHOS.includes('Braga'));
  // Ave
  assert.ok(BORDER_CONCELHOS.includes('Póvoa de Lanhoso'));
  assert.ok(BORDER_CONCELHOS.includes('Vieira do Minho'));
  assert.ok(BORDER_CONCELHOS.includes('Guimarães'));
  assert.ok(BORDER_CONCELHOS.includes('Fafe'));
  assert.ok(BORDER_CONCELHOS.includes('Vila Nova de Famalicão'));
  assert.ok(BORDER_CONCELHOS.includes('Vizela'));
  assert.ok(BORDER_CONCELHOS.includes('Cabeceiras de Basto'));
  // Vila Real
  assert.ok(BORDER_CONCELHOS.includes('Montalegre'));
});

runTest('generateOlxUrls includes private filter and district-level URLs', () => {
  const urls = generateOlxUrls({ includeBorder: false });
  assert.ok(urls.length >= 3, `Expected >= 3 OLX URLs, got ${urls.length}`);
  assert.ok(urls.every(u => u.includes('olx.pt')));
  assert.ok(urls.every(u => u.includes('private_business')));
  assert.ok(urls.some(u => u.includes('viana-do-castelo')));
});

runTest('generateOlxUrls with border adds municipality-level URLs', () => {
  const withBorder = generateOlxUrls({ includeBorder: true });
  const withoutBorder = generateOlxUrls({ includeBorder: false });
  assert.ok(withBorder.length > withoutBorder.length);
  assert.ok(withBorder.some(u => u.includes('barcelos')));
});

runTest('generateImovirtualUrls includes PRIVATE filter', () => {
  const urls = generateImovirtualUrls({ includeBorder: false });
  assert.ok(urls.length >= 3);
  assert.ok(urls.every(u => u.includes('imovirtual.com')));
  assert.ok(urls.every(u => u.includes('PRIVATE')));
});

runTest('generateCustoJustoUrls has per-concelho URLs with f=p', () => {
  const urls = generateCustoJustoUrls({ includeBorder: false });
  assert.equal(urls.length, 10, 'One URL per Alto Minho concelho');
  assert.ok(urls.every(u => u.includes('custojusto.pt')));
  assert.ok(urls.every(u => u.includes('f=p')));
  assert.ok(urls.every(u => u.includes('imobiliario')));
  assert.ok(urls.some(u => u.includes('ponte-de-lima')));
});

runTest('generateCustoJustoUrls with border has 24 URLs (10 AM + 14 border)', () => {
  const urls = generateCustoJustoUrls({ includeBorder: true });
  assert.equal(urls.length, 24);
});

runTest('generateCasaSapoUrls has per-concelho URLs', () => {
  const urls = generateCasaSapoUrls({ includeBorder: false });
  assert.equal(urls.length, 10);
  assert.ok(urls.every(u => u.includes('casa.sapo.pt')));
  assert.ok(urls.some(u => u.includes('arcos-de-valdevez')));
});

runTest('Montalegre URLs use vila-real district, not braga', () => {
  const ivUrls = generateImovirtualUrls({ includeBorder: true });
  const cjUrls = generateCustoJustoUrls({ includeBorder: true });
  assert.ok(ivUrls.some(u => u.includes('vila-real/montalegre')),
    'Imovirtual should have vila-real/montalegre');
  assert.ok(!ivUrls.some(u => u.includes('braga/montalegre')),
    'Imovirtual should NOT have braga/montalegre');
  assert.ok(cjUrls.some(u => u.includes('vila-real/montalegre')),
    'CustoJusto should have vila-real/montalegre');
});

runTest('every BORDER_CONCELHOS entry has a district mapping', () => {
  for (const c of BORDER_CONCELHOS) {
    assert.ok(BORDER_CONCELHO_DISTRICT[c],
      `${c} missing from BORDER_CONCELHO_DISTRICT`);
  }
});

runTest('generateAltoMinhoSources returns all 4 platforms', () => {
  const sources = generateAltoMinhoSources();
  assert.ok(Array.isArray(sources.olx));
  assert.ok(Array.isArray(sources.imovirtual));
  assert.ok(Array.isArray(sources.custojusto));
  assert.ok(Array.isArray(sources.casasapo));
  assert.ok(sources.olx.length > 0);
  assert.ok(sources.imovirtual.length > 0);
  assert.ok(sources.custojusto.length > 0);
  assert.ok(sources.casasapo.length > 0);
});

runTest('generateAltoMinhoSources without border has fewer URLs', () => {
  const withBorder = generateAltoMinhoSources({ includeBorder: true });
  const withoutBorder = generateAltoMinhoSources({ includeBorder: false });
  const totalWith = Object.values(withBorder).reduce((s, u) => s + u.length, 0);
  const totalWithout = Object.values(withoutBorder).reduce((s, u) => s + u.length, 0);
  assert.ok(totalWith > totalWithout,
    `With border (${totalWith}) should have more URLs than without (${totalWithout})`);
});

runTest('no duplicate URLs within each platform', () => {
  const sources = generateAltoMinhoSources();
  for (const [platform, urls] of Object.entries(sources)) {
    const unique = new Set(urls);
    assert.equal(unique.size, urls.length,
      `${platform} has ${urls.length - unique.size} duplicate URLs`);
  }
});

console.log('  All alto-minho-urls tests passed\n');
