/**
 * Extrai URLs de anúncios de uma página de listagem OLX
 */

const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { closePopupsAndOverlays } = require('../helpers');

/**
 * Garante que a URL de listagem tenha o filtro de particulares
 * Adiciona ou preserva o parâmetro search[private_business]=private
 */
function ensurePrivateFilter(url) {
  try {
    const urlObj = new URL(url);
    
    // Verificar se já tem o parâmetro (pode estar codificado ou não)
    const searchParams = urlObj.searchParams;
    let hasPrivateFilter = false;
    
    // Verificar diferentes formatos possíveis do parâmetro
    for (const [key, value] of searchParams.entries()) {
      // Verificar se é o parâmetro de particulares (pode estar codificado)
      if (key === 'search[private_business]' || 
          key === 'search%5Bprivate_business%5D' ||
          decodeURIComponent(key) === 'search[private_business]') {
        hasPrivateFilter = true;
        // Garantir que o valor é 'private'
        if (value !== 'private') {
          searchParams.set('search[private_business]', 'private');
        }
        break;
      }
    }
    
    // Também verificar na string da URL diretamente (caso o URL não parseie corretamente)
    if (!hasPrivateFilter && url.includes('private_business')) {
      hasPrivateFilter = true;
    }
    
    if (!hasPrivateFilter) {
      // Adicionar o parâmetro de particulares
      urlObj.searchParams.set('search[private_business]', 'private');
      console.log('[OLX Listings] ✅ Filtro de particulares adicionado à URL');
    } else {
      // Garantir que está definido como 'private'
      urlObj.searchParams.set('search[private_business]', 'private');
      console.log('[OLX Listings] ✅ Filtro de particulares já presente na URL');
    }
    
    return urlObj.toString();
  } catch (error) {
    console.warn('[OLX Listings] ⚠️  Erro ao processar URL, usando URL original:', error.message);
    return url;
  }
}

function normalizeOlxListingUrl(rawHref) {
  if (!rawHref || typeof rawHref !== 'string') return null;

  try {
    let fullUrl = rawHref;
    if (rawHref.startsWith('/')) {
      fullUrl = `https://www.olx.pt${rawHref}`;
    } else if (!rawHref.startsWith('http')) {
      fullUrl = `https://www.olx.pt/${rawHref}`;
    }

    const url = new URL(fullUrl);
    if (!(url.hostname === 'www.olx.pt' || url.hostname.endsWith('.olx.pt'))) {
      return null;
    }

    const cleanPath = url.pathname.replace(/\/+$/, '');
    const isCanonicalAd =
      cleanPath.includes('/d/anuncio/') ||
      cleanPath.includes('/anuncio/') ||
      cleanPath.includes('/ad/');
    if (!isCanonicalAd) {
      return null;
    }

    url.search = '';
    url.hash = '';
    url.pathname = cleanPath;
    return url.toString();
  } catch (error) {
    return null;
  }
}

function looksLikeRealEstateCard(cardText) {
  if (!cardText || typeof cardText !== 'string') return true;

  const text = cardText.toLowerCase();
  const positiveHints = [
    'apartamento',
    'moradia',
    'casa',
    'terreno',
    'quinta',
    'vivenda',
    'duplex',
    't0',
    't1',
    't2',
    't3',
    't4',
    't5',
    'imóvel',
    'imovel',
    'm2',
  ];
  const negativeHints = [
    'automóvel',
    'automovel',
    'bmw',
    'mercedes',
    'audi',
    'peugeot',
    'renault',
    'carro',
    'mota',
    'motociclo',
    'cv',
    'kms',
    ' km ',
    'iphone',
    'samsung',
    'playstation',
    'ps5',
    'xbox',
    'emprego',
    'serviço',
    'servico',
  ];

  const hasPositiveHint = positiveHints.some((hint) => text.includes(hint));
  const hasNegativeHint = negativeHints.some((hint) => text.includes(hint));

  return hasPositiveHint || !hasNegativeHint;
}

/**
 * Extrai URLs de anúncios de uma página de listagem
 */
