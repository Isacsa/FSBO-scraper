/**
 * Script para obter results de um run do Lobstr após completar
 * Aguarda indefinidamente até o run completar
 */

const {
  createTask,
  createRun,
  getRun,
  pollRunUntilComplete,
  getAllResults,
  getIdealistaSquidId
} = require('../src/scrapers/idealista_lobstr/idealista.client');
const { normalizeListings } = require('../src/scrapers/idealista_lobstr/idealista.normalize');

// Argumentos da linha de comando
const args = process.argv.slice(2);
// Se não fornecer URL, usa null (squid já tem sites configurados)
const searchUrl = args[0] && args[0] !== '' ? args[0] : null;
const existingRunId = args[1]; // Se fornecido, usa este run em vez de criar novo

async function getResults() {
  console.log('🔍 Obtendo results do Lobstr...\n');
  if (searchUrl) {
    console.log(`URL: ${searchUrl}`);
  } else {
    console.log(`Sem URL - usando sites configurados no squid`);
  }
  
  let runId;
  let taskId;
  let squidId;
  
  try {
    squidId = await getIdealistaSquidId();
    console.log(`Squid ID: ${squidId}\n`);
    
    if (existingRunId) {
      // Usar run existente
      console.log(`📋 Usando run existente: ${existingRunId}`);
      runId = existingRunId;
      
      // Verificar status atual
      const run = await getRun(runId);
      const status = run.status || run.state || 'unknown';
      console.log(`Status atual: ${status}\n`);
      
      if (status === 'completed' || status === 'success') {
        console.log('✅ Run já está completo!');
      } else {
        console.log('⏳ Aguardando run completar (sem limite de tempo)...');
        await pollRunUntilComplete(runId, {
          interval: 4000,
          maxWait: 999999999 // ~277 horas (praticamente sem limite)
        });
      }
    } else {
      // Criar novo run
      console.log('📋 Passo 1: Criando task...');
      const taskResult = await createTask(searchUrl);
      taskId = taskResult.taskId;
      console.log(`✅ Task criada: ${taskId}\n`);
      
      console.log('📋 Passo 2: Criando run...');
      const runResult = await createRun(squidId);
      runId = runResult.runId;
      console.log(`✅ Run criado: ${runId}\n`);
      
      console.log('⏳ Aguardando run completar (sem limite de tempo)...');
      await pollRunUntilComplete(runId, {
        interval: 4000,
        maxWait: 999999999 // ~277 horas (praticamente sem limite)
      });
    }
    
    console.log('\n📥 Obtendo results...');
    const results = await getAllResults(squidId, runId);
    
    console.log(`✅ Total de results obtidos: ${results.length}\n`);
    
    // Normalizar para FSBO_LITE
    console.log('📋 Normalizando para FSBO_LITE...');
    const normalized = normalizeListings(results);
    
    // Output em JSON
    const output = {
      success: true,
      total_results: normalized.length,
      run_id: runId,
      task_id: taskId || null,
      items: normalized
    };
    
    console.log('\n✅ Resultado final:\n');
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    // Output de erro em JSON
    const errorOutput = {
      success: false,
      error: error.message,
      run_id: runId || null,
      task_id: taskId || null
    };
    
    console.log('\n❌ Erro em JSON:\n');
    console.log(JSON.stringify(errorOutput, null, 2));
    
    process.exit(1);
  }
}

// Uso:
// node scripts/get-lobstr-results.js [URL] [RUN_ID_OPCIONAL]
// Exemplo: node scripts/get-lobstr-results.js "https://www.idealista.pt/comprar-casas/lisboa/"
// Exemplo: node scripts/get-lobstr-results.js "" "fd772fddae984f17a8cdc36078583fcb"

getResults();

