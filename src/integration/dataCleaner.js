/**
 * Portal-aware data cleaner for scraper output.
 * Runs BEFORE toIngestPayload — cleans raw scraper data without
 * altering any portal scraper logic.
 */

const { getDistrictForMunicipality } = require('../utils/municipalityDistrictMap');

// ─── Generic helpers ───

function trimCollapse(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\r\n]+/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
}

function toNullIfEmpty(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
}

/**
 * Parse a Portuguese-formatted price string (e.g. "1.500" or "1.500,00")
 * where dots are thousand separators and commas are decimal separators.
 */
function parsePriceNum(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Parse a standard decimal number (coordinates, areas, etc.)
 * Dots are decimal separators.
 */
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  return null;
}

function parseInt_(val) {
  const n = parseNum(val);
  return n === null ? null : Math.round(n);
}

// ─── CustoJusto cleaners ───

function cleanCustoJustoDescription(desc) {
  if (!desc || typeof desc !== 'string') return null;
  // CSS/HTML dump starts with *, ::before, or similar selectors
  if (/^\s*[*,]?\s*::?(before|after)/i.test(desc) || desc.startsWith('*,::before')) {
    // Try to extract real text after common markers
    const markers = ['Descrição', 'descricao', 'DESCRIÇÃO'];
    for (const m of markers) {
      const idx = desc.indexOf(m);
      if (idx >= 0) {
        let text = desc.slice(idx + m.length);
        // Stop at footer / "Ver Mais" markers
        const stopMarkers = ['Ver Mais', 'Ver mais', 'Contactar', 'ID do anúncio'];
        for (const stop of stopMarkers) {
          const stopIdx = text.indexOf(stop);
          if (stopIdx > 0) text = text.slice(0, stopIdx);
        }
        text = text.replace(/<[^>]*>/g, '').trim();
        if (text.length > 10) return trimCollapse(text);
      }
    }
    return null;
  }
  return trimCollapse(desc);
}

function cleanCustoJustoMunicipality(val) {
  if (!val || typeof val !== 'string') return null;
  // "Ponte de LimaFreguesiaLabruj" → "Ponte de Lima"
  const parts = val.split(/Freguesia/i);
  return toNullIfEmpty(parts[0]?.trim());
}

function cleanCustoJustoParish(val) {
  if (!val || typeof val !== 'string') return null;
  // "CambesesId do an" → "Cambeses"
  const cutPoints = ['Id do an', 'ID do an', 'id do an'];
  for (const cp of cutPoints) {
    const idx = val.indexOf(cp);
    if (idx > 0) return toNullIfEmpty(val.slice(0, idx).trim());
  }
  return toNullIfEmpty(val.trim());
}

function cleanCustoJustoFloor(val) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  if (/^r\/c$/i.test(trimmed)) return 'R/C';
  if (/^cave$/i.test(trimmed)) return 'Cave';
  // If it contains description fragments, discard
  if (trimmed.length > 10 || /[,.]/.test(trimmed)) return null;
  return toNullIfEmpty(trimmed);
}

function cleanCustoJustoFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features
    .map(f => {
      if (typeof f !== 'string') return null;
      // Split joined entries like "tipo: logiaT0Área útil150"
      if (/Área\s*útil/i.test(f)) {
        const parts = f.split(/Área\s*útil/i);
        return parts[0]?.trim() || null;
      }
      return f.trim();
    })
    .filter(f => f && f.length > 0 && f.length < 200);
}

// ─── CasaSapo cleaners ───

const CASASAPO_UI_NOISE = [
  'Partilhar', 'Contactar', 'Ver mais', 'ver mais', 'Leaflet',
  'OpenStreetMap', 'Quero ser avisado', 'comprar\n', 'Obtenha valor',
  'Imprimir', 'Guardar', 'Comparar', 'Enviar', 'Denunciar',
  'semelhantes', 'Mapa', 'Street View', 'Financiamento',
  'Simular', 'crédito', 'prestação', 'Ver mapa',
];

function cleanCasaSapoFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features.filter(f => {
    if (typeof f !== 'string') return false;
    const trimmed = f.trim();
    if (!trimmed || trimmed.length > 300) return false;
    // Filter UI noise
    for (const noise of CASASAPO_UI_NOISE) {
      if (trimmed.toLowerCase().includes(noise.toLowerCase())) return false;
    }
    // Keep entries that look like "Key: Value" or short descriptive items
    if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^:]*:\s*.+/i.test(trimmed)) return true;
    // Keep short descriptive items (e.g., "Garagem", "Piscina")
    if (trimmed.length < 80 && !/https?:/.test(trimmed)) return true;
    return false;
  });
}

function cleanCasaSapoPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.filter(p => {
    if (typeof p !== 'string') return false;
    if (p.includes('data:image')) return false;
    if (!p.startsWith('http')) return false;
    return true;
  });
}

// ─── OLX cleaners ───

const COOKIE_CONSENT_PATTERN = /Nós e os nossos parceiros tratamos os dados para fornecermos/i;

function cleanOlxTitle(title, url) {
  if (!title || typeof title !== 'string') return null;
  if (COOKIE_CONSENT_PATTERN.test(title)) {
    // Try to extract from URL
    if (url && typeof url === 'string') {
      const match = url.match(/\/d\/anuncio\/([^/]+)/);
      if (match) {
        return match[1].replace(/-/g, ' ').replace(/IDJ\w+$/i, '').trim() || null;
      }
    }
    return null;
  }
  return toNullIfEmpty(title.trim());
}

function detectOlxCrossPlatform(item) {
  if (!item.url || typeof item.url !== 'string') return false;
  return !item.url.includes('olx.pt');
}

// ─── Imovirtual cleaners ───

function cleanImovirtualPropertyType(type, tipology) {
  if (!type || typeof type !== 'string') return null;
  const t = type.toLowerCase().trim();
  const tip = (tipology || '').trim();
  // If tipology starts with "T" (T0-T9) and type is "garagem", re-infer
  if (t === 'garagem' && /^T\d/i.test(tip)) {
    return 'apartamento';
  }
  return t;
}

function cleanImovirtualYear(year) {
  const y = parseInt_(year);
  if (y === null) return null;
  const currentYear = new Date().getFullYear();
  if (y > currentYear) return null;
  if (y < 1800) return null;
  return y;
}

function cleanImovirtualFloor(floor) {
  if (!floor || typeof floor !== 'string') return null;
  const trimmed = floor.trim();
  // "andar:: 1" → "1"
  const andarMatch = trimmed.match(/andar\s*:+\s*(\d+)/i);
  if (andarMatch) return andarMatch[1];
  // "4º andar" → "4"
  const nthMatch = trimmed.match(/^(\d+)\s*[ºª°]\s*(andar)?/i);
  if (nthMatch) return nthMatch[1];
  // "R/C" variants
  if (/^r\/?c$/i.test(trimmed)) return 'R/C';
  // Plain number
  if (/^\d+$/.test(trimmed)) return trimmed;
  // Cave
  if (/^cave$/i.test(trimmed)) return 'Cave';
  return toNullIfEmpty(trimmed);
}

// ─── Area extraction from description ───

/**
 * Extract area from description text when structured data is missing.
 * Portuguese patterns: "120m2", "120 m²", "área 120", "120 metros quadrados",
 * "área útil: 80m2", "120m2 de área útil"
 *
 * Returns { area: number, source: 'description' } or null.
 */
