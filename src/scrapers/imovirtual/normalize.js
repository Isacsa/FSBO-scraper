/**
 * Normaliza dados parseados para o formato JSON final - Imovirtual
 */

function calculateDaysOnline(publishedDate) {
  if (!publishedDate) return null;
  try {
    const published = new Date(publishedDate);
    const now = new Date();
    const diffTime = Math.abs(now - published);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays.toString();
  } catch (error) {
    return null;
  }
}

// Função extractPropertyType removida - agora usa propertyNormalizer

// Função separateAreas removida - agora usa propertyNormalizer

function createFeaturesArray(features) {
  const featuresArray = [];
  
  if (!features || typeof features !== 'object') return featuresArray;
  
  if (features.energy) featuresArray.push(`Certificado Energético: ${features.energy}`);
  if (features.garage) featuresArray.push(`Garagem: ${features.garage}`);
  if (features.elevator) featuresArray.push(`Elevador: ${features.elevator}`);
  if (features.balcony) featuresArray.push(`Varanda: ${features.balcony}`);
  if (features.bathrooms) featuresArray.push(`Casas de Banho: ${features.bathrooms}`);
  if (features.floor) featuresArray.push(`Andar: ${features.floor}`);
  if (features.year) featuresArray.push(`Ano: ${features.year}`);
  if (features.condition) featuresArray.push(`Condição: ${features.condition}`);
  
  return featuresArray;
}

async function normalizeToFinalFormat(parsed, url, platform) {
  console.log('[Imovirtual Normalize] 🔍 Normalizando para formato final...');
  
  // Normalizar propriedade usando módulo dedicado
  const { normalizeProperty } = require('../../utils/propertyNormalizer');
  const normalizedProperty = normalizeProperty(
    parsed.features._raw || parsed.features,
    parsed.title || '',
    parsed.description || ''
  );
  
  const featuresArray = createFeaturesArray(parsed.features._raw || {});
  
  // Normalizar localização usando módulo dedicado
  const { normalizeLocation } = require('../../utils/locationNormalizer');
  const normalizedLocation = await normalizeLocation(parsed.location, 'imovirtual', true);
  
  const normalized = {
    source: platform,
    ad_id: parsed.ad_id || null,
    url: url,
    published_date: parsed.published_date || null,
    updated_date: parsed.updated_date || null,
    timestamp: new Date().toISOString(),
    days_online: calculateDaysOnline(parsed.published_date),
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
      is_agency:
        typeof parsed.advertiser.is_agency === 'boolean'
          ? parsed.advertiser.is_agency
          : null,
      url: parsed.advertiser.url || null
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: []
    }
  };
  console.log('[Imovirtual Normalize] ✅ Normalização concluída');
  return normalized;
}

module.exports = normalizeToFinalFormat;

