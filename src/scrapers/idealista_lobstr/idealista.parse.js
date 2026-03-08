/**
 * Parse e complementa dados brutos do Lobstr
 * com classificação híbrida FSBO específica para Idealista.
 */

const { cleanText } = require('../../utils/selectors');

const AGENCY_KEYWORDS = [
  'ami',
  'consultor',
  'consultora',
  'imobiliaria',
  'imobiliaria',
  'properties',
  'gestor',
  'gestora',
  'mediador',
  'mediadora',
  'remax',
  'century',
  'era',
  'real estate',
  'broker',
  'agency'
];

const STRONG_AGENCY_KEYWORDS = new Set([
  'ami',
  'remax',
  'century',
  'era',
  'real estate',
  'broker',
  'agency'
]);

const ANTI_AGENCY_PHRASES = [
  'nao respondo a imobiliarias',
  'nao aceito agencias',
  'sem imobiliarias',
  'sem agencias',
  'no agencies',
  'without agencies',
  'nao pretendo mediacao',
  'nao quero mediadores'
];

const OWNER_DIRECT_PHRASES = [
  'particular',
  'particular a particular',
  'proprietario',
  'proprietaria',
  'owner direct',
  'direct from owner',
  'sale by owner',
  'for sale by owner',
  'trata o proprio',
  'sem intermediarios'
];

const PROFESSIONAL_PATTERNS = [
  /ami[:\s]*\d+/i,
  /ref[:\s]+[\w\d-]+/i,
  /consultor\s+imobili/i,
  /mediador\s+imobili/i,
  /real\s+estate/i,
  /broker/i
];

function normalizeForMatch(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchConfiguredPhrases(text, phrases) {
  return phrases.filter(phrase => text.includes(phrase));
}

/**
 * Infere tipo de imóvel do título
 */
function inferPropertyType(title) {
  if (!title) return null;
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('apartamento') || lowerTitle.includes('apartment') || lowerTitle.includes('flat')) {
    return 'apartamento';
  }
  if (lowerTitle.includes('moradia') || lowerTitle.includes('villa') || lowerTitle.includes('casa') || lowerTitle.includes('house')) {
    return 'moradia';
  }
  if (lowerTitle.includes('terreno') || lowerTitle.includes('land')) {
    return 'terreno';
  }
  if (lowerTitle.includes('loja') || lowerTitle.includes('shop')) {
    return 'loja';
  }
  if (lowerTitle.includes('escritório') || lowerTitle.includes('office')) {
    return 'escritório';
  }
  if (lowerTitle.includes('garagem') || lowerTitle.includes('garage')) {
    return 'garagem';
  }
  
  return null;
}

/**
 * Converte bedrooms para tipologia
 */
function bedroomsToTipology(bedrooms) {
  if (!bedrooms && bedrooms !== 0) return null;
  
  const num = parseInt(bedrooms, 10);
  if (isNaN(num)) return null;
  
  if (num === 0) return 'T0';
  if (num === 1) return 'T1';
  if (num === 2) return 'T2';
  if (num === 3) return 'T3';
  if (num === 4) return 'T4';
  if (num >= 5) return 'T5+';
  
  return null;
}

function detectAgencyKeywords(title, description) {
  const combinedText = normalizeForMatch(`${title || ''} ${description || ''}`);
  if (!combinedText) return [];

  const keywords = [];
  for (const keyword of AGENCY_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return [...new Set(keywords)];
}

/**
 * Detecta se foto parece profissional
 */
function detectProfessionalPhoto(imageUrl) {
  if (!imageUrl) return false;
  
  const professionalIndicators = [
    'width=1920',
    'width=2048',
    'resolution',
    'high-res',
    'professional'
  ];
  
  const lowerUrl = imageUrl.toLowerCase();
  return professionalIndicators.some(indicator => lowerUrl.includes(indicator));
}

function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('351') && digits.length > 9) {
    digits = digits.slice(3);
  }
  return digits || null;
}

function analyzePhoneSignal(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return {
      normalized_phone: null,
      phone_signal: 'missing',
      fsbo_points: 0,
      agency_points: 0,
      evidence: []
    };
  }

  if (/^96\d{7}$/.test(normalizedPhone)) {
    return {
      normalized_phone: normalizedPhone,
      phone_signal: 'mobile_prefix_96',
      fsbo_points: 3,
      agency_points: 0,
      evidence: ['phone_mobile_prefix_96']
    };
  }

  if (/^(91|92|93)\d{7}$/.test(normalizedPhone)) {
    return {
      normalized_phone: normalizedPhone,
      phone_signal: 'mobile_prefix_general',
      fsbo_points: 2,
      agency_points: 0,
      evidence: ['phone_mobile_prefix_general']
    };
  }

  if (/^2\d{8}$/.test(normalizedPhone)) {
    return {
      normalized_phone: normalizedPhone,
      phone_signal: 'landline_prefix',
      fsbo_points: 0,
      agency_points: 1,
      evidence: ['phone_landline_prefix']
    };
  }

  if (/^(707|708|808|809|30)\d+/.test(normalizedPhone)) {
    return {
      normalized_phone: normalizedPhone,
      phone_signal: 'service_or_business_prefix',
      fsbo_points: 0,
      agency_points: 2,
      evidence: ['phone_service_or_business_prefix']
    };
  }

  return {
    normalized_phone: normalizedPhone,
    phone_signal: 'unknown_prefix',
    fsbo_points: 0,
    agency_points: 0,
    evidence: []
  };
}

