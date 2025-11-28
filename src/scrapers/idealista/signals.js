/**
 * Detecção de sinais FSBO específicos para Idealista
 */

/**
 * Detecta watermark nas fotos
 */
function detectWatermark(photos) {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return false;
  }
  
  const watermarkIndicators = [
    'watermark',
    'wm_',
    'logo',
    'brand',
    'signature',
    'copyright',
    'idealista.com/watermark'
  ];
  
  for (const photo of photos) {
    const lowerUrl = photo.toLowerCase();
    if (watermarkIndicators.some(indicator => lowerUrl.includes(indicator))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detecta fotos profissionais
 */
function detectProfessionalPhotos(photos, description) {
  if (!photos || !Array.isArray(photos)) {
    return false;
  }
  
  let score = 0;
  
  // Critério 1: Quantidade de fotos
  if (photos.length >= 15) {
    score += 2;
  } else if (photos.length >= 10) {
    score += 1;
  }
  
  // Critério 2: Resoluções altas (indicador de fotografia profissional)
  const highResPatterns = [
    /width=1920/i,
    /width=2048/i,
    /width=2560/i,
    /resolution.*high/i
  ];
  
  const highResCount = photos.filter(photo => 
    highResPatterns.some(pattern => pattern.test(photo))
  ).length;
  
  if (highResCount >= photos.length * 0.7) {
    score += 2;
  } else if (highResCount >= photos.length * 0.5) {
    score += 1;
  }
  
  // Critério 3: Keywords na descrição
  if (description) {
    const lowerDesc = description.toLowerCase();
    const professionalKeywords = [
      'fotografia profissional',
      'fotos profissionais',
      'hdr',
      'grande angular',
      'reportagem fotográfica',
      'photography',
      'professional photos'
    ];
    
    if (professionalKeywords.some(kw => lowerDesc.includes(kw))) {
      score += 2;
    }
  }
  
  return score >= 2;
}

/**
 * Detecta keywords de agência no texto
 */
function detectAgencyKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const lowerText = text.toLowerCase();
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
    'ref:',
    'remax',
    'century',
    'era',
    'kw',
    'keller williams',
    'real estate',
    'broker',
    'angariador',
    'angariadora'
  ];
  
  // Frases negativas a ignorar
  const negativePhrases = [
    'não respondo a imobiliárias',
    'não aceito agências',
    'não pretendo contacto com mediadores',
    'dispenso mediadores',
    'sem imobiliárias'
  ];
  
  // Verificar se há frases negativas
  const hasNegative = negativePhrases.some(phrase => lowerText.includes(phrase));
  
  if (!hasNegative) {
    agencyKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  return [...new Set(keywords)]; // Remover duplicados
}

/**
 * Detecta duplicados (versão simples)
 */
function detectDuplicate(title, price, location, platform) {
  // Implementação básica - pode ser melhorada com cache/DB
  // Por agora, retornar false (será implementado no módulo principal de signals)
  return false;
}

/**
 * Analisa todos os sinais FSBO
 */
function analyzeIdealistaSignals(data) {
  const { title = '', description = '', advertiser = {}, photos = [], price, location } = data;
  const combinedText = `${title} ${description} ${advertiser.name || ''}`.trim();
  
  const watermark = detectWatermark(photos);
  const professionalPhotos = detectProfessionalPhotos(photos, description);
  const agencyKeywords = detectAgencyKeywords(combinedText);
  const duplicate = detectDuplicate(title, price, location, 'idealista');
  
  return {
    watermark,
    duplicate,
    professional_photos: professionalPhotos,
    agency_keywords: agencyKeywords
  };
}

module.exports = {
  analyzeIdealistaSignals,
  detectWatermark,
  detectProfessionalPhotos,
  detectAgencyKeywords
};

