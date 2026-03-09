# FSBO Scraper — Contexto Atual

## Resumo operacional
Este repositório é um scraper Node.js/Playwright para inventário imobiliário FSBO.

A regra estrutural continua a mesma:
- não mexer de forma agressiva na lógica específica de cada portal;
- concentrar robustez, normalização, gating e integração nas camadas comuns;
- tratar a app como fonte de verdade para estado, histórico, preços e alertas.

## Caminho canónico de produção
O caminho suportado para produção é:

```text
app configs -> scripts/scrape-and-push.js -> runPlatform -> dedupe -> precisionGate -> ingest API da app
```

Ficheiros principais:
- `scripts/scrape-and-push.js`
- `src/core/runPlatform.js`
- `src/integration/precisionGate.js`
- `src/integration/toIngestPayload.js`
- `src/integration/pushBatch.js`

## Entrypoints
### 1) Produção
- `scripts/scrape-and-push.js`
- puxa configs da app
- respeita schedule
- faz push autenticado e idempotente

### 2) Diagnóstico CLI
- `run-scraper.js`
- usa o mesmo `runPlatform`
- devolve JSON limpo para troubleshooting e validação

### 3) Compatibilidade legacy
- `server.js` / Express API
- manter apenas para troubleshooting/compatibilidade, não como referência da integração com a app

## Estado e ownership
### O que pertence ao scraper
- scraping por portal
- normalização local
- dedupe local em memória
- classificação FSBO e precision gate
- entrega batched à app

### O que pertence à app
- idempotência final
- persistência canónica
- deteção de novos/atualizados/removidos/reaparecidos
- eventos de preço
- alertas/notificações

## Código por zona
### Scrapers específicos por portal
- `src/scrapers/olx/`
- `src/scrapers/imovirtual/`
- `src/scrapers/custojusto/`
- `src/scrapers/casasapo/`
- `src/scrapers/idealista_lobstr/`

### Core
- `src/core/registry.js`
- `src/core/runPlatform.js`
- `src/core/rateLimit.js`

### Integração
- `src/integration/dataCleaner.js`
- `src/integration/precisionGate.js`
- `src/integration/toIngestPayload.js`
- `src/integration/pullConfigs.js`
- `src/integration/pushBatch.js`

### Pipeline de apoio
- `pipeline/deduplicate.js`
- `pipeline/fsboScore.js`

## O que já não é produção
- `pipeline/incremental.js` não é a fonte de verdade do estado em produção
- documentação antiga que assume n8n/Supabase como destino canónico está desatualizada
- scripts manuais antigos do Idealista devem ser tratados como diagnóstico local, não como fluxo principal

## Logging e ruído
O objetivo atual é:
- logs estruturados no `scrape-and-push`
- mínimo de ruído nos módulos partilhados
- evitar `console.log` ad-hoc em caminhos críticos

## Caches e ficheiros runtime
Estes ficheiros continuam a ser runtime-only:
- `data/*_cache.json`
- `.duplicate-cache.json`

Não devem entrar em commits de código.

