/**
 * Normaliza dados brutos do Lobstr para o formato JSON final FSBO_LITE
 * Segue o schema exato especificado: apenas campos que o Lobstr fornece
 */

/**
 * Converte bedrooms para tipologia (T1, T2, T3, etc.)
 */
function bedroomsToTipology(bedrooms) {
  if (bedrooms === null || bedrooms === undefined) return null;
  
  const num = parseInt(bedrooms);
  if (isNaN(num)) return null;
  
  if (num === 0) return 'T0';
  if (num === 1) return 'T1';
  if (num === 2) return 'T2';
  if (num === 3) return 'T3';
  if (num === 4) return 'T4';
  if (num >= 5) return 'T5+';
  
  return null;
}

/**
 * Normaliza um listing individual para o formato FSBO_LITE
 * @param {Object} result - Result bruto do Lobstr
 * @returns {Object} - JSON normalizado FSBO_LITE
 */
function normalizeListing(result) {
  // Converter scraping_time para published_date se disponível
  let published_date = null;
  let timestamp = null;
  
  if (result.scraping_time) {
    try {
      const scrapingDate = new Date(result.scraping_time);
      published_date = scrapingDate.toISOString();
      timestamp = scrapingDate.toISOString();
    } catch (e) {
      // Ignorar erro de parsing de data
    }
  }
  
  // Se não tiver scraping_time, usar timestamp atual
  if (!timestamp) {
    timestamp = new Date().toISOString();
  }
  
  // Montar array de fotos
  const photos = [];
  if (result.main_image) {
    photos.push(result.main_image);
  }
  
  // Converter tipologia de bedrooms
  const tipology = bedroomsToTipology(result.bedrooms);
  
  // Normalizar preço para string
  let price = null;
  if (result.price !== null && result.price !== undefined) {
    if (typeof result.price === 'number') {
      price = result.price.toString();
    } else if (typeof result.price === 'string') {
      price = result.price;
    }
  }
  
  // Normalizar área para string
  let area_total = null;
  let area_useful = null;
  if (result.area !== null && result.area !== undefined) {
    const areaStr = result.area.toString();
    area_total = areaStr;
    area_useful = areaStr; // Lobstr só fornece uma área
  }
  
  // Normalizar floor para string
  let floor = null;
  if (result.floor !== null && result.floor !== undefined) {
    floor = result.floor.toString();
  }
  
  // Montar objeto final FSBO_LITE (apenas campos que o Lobstr fornece)
  const normalized = {
    source: 'idealista_lobstr',
    ad_id: result.native_id || result.id || null,
    url: result.url || null,
    published_date: published_date,
    updated_date: null, // Lobstr não fornece
    timestamp: timestamp,
    days_online: null, // Lobstr não fornece
    title: result.title || null,
    description: result.description || null,
    location: {
      district: null, // Lobstr não fornece
      municipality: null, // Lobstr não fornece
      parish: null, // Lobstr não fornece
      lat: null, // Lobstr não fornece
      lng: null // Lobstr não fornece
    },
    price: price,
    property: {
      type: null, // Lobstr não fornece
      tipology: tipology,
      area_total: area_total,
      area_useful: area_useful,
      year: null, // Lobstr não fornece
      floor: floor,
      condition: null // Lobstr não fornece
    },
    photos: photos,
    advertiser: {
      name: null, // Lobstr não fornece
      total_ads: null, // Lobstr não fornece
      is_agency: null, // Lobstr não fornece
      url: null, // Lobstr não fornece
      phone: result.phone || null // Lobstr fornece phone
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: []
    }
  };
  
  return normalized;
}

/**
 * Normaliza todos os listings para formato FSBO_LITE
 * @param {Array} results - Array de results brutos do Lobstr
 * @returns {Array} - Array de listings normalizados
 */
function normalizeListings(results) {
  console.log('[Idealista Normalize] 🔍 Normalizando listings para formato FSBO_LITE...');
  console.log(`[Idealista Normalize] Total de results a normalizar: ${results.length}`);
  
  const normalized = results.map(result => normalizeListing(result));
  
  console.log(`[Idealista Normalize] ✅ Normalização concluída: ${normalized.length} listings`);
  
  return normalized;
}

module.exports = {
  normalizeListings,
  normalizeListing,
  bedroomsToTipology
};
