/**
 * Scraper principal OLX com suporte a listagens
 * Filtra automaticamente agências e detecta novos anúncios
 */

// Importar scraper de anúncio individual (lazy load para evitar circular)
let scrapeOLXSingle = null;
function getSingleScraper() {
  if (!scrapeOLXSingle) {
    scrapeOLXSingle = require('./index');
  }
  return scrapeOLXSingle;
}
const { extractAllListingUrls } = require('./olx.listings');
const { filterNewAds, updateCache } = require('./olx.cache');
const { normalizeFinalObject } = require('../../utils/finalNormalizer');
const { analyzeFsboSignals } = require('../../services/fsboSignals');
const { HttpError } = require('../../utils/browser');

const PLATFORM = 'olx';

/**
 * Builds a minimal item from listing card data when full scrape fails (403)
 * Since the listing page was filtered by private_business=private, these are FSBO
 */
function buildCardFallback(adUrl, card, fromPrivateFilter) {
  const item = {
    url: adUrl,
    source: PLATFORM,
    title: card.title || null,
    price: card.price || null,
    description: null,
    location: {},
    property: {
      type: null,
      area_total: null,
      area_useful: card.area ? String(card.area) : null,
      rooms: null,
      bathrooms: null,
      condition: null,
      floor: null,
      year_built: null,
    },
    advertiser: {
      name: null,
      type: fromPrivateFilter ? 'particular' : null,
      is_agency: fromPrivateFilter ? false : null,
      phone: null,
      url: null,
    },
    photos: card.thumbnail ? [card.thumbnail] : [],
    features: {},
    _card_only: true,
  };

  // Parse location from card (e.g., "Valença, Cristelo Covo E Arão")
  if (card.location) {
    const parts = card.location.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      item.location.municipality = parts[0];
      item.location.parish = parts.slice(1).join(', ');
    } else {
      item.location.municipality = parts[0];
    }
  }

  // Try to detect property type from title
  if (card.title) {
    const t = card.title.toLowerCase();
    if (/\bt[0-9]\b/.test(t) || t.includes('apartamento')) item.property.type = 'apartamento';
    else if (t.includes('moradia') || t.includes('vivenda')) item.property.type = 'moradia';
    else if (t.includes('terreno')) item.property.type = 'terreno';
    else if (t.includes('quinta')) item.property.type = 'quinta';
    else if (t.includes('armazém') || t.includes('armazem')) item.property.type = 'armazém';
  }

  return item;
}

/**
 * Detecta se URL é de listagem ou anúncio individual
 */
function isListingUrl(url) {
  // URLs de listagem geralmente não têm /ad/ ou /anuncio/ com ID específico
  // Exemplos de listagem:
  // - https://www.olx.pt/meadela/q-moradia/
  // - https://www.olx.pt/imoveis/moradias/
  // - https://www.olx.pt/portugal/q-moradia/
  
  // URLs de anúncio individual:
  // - https://www.olx.pt/ad/moradia-t4-ID123456
  // - https://www.olx.pt/anuncio/moradia-t4-ID123456
  
  const lowerUrl = url.toLowerCase();
  
  // Se tem /ad/ ou /anuncio/ seguido de algo que parece ID ou slug completo, é anúncio individual
  if (lowerUrl.includes('/ad/') || lowerUrl.includes('/anuncio/')) {
    // Verificar se parece ser anúncio individual (tem slug completo ou ID)
    const adMatch = url.match(/\/(ad|anuncio)\/([^\/]+)/);
    if (adMatch && adMatch[2].length > 10) {
      // Slug longo = anúncio individual
      return false;
    }
  }
  
  // Se termina com / ou tem parâmetros de busca, é listagem
  if (url.endsWith('/') || url.includes('?q=') || url.includes('/q-')) {
    return true;
  }
  
  // Por padrão, assumir que é listagem se não for claramente anúncio individual
  return !lowerUrl.includes('/ad/') && !lowerUrl.includes('/anuncio/');
}

/**
 * Filtra anúncios de agências
 */
