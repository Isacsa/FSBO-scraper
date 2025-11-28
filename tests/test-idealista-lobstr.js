/**
 * Testes automáticos para scraper Idealista via Lobstr
 */

const scrapeIdealistaLobstr = require('../src/scrapers/idealista_lobstr/idealista.scraper');

// URL de teste - pesquisa de casas em Lisboa
const TEST_URL = 'https://www.idealista.pt/comprar-casas/lisboa/';

async function runTests() {
  console.log('🧪 TESTES AUTOMÁTICOS - IDEALISTA VIA LOBSTR\n');
  console.log('='.repeat(80));
  console.log(`URL de teste: ${TEST_URL}\n`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Teste principal: criar task, criar run, pollear, obter results
    console.log('📋 TESTE: Fluxo completo (task → run → poll → results)');
    console.log('─'.repeat(80));
    
    const startTime = Date.now();
    const result = await scrapeIdealistaLobstr(TEST_URL, {
      maxResults: 10, // Limitar a 10 para teste rápido
      maxWait: 600000 // 10 minutos
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Fluxo completo executado com sucesso!`);
    console.log(`   Duração: ${Math.round(duration/1000)}s (${duration}ms)`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Total results: ${result.total_results}`);
    console.log(`   Items obtidos: ${result.items.length}\n`);
    
    // Validar estrutura de resposta
    if (!result.success || result.total_results === undefined || !Array.isArray(result.items)) {
      console.log('❌ FALHOU: Estrutura de resposta inválida');
      console.log(`   Esperado: { success: true, total_results: <INT>, items: [...] }`);
      console.log(`   Recebido:`, JSON.stringify(result, null, 2));
      testsFailed++;
    } else if (result.items.length === 0) {
      console.log('❌ FALHOU: Nenhum listing obtido');
      testsFailed++;
    } else {
      console.log('✅ PASSOU: Listings obtidos com sucesso');
      testsPassed++;
      
      const listings = result.items;
      
      // Teste: validar estrutura JSON FSBO_LITE
      console.log('📋 TESTE: Validar estrutura JSON FSBO_LITE');
      console.log('─'.repeat(80));
      
      const sample = listings[0];
      const requiredFields = [
        'source', 'ad_id', 'url', 'published_date', 'updated_date',
        'timestamp', 'days_online', 'title', 'description',
        'location', 'price', 'property', 'photos',
        'advertiser', 'signals'
      ];
      
      const missingFields = requiredFields.filter(field => !sample.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ PASSOU: Todos os campos obrigatórios presentes');
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: Campos em falta: ${missingFields.join(', ')}`);
        testsFailed++;
      }
      
      // Teste: validar campos específicos FSBO_LITE
      console.log('\n📋 TESTE: Validar campos específicos FSBO_LITE');
      console.log('─'.repeat(80));
      
      const fieldChecks = {
        'source === "idealista_lobstr"': sample.source === 'idealista_lobstr',
        'url existe': sample.url && sample.url.length > 0,
        'title existe': sample.title && sample.title.length > 0,
        'location é objeto': typeof sample.location === 'object',
        'property é objeto': typeof sample.property === 'object',
        'advertiser é objeto': typeof sample.advertiser === 'object',
        'signals é objeto': typeof sample.signals === 'object',
        'photos é array': Array.isArray(sample.photos),
        'advertiser.phone existe (pode ser null)': sample.advertiser && 'phone' in sample.advertiser
      };
      
      Object.entries(fieldChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
        if (passed) testsPassed++;
        else testsFailed++;
      });
      
      // Mostrar exemplo
      console.log('\n📋 EXEMPLO DE LISTING FSBO_LITE:');
      console.log('─'.repeat(80));
      console.log(JSON.stringify(sample, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    testsFailed++;
  }
  
  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(80));
  console.log(`✅ Passou: ${testsPassed}`);
  console.log(`❌ Falhou: ${testsFailed}`);
  console.log(`📈 Taxa de sucesso: ${testsPassed > 0 ? ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) : 0}%`);
  console.log('='.repeat(80));
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();

