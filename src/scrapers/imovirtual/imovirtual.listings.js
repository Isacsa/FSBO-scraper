/**
 * Extrai URLs de anúncios de uma página de listagem Imovirtual
 * Preserva filtro de particulares (ownerTypeSingleSelect=PRIVATE)
 */

const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { closePopupsAndOverlays } = require('../helpers');

/**
 * Extrai URLs de anúncios de uma página de listagem
 */
async function extractListingUrls(page) {
  console.log('[Imovirtual Listings] 🔍 Extraindo URLs de anúncios da listagem...');
  
  // Aguardar JavaScript carregar
  await page.waitForTimeout(3000);
  
  const urls = await page.evaluate(() => {
    const urlSet = new Set();
    
    // Método 1: Procurar links de anúncios no HTML
    // Seletores comuns do Imovirtual para anúncios
    const adSelectors = [
      'a[href*="/anuncio/"]',
      'a[href*="/oferta/"]',
      'a[data-cy="listing-item-link"]',
      'article a[href*="/anuncio/"]',
      'article a[href*="/oferta/"]',
      '[class*="offer-item"] a',
      '[class*="listing-item"] a',
      '[class*="property-card"] a'
    ];
    
    for (const selector of adSelectors) {
      const links = document.querySelectorAll(selector);
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          // Construir URL completo
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://www.imovirtual.com${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `https://www.imovirtual.com/${href}`;
          }
          
          // Limpar parâmetros extras
          const cleanUrl = fullUrl.split('?')[0].split('#')[0];
          
          // Verificar se é URL de anúncio válido
          if (cleanUrl.includes('/anuncio/') || cleanUrl.includes('/oferta/')) {
            urlSet.add(cleanUrl);
          }
        }
      });
    }
    
    // Método 2: Procurar por IDs de anúncios em data attributes
    const adElements = document.querySelectorAll('[data-id], [data-offer-id], [data-listing-id]');
    adElements.forEach(el => {
      const adId = el.getAttribute('data-id') || 
                   el.getAttribute('data-offer-id') || 
                   el.getAttribute('data-listing-id');
      
      if (adId && /^\d+$/.test(adId)) {
        // Construir URL do anúncio
        const adUrl = `https://www.imovirtual.com/anuncio/${adId}`;
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
        const urlMatches = dataStr.match(/https?:\/\/[^"'\s]*imovirtual\.com[^"'\s]*\/anuncio[^"'\s]*/g);
        if (urlMatches) {
          urlMatches.forEach(url => {
            const cleanUrl = url.split('?')[0].split('#')[0];
            if (cleanUrl.includes('/anuncio/')) {
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
  
  console.log(`[Imovirtual Listings] ✅ Encontrados ${urls.length} anúncios nesta página`);
  return urls;
}

/**
 * Verifica se há próxima página
 */
async function hasNextPage(page) {
  return await page.evaluate(() => {
    // Procurar botão "Próxima" ou "Seguinte"
    const nextButtons = document.querySelectorAll('a[aria-label*="próxima"], a[aria-label*="seguinte"], a[aria-label*="next"]');
    for (const btn of nextButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if ((text.includes('próxima') || text.includes('seguinte') || text.includes('next') || 
           ariaLabel.includes('próxima') || ariaLabel.includes('seguinte') || ariaLabel.includes('next')) && 
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
 * IMPORTANTE: Preserva filtro ownerTypeSingleSelect=PRIVATE
 */
async function extractAllListingUrls(listingUrl, options = {}) {
  const {
    maxPages = null,
    timeout = 40000,
    headless = true,
    filterPrivateOnly = true
  } = options;
  
  console.log('[Imovirtual Listings] 📋 Iniciando extração de listagem...');
  console.log(`[Imovirtual Listings] URL: ${listingUrl}`);
  
  // Handle ownerTypeSingleSelect based on filterPrivateOnly
  const urlObj = new URL(listingUrl);
  const searchParams = new URLSearchParams(urlObj.search);
  if (filterPrivateOnly) {
    if (!searchParams.has('ownerTypeSingleSelect') || searchParams.get('ownerTypeSingleSelect') !== 'PRIVATE') {
      console.warn('[Imovirtual Listings] ⚠️  AVISO: Filtro de particulares não encontrado na URL!');
      console.warn('[Imovirtual Listings] ⚠️  Adicionando ownerTypeSingleSelect=PRIVATE...');
      searchParams.set('ownerTypeSingleSelect', 'PRIVATE');
      urlObj.search = searchParams.toString();
      listingUrl = urlObj.toString();
      console.log(`[Imovirtual Listings] ✅ URL corrigida: ${listingUrl}`);
    }
  } else {
    searchParams.delete('ownerTypeSingleSelect');
    urlObj.search = searchParams.toString();
    listingUrl = urlObj.toString();
  }
  
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
  
  // Preservar URL original e seus parâmetros de query (especialmente ownerTypeSingleSelect=PRIVATE)
  const originalUrl = new URL(listingUrl);
  const originalSearchParams = new URLSearchParams(originalUrl.search);
  
  try {
    // Navegar para primeira página
    console.log(`[Imovirtual Listings] 📄 Carregando página ${currentPage}...`);
    await navigateWithRetry(page, listingUrl);
    await page.waitForTimeout(3000);
    
    // Fechar popups
    await closePopupsAndOverlays(page, 'IMOVIRTUAL');
    await page.waitForTimeout(2000);
    
    // Aguardar body carregar
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.warn('[Imovirtual Listings] ⚠️  Timeout aguardando body');
    }
    
    while (true) {
      // Extrair URLs desta página
      const pageUrls = await extractListingUrls(page);
      pageUrls.forEach(url => allUrls.add(url));
      
      console.log(`[Imovirtual Listings] 📊 Página ${currentPage}: ${pageUrls.length} anúncios (total acumulado: ${allUrls.size})`);
      
      // Verificar limite de páginas
      if (maxPages && currentPage >= maxPages) {
        console.log(`[Imovirtual Listings] ⏹️  Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      // Verificar se há próxima página
      const hasNext = await hasNextPage(page);
      if (!hasNext) {
        console.log(`[Imovirtual Listings] ✅ Última página alcançada`);
        break;
      }
      
      // Navegar para próxima página
      // IMPORTANTE: Preservar parâmetros originais (especialmente ownerTypeSingleSelect=PRIVATE)
      currentPage++;
      const nextPageUrl = new URL(originalUrl);
      const nextPageParams = new URLSearchParams(originalSearchParams);
      nextPageParams.set('page', currentPage.toString());
      nextPageUrl.search = nextPageParams.toString();
      
      console.log(`[Imovirtual Listings] 🔗 URL próxima página: ${nextPageUrl.toString()}`);
      
      console.log(`[Imovirtual Listings] 📄 Carregando página ${currentPage}...`);
      await page.waitForTimeout(2000);
      await page.goto(nextPageUrl.toString(), { waitUntil: 'domcontentloaded', timeout });
      await page.waitForTimeout(3000);
      
      // Fechar popups novamente
      await closePopupsAndOverlays(page, 'IMOVIRTUAL');
      await page.waitForTimeout(1000);
    }
    
    console.log(`[Imovirtual Listings] ✅ Extração de listagem concluída: ${allUrls.size} anúncios únicos`);
    
    return Array.from(allUrls);
    
  } catch (error) {
    console.error('[Imovirtual Listings] ❌ Erro durante extração de listagem:', error.message);
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

