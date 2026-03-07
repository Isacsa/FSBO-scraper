/**
 * Parsing e limpeza de dados brutos do CustoJusto
 */

const { cleanText } = require('../../utils/selectors');
const { extractPrice, normalizePhone, extractAdId } = require('./custojusto.utils');

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
    phone: normalizePhone(rawData.phone),
    advertiser: rawData.advertiser
      ? {
          name: rawData.advertiser.name ? cleanText(rawData.advertiser.name) : null,
          label: rawData.advertiser.label ? cleanText(rawData.advertiser.label) : null,
        }
      : null,
    specifications: rawData.specifications || {},
    // Preservar dados de data para normalização
    listTime: rawData.listTime || null,
    published_date: rawData.published_date || null,
    updated_date: rawData.updated_date || null,
    days_online: rawData.days_online || null
  };
  
  // Usar especificações para melhorar location_text se disponível
  if (parsed.specifications.freguesia || parsed.specifications.concelho) {
    const parts = [];
    if (parsed.specifications.freguesia) parts.push(parsed.specifications.freguesia);
    if (parsed.specifications.concelho) parts.push(parsed.specifications.concelho);
    if (parts.length > 0) {
      parsed.location_text = parts.join(', ');
    }
  }
  
  return parsed;
}

/**
 * Parse de múltiplos anúncios
 */
function parseAdsData(rawAdsData) {
  console.log('[CustoJusto Parse] 🔍 Iniciando parsing...');
  
  const parsed = rawAdsData.map(raw => parseAdData(raw));
  
  console.log(`[CustoJusto Parse] ✅ Parsing concluído: ${parsed.length} anúncios`);
  
  return parsed;
}

module.exports = {
  parseAdData,
  parseAdsData
};

