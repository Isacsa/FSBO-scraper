/**
 * Teste rápido de um anúncio individual do CustoJusto
 */

const { extractAdDetails } = require('../src/scrapers/custojusto/custojusto.extract');
const { parseAdData } = require('../src/scrapers/custojusto/custojusto.parse');
const { normalizeAd } = require('../src/scrapers/custojusto/custojusto.normalize');
const { normalizeFinalObject } = require('../src/utils/finalNormalizer');

const TEST_URL = process.argv[2] || 'https://www.custojusto.pt/leiria/imobiliario/moradias/moradia-e-espaco-comercial-44325290';

async function testSingleAd() {
  console.log('🧪 TESTE DE ANÚNCIO INDIVIDUAL - CUSTOJUSTO\n');
  console.log('='.repeat(80));
  console.log(`URL: ${TEST_URL}\n`);
  
  try {
    console.log('📋 Fase 1: Extraindo dados brutos...');
    const rawData = await extractAdDetails(TEST_URL, { timeout: 60000 });
    
    console.log('\n📋 Fase 2: Parsing dos dados...');
    const parsedData = parseAdData(rawData);
    
    console.log('\n📋 Fase 3: Normalização...');
    const normalizedData = await normalizeAd(parsedData);
    
    console.log('\n📋 Fase 4: Normalização final (schema)...');
    const finalData = normalizeFinalObject(normalizedData);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 OUTPUT FINAL (JSON):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(finalData, null, 2));
    console.log('\n' + '='.repeat(80));
    
    // Resumo
    console.log('\n📋 RESUMO:');
    console.log(`  ✅ Título: ${finalData.title ? 'Sim' : 'Não'}`);
    console.log(`  ✅ Descrição: ${finalData.description ? 'Sim' : 'Não'}`);
    console.log(`  ✅ Preço: ${finalData.price || 'N/A'}`);
    console.log(`  ✅ Localização: ${finalData.location?.district || 'N/A'}`);
    console.log(`  ✅ Fotos: ${finalData.photos?.length || 0}`);
    console.log(`  ✅ Features: ${finalData.features?.length || 0}`);
    console.log(`  ✅ Telefone: ${finalData.advertiser?.phone || 'N/A'}`);
    console.log(`  ✅ ID: ${finalData.ad_id || 'N/A'}`);
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

testSingleAd();

