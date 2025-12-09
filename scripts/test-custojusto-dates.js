/**
 * Script de teste para verificar extração de datas do CustoJusto
 */

const scrapeCustoJusto = require('../src/scrapers/custojusto/custojusto.scraper');

const TEST_URL = 'https://www.custojusto.pt/viana-do-castelo/viana-do-castelo/imobiliario/moradias?f=p';

async function testDates() {
  console.log('🧪 TESTE: Extração de datas do CustoJusto\n');
  console.log(`URL: ${TEST_URL}\n`);
  console.log('─'.repeat(80));
  
  try {
    const result = await scrapeCustoJusto(TEST_URL, {
      onlyNew: false,
      maxPages: 1,
      maxAds: 3, // Testar apenas 3 anúncios
      headless: true
    });
    
    console.log('\n📊 RESULTADOS:\n');
    console.log(`Total de anúncios processados: ${result.all_ads.length}`);
    console.log(`Anúncios novos: ${result.total_new}\n`);
    
    if (result.all_ads.length > 0) {
      console.log('📋 DETALHES DOS ANÚNCIOS:\n');
      result.all_ads.forEach((ad, index) => {
        console.log(`\n${index + 1}. ${ad.title || 'Sem título'}`);
        console.log(`   URL: ${ad.url}`);
        console.log(`   Preço: ${ad.price || 'N/A'}`);
        console.log(`   📅 Published Date: ${ad.published_date || 'N/A'}`);
        console.log(`   📅 Updated Date: ${ad.updated_date || 'N/A'}`);
        console.log(`   📅 Days Online: ${ad.days_online !== null ? ad.days_online : 'N/A'}`);
        console.log(`   Localização: ${ad.location?.municipality || ad.location_text || 'N/A'}`);
      });
      
      // Estatísticas
      const withPublishedDate = result.all_ads.filter(ad => ad.published_date).length;
      const withUpdatedDate = result.all_ads.filter(ad => ad.updated_date).length;
      const withDaysOnline = result.all_ads.filter(ad => ad.days_online !== null).length;
      
      console.log('\n📈 ESTATÍSTICAS:\n');
      console.log(`   Anúncios com published_date: ${withPublishedDate}/${result.all_ads.length}`);
      console.log(`   Anúncios com updated_date: ${withUpdatedDate}/${result.all_ads.length}`);
      console.log(`   Anúncios com days_online: ${withDaysOnline}/${result.all_ads.length}`);
      
    } else {
      console.log('⚠️  Nenhum anúncio encontrado');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

testDates();

