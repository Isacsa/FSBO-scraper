/**
 * Módulo para calcular FSBO Score
 * Entrada: dados do anúncio
 * Saída: score 0-100 + razões
 */

/**
 * Calcula FSBO Score para um anúncio
 * @param {Object} ad - Objeto de anúncio normalizado
 * @returns {Object} - { score: 0-100, reasons: [] }
 */
function calculateFsboScore(ad) {
  let score = 50; // Score base
  const reasons = [];
  
  // 1. Advertiser name - verificar se é agência
  const advertiserName = (ad.advertiser?.name || '').toLowerCase();
  const agencyKeywords = ['remax', 'era', 'century', 'kw', 'imobiliária', 'imobiliaria', 'properties', 'real estate', 'ami', 'consultor', 'gestor', 'mediador'];
  const isAgencyName = agencyKeywords.some(keyword => advertiserName.includes(keyword));
  
  if (isAgencyName) {
    score -= 30;
    reasons.push('Nome do anunciante contém palavras-chave de agência');
  } else if (advertiserName && advertiserName !== 'particular' && advertiserName.length > 0) {
    score += 5;
    reasons.push('Nome do anunciante não parece ser agência');
  }
  
  // 2. Total ads - se tiver muitos anúncios, provavelmente é agência
  const totalAds = parseInt(ad.advertiser?.total_ads || '0');
  if (totalAds >= 20) {
    score -= 25;
    reasons.push(`Anunciante tem ${totalAds} anúncios (provável agência)`);
  } else if (totalAds >= 5) {
    score -= 15;
    reasons.push(`Anunciante tem ${totalAds} anúncios (possível agência)`);
  } else if (totalAds === 0 || totalAds === null || totalAds === '') {
    score += 10;
    reasons.push('Anunciante não tem histórico de múltiplos anúncios');
  }
  
  // 3. Agency keywords nos sinais
  const agencyKeywordsCount = (ad.signals?.agency_keywords || []).length;
  if (agencyKeywordsCount > 0) {
    score -= agencyKeywordsCount * 10;
    reasons.push(`Encontradas ${agencyKeywordsCount} palavras-chave de agência no texto`);
  }
  
  // 4. Professional photos
  if (ad.signals?.professional_photos === true) {
    score -= 15;
    reasons.push('Fotos profissionais detectadas (possível agência)');
  } else {
    score += 5;
    reasons.push('Fotos não parecem profissionais');
  }
  
  // 5. Phone availability - FSBO geralmente tem telefone
  const hasPhone = !!(ad.advertiser?.phone || '').trim();
  if (hasPhone) {
    score += 15;
    reasons.push('Telefone disponível (bom sinal FSBO)');
  } else {
    score -= 5;
    reasons.push('Telefone não disponível');
  }
  
  // 6. Number of photos - FSBO geralmente tem menos fotos
  const photoCount = (ad.photos || []).length;
  if (photoCount === 0) {
    score -= 10;
    reasons.push('Sem fotos');
  } else if (photoCount >= 1 && photoCount <= 8) {
    score += 10;
    reasons.push(`${photoCount} fotos (típico de FSBO)`);
  } else if (photoCount > 20) {
    score -= 10;
    reasons.push(`${photoCount} fotos (muitas, possível agência)`);
  }
  
  // 7. Description length - FSBO geralmente tem descrições mais pessoais
  const descLength = (ad.description || '').length;
  if (descLength === 0) {
    score -= 10;
    reasons.push('Sem descrição');
  } else if (descLength >= 200 && descLength <= 1000) {
    score += 5;
    reasons.push('Descrição com tamanho adequado');
  } else if (descLength > 2000) {
    score -= 5;
    reasons.push('Descrição muito longa (possível agência)');
  }
  
  // 8. Watermark - se tiver watermark, provável agência
  if (ad.signals?.watermark === true) {
    score -= 20;
    reasons.push('Watermark detectado nas fotos');
  }
  
  // 9. Duplicate - se for duplicado, reduz score
  if (ad.signals?.duplicate === true) {
    score -= 10;
    reasons.push('Anúncio duplicado detectado');
  }
  
  // 10. is_agency flag - se já está marcado como agência
  if (ad.advertiser?.is_agency === true) {
    score -= 40;
    reasons.push('Anunciante marcado como agência');
  } else if (ad.advertiser?.is_agency === false) {
    score += 10;
    reasons.push('Anunciante confirmado como particular');
  }
  
  // Normalizar score entre 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  return {
    score,
    reasons: reasons.length > 0 ? reasons : ['Score base calculado']
  };
}

/**
 * Calcula FSBO Score para múltiplos anúncios
 */
function calculateFsboScores(ads) {
  return ads.map(ad => {
    const scoreResult = calculateFsboScore(ad);
    return {
      ...ad,
      _fsbo_score: scoreResult.score,
      _fsbo_reasons: scoreResult.reasons
    };
  });
}

module.exports = {
  calculateFsboScore,
  calculateFsboScores
};

