/**
 * Scraper principal do Idealista via Lobstr
 * Entry-point que integra extract → normalize
 * Retorna formato: { success: true, total_results: <INT>, items: [...] }
 */

const { extractIdealistaListings } = require('./idealista.extract');
const { normalizeListings } = require('./idealista.normalize');

const PLATFORM = 'idealista_lobstr';

/**
 * Scraper do Idealista via Lobstr API
 * @param {string} searchUrl - URL de pesquisa do Idealista (opcional - pode ser null se squid já tem sites configurados)
 * @param {Object} options - Opções
 * @param {number} options.maxResults - Número máximo de results
 * @param {number} options.maxWait - Tempo máximo de espera (ms)
 * @returns {Promise<Object>} - { success: true, total_results: <INT>, items: [...] }
 */
async function scrapeIdealistaLobstr(searchUrl = null, options = {}) {
  const startTime = Date.now();
  
  console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando scrape via Lobstr...`);
  if (searchUrl) {
    console.log(`[${PLATFORM.toUpperCase()}] URL: ${searchUrl}`);
  } else {
    console.log(`[${PLATFORM.toUpperCase()}] Sem URL - usando sites configurados no squid`);
  }
  
  try {
    // 1. EXTRAIR (criar task, criar run, poll, obter results)
    console.log(`[${PLATFORM.toUpperCase()}] 📥 Fase 1: Extração via Lobstr API`);
    const extracted = await extractIdealistaListings(searchUrl, options);
    
    if (!extracted.results || extracted.results.length === 0) {
      console.warn(`[${PLATFORM.toUpperCase()}] ⚠️  Nenhum result obtido`);
      return {
        success: true,
        total_results: 0,
        items: []
      };
    }
    
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Extração concluída: ${extracted.results.length} results brutos`);
    
    // 2. NORMALIZAR (montar JSON final FSBO_LITE)
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 2: Normalização para formato FSBO_LITE`);
    const normalized = normalizeListings(extracted.results);
    
    const duration = Date.now() - startTime;
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Scrape concluído:`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Total de results: ${normalized.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Duração: ${Math.round(duration/1000)}s (${duration}ms)`);
    
    // Retornar no formato especificado
    return {
      success: true,
      total_results: normalized.length,
      items: normalized
    };
    
  } catch (error) {
    console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro durante scrape:`, error.message);
    if (error.stack) {
      console.error(`[${PLATFORM.toUpperCase()}] Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  }
}

module.exports = scrapeIdealistaLobstr;

