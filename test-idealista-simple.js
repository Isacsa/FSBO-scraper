/**
 * Teste simples do scraper Idealista
 * Testa com URL de listagem (extrai primeiro anúncio e scrapeia)
 */

const scrapeIdealista = require('./src/scrapers/idealista');

// URL de listagem - vamos extrair primeiro anúncio
const LISTING_URL = 'https://www.idealista.pt/comprar-casas/ponte-de-lima/arca-e-ponte-de-lima/';

async function testSimple() {
  console.log('🧪 TESTE SIMPLES - SCRAPER IDEALISTA\n');
  console.log('='.repeat(80));
  console.log(`URL de listagem: ${LISTING_URL}\n`);
  
  try {
    // Primeiro, vamos usar Playwright para extrair uma URL de anúncio da listagem
    const { createBrowser, createPage } = require('./src/utils/browser');
    const { performWarmupSequence, humanClosePopups, simulateReading, humanScroll } = require('./src/scrapers/idealista/warmup');
    
    console.log('📋 Passo 1: Extraindo URL de anúncio da listagem...');
    
    const browser = await createBrowser({ headless: false, timeout: 60000 });
    const page = await createPage(browser, {
      timeout: 60000,
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      geolocation: { latitude: 38.7223, longitude: -9.1393 }
    });
    
    // Warmup
    await performWarmupSequence(page);
    
    // Navegar para listagem
    await page.goto(LISTING_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await simulateReading(page, 3000, 4000);
    await humanClosePopups(page);
    
    // Aguardar elementos de anúncios aparecerem
    try {
      await page.waitForSelector('a[href*="/imovel/"], article, [class*="item"]', { timeout: 10000 });
    } catch (e) {
      console.log('⚠️  Aguardando carregamento de anúncios...');
    }
    
    // Scroll para carregar (lazy loading)
    for (let i = 0; i < 5; i++) {
      await humanScroll(page, 'down');
      await simulateReading(page, 1500, 2500);
    }
    
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await simulateReading(page, 2000, 3000);
    
    // Verificar se foi bloqueado
    const currentUrl = page.url();
    console.log(`   URL atual: ${currentUrl}`);
    
    if (currentUrl.includes('captcha') || currentUrl.includes('blocked')) {
      console.log('❌ Página bloqueada por anti-bot');
      await browser.close();
      return;
    }
    
    // Aguardar mais tempo e verificar conteúdo
    await page.waitForTimeout(3000);
    
    // Extrair primeira URL de anúncio com múltiplos seletores
    const firstAdUrl = await page.evaluate(() => {
      // Coletar todos os links possíveis
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const adUrls = [];
      
      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (href && (href.includes('/imovel/') || href.includes('/anuncio/'))) {
          const fullUrl = href.startsWith('http') ? href : `https://www.idealista.pt${href}`;
          // Filtrar URLs válidas (devem ter ID numérico)
          if (fullUrl.match(/\/imovel\/\d+\//) || fullUrl.match(/\/anuncio\/\d+\//)) {
            adUrls.push(fullUrl);
          }
        }
      }
      
      // Remover duplicados
      const uniqueUrls = [...new Set(adUrls)];
      
      console.log(`[Debug] Encontrados ${uniqueUrls.length} URLs de anúncios`);
      if (uniqueUrls.length > 0) {
        console.log(`[Debug] Primeira URL: ${uniqueUrls[0]}`);
      }
      
      // Debug: mostrar estrutura da página
      const items = document.querySelectorAll('[class*="item"], [class*="card"], article');
      console.log(`[Debug] Elementos de anúncio encontrados: ${items.length}`);
      
      return uniqueUrls.length > 0 ? uniqueUrls[0] : null;
    });
    
    await browser.close();
    
    if (!firstAdUrl) {
      console.log('❌ Não foi possível encontrar URL de anúncio na listagem');
      console.log('   Verificando se a página foi bloqueada...');
      return;
    }
    
    console.log(`✅ URL encontrada: ${firstAdUrl}\n`);
    
    // Agora scrapear o anúncio
    console.log('📋 Passo 2: Scrapeando anúncio individual...');
    console.log('─'.repeat(80));
    
    const result = await scrapeIdealista(firstAdUrl, {
      timeout: 120000
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SCRAPE CONCLUÍDO!');
    console.log('='.repeat(80));
    
    // Validações
    console.log('\n📊 VALIDAÇÕES:');
    const checks = {
      'source': result.source === 'idealista',
      'url': result.url === firstAdUrl,
      'title': result.title && result.title.length > 0,
      'price': result.price && result.price.length > 0,
      'description': result.description && result.description.length > 0,
      'photos': Array.isArray(result.photos) && result.photos.length > 0,
      'location': result.location && (result.location.district || result.location.municipality),
      'property': result.property && result.property.type,
      'advertiser': result.advertiser && result.advertiser.name,
      'signals': typeof result.signals === 'object'
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    console.log(`\n${allPassed ? '✅' : '❌'} Todos os checks: ${allPassed ? 'PASSOU' : 'FALHOU'}`);
    
    // Resumo
    console.log('\n📋 RESUMO DO ANÚNCIO:');
    console.log(`   Título: ${result.title || 'N/A'}`);
    console.log(`   Preço: ${result.price || 'N/A'} €`);
    console.log(`   Localização: ${result.location?.municipality || 'N/A'}, ${result.location?.parish || 'N/A'}`);
    console.log(`   Fotos: ${result.photos?.length || 0}`);
    console.log(`   Anunciante: ${result.advertiser?.name || 'N/A'}`);
    console.log(`   É agência: ${result.advertiser?.is_agency ? 'Sim' : 'Não'}`);
    console.log(`   Tipo: ${result.property?.type || 'N/A'} ${result.property?.tipology || ''}`);
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    process.exit(1);
  }
}

testSimple();

