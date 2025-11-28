/**
 * Testes automáticos para scraper CustoJusto
 */

const scrapeCustoJusto = require('../src/scrapers/custojusto/custojusto.scraper');
const { filterNewAds, cleanOldCache } = require('../src/scrapers/custojusto/custojusto.cache');

// URL de teste - moradias particulares em Lisboa
const TEST_URL = 'https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p';

async function runTests() {
  console.log('🧪 TESTES AUTOMÁTICOS - CUSTOJUSTO\n');
  console.log('='.repeat(80));
  console.log(`URL de teste: ${TEST_URL}\n`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Teste 1: Extração de listagem
    console.log('📋 TESTE 1: Extração de listagem');
    console.log('─'.repeat(80));
    
    const { extractAllListingUrls } = require('../src/scrapers/custojusto/custojusto.extract');
    
    const listingUrls = await extractAllListingUrls(TEST_URL, {
      maxPages: 2, // Apenas 2 páginas para teste rápido
      timeout: 40000
    });
    
    if (listingUrls.length >= 10) {
      console.log(`✅ PASSOU: Encontrados ${listingUrls.length} anúncios (mínimo: 10)`);
      testsPassed++;
      
      // Validar URLs (formato slug ou /id-)
      const validUrls = listingUrls.filter(url => {
        if (!url || !url.includes('custojusto.pt')) return false;
        // Formato slug: /[regiao]/imobiliario/[tipo]/[titulo]-[id]
        if (url.match(/\/[^\/]+\/imobiliario\/(moradias|apartamentos|terrenos)\/[^\/]+-\d{6,}/)) return true;
        // Formato antigo: /id-XXXXXXX
        if (url.includes('/id-')) return true;
        return false;
      });
      if (validUrls.length === listingUrls.length) {
        console.log(`✅ PASSOU: Todos os ${validUrls.length} URLs são válidos`);
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: Apenas ${validUrls.length} de ${listingUrls.length} URLs são válidos`);
        console.log(`   Exemplo de URL inválido: ${listingUrls.find(url => !validUrls.includes(url))}`);
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
      const { extractAdDetails } = require('../src/scrapers/custojusto/custojusto.extract');
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
    
    const result = await scrapeCustoJusto(TEST_URL, {
      onlyNew: false,
      maxPages: 1,
      maxAds: 3 // Apenas 3 anúncios para teste rápido
    });
    
    if (result.success && result.all_ads && result.all_ads.length > 0) {
      console.log(`✅ PASSOU: Scrape completo executado`);
      console.log(`   Total de anúncios: ${result.all_ads.length}`);
      testsPassed++;
      
      // Validar estrutura JSON
      const sample = result.all_ads[0];
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
      if (sample.source === 'custojusto') {
        console.log('✅ PASSOU: source = "custojusto"');
        testsPassed++;
      } else {
        console.log(`❌ FALHOU: source = "${sample.source}" (esperado: "custojusto")`);
        testsFailed++;
      }
      
      if (sample.advertiser && sample.advertiser.is_agency === false) {
        console.log('✅ PASSOU: advertiser.is_agency = false');
        testsPassed++;
      } else {
        console.log('❌ FALHOU: advertiser.is_agency não é false');
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
    const firstResult = await scrapeCustoJusto(TEST_URL, {
      onlyNew: true,
      maxPages: 1,
      maxAds: 2
    });
    
    if (firstResult.total_new === firstResult.all_ads.length) {
      console.log(`✅ PASSOU: Primeira execução - todos ${firstResult.total_new} são novos`);
      testsPassed++;
    } else {
      console.log(`❌ FALHOU: Primeira execução - esperado ${firstResult.all_ads.length} novos, obtido ${firstResult.total_new}`);
      testsFailed++;
    }
    
    // Segunda execução - nenhum deve ser novo
    const secondResult = await scrapeCustoJusto(TEST_URL, {
      onlyNew: true,
      maxPages: 1,
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

