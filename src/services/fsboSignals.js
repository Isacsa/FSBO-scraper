/**
 * Sistema de detecção de sinais FSBO (For Sale By Owner)
 * Detecta agências, fotos profissionais, watermarks e duplicados
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Lista expandida de palavras-chave de agência
 */
const AGENCY_KEYWORDS = [
  'remax',
  'era',
  'century',
  'century 21',
  'c21',
  'kw',
  'keller williams',
  'imobiliária',
  'imobiliaria',
  'imóveis',
  'imoveis',
  'mediador',
  'mediadora',
  'consultor',
  'consultora',
  'angariador',
  'angariadora',
  'properties',
  'real estate',
  'ami',
  'coldwell banker',
  'sotheby',
  'engel & völkers',
  'private broker',
  'gestão de imóveis',
  'investimento imobiliário',
  'broker',
  'realty',
  'home',
  'homes',
  'ltd',
  'lda',
  's.a.',
  'sociedade',
  'empresa',
  'group',
  'grupo',
  'investimentos',
  'investment',
  'gestão',
  'gestao',
  'management',
  'consultoria',
  'consulting'
];

/**
 * Palavras que indicam negação (não querer agências)
 */
const NEGATION_WORDS = [
  'não',
  'nao',
  'nunca',
  'sem',
  'evitar',
  'dispenso',
  'dispensamos',
  'não desejo',
  'nao desejo',
  'não quero',
  'nao quero',
  'não aceito',
  'nao aceito',
  'não pretendo',
  'nao pretendo',
  'não respondo',
  'nao respondo',
  'não contactar',
  'nao contactar',
  'não contactem',
  'nao contactem',
  'recuso',
  'recusamos',
  'excluir',
  'excluímos'
];

/**
 * Padrões profissionais explícitos na descrição
 */
const PROFESSIONAL_PATTERNS = [
  /ref[:\s]+[\w\d]+/i,
  /ami[:\s]+[\w\d]+/i,
  /tratado\s+por/i,
  /gestor\s+de\s+produto/i,
  /mediador\s+imobiliário/i,
  /consultor\s+imobiliário/i,
  /equipa\s+de\s+vendas/i,
  /escritório/i,
  /sede/i,
  /agência\s+imobiliária/i,
  /agencia\s+imobiliaria/i
];

const OWNER_DIRECT_PATTERNS = [
  /\bparticular\b/i,
  /\bpropriet[aá]ri[oa]\b/i,
  /\bdono\b/i,
  /\bsem intermedi[aá]rios\b/i,
  /\bneg[oó]cio direto\b/i,
  /\bcontacto direto\b/i,
];

const ANTI_AGENCY_PATTERNS = [
  /\bsem imobili[aá]rias?\b/i,
  /\bsem ag[eê]ncias?\b/i,
  /\bdispenso imobili[aá]rias?\b/i,
  /\bdispenso ag[eê]ncias?\b/i,
  /\bn[aã]o quero imobili[aá]rias?\b/i,
  /\bn[aã]o pretendo media[cç][aã]o\b/i,
];

/**
 * Cache de fingerprints para detecção de duplicados
 */
const DUPLICATE_CACHE_FILE = path.join(__dirname, '../../.duplicate-cache.json');
const DUPLICATE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Carrega cache de duplicados
 */
