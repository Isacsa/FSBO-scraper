/**
 * Normalização para formato JSON final
 */

const { normalizeLocation } = require('../../utils/locationNormalizer');
const { analyzeFsboSignals } = require('../../services/fsboSignals');

/**
 * Calcula dias online
 */
function calculateDaysOnline(publishedDate) {
  if (!publishedDate) return null;
  try {
    const published = new Date(publishedDate);
    const now = new Date();
    const diffTime = Math.abs(now - published);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  } catch (error) {
    return null;
  }
}

/**
 * Parse de datas do Casa Sapo (ex: "há mais de um mês", "há 2 dias")
 */
function parseCasaSapoDate(dateStr) {
  if (!dateStr) return null;
  
  const cleaned = dateStr.toLowerCase().trim();
  const now = new Date();
  
  // "há X dias"
  const diasMatch = cleaned.match(/há\s+(\d+)\s+dia/i);
  if (diasMatch) {
    const days = parseInt(diasMatch[1]);
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
  
  // "há mais de um mês" ou "há X meses"
  const mesesMatch = cleaned.match(/há\s+(?:mais\s+de\s+)?(\d+)?\s*m[êe]s/i);
  if (mesesMatch) {
    const months = parseInt(mesesMatch[1] || '1');
    const date = new Date(now);
    date.setMonth(date.getMonth() - months);
    return date.toISOString();
  }
  
  // "há X semanas"
  const semanasMatch = cleaned.match(/há\s+(\d+)\s+semana/i);
  if (semanasMatch) {
    const weeks = parseInt(semanasMatch[1]);
    const date = new Date(now);
    date.setDate(date.getDate() - (weeks * 7));
    return date.toISOString();
  }
  
  // Data completa DD/MM/YYYY ou DD-MM-YYYY
  const dateMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  return null;
}

/**
 * Normaliza um anúncio para formato JSON final
 */
async function normalizeAd(parsed, options = {}) {
  const now = new Date().toISOString();
  
  // Normalizar localização
  let location = {
    district: null,
    municipality: null,
    parish: null,
    lat: null,
    lng: null
  };
  
  if (parsed.location_text) {
    try {
      location = await normalizeLocation(parsed.location_text);
    } catch (e) {
      console.warn('[CasaSapo Normalize] ⚠️  Erro ao normalizar localização:', e.message);
    }
  }
  
  // Extrair tipo e tipologia
  let propertyType = null;
  let tipology = null;
  
  const combinedText = `${parsed.title || ''} ${parsed.description || ''}`.toLowerCase();
  
  // Determinar tipo
  if (combinedText.includes('apartamento')) {
    propertyType = 'apartamento';
  } else if (combinedText.includes('moradia') || combinedText.includes('casa') || combinedText.includes('villa')) {
    propertyType = 'moradia';
  } else if (combinedText.includes('terreno')) {
    propertyType = 'terreno';
  } else if (combinedText.includes('loja')) {
    propertyType = 'loja';
  } else if (combinedText.includes('escritório') || combinedText.includes('escritorio')) {
    propertyType = 'escritório';
  }
  
  // Extrair tipologia
  const tipologyMatch = combinedText.match(/t([0-9]+)/i);
  if (tipologyMatch) {
    tipology = `T${tipologyMatch[1]}`;
  }
  
  // Extrair áreas das specifications primeiro, depois das features
  let area_total = null;
  let area_useful = null;
  let year = null;
  let floor = null;
  let condition = null;
  
  // Usar specifications se disponível
  if (parsed.specifications && Object.keys(parsed.specifications).length > 0) {
    const specs = parsed.specifications;
    
    // Área útil
    if (specs['área útil'] || specs['area util']) {
      const match = (specs['área útil'] || specs['area util']).match(/(\d+)/);
      if (match) area_useful = match[1];
    }
    
    // Área total/bruta
    if (specs['área bruta'] || specs['area bruta'] || specs['área total'] || specs['area total']) {
      const match = (specs['área bruta'] || specs['area bruta'] || specs['área total'] || specs['area total']).match(/(\d+)/);
      if (match) area_total = match[1];
    }
    
    // Ano
    if (specs['ano'] || specs['ano de construção']) {
      const match = (specs['ano'] || specs['ano de construção']).match(/(\d{4})/);
      if (match && parseInt(match[1]) >= 1850 && parseInt(match[1]) <= new Date().getFullYear()) {
        year = match[1];
      }
    }
    
    // Piso
    if (specs['piso'] || specs['andar']) {
      floor = (specs['piso'] || specs['andar']).trim();
    }
    
    // Condição
    if (specs['estado'] || specs['condição'] || specs['condicao']) {
      condition = (specs['estado'] || specs['condição'] || specs['condicao']).trim();
    }
  }
  
  // Fallback: extrair das features
  parsed.features.forEach(feature => {
    const lowerFeature = feature.toLowerCase();
    
    // Área útil
    if (!area_useful) {
      const areaUtilMatch = feature.match(/área\s+útil[:\s]*(\d+)/i);
      if (areaUtilMatch) {
        area_useful = areaUtilMatch[1];
      }
    }
    
    // Área total/bruta
    if (!area_total) {
      const areaTotalMatch = feature.match(/área\s+(?:total|bruta|de\s+construção)[:\s]*(\d+)/i);
      if (areaTotalMatch) {
        area_total = areaTotalMatch[1];
      }
    }
    
    // Ano
    if (!year) {
      const anoMatch = feature.match(/ano[:\s]*(\d{4})/i);
      if (anoMatch && parseInt(anoMatch[1]) >= 1850 && parseInt(anoMatch[1]) <= new Date().getFullYear()) {
        year = anoMatch[1];
      }
    }
    
    // Piso
    if (!floor && (lowerFeature.includes('piso') || lowerFeature.includes('andar'))) {
      const pisoMatch = feature.match(/(?:piso|andar)[:\s]*([^\n]+)/i);
      if (pisoMatch) {
        floor = pisoMatch[1].trim();
      }
    }
    
    // Condição
    if (!condition && (lowerFeature.includes('estado') || lowerFeature.includes('condição'))) {
      const condMatch = feature.match(/(?:estado|condição)[:\s]*([^\n]+)/i);
      if (condMatch) {
        condition = condMatch[1].trim();
      }
    }
  });
  
  // Parsear datas
  let published_date = null;
  let updated_date = null;
  let days_online = null;
  
  if (parsed.published_date) {
    published_date = parseCasaSapoDate(parsed.published_date);
    if (published_date) {
      days_online = calculateDaysOnline(published_date);
    }
  }
  
  if (parsed.updated_date) {
    updated_date = parseCasaSapoDate(parsed.updated_date);
  }
  
  // Detectar se é agência
  const isAgency = parsed.advertiser_name ? 
    /(ami|consultor|gestor|imobiliária|imobiliaria|properties|real\s+estate)/i.test(parsed.advertiser_name) : false;
  
  // FSBO Signals
  const signals = analyzeFsboSignals({
    title: parsed.title,
    description: parsed.description,
    photos: parsed.photos,
    advertiser: {
      name: parsed.advertiser_name,
      is_agency: isAgency
    }
  });
  
  // Montar objeto final
  const normalized = {
    source: 'casasapo',
    ad_id: parsed.ad_id || null,
    url: parsed.url || null,
    published_date: published_date,
    updated_date: updated_date,
    timestamp: now,
    days_online: days_online !== null ? days_online.toString() : null,
    title: parsed.title || null,
    description: parsed.description || null,
    location: location,
    price: parsed.price || null,
    property: {
      type: propertyType,
      tipology: tipology,
      area_total: area_total,
      area_useful: area_useful,
      year: year,
      floor: floor,
      condition: condition
    },
    features: parsed.features.filter(f => {
      // Filtrar features muito curtas ou muito longas
      if (!f || f.length < 3 || f.length > 200) return false;
      const lower = f.toLowerCase();
      // Remover features de navegação/UI/footer
      if (lower.includes('pesquisa') || lower.includes('favoritos') || 
          lower.includes('anunciar') || lower.includes('mensagens') ||
          lower.includes('login') || lower.includes('sobre') ||
          lower.includes('publicado em') || lower.includes('há mais') ||
          lower.includes('visualizações') || lower.includes('cliques') ||
          lower.includes('referência') || lower.includes('certificação') ||
          lower.includes('pt portugal') || lower.includes('reino unido') ||
          lower.includes('gerir') || lower.includes('casasapo notícias') ||
          lower.includes('como divulgar') || lower.includes('profissionais') ||
          lower.includes('imobiliárias') || lower.includes('entrar na área') ||
          lower.includes('facebook') || lower.includes('barómetro') ||
          lower.includes('nrau') || lower.includes('reforma') ||
          lower.includes('quartos') || lower.includes('casas de férias') ||
          lower.includes('espanha') || lower.includes('brasil') ||
          lower.includes('angola') || lower.includes('cabo verde') ||
          lower.includes('moçambique') || lower.includes('quem somos') ||
          lower.includes('netbox') || lower.includes('imóveis') ||
          lower.includes('contacte-nos') || lower.includes('política') ||
          lower.includes('cookies') || lower.includes('emprego') ||
          lower.match(/^[a-z]{2}\s/)) { // Códigos de país (ex: "PT Portugal")
        return false;
      }
      return true;
    }),
    photos: parsed.photos,
    advertiser: {
      name: parsed.advertiser_name || 'Particular',
      total_ads: null,
      is_agency: isAgency,
      url: null,
      phone: parsed.phone || null
    },
    signals: {
      ...signals,
      is_fsbo: !isAgency && signals.is_fsbo !== false
    }
  };
  
  return normalized;
}

/**
 * Normaliza múltiplos anúncios
 */
async function normalizeAds(parsedAds, options = {}) {
  console.log('[CasaSapo Normalize] 🔍 Normalizando anúncios...');
  
  const normalized = [];
  
  for (const parsed of parsedAds) {
    try {
      const normalizedAd = await normalizeAd(parsed, options);
      normalized.push(normalizedAd);
    } catch (error) {
      console.error('[CasaSapo Normalize] ❌ Erro ao normalizar anúncio:', error.message);
      // Continuar com próximo
    }
  }
  
  console.log(`[CasaSapo Normalize] ✅ Normalização concluída: ${normalized.length} anúncios`);
  
  return normalized;
}

module.exports = {
  normalizeAd,
  normalizeAds
};

