/**
 * Parse e normaliza dados brutos extraídos do Idealista
 * Limpa textos, normaliza formatos, extrai valores numéricos
 */

const { cleanText } = require('../../utils/selectors');

/**
 * Parse de preço
 */
function parsePrice(priceStr) {
  if (!priceStr) return null;
  
  // Remover tudo exceto números, pontos e vírgulas
  const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  
  return isNaN(numValue) ? priceStr.trim() : numValue.toString();
}

/**
 * Parse de tipologia (T2, T3+1, etc)
 */
function parseTipology(text) {
  if (!text) return null;
  
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  
  // Procurar padrão T seguido de número
  const match = cleaned.match(/T\s*(\d+)\+?(\d+)?/i);
  if (match) {
    const base = match[1];
    const extra = match[2] ? `+${match[2]}` : '';
    return `T${base}${extra}`;
  }
  
  // Procurar padrão "X quartos" ou "X assoalhadas"
  const quartosMatch = cleaned.match(/(\d+)\s*(?:quartos?|assoalhadas?)/i);
  if (quartosMatch) {
    return `T${quartosMatch[1]}`;
  }
  
  return cleaned;
}

/**
 * Parse de área (extrai número)
 */
function parseArea(areaStr) {
  if (!areaStr) return null;
  
  const match = areaStr.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    return isNaN(num) ? areaStr.trim() : num.toString();
  }
  
  // Tentar extrair apenas número
  const numMatch = areaStr.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(',', '.'));
    return isNaN(num) ? areaStr.trim() : num.toString();
  }
  
  return areaStr.trim();
}

/**
 * Parse de ano
 */
function parseYear(yearStr) {
  if (!yearStr) return null;
  
  const match = yearStr.match(/\b(19|20)\d{2}\b/);
  if (match) {
    return match[0];
  }
  
  return yearStr.trim();
}

/**
 * Parse de andar
 */
function parseFloor(floorStr) {
  if (!floorStr) return null;
  
  const cleaned = cleanText(floorStr);
  
  // Normalizar valores comuns
  const normalized = cleaned
    .toLowerCase()
    .replace(/rés\s*do\s*chão/i, '0')
    .replace(/térreo/i, '0')
    .replace(/primeiro/i, '1')
    .replace(/segundo/i, '2')
    .replace(/terceiro/i, '3')
    .replace(/quarto/i, '4')
    .replace(/quinto/i, '5');
  
  const match = normalized.match(/\d+/);
  return match ? match[0] : cleaned;
}

/**
 * Parse de localização
 * A normalização completa será feita no normalize.js usando o módulo dedicado
 */
function parseLocation(locationData) {
  if (!locationData) return { raw: null, parts: [] };
  
  let locationStr = '';
  let parts = [];
  
  if (typeof locationData === 'string') {
    locationStr = locationData;
    parts = locationData.split(',').map(p => p.trim()).filter(Boolean);
  } else if (locationData.raw) {
    locationStr = locationData.raw;
    parts = locationData.parts || [locationData.raw];
  }
  
  return {
    raw: locationStr,
    parts: parts
  };
}

/**
 * Parse de datas usando o módulo específico do Idealista
 */
const { parseIdealistaDate } = require('./dateParser');

function parseDates(dates) {
  if (!dates || typeof dates !== 'object') {
    return { published_date: null, updated_date: null };
  }
  
  const now = new Date();
  
  const published_date = dates.published ? parseIdealistaDate(dates.published, now) : null;
  const updated_date = dates.updated ? parseIdealistaDate(dates.updated, now) : null;
  
  return { published_date, updated_date };
}

/**
 * Parse de características
 * Mantém dados brutos para processamento no normalize
 */
function parseFeatures(features) {
  if (!features || typeof features !== 'object') return { _rawText: '', _rawItems: [] };
  
  // Manter dados brutos para processamento completo no normalize
  return {
    _rawText: features._rawText || '',
    _rawItems: features._rawItems || [],
    _raw: features // Manter objeto completo
  };
}

/**
 * Função principal de parsing
 */
function parseRawData(raw) {
  console.log('[Idealista Parse] 🔍 Iniciando parsing de dados...');
  
  const parsed = {
    title: raw.title ? cleanText(raw.title) : null,
    price: raw.price ? parsePrice(raw.price) : null,
    location: parseLocation(raw.location),
    coordinates: raw.coordinates || null,
    ...parseDates(raw.dates),
    advertiser: {
      name: raw.advertiser?.name ? cleanText(raw.advertiser.name) : null,
      url: raw.advertiser?.url || null,
      ami: raw.advertiser?.ami || null
    },
    description: raw.description ? cleanText(raw.description) : null,
    photos: raw.photos || [],
    features: parseFeatures(raw.features),
    ad_id: raw.ad_id || null
  };
  
  console.log('[Idealista Parse] ✅ Parsing concluído');
  
  return parsed;
}

module.exports = parseRawData;

