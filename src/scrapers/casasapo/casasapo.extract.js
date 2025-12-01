/**
 * Extração de dados brutos do Casa Sapo
 */

const { createBrowser, createPage, navigateWithRetry, randomDelay, slowScroll, closePopupsAndOverlays, getRandomUserAgent } = require('./casasapo.utils');

/**
 * Extrai URLs de anúncios da página de listagem
 * Retorna apenas URLs de anúncios SEM telefone visível (potenciais FSBO)
 */
async function extractListingUrls(page) {
  await randomDelay(2000, 3000);
  
  // Scroll para carregar lazy-load
  for (let i = 0; i < 5; i++) {
    await slowScroll(page, 'down', 400);
    await randomDelay(1000, 2000);
  }
  
  // Extrair URLs de anúncios SEM botão "Ver Telefone" (potenciais FSBO)
  const result = await page.evaluate(() => {
    const urlSet = new Set();
    const debug = {
      totalCards: 0,
      cardsWithLink: 0,
      validUrls: 0,
      withPhone: 0,
      withoutPhone: 0,
      rejected: []
    };
    
    // Função para verificar se é URL de anúncio individual
    const isAdUrl = (href) => {
      if (!href) return false;
      
      // Deve conter /comprar- ou /arrendar- seguido de tipo de imóvel
      const hasPropertyType = (href.includes('/comprar-apartamento') || 
                               href.includes('/comprar-moradia') || 
                               href.includes('/comprar-casa') ||
                               href.includes('/comprar-terreno') ||
                               href.includes('/comprar-loja') ||
                               href.includes('/arrendar-apartamento') ||
                               href.includes('/arrendar-moradia')) &&
                               !href.includes('/comprar-apartamentos/') && // listagem
                               !href.includes('/comprar-moradias/'); // listagem
      
      // Deve terminar em .html OU ter UUID no meio
      const hasId = href.endsWith('.html') ||
                   href.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
      
      // NÃO deve ser URL de listagem
      const isListing = href.includes('/comprar-apartamentos/') ||
                       href.includes('/comprar-moradias/') ||
                       href.includes('/arrendar-apartamentos/') ||
                       href.includes('/arrendar-moradias/') ||
                       href.includes('/es-es/') ||
                       href.includes('/en-en/') ||
                       (href.endsWith('/') && !href.endsWith('.html'));
      
      return hasPropertyType && hasId && !isListing;
    };
    
    // Função para verificar se tem classe "property-phone" (indica agência)
    const hasPhoneButton = (card) => {
      if (!card) return false;
      
      // Procurar especificamente por elemento com classe exata "property-phone"
      // Deve estar dentro de property-contacts
      const phoneElement = card.querySelector('.property-phone, [class="property-phone"]');
      return !!phoneElement;
    };
    
    // Método 1: Procurar por cards com classe exata "property" (card principal)
    const propertyCards = document.querySelectorAll('.property, [class="property"]');
    debug.totalCards = propertyCards.length;
    
    propertyCards.forEach((card, index) => {
      // Procurar link dentro do card (pode estar em vários lugares)
      const link = card.querySelector('a[href*="/comprar-"]');
      if (!link) {
        debug.rejected.push({ card: index + 1, reason: 'sem link /comprar-' });
        return;
      }
      
      debug.cardsWithLink++;
      const href = link.getAttribute('href');
      
      if (!href) {
        debug.rejected.push({ card: index + 1, reason: 'href vazio' });
        return;
      }
      
      if (!isAdUrl(href)) {
        debug.rejected.push({ card: index + 1, reason: 'URL inválido', href: href.substring(0, 80) });
        return;
      }
      
      debug.validUrls++;
      
      // Verificar se tem elemento com classe "property-phone" dentro deste card
      const hasPhoneBtn = hasPhoneButton(card);
      
      if (hasPhoneBtn) {
        debug.withPhone++;
      } else {
        debug.withoutPhone++;
        // Se NÃO tem classe "property-phone", é FSBO (queremos extrair)
        const fullUrl = href.startsWith('http') ? href : `https://casa.sapo.pt${href}`;
        urlSet.add(fullUrl);
      }
    });
    
    return {
      urls: Array.from(urlSet),
      debug: debug
    };
  });
  
  // Imprimir debug
  if (result.debug) {
    console.log(`[DEBUG] Total de cards .property: ${result.debug.totalCards}`);
    console.log(`[DEBUG] Cards com link: ${result.debug.cardsWithLink}`);
    console.log(`[DEBUG] URLs válidos: ${result.debug.validUrls}`);
    console.log(`[DEBUG] Com property-phone (agências): ${result.debug.withPhone}`);
    console.log(`[DEBUG] Sem property-phone (FSBO): ${result.debug.withoutPhone}`);
    if (result.debug.rejected.length > 0) {
      console.log(`[DEBUG] Rejeitados: ${result.debug.rejected.length}`);
      result.debug.rejected.slice(0, 5).forEach(r => {
        console.log(`[DEBUG]   - Card ${r.card}: ${r.reason}${r.href ? ` (${r.href})` : ''}`);
      });
    }
  }
  
  const urls = result.urls;
  
  console.log(`[CasaSapo Extract] ✅ Encontrados ${urls.length} anúncios sem telefone nesta página`);
  
  return urls;
}

