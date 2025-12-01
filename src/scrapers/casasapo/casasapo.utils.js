/**
 * Utilitários para scraper Casa Sapo
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

/**
 * Gera user agent aleatório
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Cria browser com configurações anti-bot
 */
async function createBrowser(options = {}) {
  const {
    headless: requestedHeadless = true,  // Default true, mas será validado por shouldRunHeadless()
    timeout = 60000
  } = options;
  
  // Usar função centralizada para determinar headless real
  const { shouldRunHeadless } = require('../../utils/browser');
  const effectiveHeadless = shouldRunHeadless({ headless: requestedHeadless });
  
  // Detectar se estamos em servidor Linux (VPS sem interface gráfica)
  const isServerLinux = process.platform === 'linux';
  const isServerEnv = !!(process.env.N8N || process.env.FSBO_SERVER || process.env.CI);
  
  // Argumentos ESSENCIAIS para servidor Linux (VPS sem X11)
  const serverArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ];
  
  // Argumentos adicionais para headless
  const headlessArgs = [
    '--disable-accelerated-2d-canvas',
    '--no-zygote',
    '--disable-gpu'
  ];
  
  // Em servidor, sempre usar args de servidor
  const args = (isServerLinux || isServerEnv)
    ? (effectiveHeadless ? [...serverArgs, ...headlessArgs] : serverArgs)
    : (effectiveHeadless ? [...serverArgs, ...headlessArgs] : serverArgs);
  
  return await chromium.launch({
    headless: effectiveHeadless,
    timeout,
    args: [
      ...args,
      '--disable-blink-features=AutomationControlled'  // Anti-bot específico
    ]
  });
}

/**
 * Cria página com configurações
 */
async function createPage(browser, options = {}) {
  const {
    timeout = 60000,
    locale = 'pt-PT',
    timezoneId = 'Europe/Lisbon',
    userAgent = getRandomUserAgent()
  } = options;
  
  const context = await browser.newContext({
    locale,
    timezoneId,
    userAgent,
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  
  const page = await context.newPage();
  
  // Override webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
  });
  
  return { page, context };
}

/**
 * Navegação com retry
 */
async function navigateWithRetry(page, url, options = {}) {
  const {
    maxRetries = 3,
    timeout = 60000,
    waitUntil = 'domcontentloaded'
  } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Browser] Navigating to ${url} (attempt ${attempt}/${maxRetries})`);
      await page.goto(url, { waitUntil, timeout });
      const status = page.url() === url ? 200 : 'redirected';
      console.log(`[Browser] Navigation successful: ${status}`);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to navigate after ${maxRetries} attempts: ${error.message}`);
      }
      console.warn(`[Browser] Navigation attempt ${attempt} failed, retrying...`);
      await randomDelay(2000, 4000);
    }
  }
}

/**
 * Delay aleatório
 */
async function randomDelay(min = 1500, max = 3200) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Scroll lento e natural
 */
async function slowScroll(page, direction = 'down', distance = 500, delay = 100) {
  const scrollAmount = direction === 'down' ? distance : -distance;
  await page.evaluate(({ amount, delay }) => {
    window.scrollBy({
      top: amount,
      left: 0,
      behavior: 'smooth'
    });
    return new Promise(resolve => setTimeout(resolve, delay));
  }, { amount: scrollAmount, delay });
}

/**
 * Fechar popups e overlays
 */
async function closePopupsAndOverlays(page) {
  try {
    // Aceitar cookies
    const cookieSelectors = [
      'button:has-text("Aceitar")',
      'button:has-text("Accept")',
      'button:has-text("Concordo")',
      '[id*="cookie"]',
      '[class*="cookie"]'
    ];
    
    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await randomDelay(500, 1000);
          break;
        }
      } catch (e) {
        // Continuar
      }
    }
    
    // Fechar modais
    const modalSelectors = [
      'button[aria-label*="fechar"]',
      'button[aria-label*="close"]',
      '.modal-close',
      '[class*="close"]'
    ];
    
    for (const selector of modalSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await randomDelay(500, 1000);
        }
      } catch (e) {
        // Continuar
      }
    }
  } catch (e) {
    // Ignorar erros de popups
  }
}

/**
 * Extrai ID do anúncio da URL
 */
function extractAdId(url) {
  if (!url) return null;
  
  // Padrão: /imoveis/ID ou /imoveis/...-ID
  const idMatch = url.match(/\/(\d+)(?:\/|$|\?)/);
  if (idMatch) {
    return idMatch[1];
  }
  
  // Tentar extrair qualquer número no final
  const numberMatch = url.match(/(\d{6,})(?:\/|$|\?)/);
  if (numberMatch) {
    return numberMatch[1];
  }
  
  return null;
}

/**
 * Normaliza telefone
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remover espaços, traços, parênteses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Adicionar +351 se começar com 9
  if (cleaned.match(/^9\d{8}$/)) {
    cleaned = `+351${cleaned}`;
  }
  
  // Verificar formato válido
  if (cleaned.match(/^\+3519\d{8}$/)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Extrai preço
 */
function extractPrice(priceText) {
  if (!priceText) return null;
  
  // Remover tudo exceto números
  const cleaned = priceText.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  
  return isNaN(price) ? null : Math.floor(price).toString();
}

module.exports = {
  getRandomUserAgent,
  createBrowser,
  createPage,
  navigateWithRetry,
  randomDelay,
  slowScroll,
  closePopupsAndOverlays,
  extractAdId,
  normalizePhone,
  extractPrice
};