function classifyIdealistaFsbo({ title, description, phone, mainImage }) {
  const cleanedTitle = cleanText(title);
  const cleanedDescription = cleanText(description);
  const normalizedText = normalizeForMatch(`${cleanedTitle || ''} ${cleanedDescription || ''}`);

  const agencyKeywords = detectAgencyKeywords(cleanedTitle, cleanedDescription);
  const antiAgencyPhrases = matchConfiguredPhrases(normalizedText, ANTI_AGENCY_PHRASES);
  const ownerDirectPhrases = matchConfiguredPhrases(normalizedText, OWNER_DIRECT_PHRASES);
  const professionalPatternMatches = PROFESSIONAL_PATTERNS
    .filter(pattern => pattern.test(normalizedText))
    .map(pattern => pattern.source);
  const professionalPhotos = detectProfessionalPhoto(mainImage);
  const phoneSignal = analyzePhoneSignal(phone);

  let agencyScore = phoneSignal.agency_points;
  let fsboScore = phoneSignal.fsbo_points;
  const evidence = [...phoneSignal.evidence];

  for (const keyword of agencyKeywords) {
    agencyScore += STRONG_AGENCY_KEYWORDS.has(keyword) ? 3 : 2;
    evidence.push(`agency_keyword:${keyword}`);
  }

  if (antiAgencyPhrases.length > 0) {
    fsboScore += 4;
    antiAgencyPhrases.forEach(phrase => evidence.push(`anti_agency_phrase:${phrase}`));
  }

  if (ownerDirectPhrases.length > 0) {
    fsboScore += 2;
    ownerDirectPhrases.forEach(phrase => evidence.push(`owner_direct_phrase:${phrase}`));
  }

  if (professionalPatternMatches.length > 0) {
    agencyScore += 2;
    professionalPatternMatches.forEach(pattern => evidence.push(`professional_pattern:${pattern}`));
  }

  if (professionalPhotos) {
    agencyScore += 1;
    evidence.push('professional_photos');
  }

  let fsboDecision = 'uncertain';
  if (agencyScore >= fsboScore + 2 && agencyScore >= 3) {
    fsboDecision = 'agency';
  } else if (fsboScore >= agencyScore + 2 && fsboScore >= 3) {
    fsboDecision = 'fsbo';
  }

  return {
    fsbo_decision: fsboDecision,
    is_agency: fsboDecision === 'agency',
    agency_score: agencyScore,
    fsbo_score_signal: fsboScore,
    agency_keywords: agencyKeywords,
    anti_agency_phrases: antiAgencyPhrases,
    owner_direct_phrases: ownerDirectPhrases,
    professional_pattern_matches: professionalPatternMatches,
    professional_photos: professionalPhotos,
    phone_signal: phoneSignal.phone_signal,
    normalized_phone: phoneSignal.normalized_phone,
    fsbo_evidence: evidence
  };
}

/**
 * Normaliza preço
 */
function normalizePrice(price, currency) {
  if (!price && price !== 0) return null;
  
  if (typeof price === 'number') {
    return price.toString();
  }
  
  const cleaned = price.toString().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  
  return isNaN(numValue) ? null : numValue.toString();
}

/**
 * Parse de um result individual do Lobstr
 */
function parseLobstrResult(result) {
  const title = result.title ? cleanText(result.title) : null;
  const description = result.description ? cleanText(result.description) : null;
  const classification = classifyIdealistaFsbo({
    title,
    description,
    phone: result.phone || null,
    mainImage: result.main_image || null
  });

  return {
    id: result.id || null,
    native_id: result.native_id || result.id || null,
    url: result.url || null,
    title,
    description,
    price: normalizePrice(result.price, result.currency),
    area: result.area ? result.area.toString() : null,
    bedrooms: result.bedrooms || null,
    floor: result.floor || null,
    main_image: result.main_image || null,
    phone: result.phone || null,
    scraping_time: result.scraping_time || null,
    property_type: inferPropertyType(result.title),
    tipology: bedroomsToTipology(result.bedrooms),
    ...classification
  };
}

/**
 * Parse de todos os results
 */
function parseLobstrResults(results) {
  console.log('[Idealista Parse] 🔍 Iniciando parsing de results...');
  
  const parsed = results.map(result => parseLobstrResult(result));
  
  console.log(`[Idealista Parse] ✅ Parsing concluído: ${parsed.length} results processados`);
  
  return parsed;
}

module.exports = {
  parseLobstrResults,
  parseLobstrResult,
  inferPropertyType,
  bedroomsToTipology,
  detectAgencyKeywords,
  detectProfessionalPhoto,
  normalizePrice,
  normalizePhone,
  analyzePhoneSignal,
  classifyIdealistaFsbo
};