function extractAreaFromDescription(description) {
  if (!description || typeof description !== 'string') return null;

  // Patterns ordered from most specific to least specific
  const patterns = [
    // "área útil: 80m2" / "área útil de 80 m²"
    /[aá]rea\s*[uú]til\s*(?:de\s*|:\s*)?(\d{2,4})\s*m[²2]/i,
    // "80m2 de área útil"
    /(\d{2,4})\s*m[²2]\s*(?:de\s*)?[aá]rea\s*[uú]til/i,
    // "área total: 120m2" / "área total de 120 m²"
    /[aá]rea\s*(?:total|bruta)\s*(?:de\s*|:\s*)?(\d{2,4})\s*m[²2]/i,
    // "120m2 de área" / "120 m² de área"
    /(\d{2,4})\s*m[²2]\s*(?:de\s*)?[aá]rea/i,
    // "área de 120m2" / "área: 120 m²"
    /[aá]rea\s*(?:de\s*|:\s*)?(\d{2,4})\s*m[²2]/i,
    // "120m2" / "120 m²" / "120m²" (standalone — no \b after ² since it's non-ASCII)
    /\b(\d{2,4})\s*m[²2](?:\b|(?=[^a-zA-Z0-9²])|\s|$)/i,
    // "120 metros quadrados"
    /(\d{2,4})\s*metros?\s*quadrados?/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const area = parseInt(match[1], 10);
      // Validate range: 10-5000 m² (reject outliers)
      if (area >= 10 && area <= 5000) {
        return { area, source: 'description' };
      }
    }
  }

  return null;
}

// ─── Universal cleaners ───

function cleanDescription(desc) {
  if (!desc || typeof desc !== 'string') return null;
  // Strip any remaining HTML tags
  let cleaned = desc.replace(/<[^>]*>/g, ' ');
  cleaned = trimCollapse(cleaned);
  return toNullIfEmpty(cleaned);
}

function coerceStringsToNative(item) {
  const result = { ...item };

  // Prices use Portuguese format (dots as thousand separators)
  result.price = (() => { const n = parsePriceNum(result.price); return n === null ? null : Math.round(n); })();
  result.fsbo_score = (() => { const n = parseNum(result.fsbo_score); return n === null ? null : Math.round(n); })();
  result.days_online = parseInt_(result.days_online);

  // Location
  if (result.location) {
    result.location = { ...result.location };
    result.location.lat = parseNum(result.location.lat);
    result.location.lng = parseNum(result.location.lng);
    result.location.district = toNullIfEmpty(result.location.district);
    result.location.municipality = toNullIfEmpty(result.location.municipality);
    result.location.parish = toNullIfEmpty(result.location.parish);
  }

  // Property
  if (result.property) {
    result.property = { ...result.property };
    result.property.area_total = parseInt_(result.property.area_total);
    result.property.area_useful = parseInt_(result.property.area_useful);
    result.property.year = parseInt_(result.property.year);
    result.property.type = toNullIfEmpty(result.property.type);
    result.property.tipology = toNullIfEmpty(result.property.tipology);
    result.property.floor = toNullIfEmpty(result.property.floor);
    result.property.condition = toNullIfEmpty(result.property.condition);
  }

  // Advertiser
  if (result.advertiser) {
    result.advertiser = { ...result.advertiser };
    result.advertiser.name = toNullIfEmpty(result.advertiser.name);
    result.advertiser.url = toNullIfEmpty(result.advertiser.url);
  }

  // String fields
  result.title = toNullIfEmpty(result.title);
  result.description = toNullIfEmpty(result.description);
  result.url = toNullIfEmpty(result.url);
  result.ad_id = toNullIfEmpty(result.ad_id);

  return result;
}

// ─── Bathroom extraction ───

/**
 * Extract number of bathrooms from features array.
 * Handles Portuguese patterns: "Casas de Banho: 2", "2 casas de banho", "WC: 1".
 *
 * @param {string[]} features
 * @returns {number|null}
 */
function extractBathroomsFromFeatures(features) {
  if (!Array.isArray(features)) return null;
  const text = features.join(' ');

  const patterns = [
    /Casas?\s+de\s+Banho[:\s]+(\d+)/i,
    /(\d+)\s+casas?\s+de\s+banho/i,
    /wc[:\s]+(\d+)/i,
    /(\d+)\s+wc/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 10) return num;
    }
  }

  return null;
}

