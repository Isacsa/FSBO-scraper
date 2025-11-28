/**
 * Scraper principal Casa Sapo
 */

const { extractAllListingUrls, extractAdDetails } = require('./casasapo.extract');
const { parseAdsData } = require('./casasapo.parse');
const { normalizeAds } = require('./casasapo.normalize');
const { updateCache, filterNewAds } = require('./casasapo.cache');
const { normalizeFinalObject } = require('../../utils/finalNormalizer');

/**
 * Scrape completo do Casa Sapo
 */
async function scrapeCasaSapo(listingUrl, options = {}) {
  const {
    onlyNew = false,
    maxPages = null,
    maxAds = null,
    headless = false
  } = options;
  
  console.log('[CASASAPO] 🚀 Iniciando scrape...');
  console.log(`[CASASAPO] URL: ${listingUrl}`);
  console.log(`[CASASAPO] Modo: ${onlyNew ? 'Apenas novos' : 'Todos'}`);
  
  const startTime = Date.now();
  
  try {
    // Fase 1: Extrair URLs da listagem
    console.log('[CASASAPO] 📋 Fase 1: Extraindo URLs de listagem...');
    const adUrls = await extractAllListingUrls(listingUrl, { maxPages, timeout: 40000, headless });
    
    if (adUrls.length === 0) {
      console.log('[CASASAPO] ⚠️  Nenhum anúncio encontrado na listagem');
      return {
        success: true,
        total_results: 0,
        new_ads: [],
        total_new: 0,
        items: []
      };
    }
    
    // Limitar número de anúncios se especificado (mas processar todos se não especificado)
    const urlsToProcess = maxAds ? adUrls.slice(0, maxAds) : adUrls;
    console.log(`[CASASAPO] 📊 Processando ${urlsToProcess.length} de ${adUrls.length} anúncios encontrados...`);
    
    // Fase 2: Extrair detalhes dos anúncios
    console.log('[CASASAPO] 📋 Fase 2: Extraindo detalhes dos anúncios...');
    const rawAds = [];
    
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      console.log(`[CASASAPO] 📄 [${i + 1}/${urlsToProcess.length}] ${url}`);
      
      try {
        const rawAd = await extractAdDetails(url, { timeout: 60000, headless });
        rawAds.push(rawAd);
      } catch (error) {
        console.error(`[CASASAPO] ⚠️  Erro ao extrair anúncio ${url}:`, error.message);
        // Continuar com próximo
      }
    }
    
    console.log(`[CASASAPO] ✅ Extração concluída: ${rawAds.length} anúncios`);
    
    // Fase 3: Parsing
    console.log('[CASASAPO] 📋 Fase 3: Parsing dos dados...');
    const parsedAds = parseAdsData(rawAds);
    
    // Fase 4: Normalização
    console.log('[CASASAPO] 📋 Fase 4: Normalização...');
    let normalizedAds = await normalizeAds(parsedAds);
    
    // Aplicar normalização final
    normalizedAds = normalizedAds.map(ad => normalizeFinalObject(ad));
    
    // Fase 5: Filtrar novos anúncios se necessário
    let finalAds = normalizedAds;
    let newAds = [];
    let totalNew = 0;
    
    if (onlyNew) {
      console.log('[CASASAPO] 📋 Fase 5: Filtrando anúncios novos...');
      newAds = filterNewAds(normalizedAds);
      totalNew = newAds.length;
      finalAds = newAds;
    } else {
      // Atualizar cache
      const cacheResult = updateCache(normalizedAds);
      newAds = cacheResult.newAds;
      totalNew = cacheResult.totalNew;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('[CASASAPO] ✅ Scrape concluído:');
    console.log(`[CASASAPO]   - Total processado: ${normalizedAds.length}`);
    console.log(`[CASASAPO]   - Anúncios novos: ${totalNew}`);
    console.log(`[CASASAPO]   - Duração: ${duration}s`);
    
    return {
      success: true,
      total_results: finalAds.length,
      new_ads: newAds,
      total_new: totalNew,
      items: finalAds
    };
    
  } catch (error) {
    console.error('[CASASAPO] ❌ Erro durante scrape:', error.message);
    throw error;
  }
}

module.exports = scrapeCasaSapo;

