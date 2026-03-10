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

const PLATFORM = 'olx';

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
    // 1. Extrair URLs de todas as páginas
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 1: Extraindo URLs de listagem...`);
    const listingUrls = await extractAllListingUrls(url, {
      maxPages,
      timeout: 40000,
      headless,
      filterPrivateOnly
    });
    
    if (listingUrls.length === 0) {
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
    const urlsToProcess = maxAds ? listingUrls.slice(0, maxAds) : listingUrls;
    console.log(`[${PLATFORM.toUpperCase()}] 📊 Processando ${urlsToProcess.length} de ${listingUrls.length} anúncios encontrados...`);
    
    // 2. Extrair detalhes de cada anúncio
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 2: Extraindo detalhes dos anúncios...`);
    const rawAdsData = [];
    
    for (let i = 0; i < urlsToProcess.length; i++) {
      const adUrl = urlsToProcess[i];
      console.log(`[${PLATFORM.toUpperCase()}] 📄 [${i + 1}/${urlsToProcess.length}] ${adUrl}`);
      
      try {
        const adData = await getSingleScraper()(adUrl, { headless });
        rawAdsData.push(adData);
        
        // Delay entre anúncios
        if (i < urlsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        }
      } catch (error) {
        console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro ao extrair anúncio ${adUrl}:`, error.message);
        // Continuar com próximo
      }
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

