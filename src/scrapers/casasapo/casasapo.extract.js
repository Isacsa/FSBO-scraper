/**
 * Extração de dados brutos do Casa Sapo
 */

const { createBrowser, createPage, navigateWithRetry, randomDelay, slowScroll, closePopupsAndOverlays, getRandomUserAgent } = require('./casasapo.utils');

/**
 * Extrai dados de cards de anúncios da página de listagem.
 * Returns rich card objects with price, location, image, features, URL.
 * This avoids visiting individual ad pages (which trigger 429).
 */
async function extractListingCards(page, options = {}) {
  const filterPrivateOnly = options.filterPrivateOnly !== false;

  // Wait for property cards to appear (SPA loads content dynamically)
  try {
    await page.waitForSelector('.property', { timeout: 15000 });
  } catch (_) {
    console.log('[CasaSapo Extract] No .property cards found, trying scroll...');
  }

  // Scroll para carregar lazy-load
  for (let i = 0; i < 5; i++) {
    await slowScroll(page, 'down', 400);
    await randomDelay(1000, 2000);
  }

  // Extrair dados dos cards
  const result = await page.evaluate((filterPrivateOnly) => {
    const cards = [];
    const seenUrls = new Set();

    // Função para verificar se é URL de anúncio individual
    const isAdUrl = (href) => {
      if (!href) return false;
      const hasPropertyType = (href.includes('/comprar-apartamento') ||
                               href.includes('/comprar-moradia') ||
                               href.includes('/comprar-casa') ||
                               href.includes('/comprar-terreno') ||
                               href.includes('/comprar-loja') ||
                               href.includes('/comprar-quinta') ||
                               href.includes('/comprar-armazem') ||
                               href.includes('/comprar-garagem') ||
                               href.includes('/comprar-escritorio') ||
                               href.includes('/arrendar-apartamento') ||
                               href.includes('/arrendar-moradia') ||
                               href.includes('/arrendar-casa')) &&
                               !href.includes('/comprar-apartamentos/') &&
                               !href.includes('/comprar-moradias/') &&
                               !href.includes('/comprar-casas/') &&
                               !href.includes('/comprar-terrenos/');
      const hasId = href.endsWith('.html') ||
                   href.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
      const isListing = href.includes('/comprar-apartamentos/') ||
                       href.includes('/comprar-moradias/') ||
                       href.includes('/comprar-casas/') ||
                       href.includes('/comprar-terrenos/') ||
                       href.includes('/arrendar-apartamentos/') ||
                       href.includes('/arrendar-moradias/') ||
                       href.includes('/es-es/') ||
                       href.includes('/en-en/') ||
                       (href.endsWith('/') && !href.endsWith('.html'));
      return hasPropertyType && hasId && !isListing;
    };

    const propertyCards = document.querySelectorAll('.property, [class="property"]');

    propertyCards.forEach((card) => {
      const link = card.querySelector('a[href*="/comprar-"]') || card.querySelector('a[href*="/arrendar-"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || !isAdUrl(href)) return;

      const fullUrl = href.startsWith('http') ? href : `https://casa.sapo.pt${href}`;
      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      // Check for property-phone (agency indicator)
      const hasPhone = !!card.querySelector('.property-phone, [class="property-phone"]');
      if (hasPhone && filterPrivateOnly) return;

      // Extract price from card
      let price = null;
      const priceEl = card.querySelector('.property-price, [class*="property-price"]');
      if (priceEl) {
        const priceText = priceEl.textContent || '';
        const priceMatch = priceText.match(/(\d{1,3}(?:[\s.]?\d{3})*)\s*€/);
        if (priceMatch) price = priceMatch[0].trim();
      }
      // Fallback: search entire card for price pattern
      if (!price) {
        const cardText = card.textContent || '';
        const priceMatch = cardText.match(/(\d{1,3}(?:[\s.]?\d{3})*)\s*€/);
        if (priceMatch) {
          const num = parseInt(priceMatch[1].replace(/[\s.]/g, ''));
          if (num > 1000) price = priceMatch[0].trim();
        }
      }

      // Extract location from card
      let location = null;
      const locEl = card.querySelector('.property-location, [class*="property-location"]');
      if (locEl) {
        location = locEl.textContent?.trim() || null;
      }
      if (!location) {
        const locEl2 = card.querySelector('[class*="location"], address');
        if (locEl2) location = locEl2.textContent?.trim() || null;
      }

      // Extract title from card link or heading
      let title = null;
      const titleEl = card.querySelector('.property-title, [class*="property-title"], h2, h3');
      if (titleEl) {
        title = titleEl.textContent?.trim() || null;
      }
      if (!title && link.textContent) {
        const linkText = link.textContent.trim();
        // Only use link text if it looks like a title (not just a price or location)
        if (linkText.length > 10 && !linkText.match(/^\d/) && !linkText.includes('€')) {
          title = linkText;
        }
      }

      // Extract image(s) from card
      const photos = [];
      card.querySelectorAll('img[src], img[data-src]').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('data:image')) {
          const fullSrc = src.startsWith('http') ? src : `https://casa.sapo.pt${src}`;
          if (!photos.includes(fullSrc)) photos.push(fullSrc);
        }
      });

      // Extract features from card (e.g., "T3", "Com Garagem", area info)
      const features = [];
      card.querySelectorAll('.property-features li, [class*="property-feature"], [class*="feature"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 100) {
          features.push(text);
        }
      });

      // Extract tipology/type from card text or features
      let tipology = null;
      let propertyType = null;
      const cardFullText = card.textContent || '';
      const tipMatch = cardFullText.match(/\bT(\d+)\b/);
      if (tipMatch) tipology = `T${tipMatch[1]}`;

      // Infer type from URL
      if (fullUrl.includes('/comprar-apartamento')) propertyType = 'apartamento';
      else if (fullUrl.includes('/comprar-moradia') || fullUrl.includes('/comprar-casa')) propertyType = 'moradia';
      else if (fullUrl.includes('/comprar-terreno')) propertyType = 'terreno';
      else if (fullUrl.includes('/comprar-quinta')) propertyType = 'quinta';
      else if (fullUrl.includes('/comprar-loja')) propertyType = 'loja';

      // Extract area if visible in card
      let area = null;
      const areaMatch = cardFullText.match(/(\d+)\s*m[²2]/);
      if (areaMatch) area = areaMatch[1];

      cards.push({
        url: fullUrl,
        price,
        location,
        title,
        photos,
        features,
        tipology,
        propertyType,
        area,
        hasPhone,
        _from_card: true,
      });
    });

    return cards;
  }, filterPrivateOnly);

  return result;
}

