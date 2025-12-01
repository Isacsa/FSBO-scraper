const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Aplicar plugin stealth
chromium.use(StealthPlugin());

// User agents realistas
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

/**
 * Determina se o browser deve rodar em modo headless
 * 
 * Regras:
 * - Se FSBO_HEADLESS=true → sempre headless
 * - Se N8N, FSBO_SERVER, ou CI estão definidos → sempre headless
 * - Se não for macOS (Darwin) → sempre headless (servidor Linux)
 * - Se for macOS local → respeita a flag headless passada (default: true)
 * 
 * @param {Object} flags - Flags de configuração
 * @param {boolean} flags.headless - Flag headless do usuário (opcional)
 * @returns {boolean} - true se deve rodar headless, false caso contrário
 */
function shouldRunHeadless(flags = {}) {
  // Forçar headless via variável de ambiente
  if (process.env.FSBO_HEADLESS === 'true') {
    return true;
  }
  
  // Forçar headless em ambientes de servidor/CI
  if (process.env.N8N || process.env.FSBO_SERVER || process.env.CI) {
    return true;
  }
  
  // Forçar headless em sistemas não-macOS (Linux, Windows em servidor)
  const isLocal = process.platform === 'darwin';
  if (!isLocal) {
    return true;
  }
  
  // Em macOS local, respeitar a flag passada (default: true)
  return flags.headless !== undefined ? flags.headless : true;
}

/**
 * Cria e configura um browser com stealth
 * @param {Object} options - Opções de configuração
 * @param {number} options.timeout - Timeout em ms (default: 30000)
 * @param {boolean} options.headless - Modo headless desejado (será validado por shouldRunHeadless)
 * @param {string} options.proxy - Proxy server (opcional)
 * @returns {Promise<Browser>}
 */
async function createBrowser(options = {}) {
  const {
    timeout = 30000,
    headless: requestedHeadless = true,
    proxy = null
  } = options;

  // Usar função centralizada para determinar headless real
  const effectiveHeadless = shouldRunHeadless({ headless: requestedHeadless });

  // Detectar se estamos em servidor Linux (VPS sem interface gráfica)
  const isServerLinux = process.platform === 'linux';
  const isServerEnv = !!(process.env.N8N || process.env.FSBO_SERVER || process.env.CI);

  // Argumentos ESSENCIAIS para servidor Linux (VPS sem X11)
  // Estes args são OBRIGATÓRIOS em servidor para evitar crashes do Playwright
  // Especificamente necessários para VPS Hostinger Ubuntu sem X11
  const serverArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ];

  // Argumentos adicionais para headless (Docker/CI/VPS)
  const headlessArgs = [
    '--no-first-run',
    '--disable-accelerated-2d-canvas',
    '--no-zygote',
    '--disable-gpu'
  ];

  // Argumentos base para modo local (macOS)
  const localArgs = [
    '--disable-dev-shm-usage',
    '--no-first-run'
  ];

  // Determinar args baseado no ambiente
  let args;
  if (isServerLinux || isServerEnv) {
    // SERVIDOR (VPS Linux): SEMPRE usar args de servidor
    // Mesmo que effectiveHeadless seja false (nunca será em servidor, mas garantimos)
    // Estes args são CRÍTICOS para funcionar em VPS sem X11
    args = effectiveHeadless 
      ? [...serverArgs, ...headlessArgs]  // Headless: todos os args
      : [...serverArgs];  // Não-headless (teórico): pelo menos args de servidor
  } else {
    // LOCAL (macOS): usar args apenas se headless
    args = effectiveHeadless ? [...localArgs, ...headlessArgs] : localArgs;
  }

  const launchOptions = {
    headless: effectiveHeadless,
    args
  };
  
  // Adicionar proxy se fornecido
  if (proxy) {
    launchOptions.proxy = {
      server: proxy
    };
  }
  
  // Adicionar slowMo para debug quando headless é false (apenas local macOS)
  if (!effectiveHeadless) {
    launchOptions.slowMo = 150;
  }
  
  const browser = await chromium.launch(launchOptions);

  return browser;
}

