# Pipeline FSBO - Integração n8n + Supabase

Este diretório contém módulos auxiliares para o pipeline de scraping FSBO, preparados para integração com n8n e Supabase.

## 📦 Módulos Disponíveis

### `/pipeline/fsboScore.js`
Calcula FSBO Score (0-100) para anúncios.

**Uso:**
```javascript
const { calculateFsboScore, calculateFsboScores } = require('./pipeline/fsboScore');

// Score individual
const score = calculateFsboScore(ad);
// { score: 75, reasons: [...] }

// Score para múltiplos
const scoredAds = calculateFsboScores([ad1, ad2, ad3]);
// Cada ad terá _fsbo_score e _fsbo_reasons
```

**Fatores considerados:**
- Nome do anunciante (agência vs particular)
- Total de anúncios do anunciante
- Palavras-chave de agência no texto
- Fotos profissionais
- Disponibilidade de telefone
- Número de fotos
- Comprimento da descrição
- Watermark
- Duplicados
- Flag is_agency

### `/pipeline/deduplicate.js`
Deduplicação de anúncios em memória (sem DB).

**Uso:**
```javascript
const { fingerprint, dedupeListInMemory } = require('./pipeline/deduplicate');

// Criar fingerprint
const fp = fingerprint(ad);

// Deduplicar lista
const result = dedupeListInMemory([ad1, ad2, ad3]);
// { unique: [...], duplicates: [...] }
```

**Fingerprint baseado em:**
- URL
- ad_id + source
- Telefone
- Preço + tipologia + área + localização (combinado)

## 🔌 Integração n8n + Supabase

### Estrutura de Tabela Recomendada (Supabase)

```sql
CREATE TABLE fsbo_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  price TEXT,
  phone TEXT,
  fingerprint TEXT,
  fsbo_score INTEGER DEFAULT 0,
  fsbo_reasons JSONB,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(ad_id, source)
);

CREATE INDEX idx_fsbo_ads_fingerprint ON fsbo_ads(fingerprint);
CREATE INDEX idx_fsbo_ads_source_ad_id ON fsbo_ads(source, ad_id);
CREATE INDEX idx_fsbo_ads_created_at ON fsbo_ads(created_at DESC);
CREATE INDEX idx_fsbo_ads_fsbo_score ON fsbo_ads(fsbo_score DESC);
```

### Workflow n8n Recomendado

#### 1. **Execute Scraper** (Execute Command)
```bash
node run-scraper.js --platform=custojusto --url="..." --n8n
```

#### 2. **Parse JSON** (JSON)
- Input: stdout do comando anterior
- Extrair: `results[]`, `count`, `platform`, `timestamp`

#### 3. **Split Items** (Split In Batches)
- Dividir `results[]` em batches para processar

#### 4. **Calcular FSBO Score** (Code / Function)
```javascript
const { calculateFsboScore } = require('/path/to/pipeline/fsboScore');
const scored = calculateFsboScore($json);
return { ...$json, _fsbo_score: scored.score, _fsbo_reasons: scored.reasons };
```

#### 5. **Criar Fingerprint** (Code / Function)
```javascript
const { fingerprint } = require('/path/to/pipeline/deduplicate');
const fp = fingerprint($json);
return { ...$json, _fingerprint: fp };
```

#### 6. **Verificar Duplicados** (Supabase - Select)
```sql
SELECT id, fingerprint, fsbo_score 
FROM fsbo_ads 
WHERE fingerprint = {{ $json._fingerprint }}
LIMIT 1
```

#### 7. **IF: Novo ou Existente**
- Se não existe → inserir
- Se existe → atualizar (se score maior ou dados mais recentes)

#### 8. **Insert/Update Supabase** (Supabase - Insert/Update)
```javascript
{
  "ad_id": "{{ $json.ad_id }}",
  "source": "{{ $json.source }}",
  "url": "{{ $json.url }}",
  "title": "{{ $json.title }}",
  "price": "{{ $json.price }}",
  "phone": "{{ $json.advertiser.phone }}",
  "fingerprint": "{{ $json._fingerprint }}",
  "fsbo_score": {{ $json._fsbo_score }},
  "fsbo_reasons": {{ $json._fsbo_reasons }},
  "data": {{ $json }}
}
```

#### 9. **Filtrar Novos** (IF)
- Se `created_at` = `updated_at` → novo anúncio
- Enviar para notificações/alertas

#### 10. **Notificações** (Webhook / Email / Slack)
- Enviar apenas anúncios novos com `fsbo_score >= 70`

### Campos JSON Esperados

O `run-scraper.js` devolve:

```json
{
  "success": true,
  "platform": "custojusto",
  "timestamp": "2025-11-26T12:30:45.011Z",
  "duration_ms": 45230,
  "results": [
    {
      "source": "custojusto",
      "ad_id": "...",
      "url": "...",
      "title": "...",
      "description": "...",
      "price": "...",
      "location": { ... },
      "property": { ... },
      "features": [...],
      "photos": [...],
      "advertiser": { ... },
      "signals": { ... },
      "_fingerprint": "...",  // Adicionado pelo pipeline
      "_fsbo_score": 75,      // Adicionado pelo pipeline
      "_fsbo_reasons": [...]  // Adicionado pelo pipeline
    }
  ],
  "count": 12,
  "meta": {
    "total_results": 12,
    "duplicates_removed": 2
  }
}
```

### Endpoints Supabase Típicos

#### Verificar se existe
```sql
SELECT * FROM fsbo_ads 
WHERE fingerprint = $1 
LIMIT 1
```

#### Inserir novo
```sql
INSERT INTO fsbo_ads (ad_id, source, url, title, price, phone, fingerprint, fsbo_score, fsbo_reasons, data)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (ad_id, source) DO UPDATE SET
  updated_at = NOW(),
  fsbo_score = EXCLUDED.fsbo_score,
  fsbo_reasons = EXCLUDED.fsbo_reasons,
  data = EXCLUDED.data
RETURNING *
```

#### Obter novos (últimas 24h)
```sql
SELECT * FROM fsbo_ads 
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND fsbo_score >= 70
ORDER BY fsbo_score DESC, created_at DESC
```

#### Obter melhores FSBO (score alto)
```sql
SELECT * FROM fsbo_ads 
WHERE fsbo_score >= 80
  AND sent_at IS NULL
ORDER BY fsbo_score DESC, created_at DESC
LIMIT 50
```

### Variáveis de Ambiente n8n

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SCRAPER_PATH=/path/to/fsbo-scraper
```

### Exemplo Completo n8n Workflow

1. **Cron Trigger** (a cada 2 horas)
2. **Execute Command**: `node run-scraper.js --platform=custojusto --url="..." --n8n`
3. **JSON Parse**: Parse stdout
4. **Split**: Dividir results[]
5. **Loop sobre cada item**:
   - Calcular FSBO Score
   - Criar Fingerprint
   - Verificar em Supabase
   - Se novo → Insert
   - Se existente → Update (se necessário)
   - Se score >= 70 e novo → Enviar notificação
6. **Log Results**: Guardar estatísticas

## 🚀 Próximos Passos

- [ ] Configurar Supabase project
- [ ] Criar tabela `fsbo_ads`
- [ ] Configurar n8n workflow
- [ ] Testar integração end-to-end
- [ ] Configurar notificações
- [ ] Criar dashboard (opcional)

## 📝 Notas

- O pipeline **não faz operações de DB local** - tudo é feito no n8n
- Os módulos são **stateless** e **thread-safe**
- Fingerprints são **determinísticos** (mesmo input = mesmo output)
- FSBO Score é **calculado em tempo real** (não cacheado)

