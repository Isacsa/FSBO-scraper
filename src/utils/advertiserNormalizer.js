/**
 * Normalizador de dados do anunciante
 * Extrai total_ads, detecta agências, normaliza URLs
 */

const { createBrowser, createPage, navigateWithRetry } = require('./browser');

/**
 * Keywords que indicam agência imobiliária
 */
const AGENCY_KEYWORDS = [
  'remax',
  'century',
  'era',
  'exp',
  'properties',
  'real estate',
  'imobiliária',
  'imobiliaria',
  'mediador',
  'mediadora',
  'consultor',
  'consultora',
  'broker',
  'realty',
  'home',
  'homes',
  'sotheby',
  'coldwell',
  'banker',
  'keller',
  'williams',
  'kw',
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
 * Detecta se é agência baseado em keywords no nome
 */
function detectAgencyByName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const lowerName = name.toLowerCase();
  
  return AGENCY_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Detecta se é agência baseado no número de anúncios
 */
function detectAgencyByAdsCount(totalAds) {
  if (totalAds === null || totalAds === undefined) return false;
  return parseInt(totalAds) >= 5;
}

/**
 * Detecta se é agência baseado na URL
 */
function detectAgencyByUrl(url, platform) {
  if (!url || typeof url !== 'string') return false;
  
  const lowerUrl = url.toLowerCase();
  
  if (platform === 'imovirtual') {
    // Imovirtual: /empresas/agencias-imobiliarias/ indica agência
    return lowerUrl.includes('/empresas/') || 
           lowerUrl.includes('/agencias-imobiliarias/') ||
           lowerUrl.includes('/agencias/');
  }
  
  if (platform === 'olx') {
    // OLX: URLs profissionais podem indicar agência
    // Mas não temos padrão claro, então retornar false
    return false;
  }
  
  return false;
}

/**
 * Limpa e normaliza URL do anunciante
 */
function normalizeAdvertiserUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  let cleaned = url.trim();
  
  // Remover parâmetros de tracking/ref
  try {
    const urlObj = new URL(cleaned);
    // Manter apenas parâmetros essenciais, remover ref, utm, etc.
    const paramsToKeep = ['id'];
    const newParams = new URLSearchParams();
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (paramsToKeep.includes(key.toLowerCase())) {
        newParams.set(key, value);
      }
    }
    
    urlObj.search = newParams.toString();
    cleaned = urlObj.toString();
  } catch (error) {
    // Se não for URL válida, retornar como está
  }
  
  return cleaned;
}

/**
 * Extrai total de anúncios do perfil OLX
 */
async function extractOLXTotalAds(page, advertiserUrl) {
  if (!advertiserUrl) return null;
  
  try {
    console.log(`[AdvertiserNormalizer] 🔍 Visitando perfil OLX: ${advertiserUrl}`);
    
    // Navegar para o perfil
    await navigateWithRetry(page, advertiserUrl);
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Extrair número de anúncios
    const totalAds = await page.evaluate(() => {
      // Procurar por texto que indica número de anúncios
      const text = document.body.textContent || '';
      
      // Padrões comuns: "X anúncios", "X anúncios ativos", "Total: X"
      const patterns = [
        /(\d+)\s+anúncios?\s+ativos?/i,
        /(\d+)\s+anúncios?/i,
        /total[:\s]+(\d+)/i,
        /(\d+)\s+resultados?/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 0 && num < 10000) { // Validação razoável
            return num;
          }
        }
      }
      
      // Tentar encontrar em elementos específicos
      const elements = document.querySelectorAll('[class*="count"], [class*="total"], [class*="ads"]');
      for (const el of elements) {
        const text = el.textContent || '';
        const match = text.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 0 && num < 10000) {
            return num;
          }
        }
      }
      
      return null;
    });
    
    if (totalAds !== null) {
      console.log(`[AdvertiserNormalizer] ✅ Total de anúncios encontrado: ${totalAds}`);
    } else {
      console.log(`[AdvertiserNormalizer] ⚠️  Total de anúncios não encontrado`);
    }
    
    return totalAds;
  } catch (error) {
    console.warn(`[AdvertiserNormalizer] ⚠️  Erro ao extrair total_ads do OLX: ${error.message}`);
    return null;
  }
}

/**
 * Extrai total de anúncios do perfil Imovirtual
 */
