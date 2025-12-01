/**
 * Scraper principal Imovirtual com suporte a listagens
 * Preserva filtro de particulares (ownerTypeSingleSelect=PRIVATE)
 * Detecta novos anúncios particulares
 */

// Importar scraper de anúncio individual (lazy load para evitar circular)
let scrapeImovirtualSingle = null;
function getSingleScraper() {
  if (!scrapeImovirtualSingle) {
    scrapeImovirtualSingle = require('./index');
  }
  return scrapeImovirtualSingle;
}
const { extractAllListingUrls } = require('./imovirtual.listings');
const { filterNewAds, updateCache } = require('./imovirtual.cache');
const { normalizeFinalObject } = require('../../utils/finalNormalizer');

const PLATFORM = 'imovirtual';

/**
 * Detecta se URL é de listagem ou anúncio individual
 */
function isListingUrl(url) {
  // URLs de listagem geralmente têm:
  // - /resultados/
  // - Parâmetros de busca (ownerTypeSingleSelect, limit, etc.)
  // - Não têm /anuncio/ com ID específico
  
  // URLs de anúncio individual:
  // - https://www.imovirtual.com/anuncio/ID123456
  // - https://www.imovirtual.com/oferta/ID123456
  
  const lowerUrl = url.toLowerCase();
  
  // Se tem /anuncio/ ou /oferta/ seguido de ID, é anúncio individual
  if (lowerUrl.includes('/anuncio/') || lowerUrl.includes('/oferta/')) {
    const match = url.match(/\/(anuncio|oferta)\/([^\/\?]+)/);
    if (match && match[2] && match[2].length > 3) {
      // Tem ID válido = anúncio individual
      return false;
    }
  }
  
  // Se tem /resultados/ ou parâmetros de busca, é listagem
  if (lowerUrl.includes('/resultados/') || 
      url.includes('ownerTypeSingleSelect=') || 
      url.includes('limit=') ||
      url.includes('by=')) {
    return true;
  }
  
  // Por padrão, assumir que é listagem se não for claramente anúncio individual
  return !lowerUrl.includes('/anuncio/') && !lowerUrl.includes('/oferta/');
}

/**
 * Scraper principal Imovirtual
 * @param {string} url - URL de listagem ou anúncio individual
 * @param {Object} options - Opções
 * @param {boolean} options.onlyNew - Retornar apenas anúncios novos
 * @param {number} options.maxPages - Número máximo de páginas (apenas listagens)
 * @param {number} options.maxAds - Número máximo de anúncios a processar
 * @param {boolean} options.headless - Modo headless
 * @returns {Promise<Object>}
 */
async function scrapeImovirtual(url, options = {}) {
  const startTime = Date.now();
  
  const {
    onlyNew = false,
    maxPages = null,
    maxAds = null,
    headless = true
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
  console.log(`[${PLATFORM.toUpperCase()}] Filtro: Particulares (ownerTypeSingleSelect=PRIVATE)`);
  
  try {
    // 1. Extrair URLs de todas as páginas
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 1: Extraindo URLs de listagem...`);
    const listingUrls = await extractAllListingUrls(url, {
      maxPages,
      timeout: 40000,
      headless
    });
    
    if (listingUrls.length === 0) {
      console.warn(`[${PLATFORM.toUpperCase()}] ⚠️  Nenhum anúncio encontrado na listagem`);
      return {
        success: true,
        new_ads: [],
        total_new: 0,
        all_ads: []
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
    
    // 4. Filtrar novos (se solicitado)
    let result;
    if (onlyNew) {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Filtrando anúncios novos...`);
      result = filterNewAds(normalizedAds);
    } else {
      // Atualizar cache mesmo sem filtrar novos
      updateCache(normalizedAds);
      result = {
        new_ads: normalizedAds,
        total_new: normalizedAds.length,
        all_ads: normalizedAds
      };
    }
    
    const duration = Date.now() - startTime;
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Scrape concluído:`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Total processado: ${normalizedAds.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Anúncios novos: ${result.total_new}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Duração: ${Math.round(duration/1000)}s`);
    
    return {
      success: true,
      ...result
    };
    
  } catch (error) {
    console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro durante scrape:`, error.message);
    if (error.stack) {
      console.error(`[${PLATFORM.toUpperCase()}] Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  }
}

module.exports = scrapeImovirtual;

