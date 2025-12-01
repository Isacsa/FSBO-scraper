/**
 * Testes para shouldRunHeadless()
 * 
 * Testa o comportamento do sistema de headless em diferentes ambientes
 */

const { shouldRunHeadless } = require('../src/utils/browser');

console.log('🧪 Running shouldRunHeadless() tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
}

function test(name, fn) {
  console.log(`\n📋 ${name}`);
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };
  
  try {
    fn();
  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    testsFailed++;
  } finally {
    // Restaurar valores originais
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true
    });
    process.env = { ...originalEnv };
  }
}

// Teste 1: Linux simulado → sempre headless
test('Teste 1: Linux simulado → sempre headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'linux',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === true, 'Linux com headless=false deve retornar true');
  assert(shouldRunHeadless({ headless: true }) === true, 'Linux com headless=true deve retornar true');
  assert(shouldRunHeadless({}) === true, 'Linux sem flags deve retornar true');
});

// Teste 2: macOS simulado → permite non-headless
test('Teste 2: macOS simulado → permite non-headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === false, 'macOS com headless=false deve retornar false');
  assert(shouldRunHeadless({ headless: true }) === true, 'macOS com headless=true deve retornar true');
  assert(shouldRunHeadless({}) === true, 'macOS sem flags deve retornar true (default)');
});

// Teste 3: debug mode em Linux → deve continuar headless
test('Teste 3: debug mode em Linux → deve continuar headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'linux',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false, debug: true }) === true, 'Linux com debug não deve afetar headless');
  assert(shouldRunHeadless({ headless: false, verbose: true }) === true, 'Linux com verbose não deve afetar headless');
});

// Teste 4: debug mode em macOS → pode ser headed (ok)
test('Teste 4: debug mode em macOS → pode ser headed (ok)', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false, debug: true }) === false, 'macOS com debug e headless=false deve retornar false');
  assert(shouldRunHeadless({ headless: true, debug: true }) === true, 'macOS com debug e headless=true deve retornar true');
});

// Teste 5: Variáveis de ambiente forçam headless
test('Teste 5a: N8N força headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  process.env.N8N = '1';
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === true, 'N8N deve forçar headless=true');
});

test('Teste 5b: FSBO_SERVER força headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  process.env.FSBO_SERVER = '1';
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === true, 'FSBO_SERVER deve forçar headless=true');
});

test('Teste 5c: CI força headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  process.env.CI = 'true';
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === true, 'CI deve forçar headless=true');
});

test('Teste 5d: FSBO_HEADLESS=true força headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  process.env.FSBO_HEADLESS = 'true';

  assert(shouldRunHeadless({ headless: false }) === true, 'FSBO_HEADLESS=true deve forçar headless=true');
});

// Teste 6: Windows em servidor → sempre headless
test('Teste 6: Windows em servidor → sempre headless', () => {
  Object.defineProperty(process, 'platform', {
    value: 'win32',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({ headless: false }) === true, 'Windows com headless=false deve retornar true');
  assert(shouldRunHeadless({ headless: true }) === true, 'Windows com headless=true deve retornar true');
});

// Teste 7: Default behavior
test('Teste 7: Default behavior', () => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    writable: true,
    configurable: true
  });
  delete process.env.N8N;
  delete process.env.FSBO_SERVER;
  delete process.env.CI;
  delete process.env.FSBO_HEADLESS;

  assert(shouldRunHeadless({}) === true, 'Default deve retornar true');
  assert(shouldRunHeadless() === true, 'Sem argumentos deve retornar true');
});

// Resumo
console.log('\n' + '='.repeat(80));
console.log(`📊 RESUMO DOS TESTES`);
console.log('='.repeat(80));
console.log(`✅ Testes passados: ${testsPassed}`);
console.log(`❌ Testes falhados: ${testsFailed}`);
console.log(`📋 Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(80));

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 Todos os testes passaram!\n');
}

