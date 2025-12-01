# Scraper OLX com Suporte a Listagens

## ✅ Funcionalidades Implementadas

### 1. **Suporte a Listagens**
- ✅ Extrai URLs de anúncios de páginas de listagem
- ✅ Percorre múltiplas páginas automaticamente
- ✅ Suporta paginação do OLX

### 2. **Filtro Automático de Agências**
- ✅ Detecta e filtra agências automaticamente
- ✅ Usa sistema de sinais FSBO já existente
- ✅ Remove anúncios de agências antes de processar

### 3. **Detecção de Novos Anúncios**
- ✅ Sistema de cache para detectar anúncios novos
- ✅ Compara com cache local (`data/olx_cache.json`)
- ✅ Atualiza `first_seen` e `last_seen` automaticamente

## 📁 Arquivos Criados

```
src/scrapers/olx/
├── olx.listings.js    # Extração de URLs de listagem
├── olx.cache.js       # Sistema de cache para novos anúncios
└── olx.scraper.js     # Scraper principal (listagens + anúncios individuais)
```

## 🚀 Uso

### Via CLI

#### Listagem com filtro de agências (padrão)

```bash
node run-scraper.js \
  --platform=olx \
  --url="https://www.olx.pt/meadela/q-moradia/" \
  --maxPages=2 \
  --maxAds=10
```

#### Apenas novos anúncios (FSBO)

```bash
node run-scraper.js \
  --platform=olx \
  --url="https://www.olx.pt/meadela/q-moradia/" \
  --mode=new \
  --maxPages=3
```

#### Anúncio individual (comportamento original)

```bash
node run-scraper.js \
  --platform=olx \
  --url="https://www.olx.pt/ad/moradia-t4-ID123456"
```

### Via Código

```javascript
const scrapeOLX = require('./src/scrapers/olx/olx.scraper');

// Listagem com filtro de agências
const result = await scrapeOLX('https://www.olx.pt/meadela/q-moradia/', {
  onlyNew: false,
  maxPages: 5,
  maxAds: 50,
  filterAgencies: true // Padrão: true
});

// Resultado:
// {
//   success: true,
//   new_ads: [...],      // Anúncios novos
//   total_new: 5,        // Número de novos
//   all_ads: [...],      // Todos os anúncios (FSBO)
//   fsbo_ads: [...],     // Todos os FSBO (sem agências)
//   agencies_filtered: 12 // Número de agências filtradas
// }
```

## 📊 Formato de Resposta

### Listagem

```json
{
  "success": true,
  "new_ads": [...],
  "total_new": 5,
  "all_ads": [...],
  "fsbo_ads": [...],
  "agencies_filtered": 12
}
```

### Anúncio Individual

```json
{
  "source": "olx",
  "ad_id": "123456",
  "url": "...",
  "title": "...",
  "price": "...",
  "location": {...},
  "advertiser": {
    "is_agency": false
  },
  "signals": {
    "is_agency": false,
    "agency_keywords": []
  }
}
```

## 🔍 Detecção de Agências

O sistema usa múltiplas heurísticas para detectar agências:

1. **Palavras-chave no nome/descrição**
   - remax, era, century 21, imobiliária, etc.

2. **URL do perfil**
   - `/empresas/`, `/agencias-imobiliarias/`

3. **Número de anúncios**
   - 20+ anúncios = provável agência

4. **Padrões profissionais**
   - REF: XXX, AMI: XXX, etc.

5. **Fotos profissionais**
   - Muitas fotos, alta resolução

6. **Watermarks**
   - Logos de agências nas fotos

## 📋 Parâmetros

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `onlyNew` | Apenas anúncios novos | `false` |
| `maxPages` | Limitar páginas | `null` (todas) |
| `maxAds` | Limitar anúncios | `null` (todos) |
| `headless` | Modo headless | `true` |
| `filterAgencies` | Filtrar agências | `true` |

## 💾 Cache

O cache é salvo em `data/olx_cache.json`:

```json
{
  "lastRun": "2024-01-15T10:30:00.000Z",
  "ads": {
    "123456": {
      "url": "https://www.olx.pt/ad/...",
      "first_seen": "2024-01-15T10:30:00.000Z",
      "last_seen": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## ⚠️ Notas Importantes

1. **Filtro de Agências**: Ativado por padrão. Desative com `filterAgencies: false` se necessário.

2. **Detecção Automática**: O scraper detecta automaticamente se a URL é listagem ou anúncio individual.

3. **Cache**: O cache é atualizado automaticamente a cada execução.

4. **Performance**: Processar muitos anúncios pode demorar. Use `maxAds` para limitar.

## 🧪 Exemplo de Teste

```bash
# Teste rápido
node run-scraper.js \
  --platform=olx \
  --url="https://www.olx.pt/meadela/q-moradia/" \
  --maxPages=1 \
  --maxAds=5 \
  --debug
```

Este comando:
- ✅ Processa apenas 1 página
- ✅ Limita a 5 anúncios
- ✅ Filtra agências automaticamente
- ✅ Mostra logs detalhados

