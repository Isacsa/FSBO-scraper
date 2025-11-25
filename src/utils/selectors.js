/**
 * Seletores CSS e utilitários para scrapers FSBO
 */

/**
 * Regex para extrair telefones (formato US/Canadá)
 */
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

/**
 * Limpa e formata um número de telefone
 * @param {string} text - Texto com possível telefone
 * @returns {string|null}
 */
function extractPhone(text) {
  if (!text) return null;
  
  const matches = text.match(PHONE_REGEX);
  if (!matches || matches.length === 0) return null;
  
  // Pega o primeiro match e limpa
  let phone = matches[0].replace(/[\s\-\(\)\.]/g, '').trim();
  
  // Adiciona +1 se não tiver código do país
  if (!phone.startsWith('+1') && phone.length === 10) {
    phone = `+1${phone}`;
  } else if (phone.startsWith('1') && phone.length === 11) {
    phone = `+${phone}`;
  }
  
  return phone;
}

/**
 * Limpa texto extraído
 * @param {string} text - Texto a limpar
 * @returns {string|null}
 */
function cleanText(text) {
  if (!text) return null;
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Detecta a plataforma baseado na URL
 * @param {string} url - URL do anúncio
 * @returns {string|null}
 */
function detectPlatform(url) {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  
  // OLX
  if (lowerUrl.includes('olx.pt')) {
    return 'olx';
  }
  
  // Imovirtual
  if (lowerUrl.includes('imovirtual.com')) {
    return 'imovirtual';
  }
  
  // Adicionar detecção de plataformas FSBO aqui
  // Exemplos: fsbo.com, forsalebyowner.com, etc.
  if (lowerUrl.includes('fsbo.com')) {
    return 'fsbo';
  } else if (lowerUrl.includes('forsalebyowner.com')) {
    return 'forsalebyowner';
  }
  
  return null;
}

module.exports = {
  PHONE_REGEX,
  extractPhone,
  cleanText,
  detectPlatform
};


