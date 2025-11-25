/**
 * Scraper principal para Imovirtual
 * Orquestra extração, parsing, normalização e sinais FSBO
 */

const { createBrowser, createPage, navigateWithRetry } = require('../../utils/browser');
const { closePopupsAndOverlays } = require('../helpers');
const extractRawData = require('./extract');
const parseRawData = require('./parse');
const normalizeToFinalFormat = require('./normalize');
// FSBO signals será importado quando necessário
const path = require('path');
const fs = require('fs');

const SESSION_FILE = path.join(__dirname, '../../../imovirtual-session.json');
const PLATFORM = 'imovirtual';

async function scrapeImovirtual(url, options = {}) {
  const startTime = Date.now();
  const { 
    headless = true, 
    includeRawHtml = false, 
    timeout = 30000,
    proxy = null
  } = options;
  let browser = null;
  let page = null;

  try {
    console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando scrape para: ${url}`);

    let storageStatePath = null;
    if (fs.existsSync(SESSION_FILE)) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        const hasCookies = sessionData.cookies && sessionData.cookies.length > 0;
        const hasStorage = sessionData.origins && sessionData.origins.length > 0;
        if (hasCookies || hasStorage) {
          storageStatePath = SESSION_FILE;
          const stats = fs.statSync(SESSION_FILE);
          console.log(`[${PLATFORM.toUpperCase()}] ✅ Sessão guardada encontrada`);
          console.log(`[${PLATFORM.toUpperCase()}] 📅 Sessão criada em: ${stats.mtime.toISOString()}`);
        }
      } catch (error) {
        console.log(`[${PLATFORM.toUpperCase()}] ⚠️  Erro ao ler ficheiro de sessão: ${error.message}`);
      }
    }

    console.log(`[${PLATFORM.toUpperCase()}] 🚀 Iniciando browser (headless: ${headless})...`);
      browser = await createBrowser({ headless, timeout, proxy });

    const pageOptions = {
      timeout,
      storageStatePath: storageStatePath || null,
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      geolocation: { latitude: 38.7223, longitude: -9.1393 }
    };
    
    page = await createPage(browser, pageOptions);
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
    
    console.log(`[${PLATFORM.toUpperCase()}] ✅ Browser e página criados com sucesso`);

    console.log(`[${PLATFORM.toUpperCase()}] 🌐 Navegando para: ${url}`);
    await navigateWithRetry(page, url);

    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await closePopupsAndOverlays(page, PLATFORM.toUpperCase());
    await page.waitForTimeout(1000);

    console.log(`[${PLATFORM.toUpperCase()}] 📥 Fase 1: Extração de dados brutos`);
    const raw = await extractRawData(page, url);

    console.log(`[${PLATFORM.toUpperCase()}] 🔧 Fase 2: Parsing e normalização`);
    const parsed = parseRawData(raw);

    // 2.5. NORMALIZAR ANUNCIANTE (visitar perfil se necessário)
    console.log(`[${PLATFORM.toUpperCase()}] 👤 Fase 2.5: Normalização do anunciante`);
    const { normalizeAdvertiser } = require('../../utils/advertiserNormalizer');
    const normalizedAdvertiser = await normalizeAdvertiser(
      parsed.advertiser,
      PLATFORM,
      page,
      true // visitProfile = true
    );
    parsed.advertiser = normalizedAdvertiser;

    console.log(`[${PLATFORM.toUpperCase()}] 📋 Fase 3: Montagem do JSON final`);
    let finalJson = await normalizeToFinalFormat(parsed, url, PLATFORM);

    console.log(`[${PLATFORM.toUpperCase()}] 🔍 Fase 4: Análise de sinais FSBO`);
    const { analyzeFsboSignals } = require('../../services/fsboSignals');
    const signals = analyzeFsboSignals({
      title: finalJson.title,
      description: finalJson.description,
      advertiser: finalJson.advertiser,
      photos: finalJson.photos,
      price: finalJson.price,
      location: finalJson.location
    }, PLATFORM);
    
    finalJson.signals = signals;
    
    // Atualizar is_agency no advertiser com base nos sinais (se ainda não foi definido)
    if (finalJson.advertiser.is_agency === null || finalJson.advertiser.is_agency === undefined) {
      finalJson.advertiser.is_agency = signals.is_agency;
    }
    
    // 5. NORMALIZAÇÃO FINAL (garantir schema)
    console.log(`[${PLATFORM.toUpperCase()}] ✨ Fase 5: Normalização final do schema`);
    const { normalizeFinalObject } = require('../../utils/finalNormalizer');
    finalJson = normalizeFinalObject(finalJson);

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
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = scrapeImovirtual;

