/**
 * Extrai dados do Idealista via Lobstr API
 * Cria task, inicia run, faz polling e obtém results
 */

const {
  createTask,
  createRun,
  pollRunUntilComplete,
  getAllResults,
  getIdealistaSquidId
} = require('./idealista.client');

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
    maxWait = 600000 // 10 minutos (5-10 minutos)
  } = options;
  
  console.log('[Idealista Extract] 🔍 Iniciando extração via Lobstr...');
  if (searchUrl) {
    console.log(`[Idealista Extract] URL: ${searchUrl}`);
  } else {
    console.log(`[Idealista Extract] Sem URL - usando sites configurados no squid`);
  }
  
  try {
    // Passo 1: Obter squid ID
    const squidId = await getIdealistaSquidId();
    console.log(`[Idealista Extract] Squid ID: ${squidId}`);
    
    // Passo 2: Criar task (URL opcional - squid pode já ter sites configurados)
    console.log('[Idealista Extract] 📋 Passo 1: Criando task...');
    const { taskId, created_at, squidId: confirmedSquidId } = await createTask(searchUrl);
    const finalSquidId = confirmedSquidId || squidId;
    console.log(`[Idealista Extract] ✅ Task criada: taskId=${taskId}, created_at=${created_at}`);
    
    // Passo 3: Criar run novo
    console.log('[Idealista Extract] 📋 Passo 2: Criando run novo...');
    const { runId, status: initialStatus } = await createRun(finalSquidId);
    console.log(`[Idealista Extract] ✅ Run criado: runId=${runId}, status=${initialStatus}`);
    
    // Passo 4: Poll run até completar
    console.log('[Idealista Extract] 📋 Passo 3: Fazendo polling do run até completar...');
    console.log(`[Idealista Extract] Polling: intervalo 4s, timeout 10 minutos`);
    
    const completedRun = await pollRunUntilComplete(runId, {
      interval: 4000, // 4 segundos (3-4s)
      maxWait: maxWait // 10 minutos
    });
    
    const finalStatus = completedRun.status || completedRun.state || 'unknown';
    console.log(`[Idealista Extract] ✅ Run completado: runId=${runId}, status=${finalStatus}`);
    
    // Passo 5: Obter todos os results EXCLUSIVAMENTE deste run (com paginação)
    console.log('[Idealista Extract] 📋 Passo 4: Obtendo results do run (com paginação)...');
    const results = await getAllResults(finalSquidId, runId, maxResults);
    
    console.log(`[Idealista Extract] ✅ Extração concluída:`);
    console.log(`[Idealista Extract]   - taskId: ${taskId}`);
    console.log(`[Idealista Extract]   - runId: ${runId}`);
    console.log(`[Idealista Extract]   - Total de results: ${results.length}`);
    
    return {
      runId: runId,
      taskId: taskId,
      results: results,
      totalResults: results.length
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
  extractIdealistaListings
};

