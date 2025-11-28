/**
 * Debug da estrutura da página Casa Sapo
 */

const { createBrowser, createPage, navigateWithRetry, randomDelay, slowScroll, closePopupsAndOverlays, getRandomUserAgent } = require('../src/scrapers/casasapo/casasapo.utils');

const TEST_URL = process.argv[2] || 'https://casa.sapo.pt/comprar-apartamentos/arcos-de-valdevez/';

async function debugPage() {
  console.log('🔍 DEBUG: Inspecionando página Casa Sapo\n');
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
    
    // Scroll múltiplo
    console.log('📜 Fazendo scroll para carregar conteúdo...');
    for (let i = 0; i < 8; i++) {
      await slowScroll(page, 'down', 500);
      await randomDelay(1500, 2500);
    }
    
    await randomDelay(3000, 5000);
    
    // Inspecionar estrutura
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        
        // Procurar anúncios com vários métodos
        linksWithImoveis: Array.from(document.querySelectorAll('a[href*="/imoveis/"]')).slice(0, 10).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim().substring(0, 50),
          parentClass: a.parentElement?.className?.substring(0, 50) || ''
        })),
        
        // Procurar cards/propriedades
        propertyCards: Array.from(document.querySelectorAll('[class*="property"], [class*="listing"], [class*="ad"], article, [data-id]')).slice(0, 10).map(card => ({
          className: card.className?.substring(0, 100) || '',
          hasLink: !!card.querySelector('a[href]'),
          hasPhone: (() => {
            const text = card.textContent || '';
            return /(\+351)?\s?9\d{2}\s?\d{3}\s?\d{3}/.test(text);
          })(),
          textPreview: card.textContent?.substring(0, 100) || ''
        })),
        
        // Procurar por padrões de telefone
        phonePatterns: (() => {
          const bodyText = document.body.textContent || '';
          const matches = bodyText.match(/(\+351)?\s?9\d{2}\s?\d{3}\s?\d{3}/g);
          return matches ? matches.slice(0, 10) : [];
        })(),
        
        // Procurar por botões "Ver Telefone"
        phoneButtons: (() => {
          const buttons = Array.from(document.querySelectorAll('button, a, span, div'));
          return buttons.filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('ver telefone') || 
                   text.includes('ver contacto') ||
                   text.includes('mostrar telefone') ||
                   text.includes('telefone');
          }).slice(0, 10).map(btn => ({
            text: btn.textContent?.trim().substring(0, 50),
            className: btn.className?.substring(0, 50) || '',
            tagName: btn.tagName
          }));
        })(),
        
        // Procurar anúncios e verificar se têm classe property-phone
        adsWithPhoneButton: (() => {
          const ads = [];
          const cards = document.querySelectorAll('[class*="property"], [class*="Property"], article');
          cards.forEach((card, i) => {
            if (i >= 10) return;
            const link = card.querySelector('a[href]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || !href.includes('/comprar-') || !href.includes('.html')) return;
            
            // Verificar se tem classe property-phone
            const phoneElement = card.querySelector('[class*="property-phone"], .property-phone');
            const hasPhoneBtn = !!phoneElement || (card.className || '').includes('property-phone');
            
            ads.push({
              url: href,
              hasPhoneButton: hasPhoneBtn,
              hasPhoneElement: !!phoneElement,
              cardClass: card.className?.substring(0, 100) || '',
              preview: card.textContent?.substring(0, 100) || ''
            });
          });
          return ads;
        })(),
        
        // Contar elementos com property-phone
        propertyPhoneCount: document.querySelectorAll('[class*="property-phone"], .property-phone').length,
        
        // Contadores
        elementCounts: {
          withPropertyClass: document.querySelectorAll('[class*="property"], [class*="Property"]').length,
          withListingClass: document.querySelectorAll('[class*="listing"], [class*="Listing"]').length,
          withAdClass: document.querySelectorAll('[class*="ad"], [class*="Ad"]').length,
          articles: document.querySelectorAll('article').length,
          linksWithImoveis: document.querySelectorAll('a[href*="/imoveis/"]').length,
          allLinks: document.querySelectorAll('a[href]').length
        },
        
        // Procurar estrutura de listagem
        listingStructure: (() => {
          const containers = Array.from(document.querySelectorAll('[class*="results"], [class*="list"], [class*="grid"], [class*="container"]'));
          return containers.slice(0, 5).map(container => ({
            className: container.className?.substring(0, 100) || '',
            children: container.children.length,
            hasPropertyLinks: container.querySelectorAll('a[href*="/imoveis/"]').length
          }));
        })()
      };
    });
    
    console.log('\n📊 INFORMAÇÕES DA PÁGINA:');
    console.log('─'.repeat(80));
    console.log(`URL: ${pageInfo.url}`);
    console.log(`Título: ${pageInfo.title}`);
    
    console.log(`\nContadores de elementos:`);
    console.log(`  Com classe "property": ${pageInfo.elementCounts.withPropertyClass}`);
    console.log(`  Com classe "listing": ${pageInfo.elementCounts.withListingClass}`);
    console.log(`  Com classe "ad": ${pageInfo.elementCounts.withAdClass}`);
    console.log(`  Articles: ${pageInfo.elementCounts.articles}`);
    console.log(`  Links com /imoveis/: ${pageInfo.elementCounts.linksWithImoveis}`);
    console.log(`  Total de links: ${pageInfo.elementCounts.allLinks}`);
    
    console.log(`\nLinks com /imoveis/ encontrados: ${pageInfo.linksWithImoveis.length}`);
    pageInfo.linksWithImoveis.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href} - "${link.text}" (parent: ${link.parentClass})`);
    });
    
    console.log(`\nCards de propriedades encontrados: ${pageInfo.propertyCards.length}`);
    pageInfo.propertyCards.forEach((card, i) => {
      console.log(`  ${i + 1}. Class: ${card.className}`);
      console.log(`     Tem link: ${card.hasLink}, Tem telefone: ${card.hasPhone}`);
      console.log(`     Preview: ${card.textPreview}...`);
    });
    
    if (pageInfo.phonePatterns.length > 0) {
      console.log(`\nPadrões de telefone encontrados: ${pageInfo.phonePatterns.length}`);
      pageInfo.phonePatterns.forEach((phone, i) => {
        console.log(`  ${i + 1}. ${phone}`);
      });
    }
    
    console.log(`\nEstrutura de listagem:`);
    pageInfo.listingStructure.forEach((struct, i) => {
      console.log(`  ${i + 1}. Class: ${struct.className}`);
      console.log(`     Children: ${struct.children}, Links: ${struct.hasPropertyLinks}`);
    });
    
    if (pageInfo.phoneButtons.length > 0) {
      console.log(`\nBotões "Ver Telefone" encontrados: ${pageInfo.phoneButtons.length}`);
      pageInfo.phoneButtons.forEach((btn, i) => {
        console.log(`  ${i + 1}. ${btn.tagName} - "${btn.text}" (class: ${btn.className})`);
      });
    } else {
      console.log(`\n⚠️  Nenhum botão "Ver Telefone" encontrado na página`);
    }
    
    console.log(`\nElementos com classe "property-phone": ${pageInfo.propertyPhoneCount}`);
    
    if (pageInfo.adsWithPhoneButton.length > 0) {
      console.log(`\nAnúncios encontrados (com/sem classe property-phone): ${pageInfo.adsWithPhoneButton.length}`);
      pageInfo.adsWithPhoneButton.forEach((ad, i) => {
        console.log(`  ${i + 1}. ${ad.url}`);
        console.log(`     Tem classe property-phone: ${ad.hasPhoneButton ? 'SIM' : 'NÃO'}`);
        console.log(`     Tem elemento property-phone: ${ad.hasPhoneElement ? 'SIM' : 'NÃO'}`);
        console.log(`     Card class: ${ad.cardClass}`);
        console.log(`     Preview: ${ad.preview}...`);
      });
      
      // Contar quantos SEM property-phone
      const withoutPhone = pageInfo.adsWithPhoneButton.filter(ad => !ad.hasPhoneButton);
      console.log(`\n📊 Anúncios SEM property-phone (FSBO): ${withoutPhone.length}`);
      withoutPhone.forEach((ad, i) => {
        console.log(`  ${i + 1}. ${ad.url}`);
      });
    }
    
    // Screenshot
    console.log('\n📸 Tirando screenshot...');
    const screenshot = await page.screenshot({ fullPage: false });
    require('fs').writeFileSync('casasapo-debug.png', screenshot);
    console.log('✅ Screenshot salvo em: casasapo-debug.png');
    
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

debugPage();

