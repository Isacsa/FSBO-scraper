# Integração Idealista via Lobstr.io

## ✅ Implementação Completa

Foi criada uma integração completa do Idealista usando a API do Lobstr.io, que utiliza o squid "Idealista Listings Search Export" para fazer crawling completo e retornar resultados estruturados.

## 📁 Estrutura Criada

```
src/scrapers/idealista_lobstr/
├── idealista.client.js     # Cliente Lobstr API (tasks, runs, results)
├── idealista.extract.js    # Extração via Lobstr (cria task, obtém results)
├── idealista.parse.js      # Parsing e complementação de dados
├── idealista.normalize.js  # Normalização para formato FSBO_SCORE
└── idealista.scraper.js    # Entry-point principal

scripts/
└── list-lobstr-squids.js   # Script auxiliar para listar squids

tests/
└── test-idealista-lobstr.js # Testes automáticos
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# API Key do Lobstr.io (obrigatório)
export LOBSTR_API_KEY="sua-api-key-aqui"

# UUID do squid Idealista (opcional - será detectado automaticamente)
export IDEALISTA_SQUID_ID="707155221624420fb6995f1ba42d1ebf"
```

### Obter UUID do Squid

Execute o script auxiliar para listar squids disponíveis:

```bash
node scripts/list-lobstr-squids.js
```

Isso mostrará todos os squids disponíveis e o UUID do squid Idealista.

## 🚀 Uso

### Via API (Controller)

```bash
POST /scrape
{
  "url": "https://www.idealista.pt/comprar-casas/lisboa/",
  "max_results": 10  # opcional, padrão: 1
}
```

### Diretamente no código

```javascript
const scrapeIdealistaLobstr = require('./src/scrapers/idealista_lobstr/idealista.scraper');

const listings = await scrapeIdealistaLobstr('https://www.idealista.pt/comprar-casas/lisboa/', {
  maxResults: 10,
  maxWait: 300000 // 5 minutos
});
```

## 📊 Fluxo de Funcionamento

1. **Extract** (`idealista.extract.js`):
   - Cria task no Lobstr com URL de pesquisa
   - Aguarda run iniciar
   - Faz polling até run completar
   - Obtém todos os results via paginação

2. **Parse** (`idealista.parse.js`):
   - Infere tipo de imóvel do título
   - Converte bedrooms para tipologia (T1, T2, etc.)
   - Detecta se é agência (keywords)
   - Detecta fotos profissionais
   - Normaliza preços

3. **Normalize** (`idealista.normalize.js`):
   - Monta JSON final no formato FSBO_SCORE
   - Preenche campos obrigatórios
   - Aplica normalização final do schema

## 📋 Dados Retornados pelo Lobstr

O squid retorna os seguintes campos por listing:

- `id` - ID interno do Lobstr
- `native_id` - ID do anúncio no Idealista
- `url` - URL do anúncio
- `title` - Título
- `description` - Descrição
- `price` - Preço (número)
- `currency` - Moeda
- `area` - Área (m²)
- `bedrooms` - Número de quartos
- `floor` - Piso
- `main_image` - URL da imagem principal
- `phone` - Telefone (quando disponível)
- `scraping_time` - Data/hora do scraping

## 🔄 Campos Derivados

O parser infere os seguintes campos:

- `property.type` - Apartamento, moradia, etc. (do título)
- `tipology` - T1, T2, T3, etc. (de bedrooms)
- `is_agency` - Detectado por keywords
- `agency_keywords` - Lista de keywords encontradas
- `professional_photos` - Heurística baseada em URL da imagem

## ⚠️ Limitações

- **Localização**: Lobstr não fornece dados de localização (district, municipality, parish, lat, lng) - campos ficam `null`
- **Anunciante**: Nome sempre "unknown", total_ads sempre `null`
- **Features**: Array vazio (Lobstr não fornece features detalhadas)
- **Datas**: Apenas `published_date` (do scraping_time), `updated_date` sempre `null`
- **Condition**: Sempre `null` (Lobstr não fornece)

## 🧪 Testes

Execute os testes automáticos:

```bash
node tests/test-idealista-lobstr.js
```

## 📝 Notas Importantes

1. **Runs Abortados**: Se um run for abortado, o sistema lançará erro. Isso pode acontecer se:
   - O squid não estiver configurado corretamente
   - A URL de pesquisa for inválida
   - Houver problemas no Lobstr

2. **Polling**: O sistema faz polling a cada 5 segundos até o run completar (máximo 5 minutos por padrão)

3. **Paginação**: Results são obtidos automaticamente via paginação (100 por página)

4. **Compatibilidade**: O scraper retorna array de listings, mas o controller retorna apenas o primeiro para compatibilidade com API de anúncio individual

## 🔗 Integração com Sistema Existente

- ✅ Integrado no `scrapeController.js`
- ✅ Detectado automaticamente por `detectPlatform()`
- ✅ Compatível com n8n
- ✅ Usa `normalizeFinalObject()` para garantir schema
- ✅ Logging estruturado

