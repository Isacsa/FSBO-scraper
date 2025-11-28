/**
 * Teste do scraper Idealista com URL de listagem
 * Extrai URLs de anúncios da listagem e testa scraping de um anúncio
 */

const { createLobstrSession, closeLobstrSession, connectToLobstrBrowser } = require('./src/utils/lobstr');
const { performWarmupSequence, humanClosePopups, simulateReading, humanScroll } = require('./src/scrapers/idealista/warmup');
const scrapeIdealista = require('./src/scrapers/idealista');

const LISTING_URL = 'https://www.idealista.pt/comprar-casas/ponte-de-lima/arca-e-ponte-de-lima/';

async function testListingUrl() {
  console.log('🧪 TESTE: URL DE LISTAGEM IDEALISTA\n');
  console.log('='.repeat(80));
  console.log(`URL: ${LISTING_URL}\n`);
  
  let sessionId = null;
  let browser = null;
  let page = null;
  
  try {
    // 1. Criar sessão Lobstr
    console.log('🌐 Criando sessão no Lobstr.io...');
    const { sessionId: sid, cdpUrl } = await createLobstrSession({
      region: 'eu-west-1',
      browser: 'chrome',
      os: 'windows'
    });
    sessionId = sid;
    
    // 2. Conectar Playwright
    console.log('🔌 Conectando Playwright...');
    const browserData = await connectToLobstrBrowser(cdpUrl);
    browser = browserData.browser;
    page = browserData.page;
    page.setDefaultTimeout(120000);
    
    // 3. Warmup
    console.log('🔥 Executando warmup...');
    await performWarmupSequence(page);
    
    // 4. Navegar para listagem
    console.log('🌐 Navegando para listagem...');
    await page.goto(LISTING_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await simulateReading(page, 2000, 3000);
    await humanClosePopups(page);
    
    // 5. Scroll para carregar anúncios
    console.log('📜 Fazendo scroll para carregar anúncios...');
    for (let i = 0; i < 5; i++) {
      await humanScroll(page, 'down');
      await simulateReading(page, 1000, 2000);
    }
    
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // 6. Extrair URLs de anúncios
    console.log('🔍 Extraindo URLs de anúncios...');
    const adUrls = await page.evaluate(() => {
      const urls = new Set();
      
      // Procurar links de anúncios
      const links = document.querySelectorAll('a[href*="/imovel/"]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://www.idealista.pt${href}`;
          urls.add(fullUrl);
        }
      });
      
      return Array.from(urls).slice(0, 5); // Primeiros 5
    });
    
    console.log(`✅ Encontrados ${adUrls.length} anúncios na listagem\n`);
    
    if (adUrls.length === 0) {
      console.log('⚠️  Nenhum anúncio encontrado. Verificando conteúdo da página...');
      const pageContent = await page.content();
      console.log(`Tamanho do HTML: ${pageContent.length} caracteres`);
      console.log(`URL atual: ${page.url()}`);
      
      // Verificar se foi bloqueado
      if (page.url().includes('captcha') || page.url().includes('blocked')) {
        console.log('❌ Página bloqueada por anti-bot');
      }
      
      return;
    }
    
    // 7. Testar scraping do primeiro anúncio
    console.log('📋 Testando scraping do primeiro anúncio...');
    console.log(`URL: ${adUrls[0]}\n`);
    
    // Fechar página atual
    await page.close().catch(() => {});
    
    // Criar nova página para o anúncio
    const context = browser.contexts()[0];
    const adPage = await context.newPage();
    adPage.setDefaultTimeout(120000);
    
    try {
      const result = await scrapeIdealista(adUrls[0], {
        timeout: 120000
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ SCRAPE CONCLUÍDO COM SUCESSO!');
      console.log('='.repeat(80));
      
      // Validações
      console.log('\n📊 VALIDAÇÕES:');
      const checks = {
        'source': result.source === 'idealista',
        'url': result.url === adUrls[0],
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
      
      // Mostrar resumo
      console.log('\n📋 RESUMO:');
      console.log(`   Título: ${result.title || 'N/A'}`);
      console.log(`   Preço: ${result.price || 'N/A'}`);
      console.log(`   Localização: ${result.location?.municipality || 'N/A'}, ${result.location?.parish || 'N/A'}`);
      console.log(`   Fotos: ${result.photos?.length || 0}`);
      console.log(`   Anunciante: ${result.advertiser?.name || 'N/A'}`);
      console.log(`   É agência: ${result.advertiser?.is_agency ? 'Sim' : 'Não'}`);
      
    } catch (error) {
      console.error('\n❌ ERRO ao scrapear anúncio:', error.message);
      throw error;
    } finally {
      await adPage.close().catch(() => {});
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Fechar browser
    if (browser) {
      try {
        await browser.close().catch(() => {});
      } catch (e) {
        // Ignorar
      }
    }
    
    // Fechar sessão Lobstr
    if (sessionId) {
      await closeLobstrSession(sessionId);
    }
  }
}

testListingUrl();

