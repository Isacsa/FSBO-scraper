#!/usr/bin/env node

/**
 * CLI unificada para executar scrapers directamente (n8n-ready)
 */

const path = require('path');
const { configureOutput, printJSON, log } = require('./src/utils/output');
const { normalizeFinalObject } = require('./src/utils/finalNormalizer');
const { calculateFsboScores } = require('./pipeline/fsboScore');
const { dedupeListInMemory } = require('./pipeline/deduplicate');

const SUPPORTED_PLATFORMS = ['olx', 'imovirtual', 'idealista', 'custojusto', 'casasapo'];

function parseArgs(argv) {
  const args = {
    platform: null,
    url: null,
    mode: 'full',
    maxPages: null,
    maxAds: null,
    silent: false,
    jsonOnly: false,
    debug: false,
    n8n: false
  };

  argv.forEach(arg => {
    if (!arg.startsWith('--')) return;
    const [key, value] = arg.substring(2).split('=');
    switch (key) {
      case 'platform':
        args.platform = value;
        break;
      case 'url':
        args.url = value;
        break;
      case 'mode':
        args.mode = value || 'full';
        break;
      case 'maxPages':
        args.maxPages = value ? Number(value) : null;
        break;
      case 'maxAds':
        args.maxAds = value ? Number(value) : null;
        break;
      case 'silent':
        args.silent = true;
        break;
      case 'json-only':
        args.jsonOnly = true;
        break;
      case 'debug':
        args.debug = true;
        break;
      case 'n8n':
        args.n8n = true;
        break;
      default:
        break;
    }
  });

  return args;
}

function validateArgs(args) {
  if (!args.platform || !SUPPORTED_PLATFORMS.includes(args.platform)) {
    throw new Error(`Platform is required and must be one of: ${SUPPORTED_PLATFORMS.join(', ')}`);
  }

  if (['olx', 'imovirtual', 'idealista', 'custojusto', 'casasapo'].includes(args.platform) && !args.url) {
    throw new Error('The --url parameter is required for this platform');
  }

  if (!['new', 'full'].includes(args.mode)) {
    throw new Error("Mode must be 'new' or 'full'");
  }
}

function createMockResults(platform, mode) {
  const baseAd = (idSuffix) => normalizeFinalObject({
    source: platform,
    ad_id: `mock-${platform}-${idSuffix}`,
    url: `https://example.com/${platform}/${idSuffix}`,
    title: `Mock listing ${idSuffix}`,
    description: 'Mock description',
    price: '100000',
    location: {
      district: 'Lisboa',
      municipality: 'Lisboa',
      parish: 'Santa Maria Maior',
      lat: '38.7223',
      lng: '-9.1393'
    },
    property: {
      type: 'apartamento',
      tipology: 'T2',
      area_total: '120',
      area_useful: '100',
      year: '2020',
      floor: '3',
      condition: 'usado'
    },
    features: ['Mock feature'],
    photos: ['https://example.com/photo.jpg'],
    advertiser: {
      name: 'Mock FSBO',
      total_ads: '1',
      is_agency: false,
      url: 'https://example.com/profile'
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: []
    }
  });

  const items = [baseAd('1')];
  if (platform === 'custojusto' || platform === 'casasapo') {
    items.push(baseAd('2'));
  }

  return {
    success: true,
    platform,
    timestamp: new Date().toISOString(),
    results: items,
    count: items.length,
    meta: {
      total_results: items.length
    }
  };
}

