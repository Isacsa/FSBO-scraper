/**
 * Normalizador final do objeto de anúncio
 * Garante que o output respeita exatamente o schema FSBO definido
 * Remove campos extra, normaliza tipos, trata nulls
 */

/**
 * Normaliza string: null/undefined → ""
 */
function normalizeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return String(value).trim();
}

/**
 * Normaliza número: pode ser string ou número, retorna string normalizada
 */
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    // Se for inteiro, retornar sem decimais
    return Number.isInteger(value) ? value.toString() : value.toString();
  }
  if (typeof value === 'string') {
    // Limpar e normalizar string numérica
    const cleaned = value.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : (Number.isInteger(num) ? num.toString() : num.toString());
  }
  return '';
}

/**
 * Normaliza boolean: sempre boolean, nunca null
 */
function normalizeBoolean(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Normaliza array: sempre array, nunca null
 */
function normalizeArray(value) {
  if (!Array.isArray(value)) {
    if (value === null || value === undefined) return [];
    return [value];
  }
  return value.filter(item => item !== null && item !== undefined);
}

/**
 * Normaliza objeto location
 */
function normalizeLocation(location) {
  if (!location || typeof location !== 'object') {
    return {
      district: '',
      municipality: '',
      parish: '',
      lat: '',
      lng: ''
    };
  }
  
  return {
    district: normalizeString(location.district),
    municipality: normalizeString(location.municipality),
    parish: normalizeString(location.parish),
    lat: normalizeString(location.lat), // String vazia se não calculado
    lng: normalizeString(location.lng)  // String vazia se não calculado
  };
}

/**
 * Normaliza objeto property
 */
function normalizeProperty(property) {
  if (!property || typeof property !== 'object') {
    return {
      type: '',
      tipology: '',
      area_total: '',
      area_useful: '',
      year: '',
      floor: '',
      condition: ''
    };
  }
  
  return {
    type: normalizeString(property.type),
    tipology: normalizeString(property.tipology),
    area_total: normalizeNumber(property.area_total), // String normalizada ou ""
    area_useful: normalizeNumber(property.area_useful), // String normalizada ou ""
    year: normalizeNumber(property.year), // String normalizada ou ""
    floor: normalizeString(property.floor),
    condition: normalizeString(property.condition)
  };
}

/**
 * Normaliza objeto advertiser
 */
function normalizeAdvertiser(advertiser) {
  if (!advertiser || typeof advertiser !== 'object') {
    return {
      name: '',
      total_ads: '',
      is_agency: false,
      url: ''
    };
  }
  
  return {
    name: normalizeString(advertiser.name),
    total_ads: normalizeNumber(advertiser.total_ads), // String normalizada ou ""
    is_agency: normalizeBoolean(advertiser.is_agency), // Sempre boolean
    url: normalizeString(advertiser.url)
  };
}

/**
 * Normaliza objeto signals
 * Remove is_agency se existir (deve estar apenas em advertiser)
 */
function normalizeSignals(signals) {
  if (!signals || typeof signals !== 'object') {
    return {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: []
    };
  }
  
  // Remover is_agency se existir (não faz parte do schema)
  const cleaned = { ...signals };
  delete cleaned.is_agency;
  
  // Remover duplicados de agency_keywords
  const agencyKeywords = normalizeArray(cleaned.agency_keywords || [])
    .map(k => normalizeString(k))
    .filter(k => k !== '');
  const uniqueKeywords = [...new Set(agencyKeywords)];
  
  return {
    watermark: normalizeBoolean(cleaned.watermark),
    duplicate: normalizeBoolean(cleaned.duplicate),
    professional_photos: normalizeBoolean(cleaned.professional_photos),
    agency_keywords: uniqueKeywords
  };
}

/**
 * Normaliza objeto final do anúncio
 * Garante que respeita exatamente o schema FSBO
 */
function normalizeFinalObject(data) {
  console.log('[FinalNormalizer] 🔍 Normalizando objeto final...');
  
  // Criar objeto base com todas as chaves obrigatórias
  const normalized = {
    source: normalizeString(data.source),
    ad_id: normalizeString(data.ad_id),
    url: normalizeString(data.url),
    published_date: normalizeString(data.published_date), // ISO string ou ""
    updated_date: normalizeString(data.updated_date), // ISO string ou ""
    timestamp: normalizeString(data.timestamp || new Date().toISOString()), // Sempre ISO string
    days_online: normalizeNumber(data.days_online), // String normalizada ou ""
    title: normalizeString(data.title),
    description: normalizeString(data.description),
    location: normalizeLocation(data.location),
    price: normalizeNumber(data.price), // String normalizada ou ""
    property: normalizeProperty(data.property),
    features: normalizeArray(data.features).map(f => normalizeString(f)),
    photos: normalizeArray(data.photos).map(p => normalizeString(p)),
    advertiser: normalizeAdvertiser(data.advertiser),
    signals: normalizeSignals(data.signals)
  };
  
  // Remover qualquer campo extra que não esteja no schema
  const schemaKeys = [
    'source', 'ad_id', 'url', 'published_date', 'updated_date', 'timestamp',
    'days_online', 'title', 'description', 'location', 'price', 'property',
    'features', 'photos', 'advertiser', 'signals'
  ];
  
  const final = {};
  for (const key of schemaKeys) {
    if (normalized.hasOwnProperty(key)) {
      final[key] = normalized[key];
    }
  }
  
  // Garantir que signals não tem is_agency (deve estar apenas em advertiser)
  if (final.signals && final.signals.hasOwnProperty('is_agency')) {
    delete final.signals.is_agency;
  }
  
  console.log('[FinalNormalizer] ✅ Objeto final normalizado');
  
  return final;
}

/**
 * Valida que o objeto respeita o schema FSBO
 * @param {Object} data - Objeto a validar
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateSchema(data) {
  const errors = [];
  
  // Chaves de 1º nível obrigatórias
  const topLevelKeys = [
    'source', 'ad_id', 'url', 'published_date', 'updated_date', 'timestamp',
    'days_online', 'title', 'description', 'location', 'price', 'property',
    'features', 'photos', 'advertiser', 'signals'
  ];
  
  for (const key of topLevelKeys) {
    if (!data.hasOwnProperty(key)) {
      errors.push(`Campo obrigatório ausente: ${key}`);
    }
  }
  
  // Verificar tipos de campos críticos
  if (data.features && !Array.isArray(data.features)) {
    errors.push('features deve ser array');
  }
  if (data.photos && !Array.isArray(data.photos)) {
    errors.push('photos deve ser array');
  }
  if (data.location && typeof data.location !== 'object') {
    errors.push('location deve ser objeto');
  }
  if (data.property && typeof data.property !== 'object') {
    errors.push('property deve ser objeto');
  }
  if (data.advertiser && typeof data.advertiser !== 'object') {
    errors.push('advertiser deve ser objeto');
  }
  if (data.signals && typeof data.signals !== 'object') {
    errors.push('signals deve ser objeto');
  }
  
  // Verificar location
  if (data.location) {
    const locationKeys = ['district', 'municipality', 'parish', 'lat', 'lng'];
    for (const key of locationKeys) {
      if (!data.location.hasOwnProperty(key)) {
        errors.push(`location.${key} ausente`);
      }
    }
  }
  
  // Verificar property
  if (data.property) {
    const propertyKeys = ['type', 'tipology', 'area_total', 'area_useful', 'year', 'floor', 'condition'];
    for (const key of propertyKeys) {
      if (!data.property.hasOwnProperty(key)) {
        errors.push(`property.${key} ausente`);
      }
    }
  }
  
  // Verificar advertiser
  if (data.advertiser) {
    const advertiserKeys = ['name', 'total_ads', 'is_agency', 'url'];
    for (const key of advertiserKeys) {
      if (!data.advertiser.hasOwnProperty(key)) {
        errors.push(`advertiser.${key} ausente`);
      }
    }
    if (typeof data.advertiser.is_agency !== 'boolean') {
      errors.push('advertiser.is_agency deve ser boolean');
    }
  }
  
  // Verificar signals
  if (data.signals) {
    const signalsKeys = ['watermark', 'duplicate', 'professional_photos', 'agency_keywords'];
    for (const key of signalsKeys) {
      if (!data.signals.hasOwnProperty(key)) {
        errors.push(`signals.${key} ausente`);
      }
    }
    if (typeof data.signals.watermark !== 'boolean') {
      errors.push('signals.watermark deve ser boolean');
    }
    if (typeof data.signals.duplicate !== 'boolean') {
      errors.push('signals.duplicate deve ser boolean');
    }
    if (typeof data.signals.professional_photos !== 'boolean') {
      errors.push('signals.professional_photos deve ser boolean');
    }
    if (!Array.isArray(data.signals.agency_keywords)) {
      errors.push('signals.agency_keywords deve ser array');
    }
    // Verificar que is_agency NÃO existe em signals
    if (data.signals.hasOwnProperty('is_agency')) {
      errors.push('signals.is_agency não deve existir (deve estar apenas em advertiser.is_agency)');
    }
  }
  
  // Verificar que não há campos extra
  const allowedKeys = new Set(topLevelKeys);
  for (const key in data) {
    if (!allowedKeys.has(key)) {
      errors.push(`Campo extra não permitido: ${key}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  normalizeFinalObject,
  validateSchema,
  normalizeString,
  normalizeNumber,
  normalizeBoolean,
  normalizeArray
};

