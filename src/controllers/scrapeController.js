/**
 * Controller para scraping de anúncios
 * Compatível com n8n - sempre retorna HTTP 200
 */

const { detectPlatform } = require('../utils/selectors');
const scrapeOLX = require('../scrapers/olx');
const scrapeImovirtual = require('../scrapers/imovirtual');
const { formatSuccess, formatError, createError, ERROR_TYPES } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

/**
 * Valida URL
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw createError(ERROR_TYPES.VALIDATION_ERROR, 'URL is required and must be a string');
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw createError(ERROR_TYPES.VALIDATION_ERROR, 'URL must use http or https protocol');
    }
  } catch (error) {
    if (error.errorType) {
      throw error;
    }
    throw createError(ERROR_TYPES.VALIDATION_ERROR, 'Invalid URL format');
  }
}

/**
 * Controller principal de scraping
 */
async function scrapeController(req, res) {
  const startTime = Date.now();
  let platform = null;
  let url = null;
  
  try {
    // Extrair URL do body
    url = req.body?.url || req.query?.url;
    
    if (!url) {
      const error = createError(ERROR_TYPES.VALIDATION_ERROR, 'URL parameter is required');
      const response = formatError(error, null, null, startTime);
      logger.error('CONTROLLER', `Validation error: ${response.message}`, { url });
      return res.status(200).json(response);
    }
    
    // Validar URL
    try {
      validateUrl(url);
    } catch (error) {
      const response = formatError(error, null, url, startTime);
      logger.error('CONTROLLER', `URL validation failed: ${response.message}`, { url });
      return res.status(200).json(response);
    }
    
    // Detectar plataforma
    try {
      platform = detectPlatform(url);
      logger.info('CONTROLLER', `Platform detected: ${platform}`, { url });
    } catch (error) {
      const response = formatError(error, null, url, startTime, ERROR_TYPES.UNSUPPORTED_PLATFORM);
      logger.error('CONTROLLER', `Platform detection failed: ${response.message}`, { url });
      return res.status(200).json(response);
    }
    
    // Extrair opções do body (n8n pode enviar)
    const options = {
      headless: req.body?.headless !== undefined ? req.body.headless : true,
      includeRawHtml: req.body?.include_raw_html === true,
      timeout: req.body?.max_timeout || 30000,
      proxy: req.body?.proxy || null
    };
    
    logger.info('CONTROLLER', `Starting scrape`, { platform, url, options });
    
    // Chamar scraper apropriado
    let result;
    try {
      if (platform === 'olx') {
        result = await scrapeOLX(url, options);
      } else if (platform === 'imovirtual') {
        result = await scrapeImovirtual(url, options);
      } else {
        throw createError(ERROR_TYPES.UNSUPPORTED_PLATFORM, `Platform '${platform}' is not supported`);
      }
    } catch (error) {
      // Erros do scraper
      const response = formatError(error, platform, url, startTime);
      logger.error('CONTROLLER', `Scraper error: ${response.message}`, { platform, url, errorType: response.error_type });
      return res.status(200).json(response);
    }
    
    // Remover 'success' do resultado do scraper (será adicionado pelo formatter)
    const { success, ...scrapedData } = result;
    
    // Formatar resposta de sucesso
    const response = formatSuccess(scrapedData, platform, url, startTime);
    
    logger.info('CONTROLLER', `Scrape completed successfully`, { 
      platform, 
      url, 
      duration_ms: response.duration_ms,
      ad_id: scrapedData.ad_id 
    });
    
    // Sempre retornar HTTP 200, mesmo em caso de erro
    return res.status(200).json(response);
    
  } catch (error) {
    // Erro inesperado (fatal)
    const response = formatError(error, platform, url, startTime, ERROR_TYPES.FATAL);
    logger.error('CONTROLLER', `Fatal error: ${response.message}`, { 
      platform, 
      url, 
      errorType: response.error_type,
      stack: error.stack 
    });
    
    // Sempre retornar HTTP 200
    return res.status(200).json(response);
  }
}

module.exports = {
  scrapeController
};
