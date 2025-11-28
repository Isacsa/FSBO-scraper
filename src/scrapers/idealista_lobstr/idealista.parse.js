/**
 * Parse e complementa dados brutos do Lobstr
 * Preenche campos derivados e normaliza valores
 */

const { cleanText } = require('../../utils/selectors');

/**
 * Infere tipo de imóvel do título
 */
function inferPropertyType(title) {
  if (!title) return null;
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('apartamento') || lowerTitle.includes('apartment')) {
    return 'apartamento';
  }
  if (lowerTitle.includes('moradia') || lowerTitle.includes('villa') || lowerTitle.includes('casa')) {
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
 * Detecta se é agência baseado em keywords
 */
function detectIsAgency(title, description) {
  if (!title && !description) return false;
  
  const combinedText = `${title || ''} ${description || ''}`.toLowerCase();
  
  const agencyKeywords = [
    'imobiliária',
    'imobiliaria',
    'consultor',
    'consultora',
    'mediador',
    'mediadora',
    'gestor',
    'gestora',
    'ami',
    'remax',
    'century',
    'era',
    'properties',
    'real estate',
    'broker'
  ];
  
  const negativePhrases = [
    'não respondo a imobiliárias',
    'não aceito agências',
    'sem imobiliárias'
  ];
  
  // Verificar frases negativas primeiro
  if (negativePhrases.some(phrase => combinedText.includes(phrase))) {
    return false;
  }
  
  // Verificar keywords
  return agencyKeywords.some(keyword => combinedText.includes(keyword));
}

/**
 * Detecta keywords de agência no texto
 */
function detectAgencyKeywords(title, description) {
  if (!title && !description) return [];
  
  const combinedText = `${title || ''} ${description || ''}`.toLowerCase();
  const keywords = [];
  
  const agencyKeywords = [
    'ami',
    'consultor',
    'consultora',
    'imobiliária',
    'imobiliaria',
    'properties',
    'gestor',
    'gestora',
    'mediador',
    'mediadora',
    'remax',
    'century',
    'era'
  ];
  
  agencyKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return [...new Set(keywords)]; // Remover duplicados
}

/**
 * Detecta se foto parece profissional
 */
function detectProfessionalPhoto(imageUrl) {
  if (!imageUrl) return false;
  
  // Heurística simples: URLs de alta resolução ou CDNs profissionais
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

/**
 * Normaliza preço
 */
function normalizePrice(price, currency) {
  if (!price && price !== 0) return null;
  
  // Se já é número, converter para string
  if (typeof price === 'number') {
    return price.toString();
  }
  
  // Se é string, limpar e converter
  const cleaned = price.toString().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  
  return isNaN(numValue) ? null : numValue.toString();
}

/**
 * Parse de um result individual do Lobstr
 */
function parseLobstrResult(result) {
  const parsed = {
    // Dados diretos do Lobstr
    id: result.id || null,
    native_id: result.native_id || result.id || null,
    url: result.url || null,
    title: result.title ? cleanText(result.title) : null,
    description: result.description ? cleanText(result.description) : null,
    price: normalizePrice(result.price, result.currency),
    area: result.area ? result.area.toString() : null,
    bedrooms: result.bedrooms || null,
    floor: result.floor || null,
    main_image: result.main_image || null,
    phone: result.phone || null,
    scraping_time: result.scraping_time || null,
    
    // Dados derivados
    property_type: inferPropertyType(result.title),
    tipology: bedroomsToTipology(result.bedrooms),
    is_agency: detectIsAgency(result.title, result.description),
    agency_keywords: detectAgencyKeywords(result.title, result.description),
    professional_photos: detectProfessionalPhoto(result.main_image)
  };
  
  return parsed;
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
  detectIsAgency,
  detectAgencyKeywords,
  detectProfessionalPhoto,
  normalizePrice
};