function filterAgencies(ads) {
  console.log(`[${PLATFORM.toUpperCase()}] 🔍 Filtrando agências...`);
  
  const fsboAds = [];
  const agencyAds = [];
  
  ads.forEach(ad => {
    // Usar sinais FSBO já calculados
    const isAgency = ad.signals?.is_agency || 
                     ad.advertiser?.is_agency || 
                     false;
    
    if (isAgency) {
      agencyAds.push(ad);
      console.log(`[${PLATFORM.toUpperCase()}] ❌ Agência filtrada: ${ad.title?.substring(0, 50)}...`);
    } else {
      fsboAds.push(ad);
    }
  });
  
  console.log(`[${PLATFORM.toUpperCase()}] ✅ Filtro concluído: ${fsboAds.length} FSBO, ${agencyAds.length} agências removidas`);
  
  return {
    fsbo: fsboAds,
    agencies: agencyAds
  };
}

/**
 * Scraper principal OLX
 * @param {string} url - URL de listagem ou anúncio individual
 * @param {Object} options - Opções
 * @param {boolean} options.onlyNew - Retornar apenas anúncios novos
 * @param {number} options.maxPages - Número máximo de páginas (apenas listagens)
 * @param {number} options.maxAds - Número máximo de anúncios a processar
 * @param {boolean} options.headless - Modo headless
 * @param {boolean} options.filterAgencies - Filtrar agências automaticamente (default: true)
 * @returns {Promise<Object>}
 */