function loadDuplicateCache() {
  try {
    if (fs.existsSync(DUPLICATE_CACHE_FILE)) {
      const data = fs.readFileSync(DUPLICATE_CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      const now = Date.now();
      
      // Limpar entradas expiradas
      const valid = {};
      for (const [key, timestamp] of Object.entries(cache)) {
        if (now - timestamp < DUPLICATE_CACHE_TTL) {
          valid[key] = timestamp;
        }
      }
      
      return valid;
    }
  } catch (error) {
    console.warn('[FSBOSignals] ⚠️  Erro ao carregar cache de duplicados:', error.message);
  }
  return {};
}

/**
 * Salva cache de duplicados
 */
function saveDuplicateCache(cache) {
  try {
    fs.writeFileSync(DUPLICATE_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('[FSBOSignals] ⚠️  Erro ao salvar cache de duplicados:', error.message);
  }
}

/**
 * Normaliza texto para comparação
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Detecta palavras-chave de agência no texto, ignorando negações
 */
function detectAgencyKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  
  const normalized = normalizeText(text);
  const foundKeywords = [];
  
  for (const keyword of AGENCY_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    if (regex.test(normalized)) {
      // Verificar se está em contexto negativo
      const keywordIndex = normalized.indexOf(keywordLower);
      if (keywordIndex !== -1) {
        // Verificar contexto antes e depois da palavra
        const beforeContext = normalized.substring(Math.max(0, keywordIndex - 50), keywordIndex);
        const afterContext = normalized.substring(keywordIndex + keywordLower.length, keywordIndex + keywordLower.length + 50);
        const fullContext = beforeContext + ' ' + afterContext;
        
        // Se encontrar palavras de negação no contexto, ignorar
        const hasNegation = NEGATION_WORDS.some(neg => fullContext.includes(neg));
        
        if (!hasNegation) {
          foundKeywords.push(keyword);
        }
      }
    }
  }
  
  return foundKeywords;
}

/**
 * Calcula score de agência baseado em múltiplas heurísticas
 */
function calculateAgencyScore(data) {
  let score = 0;
  
  const title = data.title || '';
  const description = data.description || '';
  const advertiserName = data.advertiser?.name || '';
  const advertiserUrl = data.advertiser?.url || '';
  const totalAds = data.advertiser?.total_ads;
  const allText = `${title} ${description} ${advertiserName}`.toLowerCase();
  
  // a) Nome do anunciante contém keywords (+2)
  const nameKeywords = detectAgencyKeywords(advertiserName);
  if (nameKeywords.length > 0) {
    score += 2;
  }
  
  // b) URL do anunciante é de agência (+2)
  if (advertiserUrl) {
    const urlLower = advertiserUrl.toLowerCase();
    if (urlLower.includes('/empresas/') ||
        urlLower.includes('/agencias-imobiliarias/') ||
        urlLower.includes('/agencias/') ||
        urlLower.includes('remax') ||
        urlLower.includes('era') ||
        urlLower.includes('century') ||
        urlLower.includes('century21') ||
        urlLower.includes('c21')) {
      score += 2;
    }
  }
  
  // c) Descrição contém padrões profissionais
  for (const pattern of PROFESSIONAL_PATTERNS) {
    if (pattern.test(description)) {
      if (pattern.source.includes('ref') || pattern.source.includes('ami')) {
        score += 1;
      } else if (pattern.source.includes('consultor') || pattern.source.includes('mediador')) {
        score += 1;
      } else {
        score += 1;
      }
      break; // Contar apenas uma vez
    }
  }
  
  // d) Total de anúncios
  if (totalAds !== null && totalAds !== undefined) {
    const ads = parseInt(totalAds, 10);
    if (ads >= 20) {
      score += 2;
    } else if (ads >= 5) {
      score += 1;
    }
  }
  
  // e) Penalizar frases negativas (-2)
  const hasNegation = NEGATION_WORDS.some(neg => {
    const negLower = neg.toLowerCase();
    return allText.includes(negLower) && (
      allText.includes('imobiliária') ||
      allText.includes('imobiliaria') ||
      allText.includes('agência') ||
      allText.includes('agencia') ||
      allText.includes('mediador')
    );
  });
  
  if (hasNegation) {
    score -= 2;
  }
  
  return score;
}

/**
 * Detecta se é agência baseado em score
 */
function detectIsAgency(data) {
  const score = calculateAgencyScore(data);
  return score >= 2;
}

/**
 * Detecta watermark em URLs de fotos
 */
function detectWatermark(photoUrls) {
  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return false;
  }
  
  const watermarkIndicators = [
    'watermark',
    'wm_',
    'logo',
    'marca',
    'agency',
    'brand',
    'signature',
    'branded',
    'imovirtual.com/fp_statics/images/logo',
    'olxcdn.com/logo'
  ];
  
  // Filtrar logos e ícones
  const realPhotos = photoUrls.filter(url => {
    if (!url || typeof url !== 'string') return false;
    const lowerUrl = url.toLowerCase();
    return !lowerUrl.includes('logo') && 
           !lowerUrl.includes('icon') && 
           !lowerUrl.includes('footer') &&
           !lowerUrl.includes('header') &&
           !lowerUrl.includes('app_store') &&
           !lowerUrl.includes('google_play');
  });
  
  if (realPhotos.length === 0) return false;
  
  // Verificar se alguma foto tem watermark
  return realPhotos.some(url => {
    const lowerUrl = url.toLowerCase();
    return watermarkIndicators.some(indicator => lowerUrl.includes(indicator));
  });
}

/**
 * Calcula score de fotos profissionais
 */
