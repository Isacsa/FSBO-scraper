#!/usr/bin/env node

/**
 * CLI unificada para executar scrapers directamente (n8n-ready)
 */

const { configureOutput, printJSON, log } = require('./src/utils/output');
const { normalizeFinalObject } = require('./src/utils/finalNormalizer');
const { calculateFsboScores } = require('./pipeline/fsboScore');
const { dedupeListInMemory } = require('./pipeline/deduplicate');
const { runPlatform } = require('./src/core/runPlatform');
const { shouldRunHeadless } = require('./src/utils/browser');

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
    n8n: false,
  };

  argv.forEach((arg) => {
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

  if (!args.url) {
    throw new Error('The --url parameter is required for this platform');
  }

  if (!['new', 'full'].includes(args.mode)) {
    throw new Error("Mode must be 'new' or 'full'");
  }
}

function createMockResults(platform) {
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
      lng: '-9.1393',
    },
    property: {
      type: 'apartamento',
      tipology: 'T2',
      area_total: '120',
      area_useful: '100',
      year: '2020',
      floor: '3',
      condition: 'usado',
    },
    features: ['Mock feature'],
    photos: ['https://example.com/photo.jpg'],
    advertiser: {
      name: 'Mock FSBO',
      total_ads: '1',
      is_agency: false,
      url: 'https://example.com/profile',
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: [],
    },
  });

  const normalized = calculateFsboScores([baseAd('1')]);
  return {
    success: true,
    platform,
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    results: normalized,
    count: normalized.length,
    meta: {
      total_results: normalized.length,
      duplicates_removed: 0,
      canonical_runner: 'mock',
    },
  };
}

function buildSuccessResponse(platform, startedAt, rawResults, dedupeResult, processedResults) {
  return {
    success: true,
    platform,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    results: processedResults,
    count: processedResults.length,
    meta: {
      total_results: rawResults.length,
      duplicates_removed: dedupeResult.duplicates.length,
      canonical_runner: 'runPlatform',
      supported_path: 'diagnostic_cli',
    },
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  try {
    validateArgs(args);
  } catch (error) {
    configureOutput({ silent: true });
    printJSON({
      success: false,
      platform: args.platform || null,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
    return;
  }

  if (args.n8n) {
    args.silent = true;
    args.jsonOnly = true;
  }

  configureOutput({
    silent: args.silent,
    jsonOnly: args.jsonOnly,
    debug: args.debug,
  });

  if (process.env.SCRAPER_MOCK === '1') {
    printJSON(createMockResults(args.platform));
    return;
  }

  try {
    const effectiveHeadless = shouldRunHeadless({ headless: true });
    const { results } = await runPlatform({
      platform: args.platform,
      url: args.url,
      options: {
        mode: args.mode,
        maxPages: args.maxPages,
        maxAds: args.maxAds,
        headless: effectiveHeadless,
        filterAgencies: true,
      },
      outputShape: 'cli',
      normalize: true,
    });

    const dedupeResult = dedupeListInMemory(results);
    if (dedupeResult.duplicates.length > 0) {
      log(`Removidos ${dedupeResult.duplicates.length} duplicados`);
    }

    const processedResults = calculateFsboScores(dedupeResult.unique);
    printJSON(buildSuccessResponse(args.platform, startedAt, results, dedupeResult, processedResults));
  } catch (error) {
    printJSON({
      success: false,
      platform: args.platform,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
}

run().catch((error) => {
  log('Fatal error on run-scraper:', error.message);
  printJSON({
    success: false,
    error: error.message || 'Unknown error',
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});


