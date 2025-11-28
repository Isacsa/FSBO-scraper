# Scraper CustoJusto - Documentação

## ✅ Implementação Completa

Scraper profissional para CustoJusto capaz de extrair todos os anúncios de particulares, percorrer todas as páginas, extrair detalhes completos e detectar anúncios novos.

## 📁 Estrutura Criada

```
src/scrapers/custojusto/
├── custojusto.scraper.js    # Entry-point principal
├── custojusto.extract.js    # Extração (listagem + anúncios)
├── custojusto.parse.js      # Parsing e limpeza
├── custojusto.normalize.js  # Normalização para JSON final
├── custojusto.utils.js      # Utilitários (phone, price, etc.)
└── custojusto.cache.js      # Sistema de cache para novos anúncios

tests/
└── test-custojusto.js       # Testes automáticos

data/
└── custojusto_cache.json    # Cache de anúncios (criado automaticamente)
```

## 🚀 Funcionalidades

### 1. Scraping de Listagem
- ✅ Percorre todas as páginas automaticamente
- ✅ Detecta paginação
- ✅ Extrai todos os URLs de anúncios
- ✅ Suporta lazy-load
- ✅ Delays aleatórios entre páginas
- ✅ Logging detalhado

### 2. Scraping de Anúncio Individual
- ✅ Extrai título, descrição, preço
- ✅ Extrai localização textual
- ✅ Extrai todas as fotos (HD)
- ✅ Tenta extrair telefone (clica no botão)
- ✅ Extrai atributos/features
- ✅ Valida que é particular (filtro f=p)

### 3. Sistema de Cache
- ✅ Cache local em `data/custojusto_cache.json`
- ✅ Detecta anúncios novos
- ✅ Ignora duplicados
- ✅ Atualiza `first_seen` e `last_seen`
- ✅ Retorna apenas novos se solicitado

### 4. Normalização
- ✅ Formato JSON padrão do projeto
- ✅ Normalização de localização
- ✅ Conversão de telefone para +3519XXXXXXXX
- ✅ Extração de tipo e tipologia
- ✅ Extração de área das features

### 5. Anti-Bot
- ✅ Delays aleatórios (1.3s - 3.5s)
- ✅ Scroll lento e natural
- ✅ User-agent random
- ✅ Retry automático (3x)
- ✅ Timeouts configuráveis

## 📋 Uso

### Via API

```bash
POST /scrape
{
  "url": "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p",
  "only_new": false,  # opcional
  "max_pages": 5,     # opcional
  "max_ads": 10       # opcional
}
```

### Diretamente no código

```javascript
const scrapeCustoJusto = require('./src/scrapers/custojusto/custojusto.scraper');

const result = await scrapeCustoJusto('https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p', {
  onlyNew: false,    // Retornar apenas novos
  maxPages: null,    // Todas as páginas
  maxAds: null       // Todos os anúncios
});
```

## 📊 Formato de Resposta

```json
{
  "success": true,
  "new_ads": [...],      // Anúncios novos (se onlyNew=true)
  "total_new": 5,       // Número de novos
  "all_ads": [...]      // Todos os anúncios
}
```

## 🧪 Testes

```bash
node tests/test-custojusto.js
```

Testes incluídos:
- ✅ Extração de listagem (mínimo 10 anúncios)
- ✅ Extração de anúncio individual
- ✅ Scrape completo
- ✅ Detector de novos anúncios

## 🔧 Configuração

### Filtro de Particulares

**IMPORTANTE:** A URL deve sempre incluir `f=p` para filtrar apenas particulares:

```
✅ https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p
❌ https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa
```

## 📝 Notas

- O scraper sempre marca `advertiser.is_agency = false` e `signals.is_fsbo = true` (filtro f=p)
- Telefone pode ser `null` se não for possível extrair
- Cache é mantido em `data/custojusto_cache.json`
- Sistema de cache permite detectar anúncios novos entre execuções