async function loadScraper(platform) {
  if (process.env.SCRAPER_MOCK === '1') {
    return null;
  }

  switch (platform) {
    case 'olx':
      // Usar novo scraper que suporta listagens e filtra agências
      return require('./src/scrapers/olx/olx.scraper');
    case 'imovirtual':
      // Usar novo scraper que suporta listagens e preserva filtro PRIVATE
      return require('./src/scrapers/imovirtual/imovirtual.scraper');
    case 'idealista':
      return require('./src/scrapers/idealista_lobstr/idealista.scraper');
    case 'custojusto':
      return require('./src/scrapers/custojusto/custojusto.scraper');
    case 'casasapo':
      return require('./src/scrapers/casasapo/casasapo.scraper');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const startTime = Date.now();

  try {
    validateArgs(args);
  } catch (error) {
    configureOutput({ silent: true });
    printJSON({
      success: false,
      platform: args.platform || null,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }

  // Modo n8n força headless, silent e json-only
  if (args.n8n) {
    args.silent = true;
    args.jsonOnly = true;
  }
  
  configureOutput({
    silent: args.silent,
    jsonOnly: args.jsonOnly,
    debug: args.debug
  });

  const useMock = process.env.SCRAPER_MOCK === '1';

  if (useMock) {
    const mockOutput = createMockResults(args.platform, args.mode);
    printJSON(mockOutput);
    return;
  }

  const scraperModule = await loadScraper(args.platform);
  let results = [];
  let rawResponse = null;

  // Usar função centralizada para determinar headless (não afetado por debug)
  const { shouldRunHeadless } = require('./src/utils/browser');
  // Headless é determinado pela função centralizada, não por flags de debug/silent
  // Em servidor (N8N, CI, Linux) será sempre true
  const effectiveHeadless = shouldRunHeadless({ headless: true });
  const onlyNew = args.mode === 'new';

  try {
    if (args.platform === 'olx') {
      // OLX agora suporta listagens e filtra agências automaticamente
      rawResponse = await scraperModule(args.url, {
        onlyNew,
        maxPages: args.maxPages || null,
        maxAds: args.maxAds || null,
        headless: effectiveHeadless,
        filterAgencies: true // Filtrar agências automaticamente
      });
      
      // Se for listagem, retornar array; se for anúncio individual, retornar objeto único
      if (rawResponse && rawResponse.all_ads) {
        // Listagem
        const ads = rawResponse.all_ads || rawResponse.new_ads || [];
        results = ads.map(item => normalizeFinalObject(item));
      } else {
        // Anúncio individual
        results = [normalizeFinalObject(rawResponse)];
      }
    } else if (args.platform === 'imovirtual') {
      // Imovirtual agora suporta listagens e preserva filtro PRIVATE
      rawResponse = await scraperModule(args.url, {
        onlyNew,
        maxPages: args.maxPages || null,
        maxAds: args.maxAds || null,
        headless: effectiveHeadless
      });
      
      // Se for listagem, retornar array; se for anúncio individual, retornar objeto único
      if (rawResponse && rawResponse.all_ads) {
        // Listagem
        const ads = rawResponse.all_ads || rawResponse.new_ads || [];
        results = ads.map(item => normalizeFinalObject(item));
      } else {
        // Anúncio individual
        results = [normalizeFinalObject(rawResponse)];
      }
    } else if (args.platform === 'idealista') {
      rawResponse = await scraperModule(args.url, { maxResults: args.maxAds || null });
      results = (rawResponse.items || []).map(item => normalizeFinalObject(item));
    } else if (args.platform === 'custojusto') {
      rawResponse = await scraperModule(args.url, {
        onlyNew,
        maxPages: args.maxPages || null,
        maxAds: args.maxAds || null,
        headless: effectiveHeadless
      });
      const ads = rawResponse.items || rawResponse.all_ads || rawResponse.new_ads || [];
      results = ads.map(item => normalizeFinalObject(item));
    } else if (args.platform === 'casasapo') {
      rawResponse = await scraperModule(args.url, {
        onlyNew,
        maxPages: args.maxPages || null,
        maxAds: args.maxAds || null,
        headless: effectiveHeadless
      });
      const ads = rawResponse.items || rawResponse.all_ads || [];
      results = ads.map(item => normalizeFinalObject(item));
    }
  } catch (error) {
    const failure = {
      success: false,
      platform: args.platform,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
    printJSON(failure);
    process.exit(1);
    return;
  }

  // Pipeline: Deduplicar em memória e calcular FSBO Score
  let processedResults = results;
  
  if (results.length > 0) {
    try {
      // 1. Deduplicar (apenas em memória)
      const dedupeResult = dedupeListInMemory(processedResults);
      processedResults = dedupeResult.unique;
      
      if (dedupeResult.duplicates.length > 0) {
        log(`Removidos ${dedupeResult.duplicates.length} duplicados`);
      }
      
      // 2. Calcular FSBO Score
      processedResults = calculateFsboScores(processedResults);
    } catch (pipelineError) {
      log('Erro no pipeline:', pipelineError.message);
      // Continuar mesmo se pipeline falhar
    }
  }
  
  // Montar resposta final (simplificada, sem campos de DB)
  const response = {
    success: true,
    platform: args.platform,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    results: processedResults,
    count: processedResults.length
  };
  
  if (rawResponse && typeof rawResponse.total_new !== 'undefined') {
    response.meta = {
      total_results: processedResults.length,
      duplicates_removed: results.length - processedResults.length
    };
  } else {
    response.meta = {
      total_results: processedResults.length,
      duplicates_removed: results.length - processedResults.length
    };
  }

  printJSON(response);
}

run().catch(error => {
  log('Fatal error on run-scraper:', error.message);
  printJSON({
    success: false,
    error: error.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});


