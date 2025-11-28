/**
 * Teste de debug - inspeciona o conteúdo da página de listagem
 */

const { createBrowser, createPage } = require('./src/utils/browser');
const { performWarmupSequence, humanClosePopups, simulateReading, humanScroll } = require('./src/scrapers/idealista/warmup');

const LISTING_URL = 'https://www.idealista.pt/comprar-casas/ponte-de-lima/arca-e-ponte-de-lima/';

async function debugPage() {
  console.log('🔍 DEBUG: Inspecionando página de listagem\n');
  
  const browser = await createBrowser({ headless: false, timeout: 60000 });
  const page = await createPage(browser, {
    timeout: 60000,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    geolocation: { latitude: 38.7223, longitude: -9.1393 }
  });
  
  try {
    // Warmup
    await performWarmupSequence(page);
    
    // Navegar
    console.log('🌐 Navegando para listagem...');
    await page.goto(LISTING_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await simulateReading(page, 3000, 4000);
    await humanClosePopups(page);
    
    // Scroll
    for (let i = 0; i < 5; i++) {
      await humanScroll(page, 'down');
      await simulateReading(page, 2000, 3000);
    }
    
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await simulateReading(page, 3000, 4000);
    
    // Inspecionar página
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.textContent.substring(0, 500),
        allLinks: Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent.trim().substring(0, 50)
        })),
        imovelLinks: Array.from(document.querySelectorAll('a[href*="/imovel/"]')).slice(0, 10).map(a => a.getAttribute('href')),
        items: document.querySelectorAll('[class*="item"], [class*="card"], article').length,
        hasResults: document.body.textContent.includes('anúncio') || document.body.textContent.includes('resultado'),
        pageHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight
      };
    });
    
    console.log('\n📊 INFORMAÇÕES DA PÁGINA:');
    console.log('─'.repeat(80));
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Título: ${pageInfo.title}`);
    console.log(`Altura da página: ${pageInfo.pageHeight}px`);
    console.log(`Elementos de anúncio encontrados: ${pageInfo.items}`);
    console.log(`Tem texto "anúncio" ou "resultado": ${pageInfo.hasResults}`);
    console.log(`\nLinks com /imovel/: ${pageInfo.imovelLinks.length}`);
    pageInfo.imovelLinks.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    console.log(`\nPrimeiros 10 links da página:`);
    pageInfo.allLinks.slice(0, 10).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href.substring(0, 80)} - "${link.text}"`);
    });
    
    console.log(`\nPrimeiros 500 caracteres do texto:`);
    console.log(pageInfo.bodyText);
    
    // Tentar encontrar anúncios de outras formas
    console.log('\n🔍 Tentando encontrar anúncios...');
    const adUrls = await page.evaluate(() => {
      const urls = new Set();
      
      // Método 1: Links diretos
      document.querySelectorAll('a[href*="/imovel/"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.match(/\/imovel\/\d+\//)) {
          urls.add(href.startsWith('http') ? href : `https://www.idealista.pt${href}`);
        }
      });
      
      // Método 2: Data attributes
      document.querySelectorAll('[data-id], [data-ad-id]').forEach(el => {
        const id = el.getAttribute('data-id') || el.getAttribute('data-ad-id');
        if (id && /^\d+$/.test(id)) {
          urls.add(`https://www.idealista.pt/imovel/${id}/`);
        }
      });
      
      // Método 3: URLs em scripts JSON
      const scripts = Array.from(document.querySelectorAll('script'));
      scripts.forEach(script => {
        const content = script.textContent || '';
        const matches = content.match(/\/imovel\/\d+\//g);
        if (matches) {
          matches.forEach(match => {
            urls.add(`https://www.idealista.pt${match}`);
          });
        }
      });
      
      return Array.from(urls);
    });
    
    console.log(`\n✅ URLs encontradas: ${adUrls.length}`);
    adUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    if (adUrls.length > 0) {
      console.log(`\n🎯 Usando primeira URL: ${adUrls[0]}`);
      console.log('\n⏸️  Aguardando 10 segundos para inspeção manual...');
      await page.waitForTimeout(10000);
    } else {
      console.log('\n⚠️  Nenhuma URL encontrada. Verificando se há bloqueio...');
      const screenshot = await page.screenshot({ fullPage: false });
      require('fs').writeFileSync('idealista-debug.png', screenshot);
      console.log('📸 Screenshot salvo em: idealista-debug.png');
      
      console.log('\n⏸️  Aguardando 15 segundos para inspeção manual...');
      await page.waitForTimeout(15000);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage();