/**
 * Extrai todos os cards de anúncios de todas as páginas.
 * Returns rich card objects with data extracted from listing cards.
 *
 * @param {import('playwright').Page} page - existing page from caller
 * @param {string} listingUrl - listing URL
 * @param {Object} options
 * @returns {Promise<Object[]>} array of card data objects
 */
async function extractAllListingCards(page, listingUrl, options = {}) {
  const {
    maxPages = null,
    timeout = 40000,
    filterPrivateOnly = true
  } = options;

  console.log(`[CasaSapo Extract] Iniciando extracao de listagem: ${listingUrl}`);

  const allCards = [];
  const seenUrls = new Set();
  let currentPage = 1;

  // Navigate to first page
  await navigateWithRetry(page, listingUrl, { timeout });
  await randomDelay(3000, 5000);

  // Close popups — cookie consent may trigger a navigation/reload
  try {
    await closePopupsAndOverlays(page);
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  } catch (_) {
    console.log('[CasaSapo Extract] Re-navigating after popup handling...');
    await navigateWithRetry(page, listingUrl, { timeout });
  }
  await randomDelay(2000, 3000);

  while (true) {
    const pageCards = await extractListingCards(page, { filterPrivateOnly });
    let newOnPage = 0;
    for (const card of pageCards) {
      if (!seenUrls.has(card.url)) {
        seenUrls.add(card.url);
        allCards.push(card);
        newOnPage++;
      }
    }

    console.log(`[CasaSapo Extract] Pagina ${currentPage}: ${newOnPage} anuncios (total: ${allCards.length})`);

    if (maxPages && currentPage >= maxPages) {
      console.log(`[CasaSapo Extract] Limite de ${maxPages} paginas atingido`);
      break;
    }

    // Check for next page
    const hasNextPage = await page.evaluate(() => {
      const nextButtons = Array.from(document.querySelectorAll('a, button'));
      const hasNextButton = nextButtons.some(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return (text.includes('próxima') || text.includes('seguinte') || text.includes('next')) &&
               !btn.disabled && !btn.classList.contains('disabled');
      });

      const currentPn = parseInt(new URL(window.location.href).searchParams.get('pn') || '1');
      const pageLinks = Array.from(document.querySelectorAll('a[href*="pn="]'));
      const hasNextLink = pageLinks.some(link => {
        const href = link.getAttribute('href');
        const match = href.match(/pn=(\d+)/);
        return match && parseInt(match[1]) > currentPn;
      });

      return hasNextButton || hasNextLink;
    });

    if (!hasNextPage) {
      console.log('[CasaSapo Extract] Ultima pagina alcancada');
      break;
    }

    currentPage++;
    const nextPageUrl = await page.evaluate((cp) => {
      const url = new URL(window.location.href);
      url.searchParams.set('pn', cp);
      return url.toString();
    }, currentPage);

    await randomDelay(1500, 3200);
    try {
      await navigateWithRetry(page, nextPageUrl, { timeout });
    } catch (navErr) {
      if (navErr.name === 'HttpError') {
        console.warn(`[CasaSapo Extract] HTTP ${navErr.status} na pagina ${currentPage} — parando com ${allCards.length} anuncios`);
        break;
      }
      throw navErr;
    }
    await randomDelay(3000, 5000);
    await closePopupsAndOverlays(page);
    await randomDelay(1000, 2000);
  }

  console.log(`[CasaSapo Extract] Listagem concluida: ${allCards.length} anuncios`);
  return allCards;
}