function calculateProfessionalPhotosScore(photoUrls, description = '') {
  if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
    return 0;
  }
  
  let score = 0;
  
  // Filtrar logos e ícones
  const realPhotos = photoUrls.filter(url => {
    if (!url || typeof url !== 'string') return false;
    const lowerUrl = url.toLowerCase();
    return !lowerUrl.includes('logo') && 
           !lowerUrl.includes('icon') && 
           !lowerUrl.includes('footer') &&
           !lowerUrl.includes('header');
  });
  
  if (realPhotos.length === 0) return 0;
  
  // a) Quantidade de fotos
  if (realPhotos.length >= 12) {
    score += 2; // Agências geralmente têm muitas fotos
  } else if (realPhotos.length >= 8) {
    score += 1;
  } else if (realPhotos.length <= 5) {
    score -= 1; // FSBO geralmente tem poucas fotos
  }
  
  // b) Resolução/proporção (heurística simples)
  const highResPatterns = [
    /2000x1500/i,
    /4032x3024/i,
    /3024x4032/i,
    /1920x1080/i,
    /1280x1024/i
  ];
  
  let highResCount = 0;
  for (const url of realPhotos) {
    if (highResPatterns.some(pattern => pattern.test(url))) {
      highResCount++;
    }
  }
  
  // Se maioria das fotos tem alta resolução
  if (highResCount / realPhotos.length > 0.5) {
    score += 1;
  }
  
  // c) Descrição menciona fotos profissionais
  const descLower = description.toLowerCase();
  if (descLower.includes('fotos profissionais') ||
      descLower.includes('fotografia hdr') ||
      descLower.includes('reportagem fotográfica') ||
      descLower.includes('fotografia profissional')) {
    score += 2;
  }
  
  return score;
}

/**
 * Detecta se as fotos são profissionais
 */
function detectProfessionalPhotos(photoUrls, description = '') {
  const score = calculateProfessionalPhotosScore(photoUrls, description);
  return score >= 2;
}

/**
 * Cria fingerprint para detecção de duplicados
 */
function createFingerprint(data) {
  const title = normalizeText(data.title || '');
  const price = (data.price || '').toString().trim();
  const district = normalizeText(data.location?.district || '');
  const municipality = normalizeText(data.location?.municipality || '');
  const parish = normalizeText(data.location?.parish || '');
  
  const fingerprintString = `${title}|${price}|${district}|${municipality}|${parish}`;
  return crypto.createHash('md5').update(fingerprintString).digest('hex');
}

/**
 * Detecta se é duplicado
 */
function detectDuplicate(data) {
  try {
    const fingerprint = createFingerprint(data);
    const cache = loadDuplicateCache();
    
    if (cache[fingerprint]) {
      return true; // Já existe no cache
    }
    
    // Adicionar ao cache
    cache[fingerprint] = Date.now();
    saveDuplicateCache(cache);
    
    return false;
  } catch (error) {
    console.warn('[FSBOSignals] ⚠️  Erro ao detectar duplicado:', error.message);
    return false;
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+351')) return digits;
  if (digits.startsWith('351')) return `+${digits}`;
  if (/^9\d{8}$/.test(digits)) return `+351${digits}`;
  return digits || null;
}

function analyzePhoneHeuristic(phone) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return { phone_signal: null, score_delta: 0 };
  }

  const local = normalized.replace(/^\+351/, '');
  if (/^96\d{7}$/.test(local)) {
    return { phone_signal: 'mobile_prefix_96', score_delta: 12 };
  }
  if (/^9\d{8}$/.test(local)) {
    return { phone_signal: 'mobile_prefix_9', score_delta: 8 };
  }
  if (/^(2|3)\d{8}$/.test(local)) {
    return { phone_signal: 'landline_prefix', score_delta: -6 };
  }

  return { phone_signal: 'unknown', score_delta: 0 };
}

/**
 * Função principal de análise de sinais FSBO
 * @param {Object} data - Dados do anúncio
 * @param {string} platform - Plataforma ('olx' ou 'imovirtual')
 * @returns {Object} - Sinais FSBO
 */
