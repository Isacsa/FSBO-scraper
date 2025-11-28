/**
 * Debug da extração de dados
 */

const { extractAdDetails } = require('../src/scrapers/custojusto/custojusto.extract');

const TEST_URL = process.argv[2] || 'https://www.custojusto.pt/leiria/imobiliario/moradias/moradia-e-espaco-comercial-44325290';

async function debugExtract() {
  console.log('🔍 DEBUG: Extração de dados brutos\n');
  console.log(`URL: ${TEST_URL}\n`);
  
  try {
    const rawData = await extractAdDetails(TEST_URL, { timeout: 60000 });
    
    console.log('📊 DADOS EXTRAÍDOS:\n');
    console.log('─'.repeat(80));
    console.log(`Título: ${rawData.title || 'N/A'}`);
    console.log(`Preço: ${rawData.price || 'N/A'}`);
    console.log(`Localização: ${rawData.location || 'N/A'}`);
    console.log(`Fotos: ${rawData.photos?.length || 0}`);
    console.log(`Features: ${rawData.features?.length || 0}`);
    console.log(`Telefone: ${rawData.phone || 'N/A'}`);
    
    if (rawData.specifications) {
      console.log('\n📋 ESPECIFICAÇÕES:');
      console.log(JSON.stringify(rawData.specifications, null, 2));
    }
    
    console.log('\n📋 FEATURES (primeiras 20):');
    rawData.features?.slice(0, 20).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

debugExtract();

