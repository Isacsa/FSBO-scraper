const { spawnSync } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', 'run-scraper.js');

function runCli(args, extraEnv = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      SCRAPER_MOCK: '1',
      ...extraEnv
    }
  });
}

console.log('\n🧪 run-scraper CLI tests (mock mode)');

// Teste 1: Execução básica
const basic = runCli(['--platform=olx', '--url=https://example.com/anuncio']);
try {
  const json = JSON.parse(basic.stdout.trim());
  console.log('  ✅ Test 1: CLI retorna JSON válido (OLX mock)');
  if (!json.success || json.platform !== 'olx') {
    console.error('  ❌ Test 1 falhou: JSON inesperado', json);
  }
  // Validar que não há campos de DB
  if (json.count_new !== undefined || json.count_existing !== undefined || 
      json.new_ads !== undefined || json.existing_ads !== undefined) {
    console.error('  ❌ Test 1 falhou: JSON contém campos de DB que não deveriam existir', json);
  }
  // Validar estrutura simplificada
  if (!json.results || !Array.isArray(json.results) || json.count === undefined) {
    console.error('  ❌ Test 1 falhou: estrutura JSON incorreta', json);
  }
} catch (err) {
  console.error('  ❌ Test 1 falhou: saída não é JSON', basic.stdout);
}

// Teste 2: Silent + json-only não gera logs em stdout
const silent = runCli([
  '--platform=imovirtual',
  '--url=https://example.com/ad',
  '--silent',
  '--json-only'
]);
if (silent.stderr && silent.stderr.trim().length > 0) {
  console.error('  ❌ Test 2 falhou: stderr deveria estar vazio em silent mode');
} else {
  console.log('  ✅ Test 2: modo silent/json-only sem logs em stderr');
}

// Teste 3: Falha de validação (sem platform)
const invalid = runCli(['--url=https://example.com'], { SCRAPER_MOCK: '1' });
try {
  const json = JSON.parse(invalid.stdout.trim());
  if (json.success === false) {
    console.log('  ✅ Test 3: erro de validação devolve JSON estruturado');
  } else {
    console.error('  ❌ Test 3 falhou: esperava success=false', json);
  }
} catch (err) {
  console.error('  ❌ Test 3 falhou: saída não é JSON', invalid.stdout);
}


