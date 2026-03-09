# Configuração Headless para VPS (Ubuntu/Linux)

## ✅ Implementação Completa

O sistema foi configurado para garantir que o Playwright **sempre** rode em modo headless em servidores Linux (VPS), independentemente de flags de debug ou outras configurações.

## 🔥 Regras Implementadas

### 1. Headless Sempre True em Servidor

A função `shouldRunHeadless()` em `src/utils/browser.js` garante:

- ✅ **Linux (qualquer distro)**: Sempre `headless = true`
- ✅ **Variáveis de ambiente**: `N8N`, `FSBO_SERVER`, ou `CI` → sempre `headless = true`
- ✅ **FSBO_HEADLESS=true**: Força headless mesmo em macOS local
- ✅ **macOS local**: Permite non-headless apenas se explicitamente solicitado

### 2. Args Essenciais para VPS

O browser Chromium é sempre lançado com os seguintes args em servidor Linux:

```javascript
[
  '--no-sandbox',              // CRÍTICO para VPS sem X11
  '--disable-setuid-sandbox',   // CRÍTICO para VPS sem X11
  '--disable-dev-shm-usage',    // Evita problemas de memória compartilhada
  '--no-first-run',
  '--disable-accelerated-2d-canvas',
  '--no-zygote',
  '--disable-gpu'
]
```

Estes args são **obrigatórios** para funcionar em VPS Ubuntu sem interface gráfica.

### 3. Debug Não Afeta Headless

- ✅ `--debug` controla **apenas logs**, nunca o modo do browser
- ✅ `--verbose` controla **apenas logs**, nunca o modo do browser
- ✅ `--silent` controla **apenas logs**, nunca o modo do browser

O modo headless é determinado **exclusivamente** por:
- Sistema operativo (Linux = sempre headless)
- Variáveis de ambiente (N8N, FSBO_SERVER, CI)
- Variável `FSBO_HEADLESS=true`

## 📋 Arquivos Modificados

### Core
- ✅ `src/utils/browser.js` - Função `shouldRunHeadless()` e `createBrowser()`
- ✅ `src/controllers/scrapeController.js` - Usa `shouldRunHeadless()`
- ✅ `run-scraper.js` - Removida lógica de debug afetando headless

### Scrapers
- ✅ `src/scrapers/custojusto/custojusto.scraper.js` - Default headless=true
- ✅ `src/scrapers/custojusto/custojusto.extract.js` - Default headless=true
- ✅ `src/scrapers/casasapo/casasapo.scraper.js` - Default headless=true
- ✅ `src/scrapers/casasapo/casasapo.extract.js` - Default headless=true
- ✅ `src/scrapers/casasapo/casasapo.utils.js` - Usa `shouldRunHeadless()` e args corretos
- ✅ `src/scrapers/idealista_lobstr/idealista.scraper.js` - Usa runtime headless consistente
- ✅ `src/scrapers/olx/index.js` - Já usava createBrowser() centralizado
- ✅ `src/scrapers/imovirtual/index.js` - Já usava createBrowser() centralizado

### Scripts
- ✅ `scripts/scrape-all.js` - Já usa createBrowser() centralizado

### Testes
- ✅ `tests/browser-headless.test.js` - Testes completos para `shouldRunHeadless()`

## 🧪 Testes

Execute os testes para verificar o comportamento:

```bash
npm run test:headless
```

Os testes verificam:
1. ✅ Linux sempre headless (mesmo com headless=false)
2. ✅ macOS permite non-headless localmente
3. ✅ Debug não afeta headless em Linux
4. ✅ Debug não afeta headless em macOS
5. ✅ Variáveis de ambiente forçam headless
6. ✅ Windows sempre headless
7. ✅ Default behavior

## 🚀 Uso no VPS

### Ambiente VPS (Ubuntu/Linux)

No VPS, o scraper **sempre** rodará em headless, independentemente de qualquer flag:

```bash
# Todos estes comandos rodarão em headless no VPS:
node run-scraper.js --platform=custojusto --url=... --debug
node run-scraper.js --platform=custojusto --url=... --verbose
node run-scraper.js --platform=custojusto --url=... --silent
```

### Variáveis de Ambiente (Opcional)

Você pode forçar headless explicitamente:

```bash
export FSBO_HEADLESS=true
# ou
export N8N=1
# ou
export FSBO_SERVER=1
```

### n8n Integration

Quando rodando dentro do n8n, o sistema detecta automaticamente `process.env.N8N` e força headless.

## ⚠️ Importante

1. **Não altere** a lógica de `shouldRunHeadless()` sem testar em servidor
2. **Não remova** os args `--no-sandbox` e `--disable-setuid-sandbox` - são críticos para VPS
3. **Debug flags** (`--debug`, `--verbose`) controlam apenas logs, nunca headless
4. **Teste sempre** em ambiente Linux antes de deploy em produção

## 🔍 Verificação

Para verificar se está rodando em headless no VPS:

```bash
# O browser será lançado com headless: true automaticamente
# Verifique os logs - não deve haver tentativas de abrir janela gráfica
```

## 📝 Notas Técnicas

- A função `shouldRunHeadless()` é chamada em `createBrowser()` antes de lançar o Chromium
- Todos os scrapers usam `createBrowser()` centralizado, garantindo comportamento consistente
- Os args de servidor são aplicados **antes** de qualquer outra lógica
- O sistema detecta automaticamente o ambiente (Linux vs macOS) via `process.platform`

