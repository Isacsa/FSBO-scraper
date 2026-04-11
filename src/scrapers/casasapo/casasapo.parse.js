/**
 * Parsing e limpeza de dados brutos do Casa Sapo
 */

const { cleanText } = require('../../utils/selectors');
const { extractPrice, normalizePhone, extractAdId } = require('./casasapo.utils');

/**
 * Parse de dados brutos de um anúncio.
 * Supports both detail-page data and card-sourced data.
 */
function parseAdData(rawData) {
  const parsed = {
    ad_id: extractAdId(rawData.url),
    url: rawData.url || null,
    title: rawData.title ? cleanText(rawData.title) : null,
    description: rawData.description ? cleanText(rawData.description) : null,
    price: extractPrice(rawData.price),
    location_text: rawData.location ? cleanText(rawData.location) : null,
    photos: rawData.photos || [],
    features: rawData.features || [],
    specifications: rawData.specifications || {},
    phone: normalizePhone(rawData.phone),
    advertiser_name: rawData.advertiser?.name ? cleanText(rawData.advertiser.name) : null,
    published_date: rawData.published_date ? cleanText(rawData.published_date) : null,
    updated_date: rawData.updated_date ? cleanText(rawData.updated_date) : null,
    // Card-sourced hints (used by normalizer when detail page data is missing)
    _card_type: rawData._card_type || null,
    _card_tipology: rawData._card_tipology || null,
    _card_area: rawData._card_area || null,
    _from_card: !!rawData._from_card,
  };

  return parsed;
}

/**
 * Parse de múltiplos anúncios
 */
function parseAdsData(rawAdsData) {
  console.log('[CasaSapo Parse] 🔍 Iniciando parsing...');
  
  const parsed = rawAdsData.map(raw => parseAdData(raw));
  
  console.log(`[CasaSapo Parse] ✅ Parsing concluído: ${parsed.length} anúncios`);
  
  return parsed;
}

module.exports = {
  parseAdData,
  parseAdsData
};