/**
 * Backward-compatible wrapper — returns just URLs.
 * @deprecated Use extractAllListingCards instead.
 */
async function extractAllListingUrls(page, listingUrl, options = {}) {
  const cards = await extractAllListingCards(page, listingUrl, options);
  return cards.map(c => c.url);
}

/**
 * Extrai dados de um anúncio individual reusing an existing page.
 * This avoids opening a new browser per ad which triggers rate limiting.
 *
 * @param {import('playwright').Page} page - existing page
 * @param {string} adUrl - ad URL
 * @param {Object} options
 */
async function extractAdDetailsWithPage(page, adUrl, options = {}) {
  const { timeout = 60000 } = options;

  await navigateWithRetry(page, adUrl, { timeout });
  await randomDelay(2000, 3000);

  // Close popups
  await closePopupsAndOverlays(page);
  await randomDelay(1000, 2000);

  // Scroll to load lazy content
  for (let i = 0; i < 6; i++) {
    await slowScroll(page, 'down', 500);
    await randomDelay(800, 1500);
  }

  await randomDelay(1000, 2000);

  // Extract data
  const rawData = await _extractPageData(page);
  rawData.phone = null;
  rawData.url = adUrl;
  return rawData;
}

/**
 * Extrai dados de um anúncio individual (standalone — opens own browser).
 * Kept for backward compatibility with controllers/tests.
 */
