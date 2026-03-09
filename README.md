# FSBO Scraper

Microserviço Node.js para extrair anúncios imobiliários com foco em FSBO e entregar lotes normalizados para a app.

## Production path
O caminho suportado para produção é:

1. a app expõe `ScraperConfig`
2. o scraper corre `scripts/scrape-and-push.js`
3. cada fonte passa por `runPlatform` + dedupe local + `precisionGate`
4. só anúncios aceites são enviados para `POST /api/scraper/ingest`

Os ficheiros centrais deste fluxo são:
- `scripts/scrape-and-push.js`
- `src/core/runPlatform.js`
- `src/integration/precisionGate.js`
- `src/integration/toIngestPayload.js`
- `src/integration/pushBatch.js`

## Supported entrypoints
### Produção
- `npm run scrape-push`
- `node scripts/scrape-and-push.js --run-now`

### Validação e diagnóstico
- `node run-scraper.js --platform=olx --url="..." --n8n`
- `node scripts/validate-integration.js --platform=olx --url="..."`
- `npm run lobstr:test -- --url="https://www.idealista.pt/..."`

### Legacy compatibility
- `server.js` e a API Express continuam disponíveis para compatibilidade e troubleshooting.
- `run-scraper.js` continua disponível como CLI de diagnóstico.
- Nenhum destes caminhos é a fonte de verdade para a integração com a app.

## Portais suportados
- `olx`
- `imovirtual`
- `idealista` via `src/scrapers/idealista_lobstr/`
- `custojusto`
- `casasapo`

O código específico de cada portal vive em `src/scrapers/<portal>/`.

## FSBO precision model
O scraper não entrega tudo o que raspa. Antes do push:
- normaliza os dados
- deduplica localmente
- calcula `fsbo_score` e `fsbo_decision`
- bloqueia URLs inválidas, categorias proibidas, rent-only, sinais de agência e casos incertos

O último gate comum está em `src/integration/precisionGate.js`.

## Instalação
```bash
npm install
npx playwright install chromium
```

## Variáveis de ambiente
### Obrigatórias para `scrape-and-push`
- `APP_API_URL`
- `SCRAPER_API_KEY`
- `SCRAPER_TENANT_ID`

### Runtime / browser
- `PORT`
- `NODE_ENV`
- `FSBO_HEADLESS`
- `CI`
- `N8N`

### Idealista / Lobstr
- `LOBSTR_API_KEY`
- `IDEALISTA_SQUID_ID` opcional

## Testes
```bash
npm test
npm run test:headless
```

Suites importantes:
- `tests/scrape-and-push.test.js`
- `tests/scraper-http-flow.test.js`
- `tests/precision-gate.test.js`
- `tests/fsbo-confidence-model.test.js`
- `tests/portal-safe-fixes.test.js`
- `tests/test-idealista-lobstr.js`

## Deploy validation
Usa o checklist em `SCRAPER_APP_VALIDATION_CHECKLIST.md` antes de promover mudanças:
- validar env e migrations na app
- confirmar `GET /api/scraper/configs`
- correr `--dry-run`
- validar ingest determinístico com drops/increases/removals

## Dead/outdated paths
Os seguintes caminhos já não devem ser tratados como produção:
- `pipeline/incremental.js` como fonte de verdade de estado
- documentação antiga Express-first
- scripts manuais antigos do Idealista não usados pela suite oficial

Se forem mantidos, são apenas para diagnóstico local.

- Este scraper usa técnicas stealth para evitar detecção
- Alguns sites podem mudar seus seletores CSS, necessitando atualização
- Use com responsabilidade e respeite os termos de serviço dos sites
- Para produção, considere adicionar rate limiting e cache

## 📄 Licença

MIT


