/**
 * Normaliza dados parseados para o formato JSON final
 */

/**
 * Calcula dias online
 * Retorna número inteiro, não string
 */
function calculateDaysOnline(publishedDate) {
  if (!publishedDate) return null;
  
  try {
    const published = new Date(publishedDate);
    const now = new Date();
    
    // Calcular diferença em dias (arredondar para baixo)
    const diffTime = now - published;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Retornar como número, não string
    return diffDays >= 0 ? diffDays : 0;
  } catch (error) {
    console.warn('[OLX Normalize] ⚠️  Erro ao calcular days_online:', error.message);
    return null;
  }
}

// Função extractPropertyType removida - agora usa propertyNormalizer

// Função separateAreas removida - agora usa propertyNormalizer

/**
 * Cria array de features
 */
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

/**
 * Detecta se é agência baseado em heurísticas
 */
function detectIsAgency(advertiser, description) {
  // Se tem muitos anúncios, provavelmente é agência
  // (será preenchido depois se tivermos acesso à página do anunciante)
  
  // Por enquanto, retornar false (será detectado pelo fsboSignals)
  return false;
}

/**
 * Função principal de normalização
 */
async function normalizeToFinalFormat(parsed, url, platform) {
  console.log('[OLX Normalize] 🔍 Normalizando para formato final...');
  
  // Normalizar propriedade usando módulo dedicado
  const { normalizeProperty } = require('../../utils/propertyNormalizer');
  const normalizedProperty = normalizeProperty(
    parsed.features._raw || parsed.features,
    parsed.title || '',
    parsed.description || ''
  );
  
  const featuresArray = createFeaturesArray(parsed.features._raw || {});
  
  // IMPORTANTE: published_date vem da página, nunca do timestamp do scraping
  const published_date = parsed.published_date || null;
  const days_online = published_date ? calculateDaysOnline(published_date) : null;
  
  // Normalizar localização usando módulo dedicado
  const { normalizeLocation } = require('../../utils/locationNormalizer');
  const normalizedLocation = await normalizeLocation(parsed.location, 'olx', true);
  
  const normalized = {
    source: platform,
    ad_id: parsed.ad_id || null,
    url: url,
    published_date: published_date, // Vem da página, não do scraping
    updated_date: parsed.updated_date || null,
    timestamp: new Date().toISOString(), // Timestamp do scraping (separado)
    days_online: days_online, // Número inteiro, não string
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
  
  console.log('[OLX Normalize] ✅ Normalização concluída');
  
  return normalized;
}

module.exports = normalizeToFinalFormat;

