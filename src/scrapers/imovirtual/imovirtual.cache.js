/**
 * Sistema de cache para detectar anúncios novos no Imovirtual
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../../data/imovirtual_cache.json');

/**
 * Garante que o diretório data existe
 */
function ensureDataDir() {
  const dataDir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Carrega cache do ficheiro
 */
function loadCache() {
  ensureDataDir();
  
  if (!fs.existsSync(CACHE_FILE)) {
    return {
      lastRun: null,
      ads: {}
    };
  }
  
  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('[Imovirtual Cache] ⚠️  Erro ao carregar cache, criando novo:', error.message);
    return {
      lastRun: null,
      ads: {}
    };
  }
}

/**
 * Salva cache no ficheiro
 */
function saveCache(cache) {
  ensureDataDir();
  
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`[Imovirtual Cache] ✅ Cache salvo: ${Object.keys(cache.ads).length} anúncios`);
  } catch (error) {
    console.error('[Imovirtual Cache] ❌ Erro ao salvar cache:', error.message);
  }
}

/**
 * Filtra anúncios novos comparando com cache
 */
function filterNewAds(normalizedAds) {
  console.log('[Imovirtual Cache] 🔍 Verificando anúncios novos...');
  
  const cache = loadCache();
  const now = new Date().toISOString();
  const newAds = [];
  const allAds = [];
  
  normalizedAds.forEach(ad => {
    const adId = ad.ad_id;
    
    if (!adId) {
      console.warn('[Imovirtual Cache] ⚠️  Anúncio sem ID, ignorando:', ad.url);
      return;
    }
    
    // Atualizar cache
    if (cache.ads[adId]) {
      // Anúncio já existe - atualizar last_seen
      cache.ads[adId].last_seen = now;
    } else {
      // Anúncio novo
      cache.ads[adId] = {
        url: ad.url,
        first_seen: now,
        last_seen: now
      };
      newAds.push(ad);
    }
    
    allAds.push(ad);
  });
  
  // Atualizar lastRun
  cache.lastRun = now;
  
  // Salvar cache
  saveCache(cache);
  
  console.log(`[Imovirtual Cache] ✅ Anúncios novos: ${newAds.length} de ${allAds.length} total`);
  
  return {
    new_ads: newAds,
    total_new: newAds.length,
    all_ads: allAds
  };
}

/**
 * Atualiza cache com novos anúncios
 */
function updateCache(normalizedAds) {
  const cache = loadCache();
  const now = new Date().toISOString();
  const newAds = [];
  
  normalizedAds.forEach(ad => {
    const adId = ad.ad_id;
    
    if (!adId) return;
    
    if (!cache.ads[adId]) {
      // Anúncio novo
      cache.ads[adId] = {
        url: ad.url,
        first_seen: now,
        last_seen: now
      };
      newAds.push(ad);
    } else {
      // Atualizar last_seen
      cache.ads[adId].last_seen = now;
    }
  });
  
  cache.lastRun = now;
  saveCache(cache);
  
  return {
    newAds,
    totalNew: newAds.length
  };
}

/**
 * Limpa cache antigo (opcional)
 */
function cleanOldCache(daysOld = 90) {
  const cache = loadCache();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let removed = 0;
  
  Object.keys(cache.ads).forEach(adId => {
    const ad = cache.ads[adId];
    const lastSeen = new Date(ad.last_seen);
    
    if (lastSeen < cutoffDate) {
      delete cache.ads[adId];
      removed++;
    }
  });
  
  if (removed > 0) {
    saveCache(cache);
    console.log(`[Imovirtual Cache] 🗑️  Removidos ${removed} anúncios antigos (>${daysOld} dias)`);
  }
  
  return removed;
}

module.exports = {
  loadCache,
  saveCache,
  filterNewAds,
  updateCache,
  cleanOldCache
};

