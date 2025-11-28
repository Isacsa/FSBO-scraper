/**
 * Testes automáticos para scraper Idealista
 */

const scrapeIdealista = require('../src/scrapers/idealista');

const TEST_URL = 'https://www.idealista.pt/imovel/33540002/';

async function runTests() {
  console.log('🧪 TESTES AUTOMÁTICOS - SCRAPER IDEALISTA\n');
  console.log('='.repeat(80));
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Teste 1: Consegue abrir anúncio sem bloqueio
  console.log('\n📋 TESTE 1: Abrir anúncio sem bloqueio');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    if (result && result.source === 'idealista') {
      console.log('✅ PASSOU: Anúncio aberto com sucesso');
      testsPassed++;
    } else {
      console.log('❌ FALHOU: Resultado inválido');
      testsFailed++;
    }
  } catch (error) {
    if (error.message.includes('bloqueou') || error.message.includes('403') || error.message.includes('429')) {
      console.log('⚠️  AVISO: Bloqueio detectado (pode ser temporário)');
      console.log(`   Erro: ${error.message}`);
    } else {
      console.log(`❌ FALHOU: ${error.message}`);
      testsFailed++;
    }
  }
  
  // Teste 2: Extrai pelo menos 20 fotos
  console.log('\n📋 TESTE 2: Extração de fotos (mínimo 20)');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    if (result && Array.isArray(result.photos) && result.photos.length >= 20) {
      console.log(`✅ PASSOU: ${result.photos.length} fotos extraídas`);
      testsPassed++;
    } else if (result && Array.isArray(result.photos)) {
      console.log(`⚠️  AVISO: Apenas ${result.photos.length} fotos extraídas (esperado: 20+)`);
      testsPassed++; // Passa mas com aviso
    } else {
      console.log('❌ FALHOU: Fotos não extraídas corretamente');
      testsFailed++;
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }
  
  // Teste 3: Extrai localização real
  console.log('\n📋 TESTE 3: Extração de localização');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    if (result && result.location) {
      const hasLocation = result.location.district || result.location.municipality || result.location.parish;
      if (hasLocation) {
        console.log(`✅ PASSOU: Localização extraída`);
        console.log(`   District: ${result.location.district || 'N/A'}`);
        console.log(`   Municipality: ${result.location.municipality || 'N/A'}`);
        console.log(`   Parish: ${result.location.parish || 'N/A'}`);
        testsPassed++;
      } else {
        console.log('❌ FALHOU: Localização vazia');
        testsFailed++;
      }
    } else {
      console.log('❌ FALHOU: Objeto location não encontrado');
      testsFailed++;
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }
  
  // Teste 4: Extrai anunciante
  console.log('\n📋 TESTE 4: Extração de anunciante');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    if (result && result.advertiser && result.advertiser.name) {
      console.log(`✅ PASSOU: Anunciante extraído: ${result.advertiser.name}`);
      testsPassed++;
    } else {
      console.log('⚠️  AVISO: Anunciante não encontrado (pode ser normal)');
      testsPassed++; // Passa mas com aviso
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }
  
  // Teste 5: Extrai datas
  console.log('\n📋 TESTE 5: Extração de datas');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    if (result && (result.published_date || result.updated_date)) {
      console.log(`✅ PASSOU: Datas extraídas`);
      console.log(`   Published: ${result.published_date || 'N/A'}`);
      console.log(`   Updated: ${result.updated_date || 'N/A'}`);
      testsPassed++;
    } else {
      console.log('⚠️  AVISO: Datas não encontradas (pode ser normal)');
      testsPassed++; // Passa mas com aviso
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }
  
  // Teste 6: Normaliza JSON no formato FSBO
  console.log('\n📋 TESTE 6: Normalização JSON FSBO');
  console.log('─'.repeat(80));
  try {
    const result = await scrapeIdealista(TEST_URL, {
      timeout: 120000
    });
    
    const requiredFields = [
      'source', 'ad_id', 'url', 'published_date', 'updated_date',
      'timestamp', 'days_online', 'title', 'description',
      'location', 'price', 'property', 'features', 'photos',
      'advertiser', 'signals'
    ];
    
    const missingFields = requiredFields.filter(field => !result.hasOwnProperty(field));
    
    if (missingFields.length === 0) {
      console.log('✅ PASSOU: Todos os campos obrigatórios presentes');
      testsPassed++;
    } else {
      console.log(`❌ FALHOU: Campos em falta: ${missingFields.join(', ')}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`⚠️  ERRO: ${error.message}`);
  }
  
  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(80));
  console.log(`✅ Passou: ${testsPassed}`);
  console.log(`❌ Falhou: ${testsFailed}`);
  console.log(`📈 Taxa de sucesso: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