// ─── Main entry point ───

/**
 * Clean a single scraper item based on its source portal.
 * Does NOT alter scrapers — runs as a post-processing step.
 *
 * @param {Object} item - raw scraper output item
 * @param {string} source - portal name (olx, custojusto, casasapo, imovirtual, idealista)
 * @returns {Object} cleaned item
 */
function cleanItem(item, source) {
  let result = { ...item };
  const src = (source || '').toLowerCase();

  // Portal-specific cleaning
  switch (src) {
    case 'custojusto': {
      result.description = cleanCustoJustoDescription(result.description);
      if (result.location) {
        result.location = { ...result.location };
        result.location.municipality = cleanCustoJustoMunicipality(result.location.municipality);
        result.location.parish = cleanCustoJustoParish(result.location.parish);
      }
      if (result.property) {
        result.property = { ...result.property };
        result.property.floor = cleanCustoJustoFloor(result.property.floor);
      }
      result.features = cleanCustoJustoFeatures(result.features);
      break;
    }
    case 'casasapo': {
      result.features = cleanCasaSapoFeatures(result.features);
      result.photos = cleanCasaSapoPhotos(result.photos);
      break;
    }
    case 'olx': {
      result.title = cleanOlxTitle(result.title, result.url);
      result._cross_platform = detectOlxCrossPlatform(result);
      break;
    }
    case 'imovirtual': {
      if (result.property) {
        result.property = { ...result.property };
        result.property.type = cleanImovirtualPropertyType(
          result.property.type,
          result.property.tipology,
        );
        result.property.year = cleanImovirtualYear(result.property.year);
        result.property.floor = cleanImovirtualFloor(result.property.floor);
      }
      break;
    }
    // idealista and others: no portal-specific cleaning needed
  }

  // Universal cleaning
  result.description = cleanDescription(result.description);

  // Extract area from description when structured data is missing
  if (result.property) {
    const hasAreaTotal = result.property.area_total && result.property.area_total !== '' && result.property.area_total !== '0';
    const hasAreaUseful = result.property.area_useful && result.property.area_useful !== '' && result.property.area_useful !== '0';
    if (!hasAreaTotal && !hasAreaUseful) {
      const extracted = extractAreaFromDescription(result.description);
      if (extracted) {
        result.property = { ...result.property };
        result.property.area_useful = String(extracted.area);
        result.property._area_source = extracted.source;
      }
    }
  }

  // Infer district from municipality when missing (any portal)
  if (result.location) {
    const dist = result.location.district;
    const mun = result.location.municipality;
    if ((!dist || (typeof dist === 'string' && dist.trim() === '')) && mun && typeof mun === 'string' && mun.trim()) {
      const inferred = getDistrictForMunicipality(mun);
      if (inferred) {
        result.location = { ...result.location, district: inferred };
      }
    }
  }

  result = coerceStringsToNative(result);

  // Extract bathrooms from features[] when not already present
  if (result.property && !result.property.bathrooms) {
    const extracted = extractBathroomsFromFeatures(result.features);
    if (extracted !== null) {
      result.property = { ...result.property, bathrooms: extracted };
    }
  }

  return result;
}

module.exports = {
  cleanItem,
  // Exported for testing
  cleanCustoJustoDescription,
  cleanCustoJustoMunicipality,
  cleanCustoJustoParish,
  cleanCustoJustoFloor,
  cleanCustoJustoFeatures,
  cleanCasaSapoFeatures,
  cleanCasaSapoPhotos,
  cleanOlxTitle,
  cleanImovirtualPropertyType,
  cleanImovirtualYear,
  cleanImovirtualFloor,
  coerceStringsToNative,
  extractAreaFromDescription,
  extractBathroomsFromFeatures,
};