async function extractImovirtualTotalAds(page, advertiserUrl) {
  if (!advertiserUrl) return null;
  
  try {
    console.log(`[AdvertiserNormalizer] 🔍 Visitando perfil Imovirtual: ${advertiserUrl}`);
    
    // Navegar para o perfil
    await navigateWithRetry(page, advertiserUrl);
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    // Extrair número de imóveis/anúncios
    const totalAds = await page.evaluate(() => {
      // Procurar em elementos específicos primeiro
      const selectors = [
        '[class*="count"]',
        '[class*="total"]',
        '[class*="properties"]',
        '[class*="listings"]',
        '[class*="ads"]',
        '[class*="anuncios"]',
        'strong:has-text("imóveis")',
        'span:has-text("imóveis")',
        'p:has-text("imóveis")'
      ];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent || '';
            // Procurar padrão: número seguido de "imóveis" ou similar
            const match = text.match(/(\d+)\s*(?:imóveis?|anúncios?|propriedades?|resultados?)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num >= 0 && num < 10000) {
                return num;
              }
            }
            // Ou apenas número grande no texto
            const numMatch = text.match(/\b(\d{2,})\b/);
            if (numMatch) {
              const num = parseInt(numMatch[1], 10);
              if (num >= 5 && num < 10000) {
                return num;
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // Fallback: procurar por texto que indica número de imóveis
      const text = document.body.textContent || '';
      
      // Padrões comuns: "X imóveis", "X anúncios", "Total: X"
      const patterns = [
        /(\d+)\s+imóveis?/i,
        /(\d+)\s+anúncios?/i,
        /total[:\s]+(\d+)/i,
        /(\d+)\s+propriedades?/i,
        /(\d+)\s+resultados?/i,
        /(\d+)\s+listagens?/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 0 && num < 10000) {
            return num;
          }
        }
      }
      
      return null;
    });
    
    if (totalAds !== null) {
      console.log(`[AdvertiserNormalizer] ✅ Total de anúncios encontrado: ${totalAds}`);
    } else {
      console.log(`[AdvertiserNormalizer] ⚠️  Total de anúncios não encontrado`);
    }
    
    return totalAds;
  } catch (error) {
    console.warn(`[AdvertiserNormalizer] ⚠️  Erro ao extrair total_ads do Imovirtual: ${error.message}`);
    return null;
  }
}

/**
 * Função principal de normalização do anunciante
 * @param {Object} advertiserData - Dados brutos do anunciante
 * @param {string} platform - 'olx' ou 'imovirtual'
 * @param {Page} page - Página do Playwright (para visitar perfil se necessário)
 * @param {boolean} visitProfile - Se deve visitar perfil para extrair total_ads
 * @returns {Promise<Object>} - Anunciante normalizado
 */
async function normalizeAdvertiser(advertiserData, platform, page = null, visitProfile = true) {
  console.log(`[AdvertiserNormalizer] 🔍 Normalizando dados do anunciante...`);
  
  const name = advertiserData?.name || null;
  const url = normalizeAdvertiserUrl(advertiserData?.url || null);
  
  let totalAds = null;
  
  // Extrair total_ads visitando perfil se necessário
  if (visitProfile && page && url) {
    try {
      if (platform === 'olx') {
        totalAds = await extractOLXTotalAds(page, url);
      } else if (platform === 'imovirtual') {
        totalAds = await extractImovirtualTotalAds(page, url);
      }
    } catch (error) {
      console.warn(`[AdvertiserNormalizer] ⚠️  Erro ao visitar perfil: ${error.message}`);
    }
  }
  
  // Detectar se é agência usando heurísticas
  const isAgencyByName = detectAgencyByName(name);
  const isAgencyByAds = detectAgencyByAdsCount(totalAds);
  const isAgencyByUrl = detectAgencyByUrl(url, platform);
  
  // Se qualquer heurística indicar agência, considerar como agência
  const isAgency = isAgencyByName || isAgencyByAds || isAgencyByUrl;
  
  console.log(`[AdvertiserNormalizer] ✅ Normalização concluída:`);
  console.log(`  - name: ${name}`);
  console.log(`  - total_ads: ${totalAds}`);
  console.log(`  - is_agency: ${isAgency} (byName: ${isAgencyByName}, byAds: ${isAgencyByAds}, byUrl: ${isAgencyByUrl})`);
  
  return {
    name: name,
    url: url,
    total_ads: totalAds,
    is_agency: isAgency
  };
}

module.exports = {
  normalizeAdvertiser,
  detectAgencyByName,
  detectAgencyByAdsCount,
  detectAgencyByUrl,
  normalizeAdvertiserUrl
};