/**
 * Parses card data from an OLX listing card element
 * Extracts title, price, location, area, and thumbnail
 */
function parseCardData(raw) {
  const card = { title: null, price: null, location: null, area: null, thumbnail: null };

  // Price: clean "299.000 €Negociável" → 299000
  if (raw.priceText) {
    const priceMatch = raw.priceText.replace(/\s/g, '').match(/([\d.]+)\s*€/);
    if (priceMatch) {
      card.price = parseInt(priceMatch[1].replace(/\./g, ''), 10) || null;
    }
  }

  // Title: strip trailing price text
  if (raw.titleText) {
    let title = raw.titleText;
    if (card.price) {
      // Remove price suffix (e.g., "Moradia T4375.000 €" → "Moradia T4")
      const priceIdx = title.search(/\d{1,3}(?:\.\d{3})*\s*€/);
      if (priceIdx > 0) title = title.substring(0, priceIdx);
    }
    card.title = title.trim() || null;
  }

  // Location & area from smallTexts
  if (Array.isArray(raw.smallTexts)) {
    for (const text of raw.smallTexts) {
      // Area: "250 m²" or "685 m²"
      const areaMatch = text.match(/^(\d{2,5})\s*m[²2]$/);
      if (areaMatch) {
        card.area = parseInt(areaMatch[1], 10);
        continue;
      }
      // Location: "Viana do Castelo - 21 de março de 2026" or "Argela - Para o topo..."
      const locMatch = text.match(/^(.+?)\s*-\s*(?:Para o topo|Ontem|Hoje|\d{1,2}\s+de\s+)/i);
      if (locMatch && locMatch[1].length > 2) {
        card.location = locMatch[1].trim();
      }
    }
  }

  if (raw.thumbnail) card.thumbnail = raw.thumbnail;

  return card;
}

