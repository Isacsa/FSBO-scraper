/**
 * Scraper principal do Idealista via Lobstr
 * Entry-point que integra extract → parse → filter → normalize
 * Retorna formato: { success: true, total_results: <INT>, items: [...] }
 */

const { extractIdealistaListings } = require('./idealista.extract');
const { parseLobstrResults } = require('./idealista.parse');
const { normalizeListings } = require('./idealista.normalize');

const PLATFORM = 'idealista_lobstr';

function filterAgencyListings(parsedResults) {
  const fsboListings = [];
  const agencyListings = [];
  const uncertainListings = [];

  for (const item of parsedResults) {
    if (!item) continue;

    if (item.fsbo_decision === 'agency') {
      agencyListings.push(item);
    } else if (item.fsbo_decision === 'fsbo') {
      fsboListings.push(item);
    } else {
      uncertainListings.push(item);
    }
  }

  return {
    fsboListings,
    agencyListings,
    uncertainListings
  };
}

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
  const {
    filterAgencies = true
  } = options;
  
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
    // 2. PARSE (preencher campos derivados do Lobstr)
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 2: Parsing e complementação dos resultados`);
    const parsed = parseLobstrResults(extracted.results);

    // 3. FILTRAR AGÊNCIAS / INCERTOS (opcional)
    let parsedToNormalize = parsed;
    let agenciesFiltered = 0;
    let uncertainFiltered = 0;
    if (filterAgencies) {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 3: Filtrando anúncios não-FSBO`);
      const filtered = filterAgencyListings(parsed);
      parsedToNormalize = filtered.fsboListings;
      agenciesFiltered = filtered.agencyListings.length;
      uncertainFiltered = filtered.uncertainListings.length;
      console.log(
        `[${PLATFORM.toUpperCase()}] ✅ ${agenciesFiltered} anúncios de agência e ` +
        `${uncertainFiltered} anúncios incertos removidos`
      );
    } else {
      console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 3: Filtro FSBO desativado`);
    }

    // 4. NORMALIZAR (montar JSON final FSBO_LITE)
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Normalização para formato FSBO_LITE`);
    const normalized = normalizeListings(parsedToNormalize);
    
    const duration = Date.now() - startTime;
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Scrape concluído:`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Results recebidos: ${extracted.results.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Agências filtradas: ${agenciesFiltered}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Incertos filtrados: ${uncertainFiltered}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Total de FSBO: ${normalized.length}`);
    console.log(`[${PLATFORM.toUpperCase()}]   - Duração: ${Math.round(duration/1000)}s (${duration}ms)`);
    
    // Retornar no formato especificado
    return {
      success: true,
      total_results: normalized.length,
      agencies_filtered: agenciesFiltered,
      uncertain_filtered: uncertainFiltered,
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

