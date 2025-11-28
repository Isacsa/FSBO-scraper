/**
 * Parsing e limpeza de dados brutos do Casa Sapo
 */

const { cleanText } = require('../../utils/selectors');
const { extractPrice, normalizePhone, extractAdId } = require('./casasapo.utils');

/**
 * Parse de dados brutos de um anúncio
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
    updated_date: rawData.updated_date ? cleanText(rawData.updated_date) : null
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