async function extractAdDetails(adUrl, options = {}) {
  const {
    timeout = 60000,
    headless = true
  } = options;

  const browser = await createBrowser({
    headless,
    timeout
  });

  const { page, context } = await createPage(browser, {
    timeout,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent()
  });

  try {
    const rawData = await extractAdDetailsWithPage(page, adUrl, { timeout });
    return rawData;
  } catch (error) {
    console.error(`[CasaSapo Extract] Erro ao extrair anuncio ${adUrl}:`, error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Core page data extraction — used by both extractAdDetails variants.
 */
async function _extractPageData(page) {
    const rawData = await page.evaluate(() => {
      const data = {};
      
      // Título
      data.title = document.querySelector('h1')?.textContent?.trim() || 
                   document.querySelector('[class*="title"]')?.textContent?.trim() || null;
      
      // Descrição
      const descSelectors = [
        '[class*="description"]',
        '[class*="content"]',
        '[itemprop="description"]',
        'section[class*="description"]'
      ];
      for (const selector of descSelectors) {
        const desc = document.querySelector(selector);
        if (desc && desc.textContent && desc.textContent.length > 50) {
          data.description = desc.textContent.trim();
          break;
        }
      }
      
      // Preço - procurar em elementos específicos do Casa Sapo
      // Estratégia 1: Procurar por elementos com classes específicas do CasaSapo
      const priceSelectors = [
        '[class*="price"]',
        '[class*="Price"]',
        '[class*="valor"]',
        '[class*="cost"]',
        '[itemprop="price"]',
        '[data-price]',
        'strong',
        'h2',
        'h3',
        '.property-price',
        '.ad-price',
        '[id*="price"]'
      ];
      
      for (const selector of priceSelectors) {
        try {
          const priceEls = document.querySelectorAll(selector);
          for (const priceEl of priceEls) {
            const priceText = priceEl.textContent?.trim() || '';
            // Padrão mais flexível: números com espaços/pontos e símbolo €
            const priceMatch = priceText.match(/(\d{1,3}(?:[\s.]?\d{3})*)\s*€/);
            if (priceMatch && priceMatch[1]) {
              // Verificar se não é um número muito pequeno (provavelmente não é preço)
              const numValue = parseInt(priceMatch[1].replace(/[\s.]/g, ''));
              if (numValue > 1000) { // Preços de imóveis geralmente são > 1000€
                data.price = priceMatch[0].trim();
                break;
              }
            }
          }
          if (data.price) break;
        } catch (e) {
          // Continuar
        }
      }
      
      // Estratégia 2: Procurar no header/top da página (onde geralmente está o preço)
      if (!data.price) {
        const headerSelectors = ['header', '[class*="header"]', '[class*="top"]', '[class*="summary"]'];
        for (const headerSelector of headerSelectors) {
          const header = document.querySelector(headerSelector);
          if (header) {
            const headerText = header.textContent || '';
            const priceMatch = headerText.match(/(\d{1,3}(?:[\s.]?\d{3})*)\s*€/);
            if (priceMatch && priceMatch[1]) {
              const numValue = parseInt(priceMatch[1].replace(/[\s.]/g, ''));
              if (numValue > 1000) {
                data.price = priceMatch[0].trim();
                break;
              }
            }
          }
        }
      }
      
      // Estratégia 3: Fallback - procurar no texto completo da página (mas com validação)
      if (!data.price) {
        const pricePattern = /(\d{1,3}(?:[\s.]?\d{3})*)\s*€/g;
        const bodyText = document.body.textContent;
        const matches = [...bodyText.matchAll(pricePattern)];
        
        // Filtrar matches válidos (preços razoáveis)
        for (const match of matches) {
          if (match[1]) {
            const numValue = parseInt(match[1].replace(/[\s.]/g, ''));
            if (numValue > 1000 && numValue < 100000000) { // Entre 1k e 100M
              data.price = match[0].trim();
              break;
            }
          }
        }
      }
      
      // Localização/Morada - procurar em múltiplos lugares
      data.location = null;
      const locationSelectors = [
        '[class*="location"]',
        '[class*="Location"]',
        '[class*="address"]',
        '[class*="Address"]',
        '[class*="localizacao"]',
        '[class*="morada"]',
        '[itemprop="address"]',
        '[itemprop="addressLocality"]',
        '[data-location]',
        '[data-address]',
        'address',
        '[class*="property-location"]',
        '[class*="ad-location"]'
      ];
      
      // Estratégia 1: Procurar por seletores específicos
      for (const selector of locationSelectors) {
        const locs = document.querySelectorAll(selector);
        for (const loc of locs) {
          if (loc && loc.textContent) {
            const text = loc.textContent.trim();
            // Validar que parece uma morada (contém palavras comuns de localização)
            if (text.length > 5 && text.length < 200 && 
                (text.includes(',') || text.match(/\d{4}-\d{3}/) || 
                 text.includes('Portugal') || text.match(/[A-Z][a-z]+/))) {
              data.location = text;
              break;
            }
          }
        }
        if (data.location) break;
      }
      
      // Estratégia 2: Procurar no breadcrumb ou título
      if (!data.location) {
        const breadcrumb = document.querySelector('[class*="breadcrumb"], nav[aria-label*="breadcrumb"]');
        if (breadcrumb) {
          const breadcrumbText = breadcrumb.textContent || '';
          // Extrair última parte do breadcrumb (geralmente é a morada completa)
          const parts = breadcrumbText.split('>').map(p => p.trim()).filter(p => p);
          if (parts.length > 0) {
            data.location = parts[parts.length - 1];
          }
        }
      }
      
      // Estratégia 3: Procurar no título ou subtítulo
      if (!data.location) {
        const subtitle = document.querySelector('h2, h3, [class*="subtitle"]');
        if (subtitle) {
          const subtitleText = subtitle.textContent?.trim() || '';
          if (subtitleText.length > 5 && subtitleText.length < 200) {
            data.location = subtitleText;
          }
        }
      }
      
      // Fotos
      data.photos = [];
      const photoSelectors = [
        'img[src*="casa.sapo"]',
        'img[data-src*="casa.sapo"]',
        '[class*="gallery"] img',
        '[class*="carousel"] img',
        '[class*="photo"] img'
      ];
      photoSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src && !src.includes('placeholder') && !src.includes('logo')) {
            const fullUrl = src.startsWith('http') ? src : `https://casa.sapo.pt${src}`;
            if (!data.photos.includes(fullUrl)) {
              data.photos.push(fullUrl);
            }
          }
        });
      });
      
      // Features/Atributos - filtrar elementos do footer/menu
      data.features = [];
      const excludedClasses = ['footer', 'header', 'menu', 'nav', 'cookie', 'popup', 'modal'];
      const featureElements = document.querySelectorAll('[class*="feature"], [class*="attribute"], [class*="specification"], dt, dd, [class*="info"], [class*="detail"]');
      
      featureElements.forEach(el => {
        // Verificar se não é do footer/menu
        const classList = el.className?.toLowerCase() || '';
        const isExcluded = excludedClasses.some(exc => classList.includes(exc));
        if (isExcluded) return;
        
        // Verificar se não está dentro de footer/menu
        const parent = el.closest('footer, header, nav, [class*="footer"], [class*="header"], [class*="menu"]');
        if (parent) return;
        
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 200 && !text.match(/^[A-Z]{2}\s/)) {
          // Filtrar códigos de país (ex: "PT Portugal +351")
          data.features.push(text);
        }
      });
      
      // Procurar também em elementos de sidebar ou metadata que podem conter "Publicado em"
      const metadataSelectors = [
        '[class*="metadata"]',
        '[class*="meta"]',
        '[class*="sidebar"]',
        '[class*="info-box"]',
        '[class*="property-info"]',
        'aside',
        '[class*="published"]',
        '[class*="date-info"]'
      ];
      
      metadataSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text && text.length > 0 && text.length < 300) {
            // Adicionar se contém informações relevantes mas não é duplicado
            if (!data.features.includes(text) && 
                (text.toLowerCase().includes('publicado') || 
                 text.toLowerCase().includes('atualizado') ||
                 text.match(/\d{1,2}[\/\-]\d{1,2}/))) {
              data.features.push(text);
            }
          }
        });
      });
      
      // Especificações estruturadas
      data.specifications = {};
      const specSelectors = [
        '[class*="specification"]',
        '[class*="property-detail"]',
        'dl dt',
        'table td'
      ];
      
      specSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length < 100) {
            // Tentar extrair chave-valor
            if (text.includes(':')) {
              const [key, value] = text.split(':').map(s => s.trim());
              if (key && value) {
                data.specifications[key.toLowerCase()] = value;
              }
            }
          }
        });
      });
      
      // Anunciante
      data.advertiser = {};
      const advertiserSelectors = [
        '[class*="advertiser"]',
        '[class*="owner"]',
        '[class*="contact"]',
        '[class*="seller"]'
      ];
      for (const selector of advertiserSelectors) {
        const adv = document.querySelector(selector);
        if (adv && adv.textContent) {
          const name = adv.textContent.trim();
          // Limpar texto comum
          if (
            !name.includes('Veja todos') &&
            !name.includes('Anunciante') &&
            !/^(email|sms|email\s+sms)$/i.test(name)
          ) {
            data.advertiser.name = name;
            break;
          }
        }
      }
      
      // Datas - procurar por "Publicado em" na estrutura específica do CasaSapo
      data.published_date = null;
      data.updated_date = null;
      
      // Procurar na estrutura específica do CasaSapo (detail-main-features-item)
      const allFeatureItems = document.querySelectorAll('.detail-main-features-item');
      for (const item of allFeatureItems) {
        const titleEl = item.querySelector('.detail-main-features-item-title');
        const valueEl = item.querySelector('.detail-main-features-item-value');
        
        if (titleEl && titleEl.textContent) {
          const titleText = titleEl.textContent.trim().toLowerCase();
          
          // Verificar se é "Publicado em" - extrair apenas o valor
          if (titleText.includes('publicado') && valueEl && valueEl.textContent) {
            data.published_date = valueEl.textContent.trim(); // Apenas o valor, ex: "há mais de um mês"
            break;
          }
          
          // Verificar se é "Atualizado em" - extrair apenas o valor
          if (titleText.includes('atualizado') && valueEl && valueEl.textContent) {
            data.updated_date = valueEl.textContent.trim(); // Apenas o valor
          }
        }
      }
      
      // Estratégia 2: Procurar em elementos específicos de data
      if (!data.published_date) {
        const dateSelectors = [
          '[class*="date"]',
          '[class*="published"]',
          '[class*="publicado"]',
          '[class*="time"]',
          '[datetime]',
          'time[datetime]'
        ];
        
        for (const selector of dateSelectors) {
          const dateEls = document.querySelectorAll(selector);
          for (const dateEl of dateEls) {
            const text = dateEl.textContent?.trim() || '';
            const datetime = dateEl.getAttribute('datetime') || '';
            
            // Verificar se contém "Publicado" ou "publicado"
            if (text.toLowerCase().includes('publicado') || datetime) {
              if (datetime) {
                data.published_date = datetime;
              } else if (text) {
                data.published_date = text;
              }
              break;
            }
          }
          if (data.published_date) break;
        }
      }
      
      // Estratégia 3: Procurar no texto completo da página com padrões
      if (!data.published_date) {
        const bodyText = document.body.textContent;
        const datePatterns = [
          /Publicado\s+em[:\s]+([^\n<]+?)(?:\s+(há\s+\d+\s+(?:dia|dias|semana|semanas|mês|meses|ano|anos)|hoje|ontem))?/i,
          /Publicado[:\s]+([^\n<]+)/i,
          /(há\s+\d+\s+(?:dia|dias|semana|semanas|mês|meses|ano|anos))/i,
          /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
        ];
        
        for (const pattern of datePatterns) {
          const match = bodyText.match(pattern);
          if (match && match[1]) {
            data.published_date = match[1].trim();
            break;
          } else if (match && match[0]) {
            data.published_date = match[0].trim();
            break;
          }
        }
      }
      
      // Procurar data de atualização
      const updatedPattern = /Atualizado\s+em[:\s]+([^\n<]+)/i;
      const updatedMatch = document.body.textContent.match(updatedPattern);
      if (updatedMatch && updatedMatch[1]) {
        data.updated_date = updatedMatch[1].trim();
      }
      
      return data;
    });
    
    return rawData;
}

module.exports = {
  extractAllListingUrls,
  extractAllListingCards,
  extractAdDetails,
  extractAdDetailsWithPage,
};

