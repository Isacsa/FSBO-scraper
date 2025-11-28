/**
 * Script auxiliar para listar squids disponíveis no Lobstr
 * Use este script para obter o UUID do squid Idealista
 */

const { listSquids, findIdealistaSquid } = require('../src/scrapers/idealista_lobstr/idealista.client');

async function listSquidsScript() {
  console.log('📋 Listando squids disponíveis no Lobstr.io...\n');
  
  try {
    const squids = await listSquids();
    
    if (squids.length === 0) {
      console.log('⚠️  Nenhum squid encontrado.');
      console.log('   Verifique se a API key está correta e se você tem acesso a squids.');
      return;
    }
    
    console.log(`✅ Encontrados ${squids.length} squids:\n`);
    
    squids.forEach((squid, index) => {
      console.log(`${index + 1}. ${squid.name || 'Sem nome'}`);
      console.log(`   ID: ${squid.id || squid.uuid || 'N/A'}`);
      console.log(`   Slug: ${squid.slug || 'N/A'}`);
      console.log(`   Descrição: ${squid.description || 'N/A'}`);
      console.log('');
    });
    
    // Tentar encontrar squid Idealista
    console.log('🔍 Procurando squid Idealista...\n');
    const idealistaSquid = await findIdealistaSquid();
    
    if (idealistaSquid) {
      console.log(`✅ Squid Idealista encontrado!`);
      console.log(`   UUID: ${idealistaSquid}`);
      console.log(`\n💡 Configure a variável de ambiente:`);
      console.log(`   export IDEALISTA_SQUID_ID="${idealistaSquid}"`);
    } else {
      console.log('⚠️  Squid Idealista não encontrado automaticamente.');
      console.log('   Procure manualmente na lista acima e configure IDEALISTA_SQUID_ID.');
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    if (error.response) {
      console.error('Resposta:', error.response.data);
    }
    process.exit(1);
  }
}

listSquidsScript();

