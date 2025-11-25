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
  
  // Detectar palavras-chave de agência (sem contexto negativo)
  const allText = `${title} ${description} ${advertiser.name || ''}`;
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
  
  // Detectar se é agência (usando score)
  const isAgency = detectIsAgency({
    title,
    description,
    advertiser,
    photos
  });
  
  console.log('[FSBOSignals] ✅ Análise concluída:');
  console.log(`  - watermark: ${watermark}`);
  console.log(`  - duplicate: ${duplicate}`);
  console.log(`  - professional_photos: ${professionalPhotos}`);
  console.log(`  - agency_keywords: ${agencyKeywords.length} encontrados`);
  console.log(`  - is_agency: ${isAgency}`);
  
  return {
    watermark,
    duplicate,
    professional_photos: professionalPhotos,
    agency_keywords: agencyKeywords,
    is_agency: isAgency
  };
}

module.exports = {
  analyzeFsboSignals,
  detectAgencyKeywords,
  detectIsAgency,
  detectWatermark,
  detectProfessionalPhotos,
  detectDuplicate,
  calculateAgencyScore
};
