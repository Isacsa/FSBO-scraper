/**
 * Script de debug para inspecionar estrutura de datas na página CustoJusto
 */

const { createBrowser, createPage } = require('../src/utils/browser');
const { getRandomUserAgent, randomDelay, slowScroll } = require('../src/scrapers/custojusto/custojusto.utils');

const TEST_URL = 'https://www.custojusto.pt/viana-do-castelo/imobiliario/moradias/moradia-t2-areosa-viana-do-cas-44516632';

async function debugDates() {
  console.log('🔍 DEBUG: Inspecionando estrutura de datas do CustoJusto\n');
  console.log(`URL: ${TEST_URL}\n`);
  
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
    
    // Scroll para carregar conteúdo
    await slowScroll(page, 'down', 500);
    await randomDelay(2000, 3000);
    
    // Inspecionar estrutura
    const pageInfo = await page.evaluate(() => {
      const data = {
        title: document.querySelector('h1')?.textContent?.trim() || null,
        price: null,
        priceElement: null,
        elementsAfterPrice: [],
        allDateTexts: [],
        bodyText: document.body.textContent || ''
      };
      
      // Encontrar preço
      const pricePattern = /(\d{1,3}(?:\s?\d{3})*)\s*€/;
      const bodyText = document.body.textContent || '';
      const priceMatch = bodyText.match(pricePattern);
      
      if (priceMatch) {
        data.price = priceMatch[0].trim();
        
        // Tentar encontrar o elemento do preço
        const allElements = Array.from(document.querySelectorAll('*'));
        const priceEl = allElements.find(el => {
          const text = el.textContent || '';
          return text.includes(priceMatch[0]) && text.includes('€');
        });
        
        if (priceEl) {
          data.priceElement = {
            tagName: priceEl.tagName,
            className: priceEl.className || '',
            textContent: priceEl.textContent?.trim().substring(0, 100) || '',
            innerHTML: priceEl.innerHTML?.substring(0, 200) || ''
          };
          
          // Pegar próximos 10 elementos irmãos
          let current = priceEl;
          for (let i = 0; i < 10; i++) {
            if (current && current.nextElementSibling) {
              current = current.nextElementSibling;
              const text = current.textContent?.trim() || '';
              if (text.length > 0 && text.length < 200) {
                data.elementsAfterPrice.push({
                  index: i + 1,
                  tagName: current.tagName,
                  className: current.className || '',
                  textContent: text,
                  innerHTML: current.innerHTML?.substring(0, 200) || ''
                });
              }
            } else {
              break;
            }
          }
          
          // Procurar no elemento pai
          if (priceEl.parentElement) {
            const parentText = priceEl.parentElement.textContent || '';
            if (parentText.length < 500) {
              data.elementsAfterPrice.push({
                index: 'parent',
                tagName: priceEl.parentElement.tagName,
                className: priceEl.parentElement.className || '',
                textContent: parentText,
                innerHTML: priceEl.parentElement.innerHTML?.substring(0, 500) || ''
              });
            }
          }
        }
      }
      
      // Procurar por textos relacionados a datas
      const dateKeywords = ['publicado', 'atualizado', 'dias', 'hoje', 'ontem', 'há'];
      const allTextNodes = [];
      
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim() || '';
        if (text.length > 0 && text.length < 200) {
          const lowerText = text.toLowerCase();
          if (dateKeywords.some(keyword => lowerText.includes(keyword))) {
            allTextNodes.push({
              text: text,
              parentTag: node.parentElement?.tagName || '',
              parentClass: node.parentElement?.className || '',
              parentHTML: node.parentElement?.outerHTML?.substring(0, 300) || ''
            });
          }
        }
      }
      
      data.allDateTexts = allTextNodes.slice(0, 20);
      
      // Procurar padrões de data no texto completo
      const datePatterns = [
        /(?:Publicado|publicado)[^\.\n]{0,100}/gi,
        /(?:Atualizado|atualizado)[^\.\n]{0,100}/gi,
        /\d+\s*dias?\s*online/gi,
        /há\s+\d+\s+dias?/gi
      ];
      
      data.dateMatches = [];
      datePatterns.forEach(pattern => {
        const matches = bodyText.match(pattern);
        if (matches) {
          data.dateMatches.push(...matches.slice(0, 5));
        }
      });
      
      return data;
    });
    
    console.log('\n📊 INFORMAÇÕES DA PÁGINA:');
    console.log('─'.repeat(80));
    console.log(`Título: ${pageInfo.title}`);
    console.log(`Preço encontrado: ${pageInfo.price || 'N/A'}`);
    
    if (pageInfo.priceElement) {
      console.log(`\n📍 Elemento do Preço:`);
      console.log(`   Tag: ${pageInfo.priceElement.tagName}`);
      console.log(`   Class: ${pageInfo.priceElement.className}`);
      console.log(`   Texto: ${pageInfo.priceElement.textContent.substring(0, 100)}`);
    }
    
    if (pageInfo.elementsAfterPrice.length > 0) {
      console.log(`\n📋 Elementos após o preço (${pageInfo.elementsAfterPrice.length}):`);
      pageInfo.elementsAfterPrice.forEach((el, i) => {
        console.log(`\n   ${i + 1}. [${el.tagName}] ${el.className}`);
        console.log(`      Texto: ${el.textContent.substring(0, 150)}`);
      });
    }
    
    if (pageInfo.allDateTexts.length > 0) {
      console.log(`\n📅 Textos relacionados a datas encontrados (${pageInfo.allDateTexts.length}):`);
      pageInfo.allDateTexts.forEach((item, i) => {
        console.log(`\n   ${i + 1}. [${item.parentTag}] ${item.parentClass}`);
        console.log(`      Texto: ${item.text}`);
      });
    }
    
    if (pageInfo.dateMatches.length > 0) {
      console.log(`\n🔍 Padrões de data encontrados no texto:`);
      pageInfo.dateMatches.forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Screenshot
    console.log('\n📸 Tirando screenshot...');
    const screenshot = await page.screenshot({ fullPage: false });
    require('fs').writeFileSync('custojusto-dates-debug.png', screenshot);
    console.log('✅ Screenshot salvo em: custojusto-dates-debug.png');
    
    console.log('\n⏸️  Aguardando 10 segundos para inspeção manual...');
    await randomDelay(10000, 10000);
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await browser.close();
  }
}

debugDates();

