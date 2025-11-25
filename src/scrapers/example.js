/**
 * Exemplo de scraper FSBO
 * Use este arquivo como template para criar novos scrapers
 */

const { createBrowser, createPage, navigateWithRetry, waitForElement, clickWithRetry } = require('../utils/browser');
const { extractPhone, cleanText } = require('../utils/selectors');

/**
 * Scrapes FSBO listing data from a URL
 * @param {string} url - URL do anúncio
 * @param {Object} options - Opções de scraping
 * @param {boolean} options.headless - Modo headless
 * @param {boolean} options.includeRawHtml - Incluir HTML bruto na resposta
 * @returns {Promise<Object>}
 */
async function scrapeExample(url, options = {}) {
  const {
    headless = true,
    includeRawHtml = false
  } = options;

  let browser = null;
  let page = null;

  try {
    console.log(`[Scraper] Starting scrape for: ${url}`);

    // Criar browser e página
    browser = await createBrowser({ headless });
    page = await createPage(browser);

    // Navegar para a URL
    await navigateWithRetry(page, url);

    // Aguardar carregamento da página
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Extrair dados
    const title = await extractTitle(page);
    const price = await extractPrice(page);
    const location = await extractLocation(page);
    const phone = await extractPhoneNumber(page);
    const description = await extractDescription(page);
    const rawHtml = includeRawHtml ? await page.content() : null;

    const result = {
      success: true,
      platform: 'example',
      url,
      title,
      price,
      location,
      phone,
      description,
      ...(rawHtml && { rawHtml })
    };

    console.log(`[Scraper] Scrape completed successfully`);
    return result;

  } catch (error) {
    console.error(`[Scraper] Error:`, error);
    throw error;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Extrai o título do anúncio
 */
async function extractTitle(page) {
  try {
    const titleElement = await waitForElement(page, 'h1, [class*="title"]');
    if (titleElement) {
      const text = await titleElement.textContent();
      return cleanText(text);
    }
  } catch (error) {
    console.warn('[Scraper] Could not extract title');
  }
  return null;
}

/**
 * Extrai o preço
 */
async function extractPrice(page) {
  try {
    const priceElement = await waitForElement(page, '[class*="price"]');
    if (priceElement) {
      const text = await priceElement.textContent();
      return cleanText(text);
    }
  } catch (error) {
    console.warn('[Scraper] Could not extract price');
  }
  return null;
}

/**
 * Extrai a localização
 */
async function extractLocation(page) {
  try {
    const locationElement = await waitForElement(page, '[class*="location"], [class*="address"]');
    if (locationElement) {
      const text = await locationElement.textContent();
      return cleanText(text);
    }
  } catch (error) {
    console.warn('[Scraper] Could not extract location');
  }
  return null;
}

/**
 * Extrai o número de telefone
 */
async function extractPhoneNumber(page) {
  try {
    // Tentar clicar no botão de mostrar telefone se existir
    const phoneButton = await waitForElement(page, 'button:has-text("Show"), button:has-text("Phone"), [class*="phone-button"]');
    if (phoneButton) {
      await clickWithRetry(page, 'button:has-text("Show"), button:has-text("Phone"), [class*="phone-button"]');
      await page.waitForTimeout(2000); // Aguardar telefone aparecer
    }

    // Procurar telefone na página
    const phoneElement = await waitForElement(page, '[class*="phone"], [data-phone], a[href^="tel:"]');
    if (phoneElement) {
      const text = await phoneElement.textContent();
      const href = await phoneElement.getAttribute('href');
      const phoneText = href && href.startsWith('tel:') ? href.replace('tel:', '') : text;
      return extractPhone(phoneText);
    }

    // Tentar extrair de qualquer texto na página
    const bodyText = await page.textContent('body');
    return extractPhone(bodyText);
  } catch (error) {
    console.warn('[Scraper] Could not extract phone');
  }
  return null;
}

/**
 * Extrai a descrição
 */
async function extractDescription(page) {
  try {
    const descElement = await waitForElement(page, '[class*="description"], [class*="details"]');
    if (descElement) {
      const text = await descElement.textContent();
      return cleanText(text);
    }
  } catch (error) {
    console.warn('[Scraper] Could not extract description');
  }
  return null;
}

module.exports = scrapeExample;


