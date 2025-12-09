/**
 * Extração de dados do CustoJusto
 * Listagem e anúncios individuais
 */

const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { randomDelay, slowScroll, getRandomUserAgent } = require('./custojusto.utils');
const { cleanText } = require('../../utils/selectors');

/**
 * Extrai URLs de anúncios de uma página de listagem
 */
async function extractListingUrls(page) {
  console.log('[CustoJusto Extract] 🔍 Extraindo URLs de anúncios da listagem...');
  
  // Aguardar JavaScript carregar (React/MUI)
  await randomDelay(3000, 5000);
  
  // Scroll múltiplo para carregar lazy-load
  for (let i = 0; i < 5; i++) {
    await slowScroll(page, 'down', 400);
    await randomDelay(1000, 2000);
  }
  
  // Aguardar mais um pouco para conteúdo dinâmico
  await randomDelay(2000, 3000);
  
  // Aguardar elementos carregarem (múltiplos seletores)
  let foundElements = false;
  const selectors = [
    'a[href*="/id-"]',
    'a[href*="/anuncio/"]',
    'article a[href]',
    '[class*="card"] a[href]',
    '[class*="ad"] a[href]',
    '[class*="listing"] a[href]',
    '[class*="montra"] a[href]'
  ];
  
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 8000 });
      foundElements = true;
      console.log(`[CustoJusto Extract] ✅ Encontrado seletor: ${selector}`);
      break;
    } catch (e) {
      // Continuar tentando próximo seletor
    }
  }
  
  if (!foundElements) {
    console.warn('[CustoJusto Extract] ⚠️  Nenhum seletor encontrou elementos, tentando extrair mesmo assim...');
  }
  
  // Extrair URLs com múltiplos seletores e métodos
  const urls = await page.evaluate(() => {
    const urlSet = new Set();
    
    // Método 1: Extrair de scripts JSON-LD (mais confiável)
    const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const dataStr = JSON.stringify(data);
        
        // Procurar URLs completos de anúncios no JSON (formato slug)
        const urlMatches = dataStr.match(/https?:\/\/[^"'\s]*custojusto\.pt[^"'\s]*\/[^"'\s]*-\d{6,}[^"'\s]*/g);
        if (urlMatches) {
          urlMatches.forEach(url => {
            if (url.includes('custojusto.pt') && (url.includes('/imobiliario/') || url.includes('/moradias/') || url.includes('/apartamentos/'))) {
              // Limpar URL (remover parâmetros extras)
              const cleanUrl = url.split('?')[0].split('#')[0];
              urlSet.add(cleanUrl);
            }
          });
        }
        
        // Procurar por IDs e construir URLs (formato slug)
        const idPatterns = [
          /"id":\s*(\d{6,})/g,
          /"adId":\s*(\d{6,})/g,
          /"ad_id":\s*(\d{6,})/g,
          /"idAnuncio":\s*(\d{6,})/g,
          /"itemId":\s*(\d{6,})/g,
          /"anuncioId":\s*(\d{6,})/g
        ];
        
        idPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(dataStr)) !== null) {
            const id = match[1];
            if (id && id.length >= 6) {
              // Tentar encontrar categoria no contexto
              const context = dataStr.substring(Math.max(0, match.index - 200), match.index + 200);
              let category = 'imobiliario';
              if (context.includes('moradia') || context.includes('moradias')) {
                category = 'moradias';
              } else if (context.includes('apartamento') || context.includes('apartamentos')) {
                category = 'apartamentos';
              }
              // Construir URL no formato slug (será melhorado quando tivermos mais contexto)
              urlSet.add(`https://www.custojusto.pt/portugal/imobiliario/${category}/anuncio-${id}`);
            }
          }
        });
      } catch (e) {
        // Ignorar erros de parsing
      }
    });
    
    // Método 2: Procurar em elementos com classes "card" e "item" (React components)
    const cardItems = document.querySelectorAll('[class*="card"], [class*="item"], [class*="ad"]');
    cardItems.forEach(item => {
      // Procurar link dentro do item
      const link = item.querySelector('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          // Formato slug: /leiria/imobiliario/moradias/titulo-44325290
          if (href.match(/\/[^\/]+\/imobiliario\/(moradias|apartamentos|terrenos)\/[^\/]+-\d{6,}/)) {
            const fullUrl = href.startsWith('http') ? href.split('?')[0].split('#')[0] : `https://www.custojusto.pt${href.split('?')[0].split('#')[0]}`;
            urlSet.add(fullUrl);
          }
          // Formato antigo: /id-XXXXXXX
          else if (href.match(/\/id-\d{4,}/)) {
            const fullUrl = href.startsWith('http') ? href.split('?')[0].split('#')[0] : `https://www.custojusto.pt${href.split('?')[0].split('#')[0]}`;
            urlSet.add(fullUrl);
          }
        }
      }
      
      // Procurar data attributes
      const dataId = item.getAttribute('data-id') || item.getAttribute('data-ad-id');
      if (dataId && /^\d{6,}$/.test(dataId)) {
        // Tentar construir URL slug (será melhorado)
        urlSet.add(`https://www.custojusto.pt/portugal/imobiliario/moradias/anuncio-${dataId}`);
      }
    });
    
    // Método 3: Procurar URLs no formato slug no HTML
    const html = document.body.innerHTML;
    
    // Formato slug: /[regiao]/imobiliario/[tipo]/[titulo]-[id]
    const slugMatches = html.match(/https?:\/\/[^"'\s]*custojusto\.pt\/[^"'\s]*\/imobiliario\/(moradias|apartamentos|terrenos)\/[^"'\s]+-\d{6,}[^"'\s]*/g);
    if (slugMatches) {
      slugMatches.forEach(url => {
        const cleanUrl = url.split('?')[0].split('#')[0];
        urlSet.add(cleanUrl);
      });
    }
    
    // Formato antigo: /id-XXXXXXX
    const idMatches = html.match(/https?:\/\/[^"'\s]*custojusto\.pt\/id-\d{6,}[^"'\s]*/g);
    if (idMatches) {
      idMatches.forEach(url => {
        const cleanUrl = url.split('?')[0].split('#')[0];
        urlSet.add(cleanUrl);
      });
    }
    
    // Procurar padrões relativos
    const relativeSlugMatches = html.match(/\/[^"'\s]+\/imobiliario\/(moradias|apartamentos|terrenos)\/[^"'\s]+-\d{6,}[^"'\s]*/g);
    if (relativeSlugMatches) {
      relativeSlugMatches.forEach(path => {
        const cleanPath = path.split('?')[0].split('#')[0];
        urlSet.add(`https://www.custojusto.pt${cleanPath}`);
      });
    }
    
    // Método 4: Links diretos (formato slug)
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        // Formato slug: /[regiao]/imobiliario/[tipo]/[titulo]-[id]
        if (href.match(/\/[^\/]+\/imobiliario\/(moradias|apartamentos|terrenos)\/[^\/]+-\d{6,}/)) {
          const fullUrl = href.startsWith('http') ? href.split('?')[0].split('#')[0] : `https://www.custojusto.pt${href.split('?')[0].split('#')[0]}`;
          urlSet.add(fullUrl);
        }
        // Formato antigo: /id-XXXXXXX
        else if (href.match(/\/id-\d{6,}/)) {
          const fullUrl = href.startsWith('http') ? href.split('?')[0].split('#')[0] : `https://www.custojusto.pt${href.split('?')[0].split('#')[0]}`;
          urlSet.add(fullUrl);
        }
      }
    });
    
    // Método 5: Procurar na seção "Montra de anúncios"
    const montraHeading = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, section')).find(el => 
      el.textContent?.includes('Montra de anúncios')
    );
    if (montraHeading) {
      const parent = montraHeading.closest('section, div, article') || montraHeading.parentElement;
      if (parent) {
        parent.querySelectorAll('a[href]').forEach(link => {
          const href = link.getAttribute('href');
          if (href && (href.match(/\/id-\d+/) || href.match(/\/anuncio\/\d+/))) {
            const fullUrl = href.startsWith('http') ? href : `https://www.custojusto.pt${href}`;
            urlSet.add(fullUrl);
          }
        });
      }
    }
    
    return Array.from(urlSet);
  });
  
  console.log(`[CustoJusto Extract] ✅ Encontrados ${urls.length} anúncios nesta página`);
  
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
  
  console.log('[CustoJusto Extract] 📋 Iniciando extração de listagem...');
  console.log(`[CustoJusto Extract] URL: ${listingUrl}`);
  
  // Validar e garantir que f=p está presente (filtro de particulares)
  const urlObj = new URL(listingUrl);
  const searchParams = new URLSearchParams(urlObj.search);
  if (!searchParams.has('f') || searchParams.get('f') !== 'p') {
    console.warn('[CustoJusto Extract] ⚠️  AVISO: Parâmetro f=p não encontrado na URL!');
    console.warn('[CustoJusto Extract] ⚠️  Adicionando f=p para filtrar apenas particulares...');
    searchParams.set('f', 'p');
    urlObj.search = searchParams.toString();
    listingUrl = urlObj.toString();
    console.log(`[CustoJusto Extract] ✅ URL corrigida: ${listingUrl}`);
  }
  
  const browser = await createBrowser({ 
    headless, 
    timeout 
  });
  
  const page = await createPage(browser, {
    timeout,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent()
  });
  
  const allUrls = new Set();
  let currentPage = 1;
  
  // Preservar URL (já corrigida se necessário) e seus parâmetros de query (especialmente f=p)
  const originalUrl = new URL(listingUrl);
  const originalSearchParams = new URLSearchParams(originalUrl.search);
  
  try {
    // Navegar para primeira página
    console.log(`[CustoJusto Extract] 📄 Carregando página ${currentPage}...`);
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout });
    await randomDelay(3000, 5000);
    
    // Aguardar body carregar
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      console.warn('[CustoJusto Extract] ⚠️  Timeout aguardando body');
    }
    
    while (true) {
      // Extrair URLs desta página
      const pageUrls = await extractListingUrls(page);
      pageUrls.forEach(url => allUrls.add(url));
      
      console.log(`[CustoJusto Extract] 📊 Página ${currentPage}: ${pageUrls.length} anúncios (total acumulado: ${allUrls.size})`);
      
      // Verificar se há próxima página
      const hasNextPage = await page.evaluate(() => {
      // Procurar botão "Próxima" ou "Seguinte"
      const nextButtons = document.querySelectorAll('a[aria-label*="próxima"], a[aria-label*="seguinte"]');
      for (const btn of nextButtons) {
        const text = btn.textContent?.toLowerCase() || '';
        if ((text.includes('próxima') || text.includes('seguinte')) && 
            !btn.disabled && !btn.classList.contains('disabled')) {
          return true;
        }
      }
      
      // Procurar por texto "Próxima" ou "Seguinte"
      const allLinks = Array.from(document.querySelectorAll('a'));
      for (const link of allLinks) {
        const text = link.textContent?.toLowerCase() || '';
        if ((text.includes('próxima') || text.includes('seguinte')) && 
            !link.disabled && !link.classList.contains('disabled')) {
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
      
      // Verificar limite de páginas
      if (maxPages && currentPage >= maxPages) {
        console.log(`[CustoJusto Extract] ⏹️  Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      if (!hasNextPage) {
        console.log(`[CustoJusto Extract] ✅ Última página alcançada`);
        break;
      }
      
      // Navegar para próxima página
      // IMPORTANTE: Preservar parâmetros originais da URL (especialmente f=p)
      currentPage++;
      const nextPageUrl = new URL(originalUrl);
      const nextPageParams = new URLSearchParams(originalSearchParams);
      nextPageParams.set('page', currentPage.toString());
      nextPageUrl.search = nextPageParams.toString();
      
      console.log(`[CustoJusto Extract] 🔗 URL próxima página: ${nextPageUrl.toString()}`);
      
      console.log(`[CustoJusto Extract] 📄 Carregando página ${currentPage}...`);
      await randomDelay(2000, 4000);
      await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout });
      await randomDelay(3000, 5000);
      
      // Aguardar body carregar
      try {
        await page.waitForSelector('body', { timeout: 10000 });
      } catch (e) {
        console.warn('[CustoJusto Extract] ⚠️  Timeout aguardando body');
      }
    }
    
    console.log(`[CustoJusto Extract] ✅ Extração de listagem concluída: ${allUrls.size} anúncios únicos`);
    
    return Array.from(allUrls);
    
  } catch (error) {
    console.error('[CustoJusto Extract] ❌ Erro durante extração de listagem:', error.message);
    throw error;
  } finally {
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
  
  console.log(`[CustoJusto Extract] 🔍 Extraindo detalhes: ${adUrl}`);
  
  const browser = await createBrowser({ 
    headless, 
    timeout 
  });
  
  const page = await createPage(browser, {
    timeout,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent()
  });
  
  try {
    // Navegar para anúncio
    await page.goto(adUrl, { waitUntil: 'domcontentloaded', timeout });
    await randomDelay(2000, 3000);
    
    // Aceitar cookies se existir
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, span'));
        const button = buttons.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('aceitar') || 
                 text.includes('accept') || 
                 text.includes('concordo') ||
                 text.includes('ok') ||
                 el.getAttribute('id')?.includes('cookie') ||
                 el.getAttribute('class')?.includes('cookie');
        });
        if (button) button.click();
      });
      await randomDelay(1000, 2000);
    } catch (e) {
      // Ignorar erro de cookies
    }
    
    // Scroll para carregar conteúdo
    await slowScroll(page, 'down', 500);
    await randomDelay(2000, 3000);
    
    // Extrair dados básicos
    const rawData = await page.evaluate(() => {
      const data = {};
      
      // PRIMEIRO: Tentar extrair listTime do JSON embutido na página
      // O CustoJusto embute dados JSON nos scripts que contém listTime
      data.listTime = null;
      try {
        // Procurar em scripts JSON-LD ou application/json
        const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
        for (const script of scripts) {
          try {
            const jsonData = JSON.parse(script.textContent);
            const jsonStr = JSON.stringify(jsonData);
            
            // Procurar por listTime no JSON
            const listTimeMatch = jsonStr.match(/"listTime"\s*:\s*"([^"]+)"/);
            if (listTimeMatch) {
              data.listTime = listTimeMatch[1];
              break;
            }
          } catch (e) {
            // Continuar procurando
          }
        }
        
        // Se não encontrou, procurar no HTML completo
        if (!data.listTime) {
          const htmlContent = document.body.innerHTML;
          const listTimeMatches = htmlContent.match(/"listTime"\s*:\s*"([^"]+)"/g);
          if (listTimeMatches && listTimeMatches.length > 0) {
            // Pegar o primeiro match e extrair a data
            const firstMatch = listTimeMatches[0].match(/"listTime"\s*:\s*"([^"]+)"/);
            if (firstMatch) {
              data.listTime = firstMatch[1];
            }
          }
        }
      } catch (e) {
        // Ignorar erro
      }
      
      // Título
      data.title = document.querySelector('h1')?.textContent?.trim() || 
                   document.querySelector('[class*="title"]')?.textContent?.trim() || null;
      
      // Descrição - procurar seção de descrição
      const descSelectors = [
        'h2:contains("Descrição") + div',
        'h2:contains("Descrição") + p',
        '[class*="description"]',
        '[class*="content"]',
        'div[itemprop="description"]'
      ];
      
      // Procurar por texto "Descrição" e pegar próximo elemento
      const descHeading = Array.from(document.querySelectorAll('h2, h3, h4, div, section')).find(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('descrição') || text.includes('description');
      });
      
      if (descHeading) {
        // Procurar próximo elemento com descrição
        let next = descHeading.nextElementSibling;
        while (next && (!next.textContent || next.textContent.length < 50)) {
          next = next.nextElementSibling;
        }
        if (next && next.textContent && next.textContent.length > 50) {
          data.description = next.textContent.trim();
        }
      }
      
      // Se não encontrou, tentar seletores padrão
      if (!data.description) {
        for (const selector of descSelectors) {
          try {
            const desc = document.querySelector(selector);
            if (desc && desc.textContent && desc.textContent.length > 50) {
              data.description = desc.textContent.trim();
              break;
            }
          } catch (e) {
            // Ignorar seletor inválido
          }
        }
      }
      
      // Preço - procurar por padrão "XXX XXX €" ou "Preço: XXX €"
      const pricePattern = /(\d{1,3}(?:\s?\d{3})*)\s*€/;
      const bodyText = document.body.textContent;
      const priceMatch = bodyText.match(pricePattern);
      
      let priceElement = null;
      if (priceMatch) {
        data.price = priceMatch[0].trim();
        // Tentar encontrar o elemento do preço
        const allElements = Array.from(document.querySelectorAll('*'));
        priceElement = allElements.find(el => {
          const text = el.textContent || '';
          return text.includes(priceMatch[0]) && text.includes('€');
        });
      } else {
        // Tentar seletores
        const priceSelectors = [
          '[class*="price"]',
          '[itemprop="price"]',
          'strong:contains("€")',
          '[class*="valor"]'
        ];
        for (const selector of priceSelectors) {
          try {
            const priceEl = document.querySelector(selector);
            if (priceEl && priceEl.textContent && priceEl.textContent.includes('€')) {
              data.price = priceEl.textContent.trim();
              priceElement = priceEl;
              break;
            }
          } catch (e) {
            // Ignorar seletor inválido
          }
        }
      }
      
      // Extrair datas (published_date, updated_date, days_online)
      // PRIORIDADE 1: Usar listTime do JSON se disponível
      data.published_date = null;
      data.updated_date = null;
      data.days_online = null;
      
      if (data.listTime) {
        // listTime vem em formato ISO (ex: "2025-11-19T00:00:10Z")
        // Usar como published_date
        data.published_date = data.listTime;
        
        // Calcular days_online se possível
        try {
          const listDate = new Date(data.listTime);
          const now = new Date();
          const diffTime = now - listDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            data.days_online = diffDays.toString();
          }
        } catch (e) {
          // Ignorar erro de parsing
        }
      }
      
      // PRIORIDADE 2: Se não tem listTime, tentar extrair do HTML
      // As datas costumam estar abaixo do preço no formato "27 Nov"
      
      // Padrão específico do CustoJusto: "DD MMM" (ex: "27 Nov")
      const custoJustoDatePattern = /(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?/i;
      
      if (priceElement) {
        // Procurar elementos próximos ao preço (irmãos ou filhos próximos)
        let currentElement = priceElement;
        const checkedElements = new Set();
        
        // Procurar nos próximos 10 elementos irmãos
        for (let i = 0; i < 10; i++) {
          if (currentElement && currentElement.nextElementSibling) {
            currentElement = currentElement.nextElementSibling;
            if (checkedElements.has(currentElement)) break;
            checkedElements.add(currentElement);
            
            const text = currentElement.textContent?.trim() || '';
            if (text.length > 0 && text.length < 200) {
              // Procurar padrão "DD MMM" (formato CustoJusto)
              const dateMatch = text.match(custoJustoDatePattern);
              if (dateMatch && !data.published_date) {
                data.published_date = dateMatch[0].trim();
              }
              
              // Procurar por "Publicado" ou "Atualizado"
              const lowerText = text.toLowerCase();
              
              if (lowerText.includes('publicado') && !data.published_date) {
                // Extrair a data que vem após "Publicado"
                const publishedDateMatch = text.match(/(?:publicado|publicado em|publicado à)\s*([^\.\n]{0,50})/i);
                if (publishedDateMatch) {
                  data.published_date = publishedDateMatch[1].trim();
                } else {
                  data.published_date = text;
                }
              }
              if (lowerText.includes('atualizado') && !data.updated_date) {
                // Extrair a data que vem após "Atualizado"
                const updatedDateMatch = text.match(/(?:atualizado|atualizado em|atualizado à)\s*([^\.\n]{0,50})/i);
                if (updatedDateMatch) {
                  data.updated_date = updatedDateMatch[1].trim();
                } else {
                  data.updated_date = text;
                }
              }
              
              // Procurar por "há X dias" ou "X dias online"
              if ((lowerText.includes('dias') || lowerText.includes('dias online')) && !data.days_online) {
                const daysMatch = text.match(/(\d+)\s*dias?/i);
                if (daysMatch) {
                  data.days_online = daysMatch[1];
                }
              }
            }
          } else {
            break;
          }
        }
        
        // Se não encontrou, procurar no elemento pai e seus filhos
        if (!data.published_date && !data.updated_date) {
          let parent = priceElement.parentElement;
          if (parent) {
            const parentText = parent.textContent || '';
            
            // Procurar padrão "DD MMM" no texto do pai
            const dateMatch = parentText.match(custoJustoDatePattern);
            if (dateMatch && !data.published_date) {
              data.published_date = dateMatch[0].trim();
            }
            
            // Procurar padrões de data no texto do pai
            const publishedMatch = parentText.match(/(?:Publicado|publicado)\s*(?:em|à|às)?\s*([^\.\n]{0,50})/i);
            if (publishedMatch && !data.published_date) {
              data.published_date = publishedMatch[1]?.trim() || publishedMatch[0].trim();
            }
            
            const updatedMatch = parentText.match(/(?:Atualizado|atualizado)\s*(?:em|à|às)?\s*([^\.\n]{0,50})/i);
            if (updatedMatch && !data.updated_date) {
              data.updated_date = updatedMatch[1]?.trim() || updatedMatch[0].trim();
            }
          }
        }
      }
      
      // Fallback: procurar em toda a página por padrões de data
      if (!data.published_date) {
        // Primeiro procurar pelo padrão específico "DD MMM"
        const dateMatch = bodyText.match(custoJustoDatePattern);
        if (dateMatch) {
          // Verificar se está próximo de "Publicado" ou "Atualizado"
          const matchIndex = bodyText.indexOf(dateMatch[0]);
          const contextBefore = bodyText.substring(Math.max(0, matchIndex - 50), matchIndex);
          const contextAfter = bodyText.substring(matchIndex, matchIndex + 100);
          
          if (contextBefore.toLowerCase().includes('publicado') || 
              contextAfter.toLowerCase().includes('publicado')) {
            data.published_date = dateMatch[0].trim();
          } else if (contextBefore.toLowerCase().includes('atualizado') || 
                     contextAfter.toLowerCase().includes('atualizado')) {
            data.updated_date = dateMatch[0].trim();
          } else {
            // Se não tem contexto, assumir que é published_date
            data.published_date = dateMatch[0].trim();
          }
        }
        
        // Procurar por "Publicado" ou "Atualizado" no texto
        const publishedPatterns = [
          /(?:Publicado|publicado)\s*(?:em|à|às)?\s*(\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?)/i,
          /(?:Publicado|publicado)[^\.\n]{0,100}/i
        ];
        
        for (const pattern of publishedPatterns) {
          const match = bodyText.match(pattern);
          if (match && !data.published_date) {
            // Se o match contém a data, extrair apenas a parte da data
            const dateInMatch = match[0].match(custoJustoDatePattern);
            if (dateInMatch) {
              data.published_date = dateInMatch[0].trim();
            } else {
              data.published_date = match[1]?.trim() || match[0].trim();
            }
            break;
          }
        }
        
        const updatedPatterns = [
          /(?:Atualizado|atualizado)\s*(?:em|à|às)?\s*(\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?)/i,
          /(?:Atualizado|atualizado)[^\.\n]{0,100}/i
        ];
        
        for (const pattern of updatedPatterns) {
          const match = bodyText.match(pattern);
          if (match && !data.updated_date) {
            // Se o match contém a data, extrair apenas a parte da data
            const dateInMatch = match[0].match(custoJustoDatePattern);
            if (dateInMatch) {
              data.updated_date = dateInMatch[0].trim();
            } else {
              data.updated_date = match[1]?.trim() || match[0].trim();
            }
            break;
          }
        }
      }
      
      // Procurar "dias online" se ainda não encontrou
      if (!data.days_online) {
        const daysOnlinePatterns = [
          /(\d+)\s*dias?\s+online/i,
          /há\s+(\d+)\s+dias?/i,
          /online\s+há\s+(\d+)\s+dias?/i
        ];
        
        for (const pattern of daysOnlinePatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            data.days_online = match[1];
            break;
          }
        }
      }
      
      // Especificações - procurar seção "Especificações" de forma mais precisa
      data.features = [];
      data.specifications = {};
      
      // Procurar seção "Especificações" no HTML (reutilizar bodyText já declarado)
      const specsSectionMatch = bodyText.match(/Especificações\s*([\s\S]{0,2000})/i);
      
      if (specsSectionMatch) {
        const specsText = specsSectionMatch[1];
        
        // Extrair especificações usando regex mais preciso e limitado
        const specs = {
          tipologia: specsText.match(/tipologia[:\s]*([Tt]\d+)/i)?.[1]?.trim(),
          area_util: specsText.match(/área\s+útil[:\s]*(\d+)/i)?.[1],
          area_total: specsText.match(/área\s+(?:total|bruta|de\s+construção)[:\s]*(\d+)/i)?.[1],
          area_terreno: specsText.match(/área\s+do\s+terreno[:\s]*(\d+)/i)?.[1],
          classe_energetica: specsText.match(/classe\s+energética[:\s]*([A-G])/i)?.[1],
          tipo: specsText.match(/tipo[:\s]*([^\n]{1,20})/i)?.[1]?.trim(),
          concelho: specsText.match(/concelho[:\s]*([^\n]{1,50})/i)?.[1]?.trim(),
          freguesia: specsText.match(/freguesia[:\s]*([^\n]{1,50})/i)?.[1]?.trim(),
          id_anuncio: specsText.match(/id\s+do\s+anúncio[:\s]*(\d+)/i)?.[1],
          ano: specsText.match(/ano[:\s]*(\d{4})/i)?.[1],
          piso: specsText.match(/piso[:\s]*([^\n]{1,30})/i)?.[1]?.trim(),
          condicao: specsText.match(/condição[:\s]*([^\n]{1,30})/i)?.[1]?.trim()
        };
        
        // Limpar valores (remover texto extra)
        if (specs.tipologia) {
          specs.tipologia = specs.tipologia.match(/[Tt]\d+/i)?.[0]?.toUpperCase() || null;
        }
        if (specs.concelho) {
          specs.concelho = specs.concelho.split(/[^\w\s-]/)[0].trim();
        }
        if (specs.freguesia) {
          specs.freguesia = specs.freguesia.split(/[^\w\s-]/)[0].trim();
        }
        
        // Limpar e adicionar apenas especificações válidas
        Object.keys(specs).forEach(key => {
          if (specs[key] && specs[key].length > 0 && specs[key].length < 100) {
            data.specifications[key] = specs[key];
            data.features.push(`${key.replace(/_/g, ' ')}: ${specs[key]}`);
          }
        });
      }
      
      // Se não encontrou na seção, tentar procurar em toda a página
      if (Object.keys(data.specifications).length === 0) {
        // Tipologia (apenas T + número)
        const tipologyMatch = bodyText.match(/tipologia[:\s]*([Tt]\d+)/i);
        if (tipologyMatch) {
          data.specifications.tipologia = tipologyMatch[1].toUpperCase();
          data.features.push(`Tipologia: ${tipologyMatch[1].toUpperCase()}`);
        }
        
        // Área útil
        const areaUtilMatch = bodyText.match(/área\s+útil[:\s]*(\d+)/i);
        if (areaUtilMatch) {
          data.specifications.area_util = areaUtilMatch[1];
          data.features.push(`Área útil: ${areaUtilMatch[1]} m²`);
        }
        
        // Área do terreno
        const areaTerrenoMatch = bodyText.match(/área\s+do\s+terreno[:\s]*(\d+)/i);
        if (areaTerrenoMatch) {
          data.specifications.area_terreno = areaTerrenoMatch[1];
          data.features.push(`Área do terreno: ${areaTerrenoMatch[1]} m²`);
        }
        
        // Classe Energética
        const classeMatch = bodyText.match(/classe\s+energética[:\s]*([A-G])/i);
        if (classeMatch) {
          data.specifications.classe_energetica = classeMatch[1];
          data.features.push(`Classe Energética: ${classeMatch[1]}`);
        }
        
        // Concelho (limitar tamanho)
        const concelhoMatch = bodyText.match(/concelho[:\s]*([^\n]{1,50})/i);
        if (concelhoMatch) {
          const concelho = concelhoMatch[1].split(/[^\w\s-]/)[0].trim();
          if (concelho.length > 0 && concelho.length < 50) {
            data.specifications.concelho = concelho;
            data.features.push(`Concelho: ${concelho}`);
          }
        }
        
        // Freguesia (limitar tamanho)
        const freguesiaMatch = bodyText.match(/freguesia[:\s]*([^\n]{1,50})/i);
        if (freguesiaMatch) {
          const freguesia = freguesiaMatch[1].split(/[^\w\s-]/)[0].trim();
          if (freguesia.length > 0 && freguesia.length < 50) {
            data.specifications.freguesia = freguesia;
            data.features.push(`Freguesia: ${freguesia}`);
          }
        }
      }
      
      // Localização - usar especificações se disponível
      if (data.specifications.concelho || data.specifications.freguesia) {
        const parts = [];
        if (data.specifications.freguesia) parts.push(data.specifications.freguesia);
        if (data.specifications.concelho) parts.push(data.specifications.concelho);
        data.location = parts.join(', ');
      } else {
        // Tentar seletores padrão
        const locationSelectors = [
          '[class*="location"]',
          '[class*="address"]',
          '[itemprop="address"]'
        ];
        for (const selector of locationSelectors) {
          const loc = document.querySelector(selector);
          if (loc && loc.textContent) {
            data.location = loc.textContent.trim();
            break;
          }
        }
      }
      
      // Fotos - filtrar tiles do mapa
      data.photos = [];
      const photoSelectors = [
        'img[src*="custojusto"]',
        'img[data-src*="custojusto"]',
        '[class*="gallery"] img',
        '[class*="carousel"] img'
      ];
      photoSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src');
          if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('tile') && !src.includes('geo-osm')) {
            const fullUrl = src.startsWith('http') ? src : `https://www.custojusto.pt${src}`;
            if (!data.photos.includes(fullUrl)) {
              data.photos.push(fullUrl);
            }
          }
        });
      });
      
      return data;
    });
    
    // Tentar extrair telefone (clicar no botão)
    let phone = null;
    try {
      // Procurar botão "Ver número"
      const phoneButtonFound = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('span, button, a'));
        const button = buttons.find(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('ver número') || text.includes('ver numero');
        });
        return button ? true : false;
      });
      
      if (phoneButtonFound) {
        // Encontrar e clicar no botão
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span, button, a'));
          const button = buttons.find(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('ver número') || text.includes('ver numero');
          });
          if (button) {
            button.click();
          }
        });
        
        console.log('[CustoJusto Extract] 📞 Clicando para revelar telefone...');
        await randomDelay(1500, 2500);
        
        phone = await page.evaluate(() => {
          // Procurar número de telefone após clique
          const phonePattern = /(\+351)?\s?9\d{2}\s?\d{3}\s?\d{3}/;
          const phoneMatch = document.body.textContent.match(phonePattern);
          if (phoneMatch) {
            return phoneMatch[0].trim();
          }
          
          // Procurar em elementos específicos
          const phoneElements = document.querySelectorAll('[class*="phone"], [class*="contact"], a[href^="tel:"]');
          for (const el of phoneElements) {
            const text = el.textContent || el.getAttribute('href')?.replace('tel:', '');
            if (text && text.match(/\d{9}/)) {
              return text.trim();
            }
          }
          
          return null;
        });
      }
    } catch (e) {
      console.warn('[CustoJusto Extract] ⚠️  Não foi possível extrair telefone:', e.message);
    }
    
    rawData.phone = phone;
    rawData.url = adUrl;
    
    return rawData;
    
  } catch (error) {
    console.error(`[CustoJusto Extract] ❌ Erro ao extrair anúncio ${adUrl}:`, error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = {
  extractAllListingUrls,
  extractAdDetails
};

