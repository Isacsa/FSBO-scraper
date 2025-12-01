/**
 * Extrai URLs de anúncios de uma página de listagem OLX
 */

const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { closePopupsAndOverlays } = require('../helpers');

/**
 * Extrai URLs de anúncios de uma página de listagem
 */
async function extractListingUrls(page) {
  console.log('[OLX Listings] 🔍 Extraindo URLs de anúncios da listagem...');
  
  // Aguardar JavaScript carregar
  await page.waitForTimeout(2000);
  
  const urls = await page.evaluate(() => {
    const urlSet = new Set();
    
    // Método 1: Procurar links de anúncios no HTML
    // Seletores comuns do OLX para anúncios
    const adSelectors = [
      'a[data-cy="listing-ad-title"]',
      'a[href*="/ad/"]',
      'a[href*="/anuncio/"]',
      'a[data-testid="ad-card"]',
      'article a[href*="/ad/"]',
      'article a[href*="/anuncio/"]',
      '.css-1sw7q4x a', // Seletor comum do OLX
      '[data-cy="l-card"] a'
    ];
    
    for (const selector of adSelectors) {
      const links = document.querySelectorAll(selector);
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          // Construir URL completo
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://www.olx.pt${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `https://www.olx.pt/${href}`;
          }
          
          // Limpar parâmetros extras
          const cleanUrl = fullUrl.split('?')[0].split('#')[0];
          
          // Verificar se é URL de anúncio válido
          if (cleanUrl.includes('/ad/') || cleanUrl.includes('/anuncio/')) {
            urlSet.add(cleanUrl);
          }
        }
      });
    }
    
    // Método 2: Procurar por IDs de anúncios no HTML/data attributes
    const adElements = document.querySelectorAll('[data-id], [data-ad-id], [id*="ad-"]');
    adElements.forEach(el => {
      const adId = el.getAttribute('data-id') || 
                   el.getAttribute('data-ad-id') || 
                   el.id?.replace('ad-', '');
      
      if (adId && /^\d+$/.test(adId)) {
        // Construir URL do anúncio
        const adUrl = `https://www.olx.pt/ad/i${adId}`;
        urlSet.add(adUrl);
      }
    });
    
    // Método 3: Procurar em scripts JSON-LD ou dados inline
    const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const dataStr = JSON.stringify(data);
        
        // Procurar URLs de anúncios no JSON
        const urlMatches = dataStr.match(/https?:\/\/[^"'\s]*olx\.pt[^"'\s]*\/ad[^"'\s]*/g);
        if (urlMatches) {
          urlMatches.forEach(url => {
            const cleanUrl = url.split('?')[0].split('#')[0];
            if (cleanUrl.includes('/ad/')) {
              urlSet.add(cleanUrl);
            }
          });
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    });
    
    return Array.from(urlSet);
  });
  
  console.log(`[OLX Listings] ✅ Encontrados ${urls.length} anúncios nesta página`);
  return urls;
}

/**
 * Verifica se há próxima página
 */
async function hasNextPage(page) {
  return await page.evaluate(() => {
    // Procurar botão "Próxima" ou "Seguinte"
    const nextButtons = document.querySelectorAll('a[data-cy="page-link-next"], a[aria-label*="próxima"], a[aria-label*="seguinte"]');
    for (const btn of nextButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if ((text.includes('próxima') || text.includes('seguinte') || ariaLabel.includes('próxima') || ariaLabel.includes('seguinte')) && 
          !btn.disabled && !btn.classList.contains('disabled')) {
        return true;
      }
    }
    
    // Procurar link com número de página maior
    const currentPageNum = parseInt(window.location.search.match(/page=(\d+)/)?.[1] || '1');
    const pageLinks = Array.from(document.querySelectorAll('a[href*="page="]'));
    return pageLinks.some(link => {
      const match = link.href.match(/page=(\d+)/);
      return match && parseInt(match[1]) > currentPageNum;
    });
  });
}

/**
 * Extrai todas as URLs de anúncios de todas as páginas
 */
async function extractAllListingUrls(listingUrl, options = {}) {
  const {
    maxPages = null,
    timeout = 40000,
    headless = true
  } = options;
  
  console.log('[OLX Listings] 📋 Iniciando extração de listagem...');
  console.log(`[OLX Listings] URL: ${listingUrl}`);
  
  const browser = await createBrowser({ 
    headless, 
    timeout 
  });
  
  const page = await createPage(browser, {
    timeout,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    geolocation: { latitude: 38.7223, longitude: -9.1393 }
  });
  
  const allUrls = new Set();
  let currentPage = 1;
  
  try {
    // Navegar para primeira página
    console.log(`[OLX Listings] 📄 Carregando página ${currentPage}...`);
    await navigateWithRetry(page, listingUrl);
    await page.waitForTimeout(3000);
    
    // Fechar popups
    await closePopupsAndOverlays(page, 'OLX');
    await page.waitForTimeout(2000);
    
    // Aguardar body carregar
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.warn('[OLX Listings] ⚠️  Timeout aguardando body');
    }
    
    while (true) {
      // Extrair URLs desta página
      const pageUrls = await extractListingUrls(page);
      pageUrls.forEach(url => allUrls.add(url));
      
      console.log(`[OLX Listings] 📊 Página ${currentPage}: ${pageUrls.length} anúncios (total acumulado: ${allUrls.size})`);
      
      // Verificar limite de páginas
      if (maxPages && currentPage >= maxPages) {
        console.log(`[OLX Listings] ⏹️  Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      // Verificar se há próxima página
      const hasNext = await hasNextPage(page);
      if (!hasNext) {
        console.log(`[OLX Listings] ✅ Última página alcançada`);
        break;
      }
      
      // Navegar para próxima página
      currentPage++;
      const nextPageUrl = await page.evaluate((currentPage) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', currentPage);
        return url.toString();
      }, currentPage);
      
      console.log(`[OLX Listings] 📄 Carregando página ${currentPage}...`);
      await page.waitForTimeout(2000);
      await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(3000);
      
      // Fechar popups novamente
      await closePopupsAndOverlays(page, 'OLX');
      await page.waitForTimeout(1000);
    }
    
    console.log(`[OLX Listings] ✅ Extração de listagem concluída: ${allUrls.size} anúncios únicos`);
    
    return Array.from(allUrls);
    
  } catch (error) {
    console.error('[OLX Listings] ❌ Erro durante extração de listagem:', error.message);
    throw error;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  extractAllListingUrls,
  extractListingUrls
};

