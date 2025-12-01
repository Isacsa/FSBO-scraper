/**
 * Debug para encontrar onde está "Publicado em" no CasaSapo
 */

const { createBrowser, createPage, navigateWithRetry, randomDelay, slowScroll, closePopupsAndOverlays, getRandomUserAgent } = require('../src/scrapers/casasapo/casasapo.utils');

const TEST_URL = process.argv[2] || 'https://casa.sapo.pt/comprar-apartamento-t3-arcos-de-valdevez-salvador-vila-fonche-e-parada-401fe924-480e-11ef-8add-060000000054.html';

async function debugDate() {
  console.log('🔍 DEBUG: Procurando "Publicado em" no CasaSapo\n');
  console.log(`URL: ${TEST_URL}\n`);
  
  const browser = await createBrowser({ headless: false, timeout: 60000 });
  const { page, context } = await createPage(browser, {
    timeout: 60000,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent()
  });
  
  try {
    console.log('🌐 Navegando para página...');
    await navigateWithRetry(page, TEST_URL, { timeout: 60000 });
    await randomDelay(3000, 5000);
    
    // Fechar popups
    await closePopupsAndOverlays(page);
    await randomDelay(2000, 3000);
    
    // Scroll completo
    console.log('📜 Fazendo scroll...');
    for (let i = 0; i < 8; i++) {
      await slowScroll(page, 'down', 500);
      await randomDelay(1500, 2500);
    }
    
    await randomDelay(3000, 5000);
    
    // Procurar "Publicado em"
    const dateInfo = await page.evaluate(() => {
      const result = {
        found: false,
        matches: [],
        allTextWithPublished: [],
        elementsWithPublished: []
      };
      
      // Procurar por texto "Publicado"
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.toLowerCase().includes('publicado')) {
          result.found = true;
          result.allTextWithPublished.push({
            tag: el.tagName,
            className: el.className || '',
            id: el.id || '',
            text: text.trim().substring(0, 200),
            parentClass: el.parentElement?.className || '',
            parentTag: el.parentElement?.tagName || ''
          });
          
          // Verificar se é um elemento pai que contém a informação completa
          if (text.match(/Publicado\s+em/i)) {
            result.elementsWithPublished.push({
              tag: el.tagName,
              className: el.className || '',
              id: el.id || '',
              fullText: text.trim(),
              html: el.outerHTML.substring(0, 500)
            });
          }
        }
      });
      
      // Procurar em elementos específicos
      const specificSelectors = [
        '[class*="date"]',
        '[class*="published"]',
        '[class*="meta"]',
        '[class*="info"]',
        '[class*="detail"]',
        'time',
        '[datetime]',
        'p',
        'span',
        'div'
      ];
      
      specificSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent || '';
          if (text.match(/Publicado\s+em/i)) {
            result.matches.push({
              selector: selector,
              tag: el.tagName,
              className: el.className || '',
              text: text.trim(),
              html: el.outerHTML.substring(0, 500)
            });
          }
        });
      });
      
      // Procurar no texto completo da página
      const bodyText = document.body.textContent || '';
      const publishedMatches = bodyText.match(/Publicado\s+em[^\n<]+/gi);
      if (publishedMatches) {
        result.bodyMatches = publishedMatches;
      }
      
      return result;
    });
    
    console.log('\n📊 RESULTADOS:');
    console.log('─'.repeat(80));
    console.log(`Encontrado "Publicado": ${dateInfo.found ? 'SIM' : 'NÃO'}`);
    
    if (dateInfo.bodyMatches) {
      console.log(`\nMatches no texto completo:`);
      dateInfo.bodyMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.trim()}`);
      });
    }
    
    if (dateInfo.matches.length > 0) {
      console.log(`\nMatches em elementos específicos: ${dateInfo.matches.length}`);
      dateInfo.matches.forEach((match, i) => {
        console.log(`\n  ${i + 1}. Selector: ${match.selector}`);
        console.log(`     Tag: ${match.tag}, Class: ${match.className}`);
        console.log(`     Text: ${match.text.substring(0, 150)}`);
        console.log(`     HTML: ${match.html.substring(0, 200)}...`);
      });
    }
    
    if (dateInfo.elementsWithPublished.length > 0) {
      console.log(`\nElementos com "Publicado em": ${dateInfo.elementsWithPublished.length}`);
      dateInfo.elementsWithPublished.forEach((el, i) => {
        console.log(`\n  ${i + 1}. ${el.tag} (class: ${el.className || 'sem classe'})`);
        console.log(`     Text: ${el.fullText.substring(0, 200)}`);
      });
    }
    
    if (dateInfo.allTextWithPublished.length > 0) {
      console.log(`\nTodos os elementos com "publicado": ${dateInfo.allTextWithPublished.length}`);
      dateInfo.allTextWithPublished.slice(0, 10).forEach((el, i) => {
        console.log(`\n  ${i + 1}. ${el.tag} (class: ${el.className || 'sem classe'})`);
        console.log(`     Text: ${el.text}`);
        console.log(`     Parent: ${el.parentTag} (class: ${el.parentClass || 'sem classe'})`);
      });
    }
    
    // Screenshot
    console.log('\n📸 Tirando screenshot...');
    const screenshot = await page.screenshot({ fullPage: true });
    require('fs').writeFileSync('casasapo-date-debug.png', screenshot);
    console.log('✅ Screenshot salvo em: casasapo-date-debug.png');
    
    console.log('\n⏸️  Aguardando 10 segundos para inspeção manual...');
    await randomDelay(10000, 10000);
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

debugDate();