async function scrapeOLX(url, options = {}) {
  const startTime = Date.now();
  
  const {
    onlyNew = false,
    maxPages = null,
    maxAds = null,
    headless = true,
    filterAgencies: shouldFilterAgencies = true,
    filterPrivateOnly = true
  } = options;
  
  console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando scrape...`);
  console.log(`[${PLATFORM.toUpperCase()}] URL: ${url}`);
  
  // Detectar se é listagem ou anúncio individual
  const isListing = isListingUrl(url);
  
  if (!isListing) {
    // Anúncio individual - usar scraper original
    console.log(`[${PLATFORM.toUpperCase()}] 📄 Modo: Anúncio individual`);
    const result = await getSingleScraper()(url, { headless });
    return normalizeFinalObject(result);
  }
  
  // Listagem - processar múltiplos anúncios
  console.log(`[${PLATFORM.toUpperCase()}] 📋 Modo: Listagem`);
  console.log(`[${PLATFORM.toUpperCase()}] Modo: ${onlyNew ? 'Apenas novos' : 'Todos'}`);
  
  // Verificar se a URL já tem filtro de particulares
  const hasPrivateFilter = url.includes('private_business') || url.includes('search%5Bprivate_business%5D');
  
  // Se já está filtrado por particulares, não filtrar agências (já estão filtradas)
  const effectiveFilterAgencies = hasPrivateFilter ? false : shouldFilterAgencies;
  console.log(`[${PLATFORM.toUpperCase()}] Filtrar agências: ${effectiveFilterAgencies ? 'Sim' : 'Não'} ${hasPrivateFilter ? '(já filtrado por particulares)' : ''}`);
  
  try {
    // 1. Extrair URLs e card data de todas as páginas
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 1: Extraindo URLs de listagem...`);
    const listingsMap = await extractAllListingUrls(url, {
      maxPages,
      timeout: 40000,
      headless,
      filterPrivateOnly
    });

    if (listingsMap.size === 0) {
      console.warn(`[${PLATFORM.toUpperCase()}] ⚠️  Nenhum anúncio encontrado na listagem`);
      return {
        success: true,
        new_ads: [],
        total_new: 0,
        all_ads: [],
        fsbo_ads: [],
        agencies_filtered: 0
      };
    }

    // Limitar número de anúncios se especificado
    const allEntries = Array.from(listingsMap.entries());
    const entriesToProcess = maxAds ? allEntries.slice(0, maxAds) : allEntries;
    console.log(`[${PLATFORM.toUpperCase()}] 📊 Processando ${entriesToProcess.length} de ${listingsMap.size} anúncios encontrados...`);

    // 2. Extrair detalhes de cada anúncio (com fallback para card data em caso de 403)
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 2: Extraindo detalhes dos anúncios...`);
    const rawAdsData = [];
    let consecutive403 = 0;
    let total403 = 0;
    let baseDelay = 2000;

    for (let i = 0; i < entriesToProcess.length; i++) {
      const [adUrl, cardData] = entriesToProcess[i];
      console.log(`[${PLATFORM.toUpperCase()}] 📄 [${i + 1}/${entriesToProcess.length}] ${adUrl}`);

      try {
        const adData = await getSingleScraper()(adUrl, { headless });
        rawAdsData.push(adData);
        consecutive403 = 0;

        // Delay entre anúncios (adapta-se a 403s anteriores)
        if (i < entriesToProcess.length - 1) {
          const delay = baseDelay + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (error instanceof HttpError && error.status === 403) {
          consecutive403++;
          total403++;
          console.warn(`[${PLATFORM.toUpperCase()}] 403 Forbidden (#${total403}, ${consecutive403} consecutivos): ${adUrl}`);

          // Fallback: use card data from listing page
          if (cardData && (cardData.title || cardData.price)) {
            const fallbackItem = buildCardFallback(adUrl, cardData, hasPrivateFilter);
            rawAdsData.push(fallbackItem);
            console.log(`[${PLATFORM.toUpperCase()}] Fallback card data usado: "${cardData.title}" ${cardData.price ? cardData.price + '€' : ''}`);
          }

          if (consecutive403 >= 5) {
            // IP bloqueado — usar card data para os restantes
            console.warn(`[${PLATFORM.toUpperCase()}] 5+ 403 consecutivos — usando card data para restantes anúncios`);
            for (let j = i + 1; j < entriesToProcess.length; j++) {
              const [remainUrl, remainCard] = entriesToProcess[j];
              if (remainCard && (remainCard.title || remainCard.price)) {
                rawAdsData.push(buildCardFallback(remainUrl, remainCard, hasPrivateFilter));
              }
            }
            break;
          }

          if (consecutive403 >= 3) {
            baseDelay = 15000;
            console.warn(`[${PLATFORM.toUpperCase()}] 3+ 403 consecutivos — aumentando delay para ${baseDelay/1000}s`);
          }

          // Cooldown proporcional
          const cooldown = 5000 * consecutive403 + Math.random() * 3000;
          console.warn(`[${PLATFORM.toUpperCase()}] Cooldown ${Math.round(cooldown/1000)}s antes do próximo...`);
          await new Promise(resolve => setTimeout(resolve, cooldown));
        } else {
          console.error(`[${PLATFORM.toUpperCase()}] Erro ao extrair anúncio ${adUrl}:`, error.message);
          consecutive403 = 0;
        }
      }
    }

    if (total403 > 0) {
      console.warn(`[${PLATFORM.toUpperCase()}] Total de 403 errors: ${total403}/${entriesToProcess.length} (${rawAdsData.length} anúncios recuperados via card data ou scrape)`);
    }
    
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Extração concluída: ${rawAdsData.length} anúncios`);
    
    // 3. Normalizar todos os anúncios
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 3: Normalização...`);
    const normalizedAds = rawAdsData.map(ad => normalizeFinalObject(ad));
    
    // 4. Filtrar agências se solicitado (mas não se já está filtrado por particulares)
    let finalAds = normalizedAds;
    let agenciesFiltered = 0;
    
    if (effectiveFilterAgencies) {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Filtrando agências...`);
      const filtered = filterAgencies(normalizedAds);
      finalAds = filtered.fsbo;
      agenciesFiltered = filtered.agencies.length;
      console.log(`[${PLATFORM.toUpperCase()}] ✅ ${agenciesFiltered} agências filtradas`);
    } else {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Pulando filtro de agências ${hasPrivateFilter ? '(já filtrado por particulares)' : '(desativado)'}`);
    }
    
    // 5. Filtrar novos (se solicitado)
    let result;
    if (onlyNew) {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 5: Filtrando anúncios novos...`);
      result = filterNewAds(finalAds);
    } else {
      // Atualizar cache mesmo sem filtrar novos
      updateCache(finalAds);
      result = {
        new_ads: finalAds,
        total_new: finalAds.length,
        all_ads: finalAds
      };
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Scrape concluído:`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Total processado: ${normalizedAds.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Agências filtradas: ${agenciesFiltered}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - FSBO encontrados: ${finalAds.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Anúncios novos: ${result.total_new}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Duração: ${Math.round(duration/1000)}s`);
    
    return {
      success: true,
      ...result,
      fsbo_ads: result.all_ads, // Todos os FSBO (sem agências)
      agencies_filtered: agenciesFiltered
    };
    
  } catch (error) {
    console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro durante scrape:`, error.message);
    if (error.stack) {
      console.error(`[${PLATFORM.toUpperCase()}] Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  }
}

module.exports = scrapeOLX;

