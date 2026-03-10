# Implementar suporte para Price Tracker e Valuation Engine do Scraper

## Contexto

O scraper microservice (repo separado) foi actualizado com dois novos sistemas que precisam de suporte no backend e frontend:

1. **Price Tracker** — monitoriza TODOS os anúncios (não só FSBO) e detecta descidas de preço significativas (>= 15% por defeito). Envia eventos para um novo endpoint `POST /api/scraper/price-drops`.

2. **Valuation Engine** — o scraper já calcula internamente price/m², benchmarks por zona, e opportunity scores (1-10). Estes dados devem ser armazenados e visualizáveis na app quando chegam via o ingest existente.

O pipeline FSBO existente (`POST /api/scraper/ingest`) NÃO muda — continua a funcionar exactamente como antes. Estamos apenas a ADICIONAR funcionalidade.

---

## PARTE 1: Price Tracker — Novo Endpoint

### 1.1 Endpoint: `POST /api/scraper/price-drops`

Headers (idênticos ao ingest existente):
- `Authorization: Bearer <SCRAPER_API_KEY>`
- `X-Tenant-Id: <tenant_uuid>`
- `X-Idempotency-Key: <run_id>` (para prevenir duplicados)
- `Content-Type: application/json`

Respostas esperadas:
- `200 OK` — processado com sucesso
- `409 Conflict` — run_id já processado (idempotency, o scraper trata como sucesso)
- `429 Too Many Requests` — com header `Retry-After: <seconds>` (o scraper faz backoff automático)
- `401/403` — auth inválida
- `400` — payload inválido (scraper NÃO faz retry em 4xx excepto 429)

### 1.2 Payload completo do Price Tracker

```json
{
  "run_id": "uuid-v4",
  "config_id": "uuid-v4 (referência à scraper_config)",
  "source": "olx | imovirtual | idealista | custojusto | casasapo",
  "event_type": "price_drops",
  "area_label": "Viana do Castelo",
  "detected_at": "2026-03-01T12:00:00.000Z",
  "duration_ms": 15000,
  "events": [
    {
      "canonical_url": "https://www.olx.pt/d/anuncio/moradia-t3-viana-123",
      "external_id": "ID123",
      "source": "olx",
      "title": "Moradia T3 Viana do Castelo",
      "location": {
        "district": "Viana do Castelo",
        "municipality": "Viana do Castelo",
        "parish": "Santa Marta de Portuzelo"
      },
      "property": {
        "type": "moradia",
        "tipology": "T3",
        "area_total": 150,
        "area_useful": 120,
        "year": 2005,
        "floor": null,
        "condition": "usado"
      },
      "advertiser": {
        "name": "João Silva",
        "is_agency": false,
        "url": null
      },
      "price_data": {
        "first_seen_price": 250000,
        "current_price": 210000,
        "drop_percent": 16.0,
        "drop_absolute": 40000,
        "first_seen_at": "2026-01-15T10:00:00.000Z",
        "last_seen_at": "2026-03-01T12:00:00.000Z",
        "days_tracked": 45,
        "price_history": [
          { "price": 250000, "seen_at": "2026-01-15T10:00:00.000Z" },
          { "price": 230000, "seen_at": "2026-02-10T10:00:00.000Z" },
          { "price": 210000, "seen_at": "2026-03-01T12:00:00.000Z" }
        ]
      }
    }
  ],
  "meta": {
    "total_tracked": 45,
    "total_scraped_this_run": 30,
    "new_listings": 5,
    "price_changes": 3,
    "drops_detected": 1,
    "scraper_version": "1.0.0"
  }
}
```

### 1.3 Modelo de dados — tabelas/colunas sugeridas

**Tabela `price_drop_runs`** (log de cada execução):
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | = run_id do payload |
| config_id | UUID FK → scraper_configs | |
| tenant_id | UUID FK → tenants | |
| source | VARCHAR(20) | olx, imovirtual, etc. |
| area_label | VARCHAR(255) | nullable |
| detected_at | TIMESTAMPTZ | |
| duration_ms | INTEGER | |
| total_tracked | INTEGER | |
| total_scraped | INTEGER | |
| new_listings | INTEGER | |
| price_changes | INTEGER | |
| drops_detected | INTEGER | |
| scraper_version | VARCHAR(20) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Tabela `price_drop_events`** (cada descida de preço detectada):
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | auto-generated |
| run_id | UUID FK → price_drop_runs | |
| tenant_id | UUID FK → tenants | |
| listing_id | UUID FK → listings | nullable, match by canonical_url |
| canonical_url | TEXT | NOT NULL |
| external_id | VARCHAR(255) | nullable |
| source | VARCHAR(20) | |
| title | TEXT | nullable |
| location | JSONB | { district, municipality, parish } |
| property | JSONB | { type, tipology, area_useful, ... } |
| advertiser | JSONB | { name, is_agency } |
| first_seen_price | INTEGER | EUR (euros inteiros) |
| current_price | INTEGER | |
| drop_percent | DECIMAL(5,2) | e.g. 16.00 |
| drop_absolute | INTEGER | |
| first_seen_at | TIMESTAMPTZ | |
| last_seen_at | TIMESTAMPTZ | |
| days_tracked | INTEGER | |
| price_history | JSONB | array of { price, seen_at } |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### 1.4 Config — campo novo nas scraper_configs

