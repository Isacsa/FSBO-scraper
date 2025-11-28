/**
 * Normaliza dados parseados para o formato JSON final
 */

/**
 * Calcula dias online
 */
function calculateDaysOnline(publishedDate) {
  if (!publishedDate) return null;
  
  try {
    const published = new Date(publishedDate);
    const now = new Date();
    
    const diffTime = now - published;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : 0;
  } catch (error) {
    console.warn('[Idealista Normalize] ⚠️  Erro ao calcular days_online:', error.message);
    return null;
  }
}

/**
 * Cria array de features
 */
function createFeaturesArray(features) {
  const featuresArray = [];
  
  if (!features || typeof features !== 'object') return featuresArray;
  
  const raw = features._raw || features;
  
  // Adicionar features do objeto raw
  if (raw.energy) featuresArray.push(`Certificado Energético: ${raw.energy}`);
  if (raw.garage) featuresArray.push(`Garagem: ${raw.garage}`);
  if (raw.elevator) featuresArray.push(`Elevador: ${raw.elevator}`);
  if (raw.balcony) featuresArray.push(`Varanda: ${raw.balcony}`);
  if (raw.bathrooms) featuresArray.push(`Casas de Banho: ${raw.bathrooms}`);
  if (raw.floor) featuresArray.push(`Andar: ${raw.floor}`);
  if (raw.year) featuresArray.push(`Ano: ${raw.year}`);
  if (raw.condition) featuresArray.push(`Condição: ${raw.condition}`);
  if (raw.pool) featuresArray.push(`Piscina: ${raw.pool}`);
  if (raw.land) featuresArray.push(`Terreno: ${raw.land}`);
  
  // Adicionar items brutos que não foram mapeados
  if (raw._rawItems && Array.isArray(raw._rawItems)) {
    raw._rawItems.forEach(item => {
      // Evitar duplicados
      if (!featuresArray.some(f => f.includes(item))) {
        featuresArray.push(item);
      }
    });
  }
  
  return featuresArray;
}

/**
 * Função principal de normalização
 */
async function normalizeToFinalFormat(parsed, url, platform) {
  console.log('[Idealista Normalize] 🔍 Normalizando para formato final...');
  
  // Normalizar propriedade usando módulo dedicado
  const { normalizeProperty } = require('../../utils/propertyNormalizer');
  const normalizedProperty = normalizeProperty(
    parsed.features._raw || parsed.features,
    parsed.title || '',
    parsed.description || ''
  );
  
  const featuresArray = createFeaturesArray(parsed.features);
  
  // IMPORTANTE: published_date vem da página, nunca do timestamp do scraping
  const published_date = parsed.published_date || null;
  const days_online = published_date ? calculateDaysOnline(published_date) : null;
  
  // Normalizar localização usando módulo dedicado
  const { normalizeLocation } = require('../../utils/locationNormalizer');
  const normalizedLocation = await normalizeLocation(
    parsed.location, 
    'idealista', 
    parsed.coordinates
  );
  
  const normalized = {
    source: platform,
    ad_id: parsed.ad_id || null,
    url: url,
    published_date: published_date,
    updated_date: parsed.updated_date || null,
    timestamp: new Date().toISOString(),
    days_online: days_online,
    title: parsed.title || null,
    description: parsed.description || null,
    location: {
      district: normalizedLocation.district || null,
      municipality: normalizedLocation.municipality || null,
      parish: normalizedLocation.parish || null,
      lat: normalizedLocation.lat ? normalizedLocation.lat.toString() : null,
      lng: normalizedLocation.lng ? normalizedLocation.lng.toString() : null
    },
    price: parsed.price || null,
    property: normalizedProperty,
    features: featuresArray,
    photos: parsed.photos || [],
    advertiser: {
      name: parsed.advertiser.name || null,
      total_ads: parsed.advertiser.total_ads || null,
      is_agency: parsed.advertiser.is_agency || false,
      url: parsed.advertiser.url || null
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: []
    }
  };
  
  console.log('[Idealista Normalize] ✅ Normalização concluída');
  
  return normalized;
}

module.exports = normalizeToFinalFormat;