/**
 * Extrai todas as URLs de anúncios de todas as páginas
 */
async function extractAllListingUrls(listingUrl, options = {}) {
  const {
    maxPages = null,
    timeout = 40000,
    headless = true  // Default true, mas será validado por shouldRunHeadless() em createBrowser
  } = options;
  
  console.log('[CasaSapo Extract] 📋 Iniciando extração de listagem...');
  console.log(`[CasaSapo Extract] URL: ${listingUrl}`);
  
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
  
  const allUrls = new Set();
  let currentPage = 1;
  
  try {
    // Navegar para primeira página
    console.log(`[CasaSapo Extract] 📄 Carregando página ${currentPage}...`);
    await navigateWithRetry(page, listingUrl, { timeout });
    await randomDelay(3000, 5000);
    
    // Fechar popups
    await closePopupsAndOverlays(page);
    await randomDelay(1000, 2000);
    
    while (true) {
      // Extrair URLs desta página
      const pageUrls = await extractListingUrls(page);
      pageUrls.forEach(url => allUrls.add(url));
      
      console.log(`[CasaSapo Extract] 📊 Página ${currentPage}: ${pageUrls.length} anúncios (total acumulado: ${allUrls.size})`);
      
      // Verificar limite de páginas
      if (maxPages && currentPage >= maxPages) {
        console.log(`[CasaSapo Extract] ⏹️  Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      // Verificar se há próxima página
      const hasNextPage = await page.evaluate(() => {
        // Procurar botão "Próxima" ou "Seguinte"
        const nextButtons = Array.from(document.querySelectorAll('a, button'));
        const hasNextButton = nextButtons.some(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return (text.includes('próxima') || text.includes('seguinte') || text.includes('next')) &&
                 !btn.disabled && !btn.classList.contains('disabled');
        });
        
        // Também verificar se há link com pn= na URL
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
        console.log(`[CasaSapo Extract] ✅ Última página alcançada`);
        break;
      }
      
      // Navegar para próxima página (Casa Sapo usa parâmetro "pn")
      currentPage++;
      const nextPageUrl = await page.evaluate((currentPage) => {
        const url = new URL(window.location.href);
        url.searchParams.set('pn', currentPage);
        return url.toString();
      }, currentPage);
      
      console.log(`[CasaSapo Extract] 📄 Carregando página ${currentPage}...`);
      await randomDelay(1500, 3200);
      await navigateWithRetry(page, nextPageUrl, { timeout });
      await randomDelay(3000, 5000);
      
      // Fechar popups novamente
      await closePopupsAndOverlays(page);
      await randomDelay(1000, 2000);
    }
    
    console.log(`[CasaSapo Extract] ✅ Extração de listagem concluída: ${allUrls.size} anúncios únicos sem telefone`);
    
    return Array.from(allUrls);
    
  } catch (error) {
    console.error('[CasaSapo Extract] ❌ Erro durante extração de listagem:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Extrai dados de um anúncio individual
 */
async function extractAdDetails(adUrl, options = {}) {
  const {
    timeout = 60000,
    headless = true  // Default true, mas será validado por shouldRunHeadless() em createBrowser
  } = options;
  
  console.log(`[CasaSapo Extract] 🔍 Extraindo detalhes: ${adUrl}`);
  
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
    // Navegar para anúncio
    await navigateWithRetry(page, adUrl, { timeout });
    await randomDelay(2000, 3000);
    
    // Fechar popups
    await closePopupsAndOverlays(page);
    await randomDelay(1000, 2000);
    
    // Scroll completo para carregar conteúdo
    for (let i = 0; i < 8; i++) {
      await slowScroll(page, 'down', 500);
      await randomDelay(1000, 2000);
    }
    
    // Aguardar um pouco mais para garantir que o conteúdo está carregado
    await randomDelay(2000, 3000);
    
    // Extrair dados básicos
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
          if (!name.includes('Veja todos') && !name.includes('Anunciante')) {
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
    
    // Nota: CasaSapo não expõe contato de particulares, então não tentamos extrair telefone
    // Apenas anúncios de agências têm telefone visível, mas filtramos esses na listagem
    rawData.phone = null;
    rawData.url = adUrl;
    
    return rawData;
    
  } catch (error) {
    console.error(`[CasaSapo Extract] ❌ Erro ao extrair anúncio ${adUrl}:`, error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = {
  extractAllListingUrls,
  extractAdDetails
};

