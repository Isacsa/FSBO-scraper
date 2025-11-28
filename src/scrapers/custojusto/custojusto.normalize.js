/**
 * Normalização para formato JSON final
 */

const { normalizeLocation } = require('../../utils/locationNormalizer');
const { parseAdData } = require('./custojusto.parse');

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
    
    // Tentar determinar distrito baseado no concelho
    if (concelho) {
      // Mapeamento básico de concelhos para distritos (pode ser expandido)
      const distritoMap = {
        'Óbidos': 'Leiria',
        'Lisboa': 'Lisboa',
        'Porto': 'Porto',
        'Coimbra': 'Coimbra',
        'Braga': 'Braga'
      };
      if (distritoMap[concelho]) {
        location.district = distritoMap[concelho];
      }
    }
  }
  
  // Montar objeto final
  const normalized = {
    source: 'custojusto',
    ad_id: parsed.ad_id || null,
    url: parsed.url || null,
    published_date: null, // CustoJusto não fornece
    updated_date: null,
    timestamp: now,
    days_online: null,
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
      name: 'Particular',
      total_ads: null,
      is_agency: false,
      url: null,
      phone: parsed.phone || null
    },
    signals: {
      watermark: false,
      duplicate: false,
      professional_photos: false,
      agency_keywords: [],
      is_fsbo: true
    }
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