function analyzeFsboSignals(data, platform = 'olx') {
  console.log('[FSBOSignals] 🔍 Analisando sinais FSBO...');

  const title = data.title || '';
  const description = data.description || '';
  const photos = data.photos || [];
  const advertiser = data.advertiser || {};
  const allText = `${title} ${description} ${advertiser.name || ''}`.trim();
  const positiveEvidence = [];
  const negativeEvidence = [];

  // Detectar palavras-chave de agência (sem contexto negativo)
  const agencyKeywords = detectAgencyKeywords(allText);

  // Detectar watermark
  const watermark = detectWatermark(photos);

  // Detectar fotos profissionais
  const professionalPhotos = detectProfessionalPhotos(photos, description);

  // Detectar duplicado
  const duplicate = detectDuplicate({
    title,
    price: data.price,
    location: data.location
  });

  // Reaproveitar score base de agência e convertê-lo numa escala FSBO simples.
  const agencyScore = calculateAgencyScore({
    title,
    description,
    advertiser,
    photos
  });

  let fsboScore = 50 - (agencyScore * 12);

  const ownerDirectHits = OWNER_DIRECT_PATTERNS.filter((pattern) => pattern.test(allText));
  if (ownerDirectHits.length > 0) {
    positiveEvidence.push('owner_direct_phrase');
    fsboScore += 18;
  }

  const antiAgencyHits = ANTI_AGENCY_PATTERNS.filter((pattern) => pattern.test(allText));
  if (antiAgencyHits.length > 0) {
    positiveEvidence.push('anti_agency_phrase');
    fsboScore += 20;
  }

  if (typeof advertiser.is_agency === 'boolean') {
    if (advertiser.is_agency) {
      negativeEvidence.push('advertiser_marked_agency');
      fsboScore -= 35;
    } else {
      positiveEvidence.push('advertiser_marked_private');
      fsboScore += 10;
    }
  }

  if (agencyKeywords.length > 0) {
    negativeEvidence.push('agency_keywords');
    fsboScore -= 22;
  }

  const hasProfessionalPattern = PROFESSIONAL_PATTERNS.some((pattern) => pattern.test(description));
  if (hasProfessionalPattern) {
    negativeEvidence.push('professional_pattern');
    fsboScore -= 14;
  }

  if (watermark) {
    negativeEvidence.push('watermark');
    fsboScore -= 10;
  }

  if (professionalPhotos) {
    negativeEvidence.push('professional_photos');
    fsboScore -= 8;
  }

  if (duplicate) {
    negativeEvidence.push('duplicate');
    fsboScore -= 6;
  }

  const totalAds = advertiser.total_ads != null ? parseInt(advertiser.total_ads, 10) : null;
  if (!Number.isNaN(totalAds) && totalAds !== null) {
    if (totalAds >= 20) {
      negativeEvidence.push('many_ads');
      fsboScore -= 18;
    } else if (totalAds >= 5) {
      negativeEvidence.push('several_ads');
      fsboScore -= 8;
    } else if (totalAds <= 2) {
      positiveEvidence.push('few_ads');
      fsboScore += 8;
    }
  }

  const phoneHeuristic = analyzePhoneHeuristic(advertiser.phone || data.phone || null);
  if (phoneHeuristic.phone_signal) {
    if (phoneHeuristic.score_delta > 0) {
      positiveEvidence.push(phoneHeuristic.phone_signal);
    } else if (phoneHeuristic.score_delta < 0) {
      negativeEvidence.push(phoneHeuristic.phone_signal);
    }
    fsboScore += phoneHeuristic.score_delta;
  }

  if (typeof data.fsbo_score === 'number') {
    fsboScore = Math.round((fsboScore + data.fsbo_score) / 2);
  }

  if (data.fsbo_decision === 'fsbo') {
    positiveEvidence.push('portal_fsbo_decision');
    fsboScore += 15;
  } else if (data.fsbo_decision === 'agency') {
    negativeEvidence.push('portal_agency_decision');
    fsboScore -= 25;
  } else if (data.fsbo_decision === 'uncertain') {
    negativeEvidence.push('portal_uncertain_decision');
    fsboScore -= 8;
  }

  fsboScore = clampScore(fsboScore);

  let fsboDecision = 'uncertain';
  if (advertiser.is_agency === true || fsboScore <= 35) {
    fsboDecision = 'agency';
  } else if (fsboScore >= 70) {
    fsboDecision = 'fsbo';
  }

  const isAgency = fsboDecision === 'agency'
    ? true
    : fsboDecision === 'fsbo'
      ? false
      : null;

  console.log('[FSBOSignals] ✅ Análise concluída:');
  console.log(`  - watermark: ${watermark}`);
  console.log(`  - duplicate: ${duplicate}`);
  console.log(`  - professional_photos: ${professionalPhotos}`);
  console.log(`  - agency_keywords: ${agencyKeywords.length} encontrados`);
  console.log(`  - fsbo_score: ${fsboScore}`);
  console.log(`  - fsbo_decision: ${fsboDecision}`);

  return {
    watermark,
    duplicate,
    professional_photos: professionalPhotos,
    agency_keywords: agencyKeywords,
    is_agency: isAgency,
    fsbo_score: fsboScore,
    fsbo_decision: fsboDecision,
    phone_signal: phoneHeuristic.phone_signal,
    positive_evidence: [...new Set(positiveEvidence)],
    negative_evidence: [...new Set(negativeEvidence)],
  };
}

module.exports = {
  analyzeFsboSignals,
  analyzePhoneHeuristic,
  detectAgencyKeywords,
  detectIsAgency,
  detectWatermark,
  detectProfessionalPhotos,
  detectDuplicate,
  calculateAgencyScore
};
