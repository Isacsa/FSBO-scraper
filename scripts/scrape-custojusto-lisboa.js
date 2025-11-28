/**
 * Scrape completo dos anúncios particulares de moradias em Lisboa
 */

const scrapeCustoJusto = require('../src/scrapers/custojusto/custojusto.scraper');

const LISTING_URL = 'https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p';

async function scrapeAll() {
  console.log('🚀 SCRAPE COMPLETO - CUSTOJUSTO LISBOA\n');
  console.log('='.repeat(80));
  console.log(`URL: ${LISTING_URL}\n`);
  console.log('📋 Iniciando scrape de todos os anúncios particulares...\n');
  
  const startTime = Date.now();
  
  try {
    const result = await scrapeCustoJusto(LISTING_URL, {
      onlyNew: false,
      maxPages: 10, // Permitir múltiplas páginas se necessário
      maxAds: null // Sem limite de anúncios
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SCRAPE CONCLUÍDO');
    console.log('='.repeat(80));
    console.log(`⏱️  Duração: ${duration}s`);
    console.log(`📊 Total de anúncios processados: ${result.total_results || result.all_ads?.length || 0}`);
    console.log(`🆕 Anúncios novos: ${result.total_new || 0}`);
    console.log(`📦 Total no cache: ${result.all_ads?.length || 0}`);
    
    console.log('\n📋 OUTPUT JSON:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    
    // Salvar em arquivo
    const fs = require('fs');
    const path = require('path');
    const outputFile = path.join(__dirname, '../data/custojusto_lisboa_output.json');
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\n💾 Output salvo em: ${outputFile}`);
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

scrapeAll();

