/**
 * Teste completo dos scrapers refatorados
 * Mostra o output completo de cada scraper
 */

const scrapeOLX = require('./src/scrapers/olx');
const scrapeImovirtual = require('./src/scrapers/imovirtual');

const testUrls = {
  olx: 'https://www.olx.pt/d/anuncio/moradia-t3-1-em-freamunde-com-jardim-e-ar-condicionado-IDIZXIl.html',
  imovirtual: 'https://www.imovirtual.com/pt/anuncio/moradia-t3-para-venda-ID1hpzT'
};

async function testScraper(name, scraper, url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTANDO SCRAPER: ${name.toUpperCase()}`);
  console.log(`📎 URL: ${url}`);
  console.log('='.repeat(80));
  
  try {
    const startTime = Date.now();
    const result = await scraper(url, {
      headless: false,
      includeRawHtml: false
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Scrape concluído em ${duration}s`);
    console.log(`\n${'─'.repeat(80)}`);
    console.log('📊 OUTPUT COMPLETO:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log('📋 RESUMO DOS CAMPOS:');
    console.log('─'.repeat(80));
    console.log(`✓ source: ${result.source || '❌'}`);
    console.log(`✓ ad_id: ${result.ad_id || '❌'}`);
    console.log(`✓ url: ${result.url ? '✅' : '❌'}`);
    console.log(`✓ published_date: ${result.published_date || '❌'}`);
    console.log(`✓ updated_date: ${result.updated_date || '❌ (não disponível)'}`);
    console.log(`✓ timestamp: ${result.timestamp || '❌'}`);
    console.log(`✓ days_online: ${result.days_online || '❌'}`);
    console.log(`✓ title: ${result.title ? '✅' : '❌'} (${result.title?.length || 0} chars)`);
    console.log(`✓ description: ${result.description ? '✅' : '❌'} (${result.description?.length || 0} chars)`);
    console.log(`✓ price: ${result.price || '❌'}`);
    console.log(`✓ location: ${result.location ? '✅' : '❌'}`);
    if (result.location) {
      console.log(`  - district: ${result.location.district || '❌'}`);
      console.log(`  - municipality: ${result.location.municipality || '❌'}`);
      console.log(`  - parish: ${result.location.parish || '❌'}`);
      console.log(`  - lat: ${result.location.lat || '❌'}`);
      console.log(`  - lng: ${result.location.lng || '❌'}`);
    }
    console.log(`✓ property: ${result.property ? '✅' : '❌'}`);
    if (result.property) {
      console.log(`  - type: ${result.property.type || '❌'}`);
      console.log(`  - tipology: ${result.property.tipology || '❌'}`);
      console.log(`  - area_total: ${result.property.area_total || '❌'}`);
      console.log(`  - area_useful: ${result.property.area_useful || '❌'}`);
      console.log(`  - year: ${result.property.year || '❌'}`);
      console.log(`  - floor: ${result.property.floor || '❌'}`);
      console.log(`  - condition: ${result.property.condition || '❌'}`);
    }
    console.log(`✓ features: ${result.features?.length || 0} items`);
    if (result.features && result.features.length > 0) {
      result.features.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    console.log(`✓ photos: ${result.photos?.length || 0} fotos`);
    if (result.photos && result.photos.length > 0) {
      console.log(`  Primeiras 3 URLs:`);
      result.photos.slice(0, 3).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url.substring(0, 80)}...`);
      });
      if (result.photos.length > 3) {
        console.log(`  ... e mais ${result.photos.length - 3} fotos`);
      }
    }
    console.log(`✓ advertiser: ${result.advertiser ? '✅' : '❌'}`);
    if (result.advertiser) {
      console.log(`  - name: ${result.advertiser.name || '❌'}`);
      console.log(`  - total_ads: ${result.advertiser.total_ads || '❌ (não disponível)'}`);
      console.log(`  - is_agency: ${result.advertiser.is_agency}`);
      console.log(`  - url: ${result.advertiser.url || '❌'}`);
    }
    console.log(`✓ signals: ${result.signals ? '✅' : '❌'}`);
    if (result.signals) {
      console.log(`  - watermark: ${result.signals.watermark}`);
      console.log(`  - duplicate: ${result.signals.duplicate}`);
      console.log(`  - professional_photos: ${result.signals.professional_photos}`);
      console.log(`  - agency_keywords: ${result.signals.agency_keywords?.length || 0} encontrados`);
      if (result.signals.agency_keywords && result.signals.agency_keywords.length > 0) {
        console.log(`    ${result.signals.agency_keywords.join(', ')}`);
      }
    }
    
    return { success: true, result, duration };
    
  } catch (error) {
    console.error(`\n❌ ERRO durante o teste:`, error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 INICIANDO TESTES DOS SCRAPERS REFATORADOS');
  console.log('='.repeat(80));
  
  const results = {
    olx: await testScraper('OLX', scrapeOLX, testUrls.olx),
    imovirtual: await testScraper('Imovirtual', scrapeImovirtual, testUrls.imovirtual)
  };
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 RESUMO FINAL DOS TESTES');
  console.log('='.repeat(80));
  console.log(`\nOLX:`);
  console.log(`  Status: ${results.olx.success ? '✅ PASSOU' : '❌ FALHOU'}`);
  if (results.olx.success) {
    console.log(`  Duração: ${results.olx.duration}s`);
    console.log(`  Campos extraídos: ${Object.keys(results.olx.result).length}`);
  } else {
    console.log(`  Erro: ${results.olx.error}`);
  }
  
  console.log(`\nImovirtual:`);
  console.log(`  Status: ${results.imovirtual.success ? '✅ PASSOU' : '❌ FALHOU'}`);
  if (results.imovirtual.success) {
    console.log(`  Duração: ${results.imovirtual.duration}s`);
    console.log(`  Campos extraídos: ${Object.keys(results.imovirtual.result).length}`);
  } else {
    console.log(`  Erro: ${results.imovirtual.error}`);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  
  if (results.olx.success && results.imovirtual.success) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('='.repeat(80));
    process.exit(0);
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM');
    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Executar todos os testes
runAllTests().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

