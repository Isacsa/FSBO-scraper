# Scraper Imovirtual com Suporte a Listagens

## ✅ Funcionalidades Implementadas

### 1. **Suporte a Listagens com Filtro de Particulares**
- ✅ Extrai URLs de anúncios de páginas de listagem
- ✅ **Preserva automaticamente** `ownerTypeSingleSelect=PRIVATE`
- ✅ Percorre múltiplas páginas automaticamente
- ✅ Valida e adiciona filtro PRIVATE se não estiver presente

### 2. **Detecção de Novos Anúncios Particulares**
- ✅ Sistema de cache para detectar anúncios novos
- ✅ Compara com cache local (`data/imovirtual_cache.json`)
- ✅ Atualiza `first_seen` e `last_seen` automaticamente
- ✅ Modo `--mode=new` para retornar apenas novos

## 📁 Arquivos Criados

```
src/scrapers/imovirtual/
├── imovirtual.listings.js    # Extração de URLs de listagem
├── imovirtual.cache.js       # Sistema de cache para novos anúncios
└── imovirtual.scraper.js     # Scraper principal (listagens + anúncios individuais)
```

## 🚀 Uso

### Via CLI

#### Listagem de Particulares (Padrão)

```bash
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?limit=36&ownerTypeSingleSelect=PRIVATE&by=DEFAULT&direction=DESC" \
  --maxPages=2 \
  --maxAds=10
```

#### Apenas Novos Anúncios Particulares

```bash
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?ownerTypeSingleSelect=PRIVATE" \
  --mode=new \
  --maxPages=3
```

#### Anúncio Individual (Comportamento Original)

```bash
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/anuncio/123456"
```

### Via Código

```javascript
const scrapeImovirtual = require('./src/scrapers/imovirtual/imovirtual.scraper');

// Listagem de particulares
const result = await scrapeImovirtual('https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?ownerTypeSingleSelect=PRIVATE', {
  onlyNew: false,
  maxPages: 5,
  maxAds: 50
});

// Resultado:
// {
//   success: true,
//   new_ads: [...],      // Anúncios novos
//   total_new: 5,        // Número de novos
//   all_ads: [...]       // Todos os anúncios (particulares)
// }
```

## 🔍 Preservação do Filtro PRIVATE

O sistema **garante** que o filtro `ownerTypeSingleSelect=PRIVATE` seja sempre preservado:

1. **Validação na URL inicial**: Verifica se o filtro está presente
2. **Adição automática**: Se não estiver, adiciona automaticamente
3. **Preservação na paginação**: Mantém o filtro ao navegar entre páginas

### Exemplo de URLs Suportadas

✅ **Com filtro:**
```
https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?ownerTypeSingleSelect=PRIVATE
```

✅ **Sem filtro (será adicionado automaticamente):**
```
https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto
→ Será corrigido para incluir ownerTypeSingleSelect=PRIVATE
```

## 📊 Formato de Resposta

### Listagem

```json
{
  "success": true,
  "new_ads": [...],
  "total_new": 5,
  "all_ads": [...]
}
```

### Anúncio Individual

```json
{
  "source": "imovirtual",
  "ad_id": "123456",
  "url": "...",
  "title": "...",
  "price": "...",
  "location": {...},
  "advertiser": {...}
}
```

## 📋 Parâmetros

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `onlyNew` | Apenas anúncios novos | `false` |
| `maxPages` | Limitar páginas | `null` (todas) |
| `maxAds` | Limitar anúncios | `null` (todos) |
| `headless` | Modo headless | `true` |

## 💾 Cache

O cache é salvo em `data/imovirtual_cache.json`:

```json
{
  "lastRun": "2024-01-15T10:30:00.000Z",
  "ads": {
    "123456": {
      "url": "https://www.imovirtual.com/anuncio/...",
      "first_seen": "2024-01-15T10:30:00.000Z",
      "last_seen": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## 🎯 Caso de Uso: Detectar Novos Anúncios Particulares

### Setup Inicial (Primeira Execução)

```bash
# Scrape completo para popular cache
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?ownerTypeSingleSelect=PRIVATE" \
  --maxPages=5
```

### Execuções Subsequentes (Detectar Novos)

```bash
# Apenas novos anúncios
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?ownerTypeSingleSelect=PRIVATE" \
  --mode=new \
  --maxPages=5
```

## ⚠️ Notas Importantes

1. **Filtro PRIVATE**: Sempre preservado e adicionado automaticamente se faltar
2. **Detecção Automática**: O scraper detecta automaticamente se a URL é listagem ou anúncio individual
3. **Cache**: O cache é atualizado automaticamente a cada execução
4. **Performance**: Processar muitos anúncios pode demorar. Use `maxAds` para limitar

## 🧪 Exemplo de Teste

```bash
# Teste rápido
node run-scraper.js \
  --platform=imovirtual \
  --url="https://www.imovirtual.com/pt/resultados/comprar/moradia/porto/porto?limit=36&ownerTypeSingleSelect=PRIVATE&by=DEFAULT&direction=DESC" \
  --maxPages=1 \
  --maxAds=3 \
  --debug
```

Este comando:
- ✅ Processa apenas 1 página
- ✅ Limita a 3 anúncios
- ✅ Preserva filtro PRIVATE
- ✅ Mostra logs detalhados