A tabela `scraper_configs` precisa de suportar no campo `options` (JSONB):

```json
{
  "options": {
    "priceTracker": {
      "enabled": true,
      "dropThreshold": 0.15
    }
  }
}
```

O scraper filtra configs onde `options.priceTracker.enabled === true`. O `dropThreshold` é passado via CLI/env no scraper (não via API), mas guardar na config permite futura configuração por zona.

---

## PARTE 2: Valuation Data — Enriquecer o Ingest Existente

O endpoint `POST /api/scraper/ingest` JÁ EXISTE e já recebe listings. Agora cada listing no payload pode incluir dados de valuation. **Não é preciso mudar o endpoint** — apenas guardar os dados extra.

### 2.1 Campos de valuation que já chegam no ingest (dentro de cada item)

Estes campos já são enviados pelo scraper no `signals` de cada item:
- `fsbo_score` (0-100) — no top-level do item E em `signals.fsbo_score`
- `signals.fsbo_decision` — "fsbo" | "agency" | "uncertain"
- `signals.positive_evidence` — array de strings
- `signals.negative_evidence` — array de strings

### 2.2 Valuation separada — o scraper calcula localmente mas NÃO envia via API

A valuation engine do scraper (`analyzeBatch`) funciona assim:
- Calcula `price_per_sqm` para cada listing (preço / área)
- Constrói benchmarks por zona (mediana de preço/m² por freguesia → concelho → distrito)
- Calcula opportunity score (1-10) baseado no desvio do benchmark
- Aplica ajustes por condição, ano, andar

**A app deve implementar a sua própria valuation** usando os dados que já recebe no ingest. O schema de output da valuation (para referência) é:

```json
{
  "evaluable": true,
  "summary": {
    "verdict": "Boa oportunidade",
    "score": 7.5,
    "price_per_sqm": 1800,
    "benchmark_price_per_sqm": 2200,
    "adjusted_benchmark": 2100,
    "deviation_pct": -14.3
  },
  "property": {
    "url": "https://...",
    "title": "Moradia T3",
    "price": 216000,
    "area": 120,
    "location": "Santa Marta, Viana do Castelo, Viana do Castelo",
    "type": "moradia",
    "tipology": "T3",
    "condition": "usado",
    "year": 2005
  },
  "analysis": {
    "price_per_sqm_detail": "1800 EUR/m2 (area_useful)",
    "benchmark_detail": "Mediana zona: 2200 EUR/m2 (parish, 12 comparaveis)",
    "adjustments": ["usado (0%)"],
    "adjusted_benchmark_detail": "Benchmark ajustado: 2100 EUR/m2",
    "deviation": "-14.3% vs benchmark ajustado",
    "fsbo_advantage": "FSBO - sem comissao de agencia (~5% poupanca)",
    "days_online": "45 dias no mercado"
  },
  "reasons": [
    "Preco 14.3% abaixo da mediana da zona",
    "FSBO sem comissao de agencia",
    "45 dias no mercado (possivel margem de negociacao)"
  ],
  "confidence": "high",
  "benchmark_level": "parish"
}
```

Opportunity Score labels:
- 9-10: "Oportunidade excepcional"
- 6-8: "Boa oportunidade"
- 4-6: "Preço justo"
- 2-4: "Acima do mercado"
- 1-2: "Sobrevalorizado"

**Decisão para a app:** Implementar a valuation no backend da app (para poder recalcular com mais dados ao longo do tempo) OU simplesmente calcular no frontend com os dados que já tem (price, area, location das listings armazenadas). Sugiro backend para poder agregar benchmarks de múltiplos scraping runs.

### 2.3 Tabela/vista sugerida para valuation

**Tabela `listing_valuations`** (calculada pela app após cada ingest):
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| listing_id | UUID FK → listings | |
| tenant_id | UUID FK → tenants | |
| price_per_sqm | DECIMAL(10,2) | nullable (sem área = não calculável) |
| benchmark_price_per_sqm | DECIMAL(10,2) | mediana da zona |
| benchmark_level | VARCHAR(20) | parish/municipality/district |
| benchmark_sample_size | INTEGER | nº de comparáveis |
| deviation_pct | DECIMAL(5,2) | % vs benchmark |
| opportunity_score | DECIMAL(3,1) | 1.0 a 10.0 |
| opportunity_label | VARCHAR(50) | e.g. "Boa oportunidade" |
| confidence | VARCHAR(10) | high/medium/low |
| adjustments | JSONB | array de ajustes aplicados |
| calculated_at | TIMESTAMPTZ | |

