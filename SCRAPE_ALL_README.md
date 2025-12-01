# Scrape All - Executar Todos os Scrapers

Este script permite executar o scrape de todos os websites suportados de uma vez.

## 🚀 Plataformas Suportadas

- **OLX** (`olx`)
- **Imovirtual** (`imovirtual`)
- **Idealista** (`idealista`)
- **CustoJusto** (`custojusto`)
- **CasaSapo** (`casasapo`)

## 📋 Uso Básico

### 1. Usando arquivo de configuração

Crie um arquivo JSON com as URLs e opções:

```json
{
  "urls": {
    "idealista": "https://www.idealista.pt/comprar-casas/lisboa/",
    "custojusto": "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p",
    "casasapo": "https://www.casasapo.pt/comprar/moradias/lisboa"
  },
  "options": {
    "headless": true,
    "onlyNew": false,
    "maxPages": 10,
    "maxAds": 50
  }
}
```

Execute:

```bash
npm run scrape-all -- --config scrape-all-config.json
```

### 2. Usando argumentos de linha de comando

```bash
npm run scrape-all -- \
  --idealista-url "https://www.idealista.pt/comprar-casas/lisboa/" \
  --custojusto-url "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --casasapo-url "https://www.casasapo.pt/comprar/moradias/lisboa"
```

### 3. Executar apenas algumas plataformas

```bash
npm run scrape-all -- \
  --custojusto-url "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --casasapo-url "https://www.casasapo.pt/comprar/moradias/lisboa"
```

## ⚙️ Opções Disponíveis

### URLs por Plataforma

- `--olx-url URL` - URL do anúncio OLX
- `--imovirtual-url URL` - URL do anúncio Imovirtual
- `--idealista-url URL` - URL de listagem Idealista
- `--custojusto-url URL` - URL de listagem CustoJusto
- `--casasapo-url URL` - URL de listagem CasaSapo

### Opções Gerais

- `--config PATH` - Caminho para arquivo de configuração JSON
- `--headless true|false` - Modo headless do browser (padrão: true)
- `--only-new` - Apenas anúncios novos (para CustoJusto e CasaSapo)
- `--max-pages N` - Limitar número de páginas (para CustoJusto e CasaSapo)
- `--max-ads N` - Limitar número de anúncios (para CustoJusto e CasaSapo)
- `--max-results N` - Limitar número de resultados (para Idealista)
- `--parallel` - Executar scrapers em paralelo (mais rápido, mas usa mais recursos)
- `--output PATH` - Salvar resultado em arquivo JSON
- `--silent` - Modo silencioso (menos logs)
- `--json-only` - Apenas imprimir JSON (útil para integração)

## 📊 Exemplos

### Exemplo 1: Scrape completo de Lisboa

```bash
npm run scrape-all -- \
  --idealista-url "https://www.idealista.pt/comprar-casas/lisboa/" \
  --custojusto-url "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --casasapo-url "https://www.casasapo.pt/comprar/moradias/lisboa" \
  --max-pages 5 \
  --max-ads 100 \
  --output data/lisboa-scrape.json
```

### Exemplo 2: Apenas novos anúncios em paralelo

```bash
npm run scrape-all -- \
  --custojusto-url "https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --casasapo-url "https://www.casasapo.pt/comprar/moradias/lisboa" \
  --only-new \
  --parallel \
  --output data/new-ads.json
```

### Exemplo 3: Usando arquivo de configuração

```bash
# 1. Copiar exemplo
cp scrape-all-config.example.json my-config.json

# 2. Editar my-config.json com suas URLs

# 3. Executar
npm run scrape-all -- --config my-config.json
```

## 📤 Formato de Saída

O script retorna um JSON com:

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration_ms": 45000,
  "platforms": {
    "total": 3,
    "successful": 2,
    "failed": 1
  },
  "results": [
    // Array com todos os anúncios (já deduplicados e com FSBO scores)
  ],
  "count": 150,
  "by_platform": {
    "idealista": { ... },
    "custojusto": { ... },
    "casasapo": { ... }
  },
  "meta": {
    "total_before_dedupe": 155,
    "total_after_dedupe": 150,
    "duplicates_removed": 5
  }
}
```

## 🔄 Pipeline Automático

O script automaticamente:

1. ✅ Executa scrape de todas as plataformas especificadas
2. ✅ Deduplica anúncios (remove duplicados)
3. ✅ Calcula FSBO scores para cada anúncio
4. ✅ Combina todos os resultados em um único array

## ⚠️ Notas Importantes

- **OLX e Imovirtual**: Requerem URLs de anúncios individuais (não listagens)
- **Idealista, CustoJusto, CasaSapo**: Podem usar URLs de listagem
- **Modo Paralelo**: Mais rápido, mas usa mais recursos do sistema
- **Deduplicação**: Anúncios duplicados são removidos automaticamente
- **Cache**: CustoJusto e CasaSapo usam cache para detectar anúncios novos

## 🐛 Troubleshooting

### Erro: "Nenhuma URL fornecida"

Certifique-se de fornecer pelo menos uma URL usando `--PLATFORM-url` ou `--config`.

### Erro: "Platform not supported"

Verifique se a plataforma está na lista de suportadas e se a URL está correta.

### Timeout ou erros de conexão

- Tente aumentar o timeout nas opções
- Verifique sua conexão à internet
- Alguns sites podem ter proteções anti-bot

