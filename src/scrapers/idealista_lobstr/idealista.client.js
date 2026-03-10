/**
 * Cliente para API do Lobstr.io
 * Gerencia tasks, runs e results do squid Idealista
 */

const axios = require('axios');

const LOBSTR_API_BASE = 'https://api.lobstr.io/v1';
const IDEALISTA_SQUID_ID = process.env.IDEALISTA_SQUID_ID || null;
const IDEALISTA_SQUID_FALLBACK = '88e4e353ecad4a219922c82a47eac740';

function getRequiredLobstrApiKey() {
  const apiKey = process.env.LOBSTR_API_KEY;
  if (!apiKey) {
    throw new Error('LOBSTR_API_KEY env var is required to use Lobstr integration (Idealista).');
  }
  return apiKey;
}

/**
 * Headers padrão para requisições
 */
function getHeaders() {
  return {
    'Authorization': `Token ${getRequiredLobstrApiKey()}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Lista squids disponíveis
 * @returns {Promise<Array>} - Lista de squids
 */
async function listSquids() {
  try {
    console.log('[Lobstr Client] 📋 Listando squids disponíveis...');
    
    const response = await axios.get(
      `${LOBSTR_API_BASE}/squids`,
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    // Tentar diferentes estruturas de resposta
    let squids = [];
    
    if (Array.isArray(response.data)) {
      squids = response.data;
    } else if (response.data.results && Array.isArray(response.data.results)) {
      squids = response.data.results;
    } else if (response.data.squids && Array.isArray(response.data.squids)) {
      squids = response.data.squids;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      squids = response.data.data;
    } else if (response.data.items && Array.isArray(response.data.items)) {
      squids = response.data.items;
    }
    
    console.log(`[Lobstr Client] ✅ Encontrados ${squids.length} squids`);
    
    return squids;
  } catch (error) {
    console.warn('[Lobstr Client] ⚠️  Erro ao listar squids:', error.message);
    if (error.response) {
      console.warn('[Lobstr Client] Resposta:', JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

/**
 * Encontra squid do Idealista automaticamente
 * @returns {Promise<string|null>} - UUID do squid ou null
 */
async function findIdealistaSquid() {
  try {
    const squids = await listSquids();
    
    if (squids.length === 0) {
      console.warn('[Lobstr Client] ⚠️  Nenhum squid encontrado');
      return null;
    }
    
    // Procurar squid com "idealista" no nome, slug ou descrição
    const idealistaSquid = squids.find(squid => {
      const name = (squid.name || '').toLowerCase();
      const slug = (squid.slug || '').toLowerCase();
      const description = (squid.description || '').toLowerCase();
      return name.includes('idealista') || 
             slug.includes('idealista') || 
             description.includes('idealista');
    });
    
    if (idealistaSquid) {
      const squidId = idealistaSquid.id || idealistaSquid.uuid || idealistaSquid.squid_id;
      if (squidId) {
        console.log(`[Lobstr Client] ✅ Squid Idealista encontrado: ${squidId}`);
        return squidId;
      }
    }
    
    console.warn('[Lobstr Client] ⚠️  Squid Idealista não encontrado');
    console.warn('[Lobstr Client] 💡 Use o script scripts/list-lobstr-squids.js para listar todos os squids');
    return null;
  } catch (error) {
    console.warn('[Lobstr Client] ⚠️  Erro ao encontrar squid:', error.message);
    return null;
  }
}

/**
 * Obtém ou encontra o squid ID do Idealista
 * @returns {Promise<string>} - UUID do squid
 */
async function getIdealistaSquidId() {
  // Se já está configurado via env, usar diretamente
  if (IDEALISTA_SQUID_ID) {
    return IDEALISTA_SQUID_ID;
  }

  // Tentar encontrar automaticamente
  console.log('[Lobstr Client] IDEALISTA_SQUID_ID not set, searching automatically...');
  const foundId = await findIdealistaSquid();
  if (foundId) {
    return foundId;
  }

  // Use hardcoded fallback with warning
  console.warn(`[Lobstr Client] IDEALISTA_SQUID_ID not configured — using hardcoded fallback ${IDEALISTA_SQUID_FALLBACK}. Set IDEALISTA_SQUID_ID env var to suppress this warning.`);
  return IDEALISTA_SQUID_FALLBACK;
}

/**
 * Cria uma task no Lobstr
 * @param {string} searchUrl - URL de pesquisa do Idealista (opcional - pode ser null se squid já tem sites configurados)
 * @returns {Promise<Object>} - { taskId, created_at, squidId }
 */
async function createTask(searchUrl = null) {
  try {
    console.log('[Lobstr Client] 🚀 Passo 1: Criando task...');
    
    // Obter squid ID
    const squidId = await getIdealistaSquidId();
    
    // Se não houver URL, criar task sem URL (squid já tem sites configurados)
    const taskBody = searchUrl 
      ? { squid: squidId, tasks: [{ url: searchUrl }] }
      : { squid: squidId }; // Squid já tem sites configurados
    
    if (searchUrl) {
      console.log(`[Lobstr Client] URL: ${searchUrl}`);
    } else {
      console.log(`[Lobstr Client] Sem URL - usando sites configurados no squid`);
    }
    
    const response = await axios.post(
      `${LOBSTR_API_BASE}/tasks`,
      taskBody,
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    // Tentar diferentes estruturas de resposta
    const taskId = response.data.id || 
                   response.data.task_id || 
                   response.data.taskId ||
                   response.data.task?.id ||
                   (response.data.tasks && response.data.tasks[0]?.id) ||
                   null;
    
    const created_at = response.data.created_at || 
                      response.data.created || 
                      response.data.task?.created_at ||
                      new Date().toISOString();
    
    if (!taskId) {
      console.error('[Lobstr Client] ❌ TaskId não encontrado na resposta:', JSON.stringify(response.data, null, 2));
      throw new Error('Não foi possível obter taskId da resposta da API');
    }
    
    console.log(`[Lobstr Client] ✅ Task criada: taskId=${taskId}, created_at=${created_at}`);
    
    return { taskId, created_at, squidId };
  } catch (error) {
    console.error('[Lobstr Client] ❌ Erro ao criar task:', error.message);
    if (error.response) {
      console.error('[Lobstr Client] Resposta:', error.response.data);
    }
    throw error;
  }
}

/**
 * Cria um novo run para o squid
 * @param {string} squidId - ID do squid
 * @returns {Promise<Object>} - { runId, status }
 */
async function createRun(squidId) {
  try {
    console.log('[Lobstr Client] 🚀 Passo 2: Criando run novo...');
    console.log(`[Lobstr Client] Squid: ${squidId}`);
    
    const response = await axios.post(
      `${LOBSTR_API_BASE}/runs`,
      {
        squid: squidId
      },
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    const runId = response.data.id || 
                  response.data.run_id || 
                  response.data.runId ||
                  response.data.run?.id ||
                  null;
    
    const status = response.data.status || 
                   response.data.state || 
                   'pending';
    
    if (!runId) {
      console.error('[Lobstr Client] ❌ RunId não encontrado na resposta:', JSON.stringify(response.data, null, 2));
      throw new Error('Não foi possível obter runId da resposta da API');
    }
    
    console.log(`[Lobstr Client] ✅ Run criado: runId=${runId}, status=${status}`);
    
    return { runId, status };
  } catch (error) {
    console.error('[Lobstr Client] ❌ Erro ao criar run:', error.message);
    if (error.response) {
      console.error('[Lobstr Client] Resposta:', error.response.data);
    }
    throw error;
  }
}

/**
 * Obtém informações de um run específico
 * @param {string} runId - ID do run
 * @returns {Promise<Object>} - Informações do run
 */
async function getRun(runId) {
  try {
    const response = await axios.get(
      `${LOBSTR_API_BASE}/runs/${runId}`,
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    return response.data;
  } catch (error) {
    console.warn(`[Lobstr Client] ⚠️  Erro ao obter run ${runId}:`, error.message);
    throw error;
  }
}

/**
 * Obtém configuração do squid
 * @param {string} squidId - ID do squid
 * @returns {Promise<Object>} - Configuração do squid
 */
async function getSquidConfig(squidId = IDEALISTA_SQUID_ID) {
  try {
    console.log(`[Lobstr Client] 📋 Obtendo configuração do squid: ${squidId}`);
    
    const response = await axios.get(
      `${LOBSTR_API_BASE}/squids/${squidId}`,
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    console.log('[Lobstr Client] ✅ Configuração obtida');
    return response.data;
  } catch (error) {
    console.warn('[Lobstr Client] ⚠️  Erro ao obter configuração:', error.message);
    return null;
  }
}

/**
 * Atualiza configuração do squid
 * @param {Object} params - Parâmetros de configuração
 * @param {string} squidId - ID do squid
 * @returns {Promise<Object>}
 */
async function updateSquidConfig(params, squidId = IDEALISTA_SQUID_ID) {
  try {
    console.log(`[Lobstr Client] 🔧 Atualizando configuração do squid: ${squidId}`);
    
    const response = await axios.post(
      `${LOBSTR_API_BASE}/squids/${squidId}`,
      {
        ...params,
        export_unique_results: true
      },
      {
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    console.log('[Lobstr Client] ✅ Configuração atualizada');
    return response.data;
  } catch (error) {
    console.warn('[Lobstr Client] ⚠️  Erro ao atualizar configuração:', error.message);
    return null;
  }
}

/**
 * Obtém runs do squid
 * @param {string} squidId - ID do squid
 * @returns {Promise<Array>} - Lista de runs
 */
async function getRuns(squidId = IDEALISTA_SQUID_ID) {
  try {
    console.log(`[Lobstr Client] 📋 Obtendo runs do squid: ${squidId}`);
    
    const response = await axios.get(
      `${LOBSTR_API_BASE}/runs`,
      {
        params: { squid: squidId },
        headers: getHeaders(),
        timeout: 30000
      }
    );
    
    // Tentar diferentes estruturas de resposta
    let runs = [];
    
    if (Array.isArray(response.data)) {
      runs = response.data;
    } else if (response.data.results && Array.isArray(response.data.results)) {
      runs = response.data.results;
    } else if (response.data.runs && Array.isArray(response.data.runs)) {
      runs = response.data.runs;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      runs = response.data.data;
    } else if (response.data.items && Array.isArray(response.data.items)) {
      runs = response.data.items;
    }
    
    console.log(`[Lobstr Client] ✅ Encontrados ${runs.length} runs`);
    
    return runs;
  } catch (error) {
    console.warn('[Lobstr Client] ⚠️  Erro ao obter runs:', error.message);
    if (error.response) {
      console.warn('[Lobstr Client] Resposta:', JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}


/**
 * Faz polling do run até completar
 * @param {string} runId - ID do run
 * @param {Object} options - Opções
 * @param {number} options.interval - Intervalo entre polls (ms)
 * @param {number} options.maxWait - Tempo máximo de espera (ms)
 * @returns {Promise<Object>} - Run completo
 */
async function pollRunUntilComplete(runId, options = {}) {
  const {
    interval = 5000, // 5 segundos
    maxWait = 300000 // 5 minutos
  } = options;
  
  const startTime = Date.now();
  let attempts = 0;
  
  console.log(`[Lobstr Client] 🔄 Fazendo polling do run ${runId}...`);
  
  while (true) {
    attempts++;
    const elapsed = Date.now() - startTime;
    
    if (elapsed > maxWait) {
      throw new Error(`Timeout: Run ${runId} não completou em ${Math.round(maxWait / 1000)} segundos`);
    }
    
    try {
      const run = await getRun(runId);
      const status = run.status || run.state || 'unknown';
      
      console.log(`[Lobstr Client] 📊 Polling runId=${runId} - Status: ${status} (tentativa ${attempts}, ${Math.round(elapsed/1000)}s decorridos)`);
      
      // Status válidos durante processamento
      if (status === 'pending' || status === 'started' || status === 'processing' || status === 'running') {
        // Continuar polling
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }
      
      // Status final de sucesso
      if (status === 'completed' || status === 'success') {
        console.log(`[Lobstr Client] ✅ Run ${runId} completado após ${attempts} tentativas (${Math.round(elapsed/1000)}s)`);
        return run;
      }
      
      // Status de erro - abortar imediatamente
      if (status === 'aborted' || status === 'failed' || status === 'error' || status === 'timeout') {
        const errorMsg = run.error || run.message || `Run foi ${status}`;
        console.error(`[Lobstr Client] ❌ Run ${runId} terminou com status: ${status}`);
        console.error(`[Lobstr Client] Erro: ${errorMsg}`);
        throw new Error(`Run ${runId} terminou com status '${status}': ${errorMsg}`);
      }
      
      // Status desconhecido - continuar mas avisar
      console.warn(`[Lobstr Client] ⚠️  Status desconhecido: ${status}, continuando polling...`);
      await new Promise(resolve => setTimeout(resolve, interval));
      
    } catch (error) {
      // Se o erro já indica falha/abort, propagar
      if (error.message.includes('terminou com status') || 
          error.message.includes('abortado') || 
          error.message.includes('falhou')) {
        throw error;
      }
      // Erro de rede temporário - continuar
      console.warn(`[Lobstr Client] ⚠️  Erro no poll (tentativa ${attempts}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}

/**
 * Obtém results de um run com paginação
 * @param {string} squidId - ID do squid
 * @param {string} runId - ID do run
 * @param {Object} pagination - Opções de paginação
 * @param {number} pagination.page - Página (default: 1)
 * @param {number} pagination.pageSize - Tamanho da página (default: 100)
 * @returns {Promise<Object>} - { results: [], total: 0, hasMore: boolean, next: string|null }
 */
async function getResults(squidId, runId, pagination = {}) {
  const {
    page = 1,
    pageSize = 100
  } = pagination;
  
  try {
    console.log(`[Lobstr Client] 📥 Obtendo results - squid=${squidId}, run=${runId}, page=${page}, page_size=${pageSize}`);
    
    const response = await axios.get(
      `${LOBSTR_API_BASE}/results`,
      {
        params: {
          squid: squidId,
          run: runId,
          page_size: pageSize,
          page: page
        },
        headers: getHeaders(),
        timeout: 60000
      }
    );
    
    const data = response.data;
    const results = data.results || data.data || [];
    const total = data.total || data.count || results.length;
    const next = data.next || null;
    const hasMore = next !== null || (results.length === pageSize && pageSize > 0);
    
    console.log(`[Lobstr Client] ✅ Página ${page}: ${results.length} results obtidos (total acumulado: ${total}, hasMore: ${hasMore})`);
    
    return {
      results: Array.isArray(results) ? results : [],
      total: total,
      hasMore: hasMore,
      next: next,
      page: page
    };
  } catch (error) {
    console.error('[Lobstr Client] ❌ Erro ao obter results:', error.message);
    if (error.response) {
      console.error('[Lobstr Client] Resposta:', error.response.data);
    }
    throw error;
  }
}

/**
 * Obtém todos os results de um run (com paginação automática)
 * @param {string} squidId - ID do squid
 * @param {string} runId - ID do run
 * @param {number} maxResults - Número máximo de results (opcional)
 * @returns {Promise<Array>} - Array com todos os results
 */
async function getAllResults(squidId, runId, maxResults = null) {
  console.log(`[Lobstr Client] 📥 Passo 4: Obtendo todos os results do run ${runId}...`);
  
  const allResults = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    const { results, hasMore, next } = await getResults(squidId, runId, { page, pageSize });
    
    allResults.push(...results);
    console.log(`[Lobstr Client] 📊 Total acumulado: ${allResults.length} results`);
    
    // Verificar se atingiu limite
    if (maxResults && allResults.length >= maxResults) {
      console.log(`[Lobstr Client] ✅ Limite de ${maxResults} results atingido`);
      return allResults.slice(0, maxResults);
    }
    
    // Verificar se há mais páginas (usar next se disponível, senão hasMore)
    if (next) {
      // Se há next URL, continuar na próxima iteração
      page++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    if (!hasMore || results.length === 0) {
      break;
    }
    
    page++;
    
    // Pequeno delay entre páginas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`[Lobstr Client] ✅ Total final: ${allResults.length} results obtidos do run ${runId}`);
  return allResults;
}

module.exports = {
  createTask,
  createRun,
  getRun,
  getSquidConfig,
  updateSquidConfig,
  getRuns,
  pollRunUntilComplete,
  getResults,
  getAllResults,
  listSquids,
  findIdealistaSquid,
  getIdealistaSquidId,
  IDEALISTA_SQUID_ID
};

