/**
 * Scraper principal para Idealista usando Lobstr.io (browser humano via CDP)
 * Orquestra warmup, extração, parsing, normalização e sinais FSBO
 */

const { createLobstrSession, closeLobstrSession, connectToLobstrBrowser } = require('../../utils/lobstr');
const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { performWarmupSequence, humanClosePopups, simulateReading } = require('./warmup');
const extractRawData = require('./extract');
const parseRawData = require('./parse');
const normalizeToFinalFormat = require('./normalize');
const { analyzeIdealistaSignals } = require('./signals');

const PLATFORM = 'idealista';

/**
 * Scraper para Idealista usando Lobstr.io
 * @param {string} url - URL do anúncio
 * @param {Object} options - Opções de scraping
 * @param {boolean} options.headless - Modo headless (não aplicável com Lobstr)
 * @param {boolean} options.includeRawHtml - Incluir HTML bruto na resposta
 * @param {number} options.timeout - Timeout em ms
 * @returns {Promise<Object>}
 */
async function scrapeIdealista(url, options = {}) {
  const startTime = Date.now();
  const { 
    includeRawHtml = false,
    timeout = 90000,
    headless = true  // Default true, mas será validado por shouldRunHeadless() em createBrowser
  } = options;
  
  let sessionId = null;
  let browser = null;
  let page = null;
  let useLobstr = false;
  
  try {
    console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando scrape para: ${url}`);
    
    // 1. Tentar criar sessão no Lobstr.io (fallback para Playwright se falhar)
    console.log(`[${PLATFORM.toUpperCase()}] 🌐 Tentando criar sessão no Lobstr.io...`);
    const lobstrSession = await createLobstrSession({
      region: 'eu-west-1',
      browser: 'chrome',
      os: 'windows'
    });
    
    if (lobstrSession && lobstrSession.cdpUrl) {
      // Usar Lobstr
      useLobstr = true;
      sessionId = lobstrSession.sessionId;
      
      console.log(`[${PLATFORM.toUpperCase()}] 🔌 Conectando Playwright ao browser humano...`);
      const browserData = await connectToLobstrBrowser(lobstrSession.cdpUrl);
      browser = browserData.browser;
      page = browserData.page;
      
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);
      
      console.log(`[${PLATFORM.toUpperCase()}] ✅ Conectado ao browser humano (Lobstr)`);
    } else {
      // Fallback: usar Playwright normal com técnicas anti-bot avançadas
      console.log(`[${PLATFORM.toUpperCase()}] ⚠️  Usando Playwright normal com técnicas anti-bot avançadas...`);
      
      browser = await createBrowser({ 
        headless,
        timeout,
        proxy: null
      });
      
      page = await createPage(browser, {
        timeout,
        locale: 'pt-PT',
        timezoneId: 'Europe/Lisbon',
        geolocation: { latitude: 38.7223, longitude: -9.1393 }
      });
      
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);
      
      console.log(`[${PLATFORM.toUpperCase()}] ✅ Browser Playwright criado`);
    }
    
    // 3. WARMUP SEQUENCE (obrigatória)
    console.log(`[${PLATFORM.toUpperCase()}] 🔥 Executando warmup sequence...`);
    await performWarmupSequence(page);
    
    // 4. Navegar para o anúncio final
    console.log(`[${PLATFORM.toUpperCase()}] 🌐 Navegando para o anúncio: ${url}`);
    
    // Headers adicionais
    try {
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.idealista.pt/',
        'Origin': 'https://www.idealista.pt'
      });
    } catch (e) {
      // Ignorar erro
    }
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeout
    });
    
    // Aguardar carregamento completo
    await simulateReading(page, 2000, 3000);
    await humanClosePopups(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    
    // Verificar se foi bloqueado
    const currentUrl = page.url();
    if (currentUrl.includes('captcha') || currentUrl.includes('blocked')) {
      throw new Error(`Idealista bloqueou o acesso (URL: ${currentUrl})`);
    }
    
    // 5. EXTRAIR DADOS BRUTOS
    console.log(`[${PLATFORM.toUpperCase()}] 📥 Fase 1: Extração de dados brutos`);
    const raw = await extractRawData(page, url);
    
    // 6. PARSEAR E NORMALIZAR CAMPOS
    console.log(`[${PLATFORM.toUpperCase()}] 🔧 Fase 2: Parsing e normalização`);
    const parsed = parseRawData(raw);
    
    // 7. NORMALIZAR ANUNCIANTE (visitar perfil se necessário)
    console.log(`[${PLATFORM.toUpperCase()}] 👤 Fase 3: Normalização do anunciante`);
    const { normalizeAdvertiser } = require('../../utils/advertiserNormalizer');
    const normalizedAdvertiser = await normalizeAdvertiser(
      parsed.advertiser,
      PLATFORM,
      page,
      true // visitProfile = true
    );
    parsed.advertiser = normalizedAdvertiser;
    
    // 8. MONTAR JSON FINAL
    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 4: Montagem do JSON final`);
    let finalJson = await normalizeToFinalFormat(parsed, url, PLATFORM);
    
    // 9. ANALISAR SINAIS FSBO
    console.log(`[${PLATFORM.toUpperCase()}] 🔍 Fase 5: Análise de sinais FSBO`);
    const signals = analyzeIdealistaSignals({
      title: finalJson.title,
      description: finalJson.description,
      advertiser: finalJson.advertiser,
      photos: finalJson.photos,
      price: finalJson.price,
      location: finalJson.location
    });
    
    // Usar também o módulo principal de signals para is_agency
    const { analyzeFsboSignals } = require('../../services/fsboSignals');
    const mainSignals = analyzeFsboSignals({
      title: finalJson.title,
      description: finalJson.description,
      advertiser: finalJson.advertiser,
      photos: finalJson.photos,
      price: finalJson.price,
      location: finalJson.location
    }, PLATFORM);
    
    finalJson.signals = {
      ...signals,
      is_agency: mainSignals.is_agency
    };
    
    // Atualizar is_agency no advertiser
    if (finalJson.advertiser.is_agency === null || finalJson.advertiser.is_agency === undefined) {
      finalJson.advertiser.is_agency = mainSignals.is_agency;
    }
    
    // 10. NORMALIZAÇÃO FINAL (garantir schema)
    console.log(`[${PLATFORM.toUpperCase()}] ✨ Fase 6: Normalização final do schema`);
    const { normalizeFinalObject } = require('../../utils/finalNormalizer');
    finalJson = normalizeFinalObject(finalJson);
    
    // Incluir HTML bruto se solicitado
    if (includeRawHtml) {
      finalJson.rawHtml = await page.content();
    }
    
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Scrape concluído com sucesso!`);
    
    // Retornar apenas os dados (sem success, será adicionado pelo controller)
    return finalJson;
    
  } catch (error) {
    console.error(`[${PLATFORM.toUpperCase()}] ❌ Erro durante o scrape:`, error);
    throw error;
  } finally {
    // Fechar página e browser
    if (page) {
      try {
        await page.close().catch(() => {});
      } catch (e) {
        // Ignorar
      }
    }
    
    if (browser) {
      try {
        // Se for Lobstr, não fechar browser (é gerenciado pelo Lobstr)
        if (!useLobstr) {
          await browser.close().catch(() => {});
        }
      } catch (e) {
        // Ignorar
      }
    }
    
    // Fechar sessão no Lobstr (se foi usada)
    if (sessionId && useLobstr) {
      await closeLobstrSession(sessionId);
    }
  }
}

module.exports = scrapeIdealista;

