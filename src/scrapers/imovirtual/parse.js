/**
 * Parse e normaliza dados brutos extraídos do Imovirtual
 * Limpa textos, normaliza formatos, extrai valores numéricos
 */

const { cleanText } = require('../../utils/selectors');

// Reutilizar funções de parsing do OLX (podem ser compartilhadas)
function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  return isNaN(numValue) ? priceStr.trim() : numValue.toString();
}

function parseTipology(text) {
  if (!text) return null;
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  const match = cleaned.match(/T\s*(\d+)\+?(\d+)?/i);
  if (match) {
    const base = match[1];
    const extra = match[2] ? `+${match[2]}` : '';
    return `T${base}${extra}`;
  }
  return cleaned;
}

function parseArea(areaStr) {
  if (!areaStr) return null;
  const match = areaStr.match(/(\d+(?:[.,]\d+)?)\s*m²/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    return isNaN(num) ? areaStr.trim() : num.toString();
  }
  return areaStr.trim();
}

function parseYear(yearStr) {
  if (!yearStr) return null;
  const match = yearStr.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : yearStr.trim();
}

function parseFloor(floorStr) {
  if (!floorStr) return null;
  const cleaned = cleanText(floorStr);
  const normalized = cleaned.toLowerCase()
    .replace(/rés\s*do\s*chão/i, '0')
    .replace(/térreo/i, '0')
    .replace(/primeiro/i, '1')
    .replace(/segundo/i, '2')
    .replace(/terceiro/i, '3');
  const match = normalized.match(/\d+/);
  return match ? match[0] : cleaned;
}

function parseLocation(locationData) {
  if (!locationData) return { district: null, municipality: null, parish: null };
  let locationStr = '';
  let parts = [];
  if (typeof locationData === 'string') {
    locationStr = locationData;
    parts = locationData.split(',').map(p => p.trim());
  } else if (locationData.raw) {
    locationStr = locationData.raw;
    parts = locationData.parts || [locationData.raw];
  }
  // Imovirtual geralmente: Freguesia, Concelho, Distrito
  const district = parts.length >= 3 ? parts[parts.length - 1] : null;
  const municipality = parts.length >= 2 ? parts[parts.length - 2] : null;
  const parish = parts.length >= 1 ? parts[0] : null;
  return { district, municipality, parish, raw: locationStr };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = cleanText(dateStr);
  if (!cleaned) return null;
  const now = new Date();
  if (cleaned.toLowerCase().includes('hoje')) return now.toISOString();
  if (cleaned.toLowerCase().includes('ontem')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }
  const dateMatch = cleaned.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  return cleaned;
}

function parseFeatures(features) {
  if (!features || typeof features !== 'object') return { _rawText: '' };
  
  // Manter dados brutos para processamento completo no normalize
  return {
    _rawText: features._rawText || '',
    _raw: features // Manter objeto completo
  };
}

function parseRawData(raw) {
  console.log('[Imovirtual Parse] 🔍 Iniciando parsing de dados...');
  const parsed = {
    title: raw.title ? cleanText(raw.title) : null,
    price: raw.price ? parsePrice(raw.price) : null,
    location: parseLocation(raw.location),
    coordinates: raw.coordinates || null,
    published_date: raw.published_date ? parseDate(raw.published_date) : null,
    updated_date: raw.updated_date ? parseDate(raw.updated_date) : null,
    advertiser: {
      name: raw.advertiser?.name ? cleanText(raw.advertiser.name) : null,
      url: raw.advertiser?.url || null
    },
    description: raw.description ? cleanText(raw.description) : null,
    photos: raw.photos || [],
    features: parseFeatures(raw.features),
    ad_id: raw.ad_id || null
  };
  console.log('[Imovirtual Parse] ✅ Parsing concluído');
  return parsed;
}

module.exports = parseRawData;

