/**
 * Scraper principal do CustoJusto
 */

const { extractAllListingUrls, extractAdDetails } = require('./custojusto.extract');
const { parseAdsData } = require('./custojusto.parse');
const { normalizeAds } = require('./custojusto.normalize');
const { filterNewAds } = require('./custojusto.cache');
const { randomDelay } = require('./custojusto.utils');

const PLATFORM = 'custojusto';

/**
 * Scraper do CustoJusto
 * @param {string} listingUrl - URL da listagem (deve ter f=p para particulares)
 * @param {Object} options - Opções
 * @param {boolean} options.onlyNew - Retornar apenas anúncios novos (default: false)
 * @param {number} options.maxPages - Número máximo de páginas (default: null = todas)
 * @param {number} options.maxAds - Número máximo de anúncios a processar (default: null = todos)
 * @returns {Promise<Object>} - { success: true, new_ads: [], total_new: 0, all_ads: [] }
 */
async function scrapeCustoJusto(listingUrl, options = {}) {
  const startTime = Date.now();
  
  const {
    onlyNew = false,
    maxPages = null,
    maxAds = null,
    headless = true,  // Default true, mas será validado por shouldRunHeadless() em createBrowser
    filterPrivateOnly = true
  } = options;
  
  console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando scrape...`);
  console.log(`[${PLATFORM.toUpperCase()}] URL: ${listingUrl}`);
  console.log(`[${PLATFORM.toUpperCase()}] Modo: ${onlyNew ? 'Apenas novos' : 'Todos'}`);
  
  try {
    // 1. Extrair URLs de todas as páginas
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 1: Extraindo URLs de listagem...`);
    const listingUrls = await extractAllListingUrls(listingUrl, {
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
        all_ads: []
      };
    }
    
    // Limitar número de anúncios se especificado
    const urlsToProcess = maxAds ? listingUrls.slice(0, maxAds) : listingUrls;
    console.log(`[${PLATFORM.toUpperCase()}] 📊 Processando ${urlsToProcess.length} anúncios...`);
    
    // 2. Extrair detalhes de cada anúncio
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 2: Extraindo detalhes dos anúncios...`);
    const rawAdsData = [];
    
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      console.log(`[${PLATFORM.toUpperCase()}] 📄 [${i + 1}/${urlsToProcess.length}] ${url}`);
      
      try {
        const rawData = await extractAdDetails(url, { timeout: 60000, headless });
        rawAdsData.push(rawData);
        
        // Delay entre anúncios
        if (i < urlsToProcess.length - 1) {
          await randomDelay(2000, 4000);
        }
      } catch (error) {
        console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro ao extrair anúncio ${url}:`, error.message);
        // Continuar com próximo
      }
    }
    
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Extração concluída: ${rawAdsData.length} anúncios`);
    
    // 3. Parse dos dados
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 3: Parsing dos dados...`);
    const parsedAds = parseAdsData(rawAdsData);
    
    // 4. Normalização
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Normalização...`);
    const normalizedAds = await normalizeAds(parsedAds);
    
    // 5. Filtrar novos (se solicitado)
    let result;
    if (onlyNew) {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 5: Filtrando anúncios novos...`);
      result = filterNewAds(normalizedAds);
    } else {
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

module.exports = scrapeCustoJusto;

