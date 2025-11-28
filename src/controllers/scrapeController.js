/**
 * Controller para scraping de anúncios
 * Compatível com n8n - sempre retorna HTTP 200
 */

const { detectPlatform } = require('../utils/selectors');
const scrapeOLX = require('../scrapers/olx');
const scrapeImovirtual = require('../scrapers/imovirtual');
const scrapeIdealistaLobstr = require('../scrapers/idealista_lobstr/idealista.scraper');
const scrapeCustoJusto = require('../scrapers/custojusto/custojusto.scraper');
const scrapeCasaSapo = require('../scrapers/casasapo/casasapo.scraper');
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
      } else if (platform === 'idealista') {
        // Idealista via Lobstr retorna { success, total_results, items }
        const lobstrResult = await scrapeIdealistaLobstr(url, {
          maxResults: req.body?.max_results || null,
          maxWait: options.timeout || 600000 // 10 minutos
        });
        
        // Para compatibilidade com API de anúncio individual, retornar primeiro item
        // Se não houver items, lançar erro
        if (!lobstrResult.items || lobstrResult.items.length === 0) {
          throw createError(ERROR_TYPES.SCRAPER_ERROR, 'Nenhum listing encontrado');
        }
        
        // Retornar primeiro listing (compatibilidade com formato de anúncio individual)
        result = lobstrResult.items[0];
      } else if (platform === 'custojusto') {
        // CustoJusto retorna { success, new_ads, total_new, all_ads }
        const custojustoResult = await scrapeCustoJusto(url, {
          onlyNew: req.body?.only_new === true,
          maxPages: req.body?.max_pages || null,
          maxAds: req.body?.max_ads || null
        });
        
        // Para compatibilidade com API de anúncio individual, retornar primeiro item
        if (!custojustoResult.all_ads || custojustoResult.all_ads.length === 0) {
          throw createError(ERROR_TYPES.SCRAPER_ERROR, 'Nenhum anúncio encontrado');
        }
        
        // Retornar primeiro anúncio (compatibilidade com formato de anúncio individual)
        result = custojustoResult.all_ads[0];
      } else if (platform === 'casasapo') {
        // Casa Sapo retorna { success, new_ads, total_new, items }
        const casasapoResult = await scrapeCasaSapo(url, {
          onlyNew: req.body?.only_new === true,
          maxPages: req.body?.max_pages || null,
          maxAds: req.body?.max_ads || null
        });
        
        // Para compatibilidade com API de anúncio individual, retornar primeiro item
        if (!casasapoResult.items || casasapoResult.items.length === 0) {
          throw createError(ERROR_TYPES.SCRAPER_ERROR, 'Nenhum anúncio encontrado');
        }
        
        // Retornar primeiro anúncio (compatibilidade com formato de anúncio individual)
        result = casasapoResult.items[0];
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
