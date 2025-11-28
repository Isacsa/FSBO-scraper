/**
 * Módulo de deduplicação de anúncios
 * Cria fingerprints e verifica duplicados
 */

const crypto = require('crypto');

/**
 * Cria fingerprint de um anúncio
 * Baseado em: url, ad_id, telefone, preço + tipologia + área + localização
 */
function fingerprint(ad) {
  const parts = [];
  
  // URL (mais confiável)
  if (ad.url) {
    parts.push(`url:${ad.url}`);
  }
  
  // ad_id + source (único por plataforma)
  if (ad.ad_id && ad.source) {
    parts.push(`id:${ad.source}:${ad.ad_id}`);
  }
  
  // Telefone (se disponível)
  if (ad.advertiser?.phone) {
    const phone = String(ad.advertiser.phone).replace(/\s+/g, '');
    parts.push(`phone:${phone}`);
  }
  
  // Preço + tipologia + área + localização (combinado)
  const price = (ad.price || '').trim();
  const tipology = (ad.property?.tipology || '').trim();
  const area = (ad.property?.area_useful || ad.property?.area_total || '').trim();
  const location = [
    ad.location?.district,
    ad.location?.municipality,
    ad.location?.parish
  ].filter(Boolean).join('|');
  
  if (price || tipology || area || location) {
    parts.push(`combo:${price}|${tipology}|${area}|${location}`);
  }
  
  // Criar hash do fingerprint
  const fingerprintString = parts.join('||');
  if (!fingerprintString) {
    // Fallback: usar título + preço se não houver nada
    const fallback = `${ad.title || ''}|${ad.price || ''}`;
    return crypto.createHash('md5').update(fallback).digest('hex');
  }
  
  return crypto.createHash('md5').update(fingerprintString).digest('hex');
}

/**
 * Verifica se anúncio é duplicado em memória
 * @param {Object} ad - Anúncio
 * @param {Array} existingItems - Lista de anúncios já processados
 * @returns {boolean}
 */
function isDuplicateInMemory(ad, existingItems) {
  const fp = fingerprint(ad);
  return existingItems.some(item => {
    const itemFp = item._fingerprint || fingerprint(item);
    return itemFp === fp;
  });
}

/**
 * Deduplica lista de anúncios (apenas em memória)
 * @param {Array} items - Lista de anúncios
 * @returns {Object} - { unique: [], duplicates: [] }
 */
function dedupeListInMemory(items) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  
  for (const item of items) {
    // Adicionar fingerprint ao item
    const fp = fingerprint(item);
    item._fingerprint = fp;
    
    // Verificar se já vimos este fingerprint
    if (seen.has(fp)) {
      duplicates.push(item);
      continue;
    }
    
    seen.add(fp);
    unique.push(item);
  }
  
  return {
    unique,
    duplicates
  };
}

module.exports = {
  fingerprint,
  isDuplicateInMemory,
  dedupeListInMemory
};