async function extractListingUrls(page) {
  console.log('[OLX Listings] 🔍 Extraindo URLs de anúncios da listagem...');

  // Aguardar JavaScript carregar
  await page.waitForTimeout(2000);

  const candidates = await page.evaluate(() => {
    const entries = [];

    // Método 1: Procurar links de anúncios no HTML
    // Seletores comuns do OLX para anúncios
    const adSelectors = [
      'a[data-cy="listing-ad-title"]',
      'a[href*="/d/anuncio/"]',
      '[data-cy="l-card"] a[href*="/d/anuncio/"]',
      'a[href*="/ad/"]',
      'a[href*="/anuncio/"]',
      'a[data-testid="ad-card"]',
      'article a[href*="/d/anuncio/"]',
      'article a[href*="/ad/"]',
      'article a[href*="/anuncio/"]',
      '.css-1sw7q4x a',
      '[data-cy="l-card"] a'
    ];

    for (const selector of adSelectors) {
      const links = document.querySelectorAll(selector);
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const card = link.closest('article, [data-cy="l-card"], [data-testid="ad-card"]');
        const cardText = card?.textContent || '';

        // Extract structured card data
        const titleEl = card?.querySelector('h6, h4, [data-cy*="title"]');
        const titleText = titleEl?.textContent?.trim() || '';
        const priceEl = card?.querySelector('[data-testid="ad-price"], p[data-testid]');
        const priceText = priceEl?.textContent?.trim() || '';
        const smallTexts = card
          ? [...card.querySelectorAll('p, span')].map(el => el.textContent?.trim()).filter(Boolean)
          : [];
        const imgEl = card?.querySelector('img');
        const thumbnail = imgEl?.src || imgEl?.getAttribute('data-src') || '';

        entries.push({ href, cardText, titleText, priceText, smallTexts, thumbnail });
      });
    }

    // Método 2: Procurar em scripts JSON-LD ou dados inline
    const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);

        // Structured: parse AggregateOffer -> Offer[] with url fields
        function extractUrlsFromObj(obj) {
          if (!obj || typeof obj !== 'object') return;
          if (typeof obj.url === 'string' && obj.url.includes('olx.pt') &&
              (obj.url.includes('/d/anuncio/') || obj.url.includes('/anuncio/') || obj.url.includes('/ad/'))) {
            entries.push({ href: obj.url, cardText: obj.name || '', titleText: obj.name || '', priceText: '', smallTexts: [], thumbnail: '' });
          }
          if (Array.isArray(obj.offers)) {
            obj.offers.forEach(o => extractUrlsFromObj(o));
          }
          if (obj.offers && typeof obj.offers === 'object' && !Array.isArray(obj.offers)) {
            extractUrlsFromObj(obj.offers);
          }
          if (Array.isArray(obj.itemListElement)) {
            obj.itemListElement.forEach(o => extractUrlsFromObj(o.item || o));
          }
        }

        if (Array.isArray(data)) {
          data.forEach(d => extractUrlsFromObj(d));
        } else {
          extractUrlsFromObj(data);
        }

        // Fallback: regex for URLs in the JSON string
        const dataStr = JSON.stringify(data);
        const urlMatches = dataStr.match(/https?:\/\/[^"'\s]*olx\.pt[^"'\s]*\/(?:d\/anuncio|anuncio|ad)\/[^"'\s]*/g);
        if (urlMatches) {
          urlMatches.forEach(url => {
            entries.push({ href: url, cardText: '', titleText: '', priceText: '', smallTexts: [], thumbnail: '' });
          });
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    });

    return entries;
  });

  const resultMap = new Map();
  candidates.forEach((entry) => {
    const normalized = normalizeOlxListingUrl(entry.href);
    if (!normalized) return;
    if (!looksLikeRealEstateCard(entry.cardText)) return;
    if (!resultMap.has(normalized)) {
      resultMap.set(normalized, parseCardData(entry));
    }
  });

  console.log(`[OLX Listings] ✅ Encontrados ${resultMap.size} anúncios nesta página`);
  return resultMap;
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
    headless = true,
    filterPrivateOnly = true
  } = options;
  
  console.log('[OLX Listings] 📋 Iniciando extração de listagem...');
  console.log(`[OLX Listings] URL original: ${listingUrl}`);
  
  // Garantir que a URL tem o filtro de particulares (se filterPrivateOnly)
  const urlWithPrivateFilter = filterPrivateOnly
    ? ensurePrivateFilter(listingUrl)
    : listingUrl;
  console.log(`[OLX Listings] URL com filtro: ${urlWithPrivateFilter}`);
  
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
  
  const allListings = new Map(); // url -> cardData
  let currentPage = 1;

  try {
    // Navegar para primeira página (com filtro de particulares)
    console.log(`[OLX Listings] 📄 Carregando página ${currentPage}...`);
    await navigateWithRetry(page, urlWithPrivateFilter);
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
      // Extrair URLs e card data desta página
      const pageMap = await extractListingUrls(page);
      for (const [url, card] of pageMap) {
        if (!allListings.has(url)) allListings.set(url, card);
      }

      console.log(`[OLX Listings] 📊 Página ${currentPage}: ${pageMap.size} anúncios (total acumulado: ${allListings.size})`);

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
      const nextPageUrl = await page.evaluate(({ currentPage, filterPrivateOnly }) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', currentPage);
        if (filterPrivateOnly !== false) {
          url.searchParams.set('search[private_business]', 'private');
        }
        return url.toString();
      }, { currentPage, filterPrivateOnly });

      console.log(`[OLX Listings] 📄 Carregando página ${currentPage}...`);
      await page.waitForTimeout(2000);
      const pageResp = await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout });
      if (pageResp && pageResp.status() >= 400) {
        console.warn(`[OLX Listings] HTTP ${pageResp.status()} na página ${currentPage} — parando paginação`);
        break;
      }
      await page.waitForTimeout(3000);

      // Fechar popups novamente
      await closePopupsAndOverlays(page, 'OLX');
      await page.waitForTimeout(1000);
    }

    console.log(`[OLX Listings] ✅ Extração de listagem concluída: ${allListings.size} anúncios únicos`);

    return allListings;
    
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
  extractListingUrls,
  normalizeOlxListingUrl,
  looksLikeRealEstateCard,
  parseCardData,
};

