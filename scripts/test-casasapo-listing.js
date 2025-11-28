/**
 * Teste rápido do scraper Casa Sapo com URL de listagem
 */

const scrapeCasaSapo = require('../src/scrapers/casasapo/casasapo.scraper');

const TEST_URL = process.argv[2] || 'https://casa.sapo.pt/comprar-apartamentos/arcos-de-valdevez/';

async function testListing() {
  console.log('🧪 TESTE - CASA SAPO LISTAGEM\n');
  console.log('='.repeat(80));
  console.log(`URL: ${TEST_URL}\n`);
  
  const startTime = Date.now();
  
  try {
    const result = await scrapeCasaSapo(TEST_URL, {
      onlyNew: false,
      maxPages: null, // Processar todas as páginas
      maxAds: null // Processar todos os anúncios encontrados
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SCRAPE CONCLUÍDO');
    console.log('='.repeat(80));
    console.log(`⏱️  Duração: ${duration}s`);
    console.log(`📊 Total de anúncios processados: ${result.total_results || result.items?.length || 0}`);
    console.log(`🆕 Anúncios novos: ${result.total_new || 0}`);
    
    if (result.items && result.items.length > 0) {
      console.log('\n📋 PRIMEIROS 3 ANÚNCIOS:');
      console.log('─'.repeat(80));
      result.items.slice(0, 3).forEach((ad, i) => {
        console.log(`\n${i + 1}. ${ad.title || 'N/A'}`);
        console.log(`   Preço: ${ad.price || 'N/A'}€`);
        console.log(`   Tipologia: ${ad.property?.tipology || 'N/A'}`);
        console.log(`   Localização: ${ad.location?.municipality || 'N/A'}`);
        console.log(`   Fotos: ${ad.photos?.length || 0}`);
        console.log(`   Telefone: ${ad.advertiser?.phone || 'N/A'}`);
        console.log(`   FSBO: ${ad.signals?.is_fsbo ? 'Sim' : 'Não'}`);
      });
      
      console.log('\n📋 OUTPUT JSON COMPLETO (primeiro anúncio):');
      console.log('─'.repeat(80));
      console.log(JSON.stringify(result.items[0], null, 2));
    } else {
      console.log('\n⚠️  Nenhum anúncio encontrado');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

testListing();

