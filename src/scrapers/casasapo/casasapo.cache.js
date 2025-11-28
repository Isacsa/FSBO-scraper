/**
 * Sistema de cache para detectar novos anúncios Casa Sapo
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../../data/casasapo_cache.json');
const DEFAULT_CACHE = {
  lastRun: null,
  ads: {}
};

/**
 * Carrega cache do ficheiro
 */
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('[CasaSapo Cache] ⚠️  Erro ao carregar cache:', error.message);
  }
  return { ...DEFAULT_CACHE };
}

/**
 * Salva cache no ficheiro
 */
function saveCache(cache) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (error) {
    console.error('[CasaSapo Cache] ❌ Erro ao salvar cache:', error.message);
  }
}

/**
 * Atualiza cache com novos anúncios
 */
function updateCache(currentAds) {
  const cache = loadCache();
  const now = new Date().toISOString();
  
  const newAds = [];
  const allAdsMap = {};
  
  currentAds.forEach(ad => {
    const adId = ad.ad_id;
    if (!adId) return;
    
    allAdsMap[adId] = {
      url: ad.url || '',
      first_seen: cache.ads[adId]?.first_seen || now,
      last_seen: now
    };
    
    // Se é novo, adicionar à lista
    if (!cache.ads[adId]) {
      newAds.push(ad);
    }
  });
  
  cache.ads = allAdsMap;
  cache.lastRun = now;
  
  saveCache(cache);
  
  return {
    newAds,
    totalNew: newAds.length
  };
}

/**
 * Filtra apenas anúncios novos
 */
function filterNewAds(currentAds) {
  const cache = loadCache();
  return currentAds.filter(ad => {
    const adId = ad.ad_id;
    return adId && !cache.ads[adId];
  });
}

/**
 * Limpa cache antigo (mais de X dias)
 */
function cleanOldCache(daysToKeep = 30) {
  const cache = loadCache();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const cutoffISO = cutoffDate.toISOString();
  let removed = 0;
  
  Object.keys(cache.ads).forEach(adId => {
    if (cache.ads[adId].last_seen < cutoffISO) {
      delete cache.ads[adId];
      removed++;
    }
  });
  
  if (removed > 0) {
    saveCache(cache);
    console.log(`[CasaSapo Cache] 🗑️  Removidos ${removed} anúncios antigos do cache`);
  }
  
  return removed;
}

module.exports = {
  loadCache,
  saveCache,
  updateCache,
  filterNewAds,
  cleanOldCache
};

