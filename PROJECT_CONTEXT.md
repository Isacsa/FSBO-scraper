# FSBO Scraper — Contexto do Projeto

Este repositório é um microserviço Node.js (Playwright) para scraping de anúncios imobiliários com foco em **FSBO (For Sale By Owner)** e integração via **JSON para n8n**.

A regra principal deste projeto é: **cada portal tem as suas “regras” e fragilidades** (seletores, HTML dinâmico, anti-bot). Por isso, o código está organizado para **não reescrever a lógica específica de cada portal**, e sim reforçar o “core” (runner/pipeline) à volta dos scrapers.

## Objetivo e output
- **Entrada**: URLs (listagem ou anúncio individual, dependendo do portal).
- **Saída**: JSON com `results[]` de anúncios no schema normalizado (ver `src/utils/finalNormalizer.js`), pronto para ser consumido pelo n8n.
- **Garantia operacional para n8n**:
  - CLI pode ser usado em “json-only”/“silent”.
  - API Express devolve **sempre HTTP 200** e estrutura consistente (sucesso/erro).

## Entrypoints (como executar)

### 1) API (Express)
- Ficheiro: `server.js`
- Endpoint:
  - `POST /scrape` (body com `url` + opções)
  - `GET /health`
- Controller: `src/controllers/scrapeController.js`
  - Deteta plataforma (`src/utils/selectors.js`)
  - Executa scrape e devolve **sempre HTTP 200**
  - Formata respostas: `src/utils/responseFormatter.js`

### 2) CLI n8n-ready (recomendado para n8n)
- Ficheiro: `run-scraper.js`
- Saída:
  - `success`, `platform`, `timestamp`, `duration_ms`
  - `results[]`, `count`, `meta`
  - Pipeline aplicado: dedupe + incremental + FSBO score

Exemplo:
```bash
node run-scraper.js --platform=olx --url="https://..." --n8n
```

### 3) “Scrape all”
- Ficheiro: `scripts/scrape-all.js`
- Executa várias plataformas, agrega resultados e aplica pipeline.

## Estrutura do código (o que existe e onde mexer)

### Scrapers por portal (lógica específica)
Cada portal vive em `src/scrapers/<portal>/…`. Estes módulos contêm a parte frágil: seletores, parsing e fluxo de navegação específico.

Portais atuais:
- `src/scrapers/olx/`
- `src/scrapers/imovirtual/`
- `src/scrapers/custojusto/`
- `src/scrapers/casasapo/`
- `src/scrapers/idealista_lobstr/` (via API Lobstr)

Nota importante: **evitar “refactors criativos” aqui**. Melhorias seguras tendem a ser:
- timeouts/retries mais consistentes
- pequenas correções de cache
- parametrização via env (opt-in)

### Core modular (connectors + runner)
Para reduzir duplicação (3 entrypoints com `if (platform)`), existe um runner comum:
- `src/core/registry.js`: mapeia `platform -> scraper`.
- `src/core/runPlatform.js`: executa o scraper e interpreta o “shape” da resposta (cada portal devolve estruturas diferentes).

Isto permite:
- manter a lógica do portal intacta
- unificar opções
- adicionar camadas externas (rate limit, incremental) sem tocar nos scrapers

### Pipeline (dedupe, score, incremental)
O pipeline corre principalmente no CLI (`run-scraper.js`) e no `scrape-all`.

- **Dedupe**: `pipeline/deduplicate.js`
  - adiciona `_fingerprint` aos itens (determinístico)
- **FSBO score**: `pipeline/fsboScore.js`
  - adiciona `_fsbo_score` e `_fsbo_reasons`
- **Incremental (NEW/UPDATED/UNCHANGED/REMOVED)**: `pipeline/incremental.js`
  - adiciona por item:
    - `_status`: `NEW` | `UPDATED` | `UNCHANGED`
    - `_first_seen`, `_last_seen` (ISO)
    - `_changed_fields` (lista)
  - adiciona em `meta`:
    - `meta.incremental` com contadores e `state_file`
  - `REMOVED` só é inferido quando o run tem **cobertura full** (sem limites de páginas/ads), para evitar falsos “removidos”.

### State store (incremental)
O incremental escreve estado em disco:
- `data/incremental_state.json` (ignorado pelo git)
Lock best-effort:
- `src/core/state/fileStateStore.js`

### Logging (ruído controlável)
Alguns módulos eram muito verbosos; agora logs detalhados podem ser ligados por env:
- `FSBO_LOG_LEVEL=debug` (ou `FSBO_DEBUG=1`)

Módulos “barulhentos” ajustados:
- `src/utils/finalNormalizer.js`
- `src/utils/propertyNormalizer.js`
- `src/services/fsboSignals.js`

## Robustez: retries / timeouts / rate limiting

### Timeouts e retries (Playwright)
- `src/utils/browser.js` tem `navigateWithRetry(page, url, { retries, timeout, waitUntil })`
  - agora respeita `options.timeout` e usa backoff com jitter

### Rate limiting e concurrency (opt-in)
Existe uma camada externa (desligada por defeito) para reduzir bursts/deteção:
- `src/core/rateLimit.js`
Variáveis:
- `FSBO_RATE_LIMIT_RPS` (ex.: `1.5`)
- `FSBO_RATE_LIMIT_JITTER` (0..1, default 0.2)
- `FSBO_MAX_CONCURRENT_SCRAPES` (ex.: `2`)

## Performance: batch browser reuse (opt-in)
Em listagens, OLX/Imovirtual chamam o scraper “single” muitas vezes. Para reduzir custo:
- **Opt-in** com `FSBO_REUSE_BROWSER=1`
  - OLX: `src/scrapers/olx/olx.scraper.js` + `src/scrapers/olx/index.js`
  - Imovirtual: `src/scrapers/imovirtual/imovirtual.scraper.js` + `src/scrapers/imovirtual/index.js`

Por defeito, mantém-se o comportamento original (1 browser por anúncio).

## Integração n8n
Resumo e garantias:
- `N8N_INTEGRATION_SUMMARY.md`

Padrão recomendado:
- n8n “Execute Command” → `node run-scraper.js --platform=... --url=... --n8n`
- parse JSON e processar `results[]`

## Variáveis de ambiente (principais)
- **Playwright / runtime**
  - `FSBO_HEADLESS=true` (força headless)
  - `N8N=1` / `FSBO_SERVER=1` / `CI=1` (força headless via `shouldRunHeadless`)
- **Debug**
  - `FSBO_LOG_LEVEL=debug` ou `FSBO_DEBUG=1`
- **Rate limit (opt-in)**
  - `FSBO_RATE_LIMIT_RPS`, `FSBO_RATE_LIMIT_JITTER`, `FSBO_MAX_CONCURRENT_SCRAPES`
- **Batch (opt-in)**
  - `FSBO_REUSE_BROWSER=1`
- **Lobstr (Idealista)**
  - `LOBSTR_API_KEY` (obrigatório)
  - `LOBSTR_AUTH_SCHEME` (opcional: `Token` ou `Bearer`)
  - `IDEALISTA_SQUID_ID` (opcional)

## Ficheiros runtime / caches (não versionar)
Este repo produz ficheiros runtime que **não devem ser commitados**:
- `data/*_cache.json` (caches por portal)
- `data/incremental_state.json` (estado incremental)
- `.duplicate-cache.json` (cache interno de sinais)

Estão ignorados via `.gitignore`.

## Nota de segurança (importante)
Se em algum momento existiu uma API key hard-coded no código (ex.: Lobstr), **assume comprometida**:
- roda/rotaciona a key no provider
- usa apenas env vars/secret manager em produção

