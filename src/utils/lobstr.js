/**
 * Integração com Lobstr.io - Browser humano via CDP
 */

const axios = require('axios');

// API Key do Lobstr.io - pode ser definida via variável de ambiente
// API Key do Lobstr.io - pode ser definida via variável de ambiente
const LOBSTR_API_KEY = process.env.LOBSTR_API_KEY || 'ff1aa7541d74751227f0038459e2c5c92168f15d';
// Tentar diferentes bases de API
const LOBSTR_API_BASE = process.env.LOBSTR_API_BASE || 'https://api.lobstr.io/v1';

/**
 * Cria uma nova sessão no Lobstr.io
 * @param {Object} options - Opções da sessão
 * @returns {Promise<Object>} - { sessionId, cdpUrl } ou null se falhar
 */
async function createLobstrSession(options = {}) {
  const {
    region = 'eu-west-1',
    browser = 'chrome',
    os = 'windows'
  } = options;
  
  try {
    console.log('[Lobstr] 🚀 Criando sessão no Lobstr.io...');
    
    // Tentar diferentes formatos de API
    let response;
    
    // Tentativa 1: POST com body
    try {
      response = await axios.post(
        `${LOBSTR_API_BASE}/sessions`,
        {
          region,
          browser,
          os
        },
        {
          headers: {
            'Authorization': `Bearer ${LOBSTR_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    } catch (error) {
      // Tentativa 2: GET com query params
      if (error.response && error.response.status === 405) {
        console.log('[Lobstr] ⚠️  POST não permitido, tentando GET...');
        try {
          response = await axios.get(
            `${LOBSTR_API_BASE}/sessions`,
            {
              params: {
                region,
                browser,
                os
              },
              headers: {
                'Authorization': `Bearer ${LOBSTR_API_KEY}`
              },
              timeout: 30000
            }
          );
        } catch (error2) {
          // Tentativa 3: Endpoint alternativo sem /v1
          console.log('[Lobstr] ⚠️  Tentando endpoint alternativo...');
          try {
            response = await axios.post(
              'https://api.lobstr.io/sessions',
              {
                region,
                browser,
                os
              },
              {
                headers: {
                  'Authorization': `Bearer ${LOBSTR_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            );
          } catch (error3) {
            // Se todas falharem, retornar null para usar fallback
            console.warn('[Lobstr] ⚠️  Não foi possível criar sessão Lobstr. Usando fallback Playwright.');
            console.warn('[Lobstr] ⚠️  Verifique a documentação da API do Lobstr.io para o endpoint correto.');
            return null;
          }
        }
      } else {
        console.warn('[Lobstr] ⚠️  Erro ao criar sessão. Usando fallback Playwright.');
        return null;
      }
    }
    
    const { sessionId, cdpUrl } = response.data;
    
    console.log(`[Lobstr] ✅ Sessão criada: ${sessionId}`);
    console.log(`[Lobstr] 🔗 CDP URL: ${cdpUrl}`);
    
    return { sessionId, cdpUrl };
  } catch (error) {
    console.warn('[Lobstr] ⚠️  Erro ao criar sessão:', error.message);
    if (error.response) {
      console.warn('[Lobstr] Resposta:', error.response.data);
    }
    console.warn('[Lobstr] ⚠️  Usando fallback Playwright com técnicas anti-bot avançadas.');
    return null;
  }
}

/**
 * Fecha uma sessão do Lobstr.io
 * @param {string} sessionId - ID da sessão
 */
async function closeLobstrSession(sessionId) {
  try {
    await axios.delete(
      `${LOBSTR_API_BASE}/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${LOBSTR_API_KEY}`
        },
        timeout: 10000
      }
    );
    console.log(`[Lobstr] ✅ Sessão ${sessionId} fechada`);
  } catch (error) {
    console.warn(`[Lobstr] ⚠️  Erro ao fechar sessão: ${error.message}`);
  }
}

/**
 * Conecta Playwright a um browser Lobstr via CDP
 * @param {string} cdpUrl - WebSocket CDP URL
 * @returns {Promise<Object>} - { browser, context, page }
 */
async function connectToLobstrBrowser(cdpUrl) {
  const { chromium } = require('playwright');
  
  try {
    console.log('[Lobstr] 🔌 Conectando Playwright ao browser humano...');
    
    // Conectar via CDP
    const browser = await chromium.connectOverCDP(cdpUrl);
    
    // Obter contexto existente ou criar novo
    const contexts = browser.contexts();
    const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
    
    // Criar ou obter página
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();
    
    console.log('[Lobstr] ✅ Conectado ao browser humano');
    
    return { browser, context, page };
  } catch (error) {
    console.error('[Lobstr] ❌ Erro ao conectar:', error.message);
    throw error;
  }
}

module.exports = {
  createLobstrSession,
  closeLobstrSession,
  connectToLobstrBrowser
};

