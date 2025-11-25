/**
 * Normalizador de características do imóvel
 * Processa e normaliza todos os campos relacionados com a propriedade
 */

/**
 * Normaliza nome de localidade para busca
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Extrai valor numérico de uma string
 */
function extractNumber(text) {
  if (!text) return null;
  
  // Remover tudo exceto números, pontos e vírgulas
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
}

/**
 * Extrai áreas (área_total e área_useful)
 */
function extractAreas(featuresText, description = '') {
  const combined = `${featuresText} ${description}`.toLowerCase();
  
  let areaUseful = null;
  let areaTotal = null;
  
  // Padrões para área útil
  const usefulPatterns = [
    /área\s+útil[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+útil[:\s]+(\d+(?:[.,]\d+)?)/i,
    /área\s+interior[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+interior[:\s]+(\d+(?:[.,]\d+)?)/i,
    /útil[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i
  ];
  
  for (const pattern of usefulPatterns) {
    const match = combined.match(pattern);
    if (match) {
      areaUseful = extractNumber(match[1]);
      if (areaUseful) break;
    }
  }
  
  // Padrões para área total/bruta
  const totalPatterns = [
    /área\s+bruta[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+bruta[:\s]+(\d+(?:[.,]\d+)?)/i,
    /área\s+total[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+total[:\s]+(\d+(?:[.,]\d+)?)/i,
    /área\s+de\s+construção[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+de\s+construção[:\s]+(\d+(?:[.,]\d+)?)/i,
    /área\s+construída[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /área\s+construída[:\s]+(\d+(?:[.,]\d+)?)/i,
    /área[:\s]+(\d+(?:[.,]\d+)?)\s*m²/i,
    /tamanho[:\s]+(\d+(?:[.,]\d+)?)/i
  ];
  
  for (const pattern of totalPatterns) {
    const match = combined.match(pattern);
    if (match) {
      const num = extractNumber(match[1]);
      if (num) {
        // Se não temos área útil, usar esta como útil
        if (!areaUseful) {
          areaUseful = num;
        } else {
          // Se já temos útil, esta é total
          areaTotal = num;
        }
        break;
      }
    }
  }
  
  // Se só temos uma área e não especificou se é útil ou total
  // Assumir que é útil (mais comum)
  if (areaTotal && !areaUseful) {
    areaUseful = areaTotal;
    areaTotal = null;
  }
  
  return {
    area_useful: areaUseful ? areaUseful.toString() : null,
    area_total: areaTotal ? areaTotal.toString() : null
  };
}

/**
 * Extrai ano de construção
 */
function extractYear(featuresText, description = '') {
  const combined = `${featuresText} ${description}`;
  const currentYear = new Date().getFullYear();
  
  // Padrões para ano de construção
  const patterns = [
    /ano\s+de\s+construção[:\s]+(\d{4})/i,
    /construído\s+em\s+(\d{4})/i,
    /ano[:\s]+(\d{4})/i,
    /construção[:\s]+(\d{4})/i,
    /(\b(19|20)\d{2}\b)/g
  ];
  
  for (const pattern of patterns) {
    const matches = combined.match(pattern);
    if (matches) {
      for (const match of matches) {
        const year = parseInt(match, 10);
        // Validar ano (entre 1850 e ano atual)
        if (year >= 1850 && year <= currentYear) {
          // Ignorar se for ano de renovação
          const lowerText = combined.toLowerCase();
          const beforeYear = lowerText.substring(0, lowerText.indexOf(match));
          if (!beforeYear.includes('renovado') && !beforeYear.includes('renovação')) {
            return year.toString();
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Extrai piso/andar
 */
function extractFloor(featuresText, description = '') {
  const combined = `${featuresText} ${description}`.toLowerCase();
  
  // Padrões específicos
  const patterns = [
    /(r\/c|rés\s*do\s*chão|térreo)/i,
    /(\d+)\s*(?:º|°)?\s*andar/i,
    /piso\s+(\d+)/i,
    /andar[:\s]+(\d+)/i,
    /(cave\s*\+\s*\d+\s*pisos?)/i,
    /(sub-cave)/i,
    /(cave)/i
  ];
  
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) {
      const floor = match[0].trim();
      
      // Normalizar valores comuns
      if (floor.match(/r\/c|rés|térreo/i)) {
        return 'R/C';
      }
      if (floor.match(/cave/i)) {
        return 'Cave';
      }
      
      return cleanText(floor);
    }
  }
  
  return null;
}

/**
 * Extrai número de casas de banho
 */
function extractBathrooms(featuresText, description = '') {
  const combined = `${featuresText} ${description}`.toLowerCase();
  
  const patterns = [
    /(\d+)\s+casas?\s+de\s+banho/i,
    /casas?\s+de\s+banho[:\s]+(\d+)/i,
    /wc[:\s]+(\d+)/i,
    /(\d+)\s+wc/i,
    /banheiros?[:\s]+(\d+)/i,
    /(\d+)\s+banheiros?/i
  ];
  
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 0 && num <= 20) { // Validação razoável
        return num.toString();
      }
    }
  }
  
  return null;
}

/**
 * Extrai condição do imóvel
 */
function extractCondition(featuresText, description = '') {
  const combined = `${featuresText} ${description}`.toLowerCase();
  
  const conditionMap = {
    'novo': 'novo',
    'nova construção': 'novo',
    'nova': 'novo',
    'renovado': 'renovado',
    'renovada': 'renovado',
    'usado': 'usado',
    'usada': 'usado',
    'por recuperar': 'por renovar',
    'por renovar': 'por renovar',
    'para renovar': 'por renovar',
    'para recuperar': 'por renovar',
    'em construção': 'em construção',
    'para remodelar': 'por renovar',
    'restaurar': 'por renovar',
    'restauro': 'por renovar',
    'excelente': 'excelente',
    'bom': 'bom',
    'razoável': 'razoável',
    'razoavel': 'razoável'
  };
  
  // Procurar por padrões de condição
  for (const [key, value] of Object.entries(conditionMap)) {
    if (combined.includes(key)) {
      return value;
    }
  }
  
  // Tentar extrair de campos específicos
  const conditionPatterns = [
    /condição[:\s]+([^,\n]+)/i,
    /estado[:\s]+([^,\n]+)/i,
    /fase\s+de\s+acabamento[:\s]+([^,\n]+)/i
  ];
  
  for (const pattern of conditionPatterns) {
    const match = combined.match(pattern);
    if (match) {
      const condition = cleanText(match[1]);
      // Normalizar se estiver no mapa
      return conditionMap[condition.toLowerCase()] || condition;
    }
  }
  
  return null;
}

/**
 * Extrai tipo de imóvel
 */
function extractPropertyType(title = '', featuresText = '', description = '') {
  const combined = `${title} ${featuresText} ${description}`.toLowerCase();
  
  const typeMap = {
    'apartamento': 'apartamento',
    'apto': 'apartamento',
    'apartment': 'apartamento',
    'moradia': 'moradia',
    'casa': 'moradia',
    'villa': 'moradia',
    'vila': 'moradia',
    'terreno': 'terreno',
    'lote': 'terreno',
    'loja': 'loja',
    'comercial': 'loja',
    'armazém': 'armazém',
    'armazem': 'armazém',
    'armazem': 'armazém',
    'escritório': 'escritório',
    'escritorio': 'escritório',
    'office': 'escritório',
    'garagem': 'garagem',
    'quinta': 'quinta',
    'quintal': 'quinta',
    'prédio': 'prédio',
    'predio': 'prédio'
  };
  
  // Procurar no título primeiro (mais confiável)
  for (const [key, value] of Object.entries(typeMap)) {
    if (title.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  // Procurar em features
  for (const [key, value] of Object.entries(typeMap)) {
    if (featuresText.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  // Procurar em descrição
  for (const [key, value] of Object.entries(typeMap)) {
    if (description.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extrai tipologia (T0, T1, T2, etc.)
 */
function extractTipology(featuresText, description = '') {
  const combined = `${featuresText} ${description}`;
  
  // Padrão T seguido de número
  const tipologyMatch = combined.match(/T\s*(\d+)\+?(\d+)?/i);
  if (tipologyMatch) {
    const base = tipologyMatch[1];
    const extra = tipologyMatch[2] ? `+${tipologyMatch[2]}` : '';
    return `T${base}${extra}`;
  }
  
  // Padrão "X assoalhadas" ou "X quartos"
  const quartosMatch = combined.match(/(\d+)\s+(?:assoalhadas?|quartos?|bedrooms?)/i);
  if (quartosMatch) {
    const num = parseInt(quartosMatch[1], 10);
    if (num >= 0 && num <= 10) {
      return `T${num}`;
    }
  }
  
  // Procurar em campos específicos
  const tipologyPatterns = [
    /tipologia[:\s]+(T\d\+?\d?)/i,
    /tipo[:\s]+(T\d\+?\d?)/i
  ];
  
  for (const pattern of tipologyPatterns) {
    const match = combined.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Processa características brutas e extrai todos os campos
 */
function processPropertyFeatures(rawFeatures, title = '', description = '') {
  // Converter objeto de features em string para processamento
  let featuresText = '';
  
  if (typeof rawFeatures === 'object' && rawFeatures !== null) {
    // Se for objeto, converter para string
    featuresText = Object.entries(rawFeatures)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' ');
  } else if (typeof rawFeatures === 'string') {
    featuresText = rawFeatures;
  }
  
  // Extrair todos os campos
  const areas = extractAreas(featuresText, description);
  const year = extractYear(featuresText, description);
  const floor = extractFloor(featuresText, description);
  const bathrooms = extractBathrooms(featuresText, description);
  const condition = extractCondition(featuresText, description);
  const type = extractPropertyType(title, featuresText, description);
  const tipology = extractTipology(featuresText, description);
  
  return {
    type: type,
    tipology: tipology,
    area_total: areas.area_total,
    area_useful: areas.area_useful,
    year: year,
    floor: floor,
    condition: condition,
    bathrooms: bathrooms
  };
}

/**
 * Função principal de normalização
 * @param {Object|string} rawFeatures - Características brutas
 * @param {string} title - Título do anúncio
 * @param {string} description - Descrição do anúncio
 * @returns {Object} - Propriedade normalizada
 */
function normalizeProperty(rawFeatures, title = '', description = '') {
  console.log('[PropertyNormalizer] 🔍 Normalizando características do imóvel...');
  
  const property = processPropertyFeatures(rawFeatures, title, description);
  
  console.log('[PropertyNormalizer] ✅ Normalização concluída');
  console.log(`  - type: ${property.type || 'null'}`);
  console.log(`  - tipology: ${property.tipology || 'null'}`);
  console.log(`  - area_total: ${property.area_total || 'null'}`);
  console.log(`  - area_useful: ${property.area_useful || 'null'}`);
  console.log(`  - year: ${property.year || 'null'}`);
  console.log(`  - floor: ${property.floor || 'null'}`);
  console.log(`  - condition: ${property.condition || 'null'}`);
  
  return {
    type: property.type || null,
    tipology: property.tipology || null,
    area_total: property.area_total || null,
    area_useful: property.area_useful || null,
    year: property.year || null,
    floor: property.floor || null,
    condition: property.condition || null
  };
}

module.exports = {
  normalizeProperty,
  extractAreas,
  extractYear,
  extractFloor,
  extractBathrooms,
  extractCondition,
  extractPropertyType,
  extractTipology
};

