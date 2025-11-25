/**
 * Formatador de respostas para n8n
 * Garante estrutura consistente e previsível
 */

/**
 * Categorias de erro padronizadas
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  NAVIGATION_ERROR: 'NAVIGATION_ERROR',
  SCRAPER_ERROR: 'SCRAPER_ERROR',
  TIMEOUT: 'TIMEOUT',
  FATAL: 'FATAL'
};

/**
 * Formata resposta de sucesso
 */
function formatSuccess(data, platform, url, startTime) {
  const endTime = Date.now();
  const duration_ms = endTime - startTime;
  
  return {
    success: true,
    platform: platform || 'unknown',
    url: url || '',
    timestamp: new Date().toISOString(),
    duration_ms: duration_ms,
    data: data
  };
}

/**
 * Formata resposta de erro
 */
function formatError(error, platform, url, startTime, errorType = null) {
  const endTime = Date.now();
  const duration_ms = startTime ? endTime - startTime : 0;
  
  // Determinar tipo de erro se não fornecido
  if (!errorType) {
    errorType = determineErrorType(error);
  }
  
  // Extrair mensagem
  let message = 'An unexpected error occurred';
  if (error && typeof error === 'string') {
    message = error;
  } else if (error && error.message) {
    message = error.message;
  } else if (error && typeof error === 'object') {
    message = JSON.stringify(error);
  }
  
  // Construir resposta base
  const response = {
    success: false,
    error_type: errorType,
    message: message,
    url: url || '',
    platform: platform || 'unknown',
    timestamp: new Date().toISOString(),
    duration_ms: duration_ms
  };
  
  // Adicionar stack apenas para erros FATAL em desenvolvimento
  if (errorType === ERROR_TYPES.FATAL && error && error.stack && process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }
  
  return response;
}

/**
 * Determina o tipo de erro baseado na mensagem ou tipo
 */
function determineErrorType(error) {
  if (!error) return ERROR_TYPES.FATAL;
  
  const errorMessage = (error.message || error.toString() || '').toLowerCase();
  const errorName = (error.name || '').toLowerCase();
  
  // Timeout
  if (errorMessage.includes('timeout') || errorName.includes('timeout')) {
    return ERROR_TYPES.TIMEOUT;
  }
  
  // Navigation errors
  if (errorMessage.includes('navigation') || 
      errorMessage.includes('page.goto') ||
      errorMessage.includes('net::') ||
      errorMessage.includes('net::err_')) {
    return ERROR_TYPES.NAVIGATION_ERROR;
  }
  
  // Validation errors
  if (errorMessage.includes('invalid url') ||
      errorMessage.includes('url inválida') ||
      errorMessage.includes('validation')) {
    return ERROR_TYPES.VALIDATION_ERROR;
  }
  
  // Unsupported platform
  if (errorMessage.includes('unsupported') ||
      errorMessage.includes('platform not supported') ||
      errorMessage.includes('plataforma não suportada')) {
    return ERROR_TYPES.UNSUPPORTED_PLATFORM;
  }
  
  // Scraper errors (seletores, parsing, etc)
  if (errorMessage.includes('selector') ||
      errorMessage.includes('extract') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('scraper')) {
    return ERROR_TYPES.SCRAPER_ERROR;
  }
  
  // Default: FATAL
  return ERROR_TYPES.FATAL;
}

/**
 * Cria um erro padronizado
 */
function createError(type, message, originalError = null) {
  const error = new Error(message);
  error.errorType = type;
  error.originalError = originalError;
  return error;
}

module.exports = {
  formatSuccess,
  formatError,
  determineErrorType,
  createError,
  ERROR_TYPES
};