---

## PARTE 3: UI — O que mostrar

### 3.1 Price Drops (nova secção)

**Lista de price drops** — página/tab nova:
- Tabela com: imóvel (título + URL), preço original → preço actual, % descida, dias no mercado, fonte (OLX/Imovirtual/etc.)
- Filtros: por zona (area_label), por fonte, por % descida mínima, por período
- Ordenação: por % descida (default), por valor absoluto, por data
- Badge/tag colorido: 15-25% amarelo, 25-40% laranja, >40% vermelho
- Clicar numa row abre o detalhe com o histórico de preços (gráfico simples de linha com price_history)

**Cards de resumo** (no topo):
- Total de imóveis monitorizados
- Drops detectados este mês
- Maior descida (%)
- Média de dias até drop

### 3.2 Valuation / Oportunidades (nova secção ou enriquecimento da lista de listings)

**Na lista de listings existente**, adicionar:
- Coluna "Score" com o opportunity score (1-10) e cor (verde >= 6, amarelo 4-6, vermelho < 4)
- Coluna "€/m²"
- Coluna "vs Zona" (deviation_pct, e.g. "-14.3%")
- Filtro por score mínimo

**Vista de detalhe do listing**, adicionar secção "Avaliação":
- Score grande com label ("Boa oportunidade")
- Preço/m² vs benchmark da zona (com barra visual)
- Ajustes aplicados (condição, ano, andar)
- Razões em português (array `reasons`)
- Nível de confiança (high/medium/low)
- Badge FSBO se fsbo_score >= 70

### 3.3 Dashboard — widgets novos

- **Price Drops recentes** — top 5 maiores descidas da semana
- **Melhores oportunidades** — top 5 listings por opportunity score
- **Distribuição de scores** — donut chart (1-2, 3-4, 5-6, 7-8, 9-10)

---

## PARTE 4: Implementação — Ordem recomendada

### Passo 1: Migração de DB
- Adicionar tabelas `price_drop_runs` e `price_drop_events`
- Adicionar tabela `listing_valuations` (ou campos na tabela `listings`)
- Garantir que `scraper_configs.options` (JSONB) já suporta `priceTracker`

### Passo 2: Endpoint `POST /api/scraper/price-drops`
- Autenticação: mesma middleware do `/api/scraper/ingest` (Bearer token + tenant)
- Validação do payload (Zod ou Joi)
- Idempotency: verificar se `run_id` já existe antes de inserir
- Inserir run + events numa transaction
- Tentar fazer match do `canonical_url` com listings existentes para preencher `listing_id`
- Retornar 200 com `{ received: events.length }`

### Passo 3: Valuation engine no backend
- Após cada ingest batch, calcular price/m² e opportunity score para os listings recebidos
- Guardar em `listing_valuations`
- Recalcular periodicamente (cron job) quando novos dados entram (benchmarks melhoram com mais comparáveis)

### Passo 4: API endpoints para o frontend
- `GET /api/v1/price-drops` — lista paginada com filtros
- `GET /api/v1/price-drops/:id` — detalhe com histórico
- `GET /api/v1/scraper-listings/:id/valuation` — valuation de um listing
- `GET /api/v1/valuation-stats` — estatísticas agregadas (para dashboard)

### Passo 5: Frontend
- Página de price drops
- Secção de valuation na lista e detalhe de listings
- Widgets no dashboard

---

## IMPORTANTE: Não quebrar nada

- O endpoint `POST /api/scraper/ingest` NÃO MUDA — continua a funcionar exactamente como antes
- O endpoint `GET /api/scraper/configs` NÃO MUDA na estrutura — apenas o campo `options` precisa de suportar `priceTracker` (é JSONB, já é flexível)
- Todas as novas tabelas/endpoints são ADITIVOS — nenhuma tabela existente é alterada em schema (só leitura de dados existentes para enriquecer valuations)
- Testar que o fluxo existente de scraping continua a funcionar após as mudanças:
  - `POST /api/scraper/ingest` aceita payloads normais
  - `GET /api/scraper/configs` retorna configs com e sem `priceTracker`

## Verificação

1. Criar uma scraper_config com `options.priceTracker.enabled = true`
2. Enviar um POST para `/api/scraper/price-drops` com o payload de exemplo acima
3. Verificar que os dados aparecem na tabela `price_drop_events`
4. Enviar o mesmo `run_id` de novo — deve retornar 409
5. Verificar que o `/api/scraper/ingest` existente continua a funcionar
6. Verificar que os listings têm valuation calculada após ingest
7. Verificar que o frontend mostra price drops e opportunity scores
