/**
 * Logger estruturado para scraping
 * Nunca mistura logs com JSON de resposta
 */

/**
 * Níveis de log
 */
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Formata timestamp
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Log estruturado
 */
function logEvent(level, platform, message, data = null) {
  const timestamp = formatTimestamp();
  const prefix = `[SCRAPER][${platform || 'UNKNOWN'}][${timestamp}][${level}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Funções de conveniência
 */
const logger = {
  debug: (platform, message, data) => logEvent(LOG_LEVELS.DEBUG, platform, message, data),
  info: (platform, message, data) => logEvent(LOG_LEVELS.INFO, platform, message, data),
  warn: (platform, message, data) => logEvent(LOG_LEVELS.WARN, platform, message, data),
  error: (platform, message, data) => logEvent(LOG_LEVELS.ERROR, platform, message, data)
};

module.exports = logger;

