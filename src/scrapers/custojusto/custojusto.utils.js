/**
 * Utilitários para scraper CustoJusto
 */

const { cleanText } = require('../../utils/selectors');

/**
 * Extrai ID do anúncio da URL
 * Exemplos:
 * - https://www.custojusto.pt/leiria/imobiliario/moradias/moradia-e-espaco-comercial-44325290 -> 44325290
 * - https://www.custojusto.pt/id-12345678 -> 12345678
 */
function extractAdId(url) {
  if (!url) return null;
  
  // Padrão 1: Slug com ID no final (formato mais comum)
  // Exemplo: /leiria/imobiliario/moradias/moradia-e-espaco-comercial-44325290
  const slugMatch = url.match(/-(\d{6,})(?:\/|$|\?|#)/);
  if (slugMatch) {
    return slugMatch[1];
  }
  
  // Padrão 2: /id-XXXXXXX
  const idMatch = url.match(/\/id-(\d+)/);
  if (idMatch) {
    return idMatch[1];
  }
  
  // Padrão 3: /anuncio/XXXXXXX
  const anuncioMatch = url.match(/\/anuncio\/(\d+)/);
  if (anuncioMatch) {
    return anuncioMatch[1];
  }
  
  // Padrão 4: Número no final da URL (pelo menos 6 dígitos para evitar falsos positivos)
  const numberMatch = url.match(/(\d{6,})(?:\/|$|\?|#)/);
  if (numberMatch) {
    return numberMatch[1];
  }
  
  return null;
}

/**
 * Normaliza telefone para formato +3519XXXXXXXX
 */
function normalizePhone(phoneText) {
  if (!phoneText) return null;
  
  // Remover espaços, hífens, parênteses
  let cleaned = phoneText.replace(/[\s\-\(\)\.]/g, '');
  
  // Remover prefixos comuns
  cleaned = cleaned.replace(/^\+351/, '');
  cleaned = cleaned.replace(/^00351/, '');
  cleaned = cleaned.replace(/^351/, '');
  
  // Se começar com 9, adicionar +351
  if (cleaned.match(/^9\d{8}$/)) {
    return `+351${cleaned}`;
  }
  
  // Se tiver 9 dígitos e começar com 9
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    return `+351${cleaned}`;
  }
  
  // Se já tiver formato completo
  if (cleaned.match(/^\+3519\d{8}$/)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Extrai preço de texto
 */
function extractPrice(priceText) {
  if (!priceText) return null;
  
  // Remover tudo exceto números
  const cleaned = priceText.replace(/[^\d,]/g, '').replace(',', '.');
  const numValue = parseFloat(cleaned);
  
  return isNaN(numValue) ? null : numValue.toString();
}

/**
 * Delay aleatório entre min e max (ms)
 */
function randomDelay(min = 1300, max = 3500) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * User agents realistas
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Scroll lento e natural
 */
async function slowScroll(page, direction = 'down', distance = 300) {
  const scrollStep = 50;
  const steps = Math.ceil(distance / scrollStep);
  
  for (let i = 0; i < steps; i++) {
    if (direction === 'down') {
      await page.evaluate((step) => {
        window.scrollBy(0, step);
      }, scrollStep);
    } else {
      await page.evaluate((step) => {
        window.scrollBy(0, -step);
      }, scrollStep);
    }
    
    await randomDelay(50, 150);
  }
}

module.exports = {
  extractAdId,
  normalizePhone,
  extractPrice,
  randomDelay,
  getRandomUserAgent,
  slowScroll
};

