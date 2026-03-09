# Pipeline FSBO

Este diretório contém utilitários partilhados usados por CLIs e scripts de diagnóstico.

## Estado atual
O pipeline canónico de produção já não vive aqui sozinho. Em produção, o fluxo suportado é:

```text
runPlatform -> dedupeListInMemory -> precisionGate -> toIngestPayload -> pushBatch
```

Ou seja:
- `pipeline/deduplicate.js` continua ativo
- `pipeline/fsboScore.js` existe por compatibilidade e diagnóstico
- `pipeline/incremental.js` já não é a fonte de verdade do estado em produção

## Módulos disponíveis
### `pipeline/deduplicate.js`
Deduplicação em memória e cálculo de fingerprint determinístico.

### `pipeline/fsboScore.js`
Wrapper compatível para score/razões FSBO.

Internamente, o score agora reutiliza o modelo comum em:
- `src/services/fsboSignals.js`

Uso:
```javascript
const { calculateFsboScore, calculateFsboScores } = require('./pipeline/fsboScore');

const scored = calculateFsboScore(ad);
const scoredList = calculateFsboScores([ad1, ad2]);
```

Saída compatível:
- `_fsbo_score`
- `_fsbo_reasons`
- `_fsbo_decision`

## O que não deves assumir
- Não assumir que `pipeline/incremental.js` controla removidos em produção.
- Não assumir Supabase/n8n como destino final do serviço.
- Não usar este diretório como substituto da integração da app.

## Referências reais para produção
- `scripts/scrape-and-push.js`
- `src/integration/precisionGate.js`
- `src/integration/toIngestPayload.js`
- `src/integration/pushBatch.js`
- `SCRAPER_APP_VALIDATION_CHECKLIST.md`

