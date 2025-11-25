# FSBO Scraper

Microserviço backend em Node.js com Playwright Stealth para extrair informações de anúncios FSBO (For Sale By Owner).

## 🚀 Características

- ✅ Arquitetura modular e extensível
- ✅ Playwright Stealth para evitar detecção
- ✅ Extração de telefone, título, preço, localização e descrição
- ✅ Retry automático e tratamento de erros
- ✅ Pronto para deploy em Railway/Fly.io/Docker

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🔧 Instalação

```bash
# Clonar o repositório
cd fsbo-scraper

# Instalar dependências
npm install

# Instalar browsers do Playwright
npx playwright install chromium
```

## 🏃 Como Correr Localmente

```bash
# Modo produção
npm start

# Modo desenvolvimento (com watch)
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## 📡 API Endpoints

### POST /scrape

Extrai informações de um anúncio FSBO.

**Request Body:**
```json
{
  "url": "https://example.com/listing/...",
  "includeRawHtml": false,  // opcional
  "headless": true          // opcional
}
```

**Response:**
```json
{
  "success": true,
  "platform": "example",
  "url": "https://example.com/listing/...",
  "phone": "+1234567890",
  "title": "Beautiful House for Sale",
  "price": "$250,000",
  "location": "New York, NY",
  "description": "Full description...",
  "rawHtml": "..."  // apenas se includeRawHtml: true
}
```

**Exemplo de uso com cURL:**
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/listing/..."
  }'
```

**Exemplo com Node.js:**
```javascript
const response = await fetch('http://localhost:3000/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/listing/...'
  })
});

const data = await response.json();
console.log(data);
```

### GET /health

Verifica o status do serviço.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🐳 Deploy com Docker

### Build da imagem:
```bash
docker build -t fsbo-scraper .
```

### Executar container:
```bash
docker run -p 3000:3000 fsbo-scraper
```

## 🚂 Deploy no Railway

1. Conecte seu repositório ao Railway
2. Railway detectará automaticamente o Dockerfile
3. Configure a variável de ambiente `PORT` (opcional, padrão: 3000)
4. Deploy automático!

## ✈️ Deploy no Fly.io

1. Instale o Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Faça login: `fly auth login`
3. Crie o app: `fly launch`
4. Deploy: `fly deploy`

## 🧪 Testes

```bash
npm test
```

## 📁 Estrutura do Projeto

```
.
├── src/
│   ├── scrapers/
│   │   └── example.js        # Template de scraper
│   ├── routes/
│   │   └── scrapeRoute.js
│   ├── controllers/
│   │   └── scrapeController.js
│   └── utils/
│       ├── browser.js
│       └── selectors.js
├── tests/
│   └── test.js
├── server.js
├── package.json
├── Dockerfile
└── README.md
```

## 🔍 Adicionar Novo Scraper

1. Crie um novo arquivo em `src/scrapers/` (ex: `fsbo.js`)
2. Use `src/scrapers/example.js` como template
3. Implemente a função de scraping seguindo o padrão:
   ```javascript
   async function scrapeFSBO(url, options = {}) {
     // Seu código aqui
     return {
       success: true,
       platform: 'fsbo',
       url,
       title,
       price,
       location,
       phone,
       description
     };
   }
   module.exports = scrapeFSBO;
   ```
4. Adicione a detecção da plataforma em `src/utils/selectors.js`:
   ```javascript
   if (lowerUrl.includes('fsbo.com')) {
     return 'fsbo';
   }
   ```

## ⚙️ Configuração

### Variáveis de Ambiente

- `PORT` - Porta do servidor (padrão: 3000)
- `NODE_ENV` - Ambiente (development/production)
- `HEADLESS` - Modo headless do browser (true/false, padrão: true)

### Opções de Scraping

- `headless`: true/false - Modo headless do browser (padrão: true)
- `includeRawHtml`: true/false - Incluir HTML bruto na resposta (padrão: false)

## 🐛 Troubleshooting

### Erro: "Browser not found"
```bash
npx playwright install chromium
```

### Erro: "Navigation timeout"
- Verifique se a URL está correta
- Alguns sites podem ter proteções anti-bot mais fortes
- Tente aumentar o timeout nas opções

### Telefone não encontrado
- Alguns anúncios podem não ter telefone disponível
- Verifique se o botão "mostrar número" foi clicado corretamente
- Alguns sites podem exigir login

## 📝 Notas

- Este scraper usa técnicas stealth para evitar detecção
- Alguns sites podem mudar seus seletores CSS, necessitando atualização
- Use com responsabilidade e respeite os termos de serviço dos sites
- Para produção, considere adicionar rate limiting e cache

## 📄 Licença

MIT