/**
 * Cria uma nova página com configurações stealth
 * @param {Browser} browser - Instância do browser
 * @param {Object} options - Opções de configuração
 * @param {string} options.storageStatePath - Caminho para o ficheiro de sessão (storageState)
 * @returns {Promise<Page>}
 */
async function createPage(browser, options = {}) {
  const {
    timeout = 30000,
    viewport = { width: 1920, height: 1080 },
    storageStatePath = null
  } = options;

  // Configuração base do contexto
  const contextOptions = {
    viewport: viewport,
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    locale: options.locale || 'en-US',
    timezoneId: options.timezoneId || 'America/New_York',
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': options.locale === 'pt-PT' ? 'pt-PT,pt;q=0.9,en;q=0.8' : 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  };
  
  // Adicionar geolocation se especificado
  if (options.geolocation) {
    contextOptions.geolocation = options.geolocation;
  }

  // Carregar sessão guardada se o ficheiro existir
  if (storageStatePath) {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.isAbsolute(storageStatePath) 
      ? storageStatePath 
      : path.join(process.cwd(), storageStatePath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`[Browser] ✅ Loading session from: ${fullPath}`);
      try {
        contextOptions.storageState = fullPath;
        console.log(`[Browser] ✅ Session loaded successfully!`);
      } catch (error) {
        console.error(`[Browser] ❌ Error loading session:`, error.message);
      }
    } else {
      console.warn(`[Browser] ⚠️  Session file not found: ${fullPath}`);
    }
  }

  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);

  // Técnicas manuais de stealth
  await page.addInitScript(() => {
    // Esconder webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });

    // Adicionar plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Adicionar languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Chrome runtime
    window.chrome = {
      runtime: {}
    };
  });

  return page;
}

/**
 * Navega para uma URL com retry
 * @param {Page} page - Instância da página
 * @param {string} url - URL para navegar
 * @param {Object} options - Opções
 * @param {number} options.retries - Número de tentativas (default: 3)
 * @param {number} options.waitUntil - Wait until condition (default: 'domcontentloaded')
 * @returns {Promise<Response>}
 */
async function navigateWithRetry(page, url, options = {}) {
  const {
    retries = 3,
    waitUntil = 'domcontentloaded'
  } = options;

  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Browser] Navigating to ${url} (attempt ${i + 1}/${retries})`);
      const response = await page.goto(url, {
        waitUntil: waitUntil,
        timeout: 30000
      });
      console.log(`[Browser] Navigation successful: ${response.status()}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`[Browser] Navigation attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Espera por um elemento aparecer na página
 * @param {Page} page - Instância da página
 * @param {string} selector - Seletor CSS
 * @param {number} timeout - Timeout em ms
 * @returns {Promise<ElementHandle>}
 */
async function waitForElement(page, selector, timeout = 10000) {
  try {
    console.log(`[Browser] Waiting for element: ${selector}`);
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return await page.$(selector);
  } catch (error) {
    console.warn(`[Browser] Element not found: ${selector}`);
    return null;
  }
}

/**
 * Clica em um elemento com retry
 * @param {Page} page - Instância da página
 * @param {string} selector - Seletor CSS
 * @param {Object} options - Opções
 * @returns {Promise<void>}
 */
async function clickWithRetry(page, selector, options = {}) {
  const { retries = 3, timeout = 10000 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Browser] Clicking element: ${selector} (attempt ${i + 1}/${retries})`);
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      await page.click(selector);
      // Pequeno delay após o clique
      await page.waitForTimeout(1000);
      console.log(`[Browser] Click successful: ${selector}`);
      return;
    } catch (error) {
      console.warn(`[Browser] Click attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await page.waitForTimeout(1000);
      } else {
        throw error;
      }
    }
  }
}

module.exports = {
  createBrowser,
  createPage,
  navigateWithRetry,
  waitForElement,
  clickWithRetry,
  shouldRunHeadless
};


