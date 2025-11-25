/**
 * Normalizador de localização para scrapers
 * Processa texto bruto e retorna localização completa com coordenadas
 */

const { findInDataset, findMunicipality, findDistrict, normalizeLocationName } = require('./locationDataset');

/**
 * Cache simples para geocoding
 */
const geocodeCache = new Map();

/**
 * Geocoding usando Nominatim (OpenStreetMap)
 */
async function geocodeLocation(locationText) {
  // Verificar cache
  const cacheKey = normalizeLocationName(locationText);
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }
  
  try {
    const query = encodeURIComponent(`${locationText}, Portugal`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FSBO-Scraper/1.0'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const address = result.address || {};
      
      // Extrair informações do endereço
      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        district: address.state || address.region || null,
        municipality: address.city || address.town || address.municipality || null,
        parish: address.suburb || address.village || address.neighbourhood || null
      };
      
      // Cachear resultado
      geocodeCache.set(cacheKey, location);
      
      return location;
    }
    
    return null;
  } catch (error) {
    console.warn(`[LocationNormalizer] ⚠️  Erro no geocoding: ${error.message}`);
    return null;
  }
}

/**
 * Processa localização do OLX
 * OLX geralmente mostra: freguesia, bairro, ou concelho isolado
 */
function processOLXLocation(locationText) {
  if (!locationText || typeof locationText !== 'string') {
    return null;
  }
  
  const parts = locationText.split(',').map(p => p.trim()).filter(Boolean);
  
  // Se tem vírgula, pode ser "bairro, concelho" ou "freguesia, concelho"
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1];
    
    // Tentar encontrar primeiro como freguesia/bairro
    let location = findInDataset(first);
    
    if (location) {
      return {
        district: location.district,
        municipality: location.municipality,
        parish: first,
        lat: location.lat,
        lng: location.lng
      };
    }
    
    // Tentar segundo como concelho
    const municipality = findMunicipality(second);
    if (municipality) {
      return {
        district: municipality.district,
        municipality: municipality.municipality,
        parish: first,
        lat: municipality.lat,
        lng: municipality.lng
      };
    }
  }
  
  // Tentar encontrar como freguesia/bairro
  let location = findInDataset(parts[0]);
  if (location) {
    return {
      district: location.district,
      municipality: location.municipality,
      parish: parts[0],
      lat: location.lat,
      lng: location.lng
    };
  }
  
  // Tentar como concelho
  const municipality = findMunicipality(parts[0]);
  if (municipality) {
    return {
      district: municipality.district,
      municipality: municipality.municipality,
      parish: null,
      lat: municipality.lat,
      lng: municipality.lng
    };
  }
  
  return null;
}

/**
 * Processa localização do Imovirtual
 * Imovirtual geralmente mostra: freguesia, concelho, distrito (ou combinações)
 */
function processImovirtualLocation(locationData) {
  if (!locationData) {
    return null;
  }
  
  let parts = [];
  
  if (typeof locationData === 'string') {
    parts = locationData.split(',').map(p => p.trim()).filter(Boolean);
  } else if (locationData.parts) {
    parts = locationData.parts;
  } else if (locationData.raw) {
    parts = locationData.raw.split(',').map(p => p.trim()).filter(Boolean);
  }
  
  if (parts.length === 0) {
    return null;
  }
  
  // Imovirtual geralmente: freguesia, concelho, distrito
  // Ou: bairro, freguesia, concelho, distrito
  
  let district = null;
  let municipality = null;
  let parish = null;
  
  // Último elemento geralmente é distrito
  if (parts.length >= 3) {
    district = parts[parts.length - 1];
    municipality = parts[parts.length - 2];
    parish = parts[0];
  } else if (parts.length === 2) {
    municipality = parts[1];
    parish = parts[0];
  } else {
    parish = parts[0];
  }
  
  // Validar e completar com dataset
  let result = null;
  
  // Tentar encontrar freguesia primeiro
  if (parish) {
    result = findInDataset(parish);
    if (result) {
      return {
        district: result.district,
        municipality: result.municipality,
        parish: parish,
        lat: result.lat,
        lng: result.lng
      };
    }
  }
  
  // Tentar encontrar concelho
  if (municipality) {
    const munResult = findMunicipality(municipality);
    if (munResult) {
      return {
        district: munResult.district,
        municipality: munResult.municipality,
        parish: parish || null,
        lat: munResult.lat,
        lng: munResult.lng
      };
    }
  }
  
  // Tentar encontrar distrito
  if (district) {
    const distResult = findDistrict(district);
    if (distResult) {
      return {
        district: distResult.district,
        municipality: municipality || distResult.municipality,
        parish: parish || null,
        lat: distResult.lat,
        lng: distResult.lng
      };
    }
  }
  
  // Se não encontrou nada, retornar o que tem
  return {
    district: district || null,
    municipality: municipality || null,
    parish: parish || null,
    lat: null,
    lng: null
  };
}

/**
 * Função principal de normalização
 * @param {string|Object} locationData - Dados de localização brutos
 * @param {string} platform - 'olx' ou 'imovirtual'
 * @param {boolean} useGeocoding - Se deve usar geocoding como fallback
 * @returns {Promise<Object>} - Localização normalizada
 */
async function normalizeLocation(locationData, platform = 'olx', useGeocoding = true) {
  let processed = null;
  
  // Processar conforme plataforma
  if (platform === 'olx') {
    const locationText = typeof locationData === 'string' 
      ? locationData 
      : (locationData?.raw || locationData?.parts?.join(', ') || '');
    processed = processOLXLocation(locationText);
  } else if (platform === 'imovirtual') {
    processed = processImovirtualLocation(locationData);
  }
  
  // Se processou com sucesso e tem coordenadas, retornar
  if (processed && processed.lat && processed.lng) {
    return processed;
  }
  
  // Se processou mas sem coordenadas, tentar geocoding
  if (processed && useGeocoding) {
    const searchText = processed.parish 
      ? `${processed.parish}, ${processed.municipality || ''}, ${processed.district || ''}, Portugal`
      : `${processed.municipality || ''}, ${processed.district || ''}, Portugal`;
    
    const geocoded = await geocodeLocation(searchText.trim());
    
    if (geocoded) {
      return {
        district: processed.district || geocoded.district || null,
        municipality: processed.municipality || geocoded.municipality || null,
        parish: processed.parish || geocoded.parish || null,
        lat: geocoded.lat,
        lng: geocoded.lng
      };
    }
  }
  
  // Se não processou nada, tentar geocoding direto
  if (!processed && useGeocoding) {
    const locationText = typeof locationData === 'string' 
      ? locationData 
      : (locationData?.raw || locationData?.parts?.join(', ') || '');
    
    if (locationText) {
      const geocoded = await geocodeLocation(locationText);
      if (geocoded) {
        return {
          district: geocoded.district,
          municipality: geocoded.municipality,
          parish: geocoded.parish,
          lat: geocoded.lat,
          lng: geocoded.lng
        };
      }
    }
  }
  
  // Retornar o que conseguiu processar (pode ter nulls)
  return processed || {
    district: null,
    municipality: null,
    parish: null,
    lat: null,
    lng: null
  };
}

module.exports = {
  normalizeLocation,
  processOLXLocation,
  processImovirtualLocation,
  geocodeLocation
};

