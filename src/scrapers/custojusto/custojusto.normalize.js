/**
 * Normalização para formato JSON final
 */

const { normalizeLocation } = require('../../utils/locationNormalizer');
const { getDistrictForMunicipality } = require('../../utils/municipalityDistrictMap');
const { parseAdData } = require('./custojusto.parse');
const { parseCustoJustoDate } = require('./dateParser');
const { analyzeFsboSignals } = require('../../services/fsboSignals');

/**
 * Normaliza um anúncio para formato JSON final
 */
async function normalizeAd(parsed, options = {}) {
  const now = new Date().toISOString();
  const advertiserLabel = parsed.advertiser?.label || null;
  const advertiserName =
    parsed.advertiser?.name && !/^(particular|contactar|anunciante)$/i.test(parsed.advertiser.name)
      ? parsed.advertiser.name
      : null;
  const advertiserIsAgency =
    typeof advertiserLabel === 'string' && /(profissional|empresa|imobili[aá]ria|ag[eê]ncia)/i.test(advertiserLabel)
      ? true
      : null;
  
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
      location = await normalizeLocation(parsed.location_text, 'custojusto');
    } catch (e) {
      console.warn('[CustoJusto Normalize] ⚠️  Erro ao normalizar localização:', e.message);
    }
  }
  
  // Usar especificações se disponíveis
  const specs = parsed.specifications || {};
  
  // Extrair tipo e tipologia (priorizar especificações)
  let propertyType = null;
  let tipology = specs.tipologia ? specs.tipologia.replace(/[^T0-9]/g, '') : null;
  
  const combinedText = `${parsed.title || ''} ${parsed.description || ''}`.toLowerCase();
  
  // Se não tem tipologia nas specs, tentar extrair do texto
  if (!tipology) {
    const tipologyMatch = combinedText.match(/t([0-9]+)/i);
    if (tipologyMatch) {
      tipology = `T${tipologyMatch[1]}`;
    }
  }
  
  // Determinar tipo de propriedade (priorizar título)
  const titleLower = (parsed.title || '').toLowerCase();
  if (titleLower.includes('moradia') || titleLower.includes('casa') || titleLower.includes('villa')) {
    propertyType = 'moradia';
  } else if (titleLower.includes('apartamento')) {
    propertyType = 'apartamento';
  } else if (combinedText.includes('moradia') || combinedText.includes('casa')) {
    propertyType = 'moradia';
  } else if (combinedText.includes('apartamento')) {
    propertyType = 'apartamento';
  } else if (combinedText.includes('terreno')) {
    propertyType = 'terreno';
  } else if (combinedText.includes('loja')) {
    propertyType = 'loja';
  } else if (combinedText.includes('escritório') || combinedText.includes('escritorio')) {
    propertyType = 'escritório';
  }
  
  // Extrair áreas (priorizar especificações)
  let area_total = specs.area_total || specs.area_terreno || null;
  let area_useful = specs.area_util || null;
  
  // Se não tem nas specs, tentar extrair das features
  if (!area_total || !area_useful) {
    parsed.features.forEach(feature => {
      const areaMatch = feature.match(/(\d+)\s*m[²2]/i);
      if (areaMatch) {
        const area = areaMatch[1];
        if (!area_total) {
          area_total = area;
        }
        if (!area_useful && feature.toLowerCase().includes('útil')) {
          area_useful = area;
        }
      }
    });
  }
  
  // Ano, piso, condição das especificações
  const year = specs.ano || null;
  const floor = specs.piso || null;
  const condition = specs.condicao || null;
  
  // Melhorar localização usando especificações (limpar texto extra)
  if (specs.concelho || specs.freguesia) {
    // Limpar texto extra das especificações
    const concelho = specs.concelho ? specs.concelho.split(/[^\w\s-]/)[0].trim() : null;
    const freguesia = specs.freguesia ? specs.freguesia.split(/[^\w\s-]/)[0].trim() : null;
    
    if (concelho) {
      location.municipality = concelho;
    }
    if (freguesia) {
      location.parish = freguesia;
    }
    
    // Determinar distrito baseado no concelho
    if (concelho) {
      const distrito = getDistrictForMunicipality(concelho);
      if (distrito) {
        location.district = distrito;
      }
    }
  }
  
  // Processar datas
  let published_date = null;
  let updated_date = null;
  let days_online = null;
  
  // Se tem listTime (ISO string), usar diretamente
  if (parsed.listTime) {
    try {
      // listTime já vem em formato ISO UTC (ex: "2025-11-19T00:00:10Z")
      published_date = parsed.listTime;
      
      // Calcular days_online
      const listDate = new Date(parsed.listTime);
      const nowDate = new Date();
      const diffTime = nowDate - listDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        days_online = diffDays.toString();
      }
    } catch (e) {
      // Se falhar, tentar parsear como string
      published_date = parsed.listTime;
    }
  } else if (parsed.published_date) {
    // Tentar parsear a data extraída do HTML usando o dateParser
    const parsedDate = parseCustoJustoDate(parsed.published_date);
    if (parsedDate) {
      published_date = parsedDate;
    } else {
      // Se não conseguir parsear, manter o texto original
      published_date = parsed.published_date;
    }
  }
  
  if (parsed.updated_date) {
    const parsedUpdatedDate = parseCustoJustoDate(parsed.updated_date);
    if (parsedUpdatedDate) {
      updated_date = parsedUpdatedDate;
    } else {
      updated_date = parsed.updated_date;
    }
  }
  
  if (parsed.days_online) {
    days_online = parsed.days_online;
  }
  
  // Montar objeto final
  const signals = analyzeFsboSignals({
    title: parsed.title,
    description: parsed.description,
    photos: parsed.photos,
    advertiser: {
      name: advertiserName,
      is_agency: advertiserIsAgency,
      phone: parsed.phone || null,
    },
    phone: parsed.phone || null,
  }, 'custojusto');

  const normalized = {
    source: 'custojusto',
    ad_id: parsed.ad_id || null,
    url: parsed.url || null,
    published_date: published_date,
    updated_date: updated_date,
    timestamp: now,
    days_online: days_online,
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
      // Filtrar features muito curtas ou muito longas, ou que são apenas navegação
      if (!f || f.length < 3 || f.length > 200) return false;
      const lower = f.toLowerCase();
      // Remover features de navegação/UI
      if (lower.includes('pesquisa') || lower.includes('favoritos') || 
          lower.includes('anunciar') || lower.includes('mensagens') ||
          lower.includes('login') || lower.includes('seguros') ||
          lower.includes('sobre o') || lower.includes('termos') ||
          lower.includes('privacidade') || lower.includes('encontre-nos')) {
        return false;
      }
      return true;
    }),
    photos: parsed.photos,
    advertiser: {
      name: advertiserName,
      total_ads: null,
      is_agency: advertiserIsAgency ?? signals.is_agency,
      url: null,
      phone: parsed.phone || null
    },
    fsbo_score: signals.fsbo_score,
    fsbo_decision: signals.fsbo_decision,
    signals
  };
  
  return normalized;
}

/**
 * Normaliza múltiplos anúncios
 */
async function normalizeAds(parsedAds, options = {}) {
  console.log('[CustoJusto Normalize] 🔍 Normalizando anúncios...');
  
  const normalized = [];
  
  for (const parsed of parsedAds) {
    try {
      const normalizedAd = await normalizeAd(parsed, options);
      normalized.push(normalizedAd);
    } catch (error) {
      console.error('[CustoJusto Normalize] ❌ Erro ao normalizar anúncio:', error.message);
      // Continuar com próximo
    }
  }
  
  console.log(`[CustoJusto Normalize] ✅ Normalização concluída: ${normalized.length} anúncios`);
  
  return normalized;
}

module.exports = {
  normalizeAd,
  normalizeAds
};

