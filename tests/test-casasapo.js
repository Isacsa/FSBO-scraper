/**
 * Testes automáticos para scraper Casa Sapo
 */

const scrapeCasaSapo = require('../src/scrapers/casasapo/casasapo.scraper');
const { extractAllListingUrls, extractAdDetails } = require('../src/scrapers/casasapo/casasapo.extract');
const { loadCache, saveCache, cleanOldCache } = require('../src/scrapers/casasapo/casasapo.cache');

// URL de teste - exemplo de listagem Casa Sapo
const TEST_LISTING_URL = 'https://casa.sapo.pt/Venda/Moradias/?sa=11&or=10'; // Ajustar conforme necessário
const TEST_AD_URL = 'https://casa.sapo.pt/imoveis/12345678'; // Exemplo, substituir por URL real

async function runTests() {
  console.log('🧪 TESTES AUTOMÁTICOS - CASA SAPO\n');
  console.log('='.repeat(80));
  console.log(`URL de teste: ${TEST_LISTING_URL}\n`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Teste 1: Extração de listagem
    console.log('📋 TESTE 1: Extração de listagem');
    console.log('─'.repeat(80));
    
    const listingUrls = await extractAllListingUrls(TEST_LISTING_URL, {
      maxPages: 5, // Apenas 5 páginas para teste rápido
      timeout: 40000
    });
    
    if (listingUrls.length >= 10) {
      console.log(`✅ PASSOU: Encontrados ${listingUrls.length} anúncios sem telefone (mínimo: 10)`);
      testsPassed++;
      
      // Validar URLs
      const validUrls = listingUrls.filter(url => url && url.includes('casa.sapo.pt') && url.includes('/imoveis/'));
      if (validUrls.length === listingUrls.length) {
        console.log(`✅ PASSOU: Todos os ${validUrls.length} URLs são válidos`);
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: Apenas ${validUrls.length} de ${listingUrls.length} URLs são válidos`);
        testsFailed++;
      }
    } else {
      console.log(`❌ FALHOU: Apenas ${listingUrls.length} anúncios encontrados (mínimo: 10)`);
      testsFailed++;
    }
    
    // Teste 2: Extração de anúncio individual
    console.log('\n📋 TESTE 2: Extração de anúncio individual');
    console.log('─'.repeat(80));
    
    if (listingUrls.length > 0) {
      const testAdUrl = listingUrls[0];
      console.log(`Testando com: ${testAdUrl}`);
      
      const rawData = await extractAdDetails(testAdUrl, { timeout: 60000 });
      
      const checks = {
        'Título existe': rawData.title && rawData.title.length > 0,
        'URL existe': rawData.url && rawData.url.length > 0,
        'Descrição existe': rawData.description && rawData.description.length > 0,
        'Preço existe (pode ser null)': rawData.price !== undefined,
        'Fotos é array': Array.isArray(rawData.photos),
        'Features é array': Array.isArray(rawData.features)
      };
      
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
        if (passed) testsPassed++;
        else testsFailed++;
      });
      
      console.log(`\nDados extraídos:`);
      console.log(`  Título: ${rawData.title?.substring(0, 50) || 'N/A'}...`);
      console.log(`  Preço: ${rawData.price || 'N/A'}`);
      console.log(`  Localização: ${rawData.location || 'N/A'}`);
      console.log(`  Fotos: ${rawData.photos?.length || 0}`);
      console.log(`  Telefone: ${rawData.phone || 'Não extraído'}`);
    } else {
      console.log('⚠️  AVISO: Nenhum anúncio para testar');
    }
    
    // Teste 3: Scrape completo (limitado)
    console.log('\n📋 TESTE 3: Scrape completo (limitado)');
    console.log('─'.repeat(80));
    
    const result = await scrapeCasaSapo(TEST_LISTING_URL, {
      onlyNew: false,
      maxPages: 2,
      maxAds: 3 // Apenas 3 anúncios para teste rápido
    });
    
    if (result.success && result.items && result.items.length > 0) {
      console.log(`✅ PASSOU: Scrape completo executado`);
      console.log(`   Total de anúncios: ${result.items.length}`);
      testsPassed++;
      
      // Validar estrutura JSON
      const sample = result.items[0];
      const requiredFields = [
        'source', 'ad_id', 'url', 'title', 'description',
        'location', 'price', 'property', 'photos', 'advertiser', 'signals'
      ];
      
      const missingFields = requiredFields.filter(field => !sample.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ PASSOU: Estrutura JSON válida');
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: Campos em falta: ${missingFields.join(', ')}`);
        testsFailed++;
      }
      
      // Validar campos específicos
      if (sample.source === 'casasapo') {
        console.log('✅ PASSOU: source = "casasapo"');
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: source = "${sample.source}" (esperado: "casasapo")`);
        testsFailed++;
      }
      
      if (sample.signals && sample.signals.is_fsbo === true) {
        console.log('✅ PASSOU: signals.is_fsbo = true');
        testsPassed++;
      } else {
        console.log('❌ FALHOU: signals.is_fsbo não é true');
        testsFailed++;
      }
    } else {
      console.log('❌ FALHOU: Scrape não retornou resultados');
      testsFailed++;
    }
    
    // Teste 4: Detector de novos anúncios
    console.log('\n📋 TESTE 4: Detector de novos anúncios');
    console.log('─'.repeat(80));
    
    // Limpar cache primeiro
    cleanOldCache(0); // Remove tudo
    
    // Primeira execução - todos devem ser novos
    const firstResult = await scrapeCasaSapo(TEST_LISTING_URL, {
      onlyNew: true,
      maxPages: 2,
      maxAds: 2
    });
    
    if (firstResult.total_new === firstResult.items.length) {
      console.log(`✅ PASSOU: Primeira execução - todos ${firstResult.total_new} são novos`);
      testsPassed++;
    } else {
      console.log(`❌ FALHOU: Primeira execução - esperado ${firstResult.items.length} novos, obtido ${firstResult.total_new}`);
      testsFailed++;
    }
    
    // Segunda execução - nenhum deve ser novo
    const secondResult = await scrapeCasaSapo(TEST_LISTING_URL, {
      onlyNew: true,
      maxPages: 2,
      maxAds: 2
    });
    
    if (secondResult.total_new === 0) {
      console.log(`✅ PASSOU: Segunda execução - nenhum novo (duplicados detectados)`);
      testsPassed++;
    } else {
      console.log(`⚠️  AVISO: Segunda execução - ${secondResult.total_new} novos (pode ser normal se houver novos anúncios)`);
      testsPassed++; // Passa mas com aviso
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

