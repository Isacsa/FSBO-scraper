/**
 * Extrai dados do Idealista via Lobstr API
 * Cria task, inicia run, faz polling e obtém results
 */

const {
  createTask,
  createRun,
  getRuns,
  pollRunUntilComplete,
  getAllResults,
  getIdealistaSquidId
} = require('./idealista.client');

const ACTIVE_RUN_STATUSES = new Set(['pending', 'started', 'processing', 'running']);

function findActiveIdealistaRun(runs) {
  if (!Array.isArray(runs)) return null;
  return runs.find(run => ACTIVE_RUN_STATUSES.has(run?.status || run?.state || '')) || null;
}

function shouldUsePartialResults(error, allowPartial = false) {
  if (!allowPartial) return false;
  return String(error?.message || error || '').includes('Timeout');
}

/**
 * Extrai listings do Idealista via Lobstr
 * @param {string} searchUrl - URL de pesquisa do Idealista (opcional - pode ser null)
 * @param {Object} options - Opções
 * @param {number} options.maxResults - Número máximo de results
 * @param {number} options.maxWait - Tempo máximo de espera (ms)
 * @returns {Promise<Object>} - { runId, taskId, results, totalResults }
 */
async function extractIdealistaListings(searchUrl = null, options = {}) {
  const {
    maxResults = null,
    maxWait = 600000, // 10 minutos (5-10 minutos)
    allowPartial = false
  } = options;
  let activeSquidId = null;
  let taskId = null;
  let runId = null;
  
  console.log('[Idealista Extract] 🔍 Iniciando extração via Lobstr...');
  if (searchUrl) {
    console.log(`[Idealista Extract] URL: ${searchUrl}`);
  } else {
    console.log(`[Idealista Extract] Sem URL - usando sites configurados no squid`);
  }
  
  try {
    // Passo 1: Obter squid ID
    activeSquidId = await getIdealistaSquidId();
    console.log(`[Idealista Extract] Squid ID: ${activeSquidId}`);

    // Não iniciar uma nova execução se o mesmo squid já estiver ocupado.
    const activeRun = findActiveIdealistaRun(await getRuns(activeSquidId));
    if (activeRun) {
      const activeRunId = activeRun.id || activeRun.run_id || 'unknown';
      const activeRunStatus = activeRun.status || activeRun.state || 'unknown';
      throw new Error(
        `Já existe um run Lobstr ativo para o squid Idealista (${activeRunId}, status=${activeRunStatus}). ` +
        'Aguarde a conclusão antes de lançar uma nova execução.'
      );
    }
    
    // Passo 2: Criar task (URL opcional - squid pode já ter sites configurados)
    console.log('[Idealista Extract] 📋 Passo 1: Criando task...');
    const taskResult = await createTask(searchUrl);
    taskId = taskResult.taskId;
    const created_at = taskResult.created_at;
    activeSquidId = taskResult.squidId || activeSquidId;
    console.log(`[Idealista Extract] ✅ Task criada: taskId=${taskId}, created_at=${created_at}`);
    
    // Passo 3: Criar run novo
    console.log('[Idealista Extract] 📋 Passo 2: Criando run novo...');
    const runResult = await createRun(activeSquidId);
    runId = runResult.runId;
    const initialStatus = runResult.status;
    console.log(`[Idealista Extract] ✅ Run criado: runId=${runId}, status=${initialStatus}`);
    
    // Passo 4: Poll run até completar
    console.log('[Idealista Extract] 📋 Passo 3: Fazendo polling do run até completar...');
    console.log(`[Idealista Extract] Polling: intervalo 4s, timeout 10 minutos`);
    
    let completedRun;
    try {
      completedRun = await pollRunUntilComplete(runId, {
        interval: 4000, // 4 segundos (3-4s)
        maxWait: maxWait // 10 minutos
      });
    } catch (error) {
      if (!shouldUsePartialResults(error, allowPartial)) {
        throw error;
      }

      console.warn('[Idealista Extract] ⚠️  Timeout atingido antes do run terminar.');
      console.warn('[Idealista Extract] ⚠️  A tentar aproveitar os results já produzidos...');

      const partialResults = await getAllResults(activeSquidId, runId, maxResults);
      if (partialResults.length > 0) {
        console.log(`[Idealista Extract] ✅ Obtidos ${partialResults.length} results parciais após timeout`);
        return {
          runId,
          taskId,
          results: partialResults,
          totalResults: partialResults.length,
          partial: true,
          warning: error.message || String(error)
        };
      }

      throw error;
    }
    
    const finalStatus = completedRun.status || completedRun.state || 'unknown';
    console.log(`[Idealista Extract] ✅ Run completado: runId=${runId}, status=${finalStatus}`);
    
    // Passo 5: Obter todos os results EXCLUSIVAMENTE deste run (com paginação)
    console.log('[Idealista Extract] 📋 Passo 4: Obtendo results do run (com paginação)...');
    const results = await getAllResults(activeSquidId, runId, maxResults);
    
    console.log(`[Idealista Extract] ✅ Extração concluída:`);
    console.log(`[Idealista Extract]   - taskId: ${taskId}`);
    console.log(`[Idealista Extract]   - runId: ${runId}`);
    console.log(`[Idealista Extract]   - Total de results: ${results.length}`);
    
    return {
      runId: runId,
      taskId: taskId,
      results: results,
      totalResults: results.length,
      partial: false
    };
    
  } catch (error) {
    console.error('[Idealista Extract] ❌ Erro durante extração:', error.message);
    if (error.stack) {
      console.error('[Idealista Extract] Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    throw error;
  }
}

module.exports = {
  extractIdealistaListings,
  findActiveIdealistaRun,
  shouldUsePartialResults
};

