/**
 * Core runner for a single platform.
 *
 * IMPORTANT: This module should not change portal-specific logic.
 * It only centralizes: (a) which scraper module to call, (b) how to interpret
 * each scraper's return shape, and (c) optional final normalization for CLI.
 */

const { getConnector, SUPPORTED_PLATFORMS } = require('./registry');
const { normalizeFinalObject } = require('../utils/finalNormalizer');
const { rateLimitWait, withGlobalScrapeSlot } = require('./rateLimit');

function isObject(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function extractItemsFromRaw(platform, rawResponse) {
  if (!rawResponse) return [];

  // OLX / Imovirtual listing-aware scrapers return { all_ads/new_ads/... }
  if (platform === 'olx' || platform === 'imovirtual') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads)) return rawResponse.all_ads;
    if (isObject(rawResponse) && Array.isArray(rawResponse.new_ads)) return rawResponse.new_ads;
    if (isObject(rawResponse) && Array.isArray(rawResponse.fsbo_ads)) return rawResponse.fsbo_ads;
    return [rawResponse];
  }

  // Idealista Lobstr returns { items: [...] }
  if (platform === 'idealista') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.items)) return rawResponse.items;
    return [];
  }

  // CustoJusto returns { items/all_ads/new_ads: [...] }
  if (platform === 'custojusto') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.items)) return rawResponse.items;
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads)) return rawResponse.all_ads;
    if (isObject(rawResponse) && Array.isArray(rawResponse.new_ads)) return rawResponse.new_ads;
    return [];
  }

  // CasaSapo returns { items: [...] } (or all_ads in some flows)
  if (platform === 'casasapo') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.items)) return rawResponse.items;
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads)) return rawResponse.all_ads;
    return [];
  }

  return [];
}

function pickFirstItemFromRaw(platform, rawResponse) {
  if (!rawResponse) return null;

  // Preserve controller semantics: if listing, return first item; else return rawResponse.
  if (platform === 'olx') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads) && rawResponse.all_ads.length > 0) return rawResponse.all_ads[0];
    if (isObject(rawResponse) && Array.isArray(rawResponse.fsbo_ads) && rawResponse.fsbo_ads.length > 0) return rawResponse.fsbo_ads[0];
    if (isObject(rawResponse) && Array.isArray(rawResponse.new_ads) && rawResponse.new_ads.length > 0) return rawResponse.new_ads[0];
    return rawResponse;
  }

  if (platform === 'imovirtual') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads) && rawResponse.all_ads.length > 0) return rawResponse.all_ads[0];
    if (isObject(rawResponse) && Array.isArray(rawResponse.new_ads) && rawResponse.new_ads.length > 0) return rawResponse.new_ads[0];
    return rawResponse;
  }

  if (platform === 'idealista') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.items) && rawResponse.items.length > 0) return rawResponse.items[0];
    return null;
  }

  if (platform === 'custojusto') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.all_ads) && rawResponse.all_ads.length > 0) return rawResponse.all_ads[0];
    if (isObject(rawResponse) && Array.isArray(rawResponse.items) && rawResponse.items.length > 0) return rawResponse.items[0];
    if (isObject(rawResponse) && Array.isArray(rawResponse.new_ads) && rawResponse.new_ads.length > 0) return rawResponse.new_ads[0];
    return null;
  }

  if (platform === 'casasapo') {
    if (isObject(rawResponse) && Array.isArray(rawResponse.items) && rawResponse.items.length > 0) return rawResponse.items[0];
    return null;
  }

  return null;
}

function buildScraperOptions(platform, opts) {
  const {
    mode = 'full',
    maxPages = null,
    maxAds = null,
    headless = true,
    filterAgencies = true,
    filterPrivateOnly = true,
    // Idealista Lobstr specific
    maxWait = null
  } = opts || {};

  const onlyNew = mode === 'new';

  if (platform === 'olx') {
    return { onlyNew, maxPages, maxAds, headless, filterAgencies, filterPrivateOnly };
  }
  if (platform === 'imovirtual') {
    return { onlyNew, maxPages, maxAds, headless, filterPrivateOnly };
  }
  if (platform === 'idealista') {
    const out = {
      maxResults: maxAds || null,
      filterAgencies: filterPrivateOnly === false ? false : filterAgencies
    };
    if (maxWait) out.maxWait = maxWait;
    return out;
  }
  if (platform === 'custojusto') {
    return { onlyNew, maxPages, maxAds, headless };
  }
  if (platform === 'casasapo') {
    return { onlyNew, maxPages, maxAds, headless, filterPrivateOnly };
  }

  return {};
}

/**
 * Run a platform scraper.
 *
 * @param {Object} args
 * @param {string} args.platform
 * @param {string} args.url
 * @param {Object} [args.options]
 * @param {'cli'|'controller'} [args.outputShape] - controller returns first raw item (compat behavior)
 * @param {boolean} [args.normalize] - apply finalNormalizer to each item (CLI behavior)
 */
async function runPlatform(args) {
  const { platform, url, options = {}, outputShape = 'cli', normalize = true } = args || {};

  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  if (!url) {
    throw new Error('URL is required');
  }

  const connector = getConnector(platform);
  if (!connector || typeof connector.scrape !== 'function') {
    throw new Error(`No connector available for platform: ${platform}`);
  }

  const scraperOptions = buildScraperOptions(platform, options);

  // Optional global concurrency + per-host pacing (disabled by default).
  const hostKey = (() => {
    try {
      return new URL(url).hostname || platform;
    } catch (e) {
      return platform;
    }
  })();

  const rawResponse = await withGlobalScrapeSlot(async () => {
    await rateLimitWait(hostKey);
    return await connector.scrape(url, scraperOptions);
  });

  if (outputShape === 'controller') {
    return {
      rawResponse,
      item: pickFirstItemFromRaw(platform, rawResponse)
    };
  }

  const items = extractItemsFromRaw(platform, rawResponse);
  const results = normalize ? items.map(item => normalizeFinalObject(item)) : items;

  return {
    rawResponse,
    results
  };
}

module.exports = {
  runPlatform,
  extractItemsFromRaw,
  pickFirstItemFromRaw,
  buildScraperOptions
};

