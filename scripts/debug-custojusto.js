/**
 * Script de debug para inspecionar estrutura da página CustoJusto
 */

const { createBrowser, createPage } = require('../src/utils/browser');
const { getRandomUserAgent, randomDelay, slowScroll } = require('../src/scrapers/custojusto/custojusto.utils');

const TEST_URL = 'https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p';

async function debugPage() {
  console.log('🔍 DEBUG: Inspecionando página CustoJusto\n');
  
  const browser = await createBrowser({ headless: false, timeout: 60000 });
  const page = await createPage(browser, {
    timeout: 60000,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent()
  });
  
  try {
    console.log('🌐 Navegando para página...');
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(5000, 7000);
    
    // Aguardar elementos carregarem
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.warn('⚠️  Timeout aguardando body');
    }
    
    // Scroll múltiplo para carregar conteúdo dinâmico
    console.log('📜 Fazendo scroll para carregar conteúdo...');
    for (let i = 0; i < 8; i++) {
      await slowScroll(page, 'down', 500);
      await randomDelay(1500, 2500);
    }
    
    // Aguardar mais tempo para React renderizar
    await randomDelay(3000, 5000);
    
    // Inspecionar estrutura
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        
        // Procurar anúncios com vários métodos
        linksWithId: Array.from(document.querySelectorAll('a[href*="/id-"]')).slice(0, 10).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim().substring(0, 50)
        })),
        
        linksWithAnuncio: Array.from(document.querySelectorAll('a[href*="anuncio"]')).slice(0, 10).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim().substring(0, 50)
        })),
        
        articles: Array.from(document.querySelectorAll('article')).slice(0, 5).map(art => ({
          className: art.className,
          innerHTML: art.innerHTML.substring(0, 200)
        })),
        
        cards: Array.from(document.querySelectorAll('[class*="card"], [class*="ad"], [class*="listing"]')).slice(0, 5).map(card => ({
          className: card.className,
          hasLink: !!card.querySelector('a[href]')
        })),
        
        allLinks: Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim().substring(0, 30)
        })),
        
        // Procurar por texto "Montra de anúncios"
        hasMontra: document.body.textContent.includes('Montra de anúncios'),
        
        // Procurar números de ID
        idPatterns: document.body.innerHTML.match(/\/id-\d+/g)?.slice(0, 10) || [],
        
        // Procurar URLs completos de anúncios
        fullAdUrls: (() => {
          const urls = new Set();
          // Procurar em todos os links
          document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.includes('/id-') || href.includes('/anuncio/'))) {
              urls.add(href);
            }
          });
          // Procurar no HTML
          const html = document.body.innerHTML;
          const matches = html.match(/https?:\/\/[^"'\s]+\/(id-|anuncio\/)\d+/g);
          if (matches) {
            matches.forEach(m => urls.add(m));
          }
          return Array.from(urls).slice(0, 10);
        })(),
        
        // Procurar por texto "Montra de anúncios" e elementos próximos
        montraSection: (() => {
          const montraHeading = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, section')).find(el => 
            el.textContent?.includes('Montra de anúncios')
          );
          if (montraHeading) {
            const parent = montraHeading.closest('section, div, article') || montraHeading.parentElement;
            return {
              found: true,
              children: parent ? Array.from(parent.querySelectorAll('a[href]')).slice(0, 10).map(a => ({
                href: a.getAttribute('href'),
                text: a.textContent?.trim().substring(0, 50)
              })) : []
            };
          }
          return { found: false, children: [] };
        })(),
        
        // Procurar em scripts JSON-LD ou dados inline
        scriptData: Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]')).map(script => {
          try {
            const data = JSON.parse(script.textContent);
            return JSON.stringify(data).substring(0, 200);
          } catch (e) {
            return null;
          }
        }).filter(Boolean),
        
        // Contar elementos com classes suspeitas
        elementCounts: {
          withAdClass: document.querySelectorAll('[class*="ad"], [class*="Ad"]').length,
          withCardClass: document.querySelectorAll('[class*="card"], [class*="Card"]').length,
          withListingClass: document.querySelectorAll('[class*="listing"], [class*="Listing"]').length,
          withItemClass: document.querySelectorAll('[class*="item"], [class*="Item"]').length,
          allLinks: document.querySelectorAll('a[href]').length
        }
      };
    });
    
    console.log('\n📊 INFORMAÇÕES DA PÁGINA:');
    console.log('─'.repeat(80));
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Título: ${pageInfo.title}`);
    console.log(`Tem "Montra de anúncios": ${pageInfo.hasMontra}`);
    console.log(`\nPadrões /id- encontrados: ${pageInfo.idPatterns.length}`);
    pageInfo.idPatterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern}`);
    });
    
    console.log(`\nURLs completos de anúncios encontrados: ${pageInfo.fullAdUrls.length}`);
    pageInfo.fullAdUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    console.log(`\nLinks com /id-: ${pageInfo.linksWithId.length}`);
    pageInfo.linksWithId.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href} - "${link.text}"`);
    });
    
    console.log(`\nLinks com "anuncio": ${pageInfo.linksWithAnuncio.length}`);
    pageInfo.linksWithAnuncio.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href} - "${link.text}"`);
    });
    
    console.log(`\nArticles encontrados: ${pageInfo.articles.length}`);
    pageInfo.articles.forEach((art, i) => {
      console.log(`  ${i + 1}. Class: ${art.className.substring(0, 50)}`);
    });
    
    console.log(`\nCards encontrados: ${pageInfo.cards.length}`);
    pageInfo.cards.forEach((card, i) => {
      console.log(`  ${i + 1}. Class: ${card.className.substring(0, 50)}, Tem link: ${card.hasLink}`);
    });
    
    console.log(`\nPrimeiros 10 links da página:`);
    pageInfo.allLinks.slice(0, 10).forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href.substring(0, 80)} - "${link.text}"`);
    });
    
    console.log(`\nContadores de elementos:`);
    console.log(`  Com classe "ad": ${pageInfo.elementCounts.withAdClass}`);
    console.log(`  Com classe "card": ${pageInfo.elementCounts.withCardClass}`);
    console.log(`  Com classe "listing": ${pageInfo.elementCounts.withListingClass}`);
    console.log(`  Com classe "item": ${pageInfo.elementCounts.withItemClass}`);
    console.log(`  Total de links: ${pageInfo.elementCounts.allLinks}`);
    
    console.log(`\nSeção "Montra de anúncios":`);
    if (pageInfo.montraSection.found) {
      console.log(`  ✅ Encontrada!`);
      console.log(`  Links dentro: ${pageInfo.montraSection.children.length}`);
      pageInfo.montraSection.children.forEach((link, i) => {
        console.log(`    ${i + 1}. ${link.href} - "${link.text}"`);
      });
    } else {
      console.log(`  ❌ Não encontrada`);
    }
    
    if (pageInfo.scriptData.length > 0) {
      console.log(`\nDados em scripts JSON:`);
      pageInfo.scriptData.forEach((data, i) => {
        console.log(`  ${i + 1}. ${data}...`);
      });
    }
    
    // Screenshot
    console.log('\n📸 Tirando screenshot...');
    const screenshot = await page.screenshot({ fullPage: false });
    require('fs').writeFileSync('custojusto-debug.png', screenshot);
    console.log('✅ Screenshot salvo em: custojusto-debug.png');
    
    console.log('\n⏸️  Aguardando 10 segundos para inspeção manual...');
    await randomDelay(10000, 10000);
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage();

