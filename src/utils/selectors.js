/**
 * Seletores CSS e utilitários para scrapers FSBO
 */

/**
 * Regex para extrair telefones (formato português e internacional)
 */
const PHONE_REGEX_PT = /(\+351)?\s?9\d{2}\s?\d{3}\s?\d{3}/g;
const PHONE_REGEX_US = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

/**
 * Limpa e formata um número de telefone
 * @param {string} text - Texto com possível telefone
 * @returns {string|null}
 */
function extractPhone(text) {
  if (!text) return null;
  
  // Tentar formato português primeiro
  const ptMatches = text.match(PHONE_REGEX_PT);
  if (ptMatches && ptMatches.length > 0) {
    let phone = ptMatches[0].replace(/[\s\-\(\)\.]/g, '').trim();
    // Adicionar +351 se não tiver
    if (!phone.startsWith('+351') && phone.match(/^9\d{8}$/)) {
      phone = `+351${phone}`;
    } else if (phone.startsWith('351') && phone.length === 12) {
      phone = `+${phone}`;
    }
    return phone;
  }
  
  // Tentar formato US/Canadá
  const usMatches = text.match(PHONE_REGEX_US);
  if (usMatches && usMatches.length > 0) {
    let phone = usMatches[0].replace(/[\s\-\(\)\.]/g, '').trim();
    // Adiciona +1 se não tiver código do país
    if (!phone.startsWith('+1') && phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.startsWith('1') && phone.length === 11) {
      phone = `+${phone}`;
    }
    return phone;
  }
  
  return null;
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
  
  // Idealista
  if (lowerUrl.includes('idealista.pt')) {
    return 'idealista';
  }
  
  // CustoJusto
  if (lowerUrl.includes('custojusto.pt')) {
    return 'custojusto';
  }
  
  // Casa Sapo
  if (lowerUrl.includes('casa.sapo.pt')) {
    return 'casasapo';
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
  PHONE_REGEX: PHONE_REGEX_PT, // Mantido para compatibilidade
  PHONE_REGEX_PT,
  PHONE_REGEX_US,
  extractPhone,
  cleanText,
  detectPlatform
};


