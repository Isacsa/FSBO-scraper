/**
 * Scraper principal Casa Sapo
 *
 * Card-first strategy: extracts data from listing page cards (no 429 risk),
 * then optionally enriches a sample of ads by visiting detail pages.
 * Uses a SINGLE browser instance for the entire session.
 */

const { extractAllListingCards, extractAdDetailsWithPage } = require('./casasapo.extract');
const { parseAdsData } = require('./casasapo.parse');
const { normalizeAds } = require('./casasapo.normalize');
const { updateCache, filterNewAds } = require('./casasapo.cache');
const { normalizeFinalObject } = require('../../utils/finalNormalizer');
const { HttpError } = require('../../utils/browser');
const { createBrowser, createPage, getRandomUserAgent, randomDelay } = require('./casasapo.utils');

/**
 * Convert a card object (from listing page) to the raw ad format expected by parseAdData.
 */
function cardToRawAd(card) {
  return {
    url: card.url,
    title: card.title || null,
    description: null,
    price: card.price || null,
    location: card.location || null,
    photos: card.photos || [],
    features: card.features || [],
    specifications: {},
    advertiser: {},
    phone: null,
    published_date: null,
    updated_date: null,
    _from_card: true,
    _card_type: card.propertyType || null,
    _card_tipology: card.tipology || null,
    _card_area: card.area || null,
  };
}

/**
 * Merge detail page data into a card-based raw ad.
 * Detail data takes precedence where available.
 */
function mergeDetailIntoCard(cardRaw, detailRaw) {
  return {
    ...cardRaw,
    title: detailRaw.title || cardRaw.title,
    description: detailRaw.description || null,
    price: detailRaw.price || cardRaw.price,
    location: detailRaw.location || cardRaw.location,
    photos: (detailRaw.photos && detailRaw.photos.length > 0) ? detailRaw.photos : cardRaw.photos,
    features: (detailRaw.features && detailRaw.features.length > 0) ? detailRaw.features : cardRaw.features,
    specifications: detailRaw.specifications || {},
    advertiser: detailRaw.advertiser || {},
    published_date: detailRaw.published_date || null,
    updated_date: detailRaw.updated_date || null,
    _from_card: false, // enriched with detail
  };
}

/**
 * Scrape completo do Casa Sapo
 */
async function scrapeCasaSapo(listingUrl, options = {}) {
  const {
    onlyNew = false,
    maxPages = null,
    maxAds = null,
    headless = true,
    filterPrivateOnly = true,
    maxDetailVisits = 5, // limit detail page visits to avoid 429
  } = options;

  console.log('[CASASAPO] Iniciando scrape...');
  console.log(`[CASASAPO] URL: ${listingUrl}`);

  const startTime = Date.now();

  // Single browser for the entire scrape session
  const browser = await createBrowser({ headless, timeout: 60000 });
  const { page, context } = await createPage(browser, {
    timeout: 60000,
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    userAgent: getRandomUserAgent(),
  });

  try {
    // Phase 1: Extract card data from listing pages (safe — no 429 risk)
    console.log('[CASASAPO] Fase 1: Extraindo cards de listagem...');
    const cards = await extractAllListingCards(page, listingUrl, {
      maxPages,
      timeout: 40000,
      filterPrivateOnly,
    });

    if (cards.length === 0) {
      console.log('[CASASAPO] Nenhum anuncio encontrado na listagem');
      return {
        success: true,
        total_results: 0,
        new_ads: [],
        total_new: 0,
        items: []
      };
    }

    // Limit ads if specified
    const cardsToProcess = maxAds ? cards.slice(0, maxAds) : cards;
    console.log(`[CASASAPO] ${cardsToProcess.length} anuncios extraidos dos cards`);

    // Phase 2: Build raw ads from card data
    const rawAds = cardsToProcess.map(card => cardToRawAd(card));

    // Phase 3: Optionally enrich a sample by visiting detail pages
    const detailLimit = Math.min(maxDetailVisits, cardsToProcess.length);
    if (detailLimit > 0) {
      console.log(`[CASASAPO] Fase 2: Enriquecendo ate ${detailLimit} anuncios com detalhes...`);
      let consecutive429 = 0;
      let enriched = 0;

      for (let i = 0; i < cardsToProcess.length && enriched < detailLimit; i++) {
        const url = cardsToProcess[i].url;
        console.log(`[CASASAPO] [${enriched + 1}/${detailLimit}] Enriquecendo: ${url}`);

        try {
          const detailRaw = await extractAdDetailsWithPage(page, url, { timeout: 60000 });
          rawAds[i] = mergeDetailIntoCard(rawAds[i], detailRaw);
          enriched++;
          consecutive429 = 0;

          if (enriched < detailLimit) {
            await randomDelay(4000, 7000);
          }
        } catch (error) {
          if (error instanceof HttpError && (error.status === 429 || error.status === 403)) {
            consecutive429++;
            console.warn(`[CASASAPO] ${error.status} (#${consecutive429}) durante enriquecimento — continuando com dados dos cards`);

            if (consecutive429 >= 2) {
              console.warn(`[CASASAPO] Rate limit persistente — parando enriquecimento (${enriched} enriquecidos)`);
              break;
            }
            const cooldown = 15000 * consecutive429 + Math.random() * 5000;
            await new Promise(r => setTimeout(r, cooldown));
          } else {
            console.error(`[CASASAPO] Erro ao enriquecer ${url}:`, error.message);
            consecutive429 = 0;
          }
        }
      }
      console.log(`[CASASAPO] Enriquecimento: ${enriched}/${cardsToProcess.length} anuncios`);
    }

    console.log(`[CASASAPO] Extracao concluida: ${rawAds.length} anuncios (${rawAds.filter(a => !a._from_card).length} enriquecidos)`);

    // Phase 4: Parsing
    console.log('[CASASAPO] Fase 3: Parsing...');
    const parsedAds = parseAdsData(rawAds);

    // Phase 5: Normalization
    console.log('[CASASAPO] Fase 4: Normalizacao...');
    let normalizedAds = await normalizeAds(parsedAds);
    normalizedAds = normalizedAds.map(ad => normalizeFinalObject(ad));

    // Phase 6: Filter new ads if needed
    let finalAds = normalizedAds;
    let newAds = [];
    let totalNew = 0;

    if (onlyNew) {
      newAds = filterNewAds(normalizedAds);
      totalNew = newAds.length;
      finalAds = newAds;
    } else {
      const cacheResult = updateCache(normalizedAds);
      newAds = cacheResult.newAds;
      totalNew = cacheResult.totalNew;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`[CASASAPO] Scrape concluido: ${normalizedAds.length} processados, ${totalNew} novos, ${duration}s`);

    return {
      success: true,
      total_results: finalAds.length,
      new_ads: newAds,
      total_new: totalNew,
      items: finalAds
    };

  } catch (error) {
    console.error('[CASASAPO] Erro durante scrape:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = scrapeCasaSapo;
