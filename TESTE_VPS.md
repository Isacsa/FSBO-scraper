# 🧪 Como Testar o Scraper CustoJusto no VPS Hostinger

## 📋 Pré-requisitos

1. **Conectar ao VPS via SSH:**
   ```bash
   ssh usuario@seu-vps-hostinger.com
   ```

2. **Navegar para o diretório do projeto:**
   ```bash
   cd /caminho/para/fsbo-scraper
   ```

3. **Verificar se as dependências estão instaladas:**
   ```bash
   npm install
   ```

4. **Instalar o browser Chromium do Playwright:**
   ```bash
   npx playwright install chromium
   ```

## 🚀 Comandos para Testar

### Teste Básico (Poucos Anúncios)

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --maxPages=1 \
  --maxAds=5
```

**O que faz:**
- Scrape apenas a primeira página
- Limita a 5 anúncios (para teste rápido)
- Roda em headless automaticamente (VPS Linux)

### Teste Completo (Todas as Páginas)

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --mode=full
```

**O que faz:**
- Scrape todas as páginas disponíveis
- Processa todos os anúncios
- Pode demorar vários minutos

### Teste Apenas Novos Anúncios

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --mode=new \
  --maxPages=3
```

**O que faz:**
- Compara com cache local
- Retorna apenas anúncios novos
- Limita a 3 páginas

### Teste com Debug (Logs Detalhados)

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --maxPages=1 \
  --maxAds=3 \
  --debug
```

**Nota:** `--debug` apenas ativa logs detalhados. O browser **sempre** roda em headless no VPS.

### Teste Silencioso (Apenas JSON)

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --maxPages=1 \
  --maxAds=3 \
  --silent \
  --json-only
```

**O que faz:**
- Sem logs no terminal
- Apenas JSON no stdout (útil para scripts)

## 📊 Exemplos de URLs

### Moradias em Lisboa (Particulares)
```bash
--url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p"
```

### Apartamentos no Porto (Particulares)
```bash
--url="https://www.custojusto.pt/portugal/imobiliario/apartamentos/q/Porto?f=p"
```

### Terrenos em Coimbra (Particulares)
```bash
--url="https://www.custojusto.pt/portugal/imobiliario/terrenos/q/Coimbra?f=p"
```

**Importante:** O parâmetro `?f=p` é **essencial** - filtra apenas anúncios de particulares (FSBO).

## 🔍 Verificar Resultado

O comando retorna JSON no stdout. Exemplo:

```json
{
  "success": true,
  "platform": "custojusto",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration_ms": 45000,
  "results": [
    {
      "source": "custojusto",
      "ad_id": "12345678",
      "url": "https://www.custojusto.pt/...",
      "title": "Moradia T4",
      "price": "250000",
      "location": {...},
      "property": {...},
      "advertiser": {...}
    }
  ],
  "count": 5
}
```

## 💾 Salvar Resultado em Arquivo

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --maxPages=1 \
  --maxAds=5 \
  --json-only > resultado.json
```

## ⚠️ Troubleshooting

### Erro: "Browser not found"
```bash
npx playwright install chromium
```

### Erro: "Navigation timeout"
- Aumente o timeout ou verifique a conexão
- Alguns sites podem estar lentos

### Erro: "No ads found"
- Verifique se a URL está correta
- Certifique-se que tem `?f=p` no final
- Verifique se há anúncios na página

### Verificar se está rodando em headless
```bash
# No VPS, o browser sempre roda em headless
# Verifique os logs - não deve tentar abrir janela gráfica
```

## 📝 Parâmetros Disponíveis

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `--platform` | Plataforma (obrigatório) | `custojusto` |
| `--url` | URL da listagem (obrigatório) | URL completa com `?f=p` |
| `--mode` | Modo: `new` ou `full` | `full` (padrão) |
| `--maxPages` | Limitar páginas | `5` |
| `--maxAds` | Limitar anúncios | `10` |
| `--debug` | Logs detalhados | (flag) |
| `--silent` | Sem logs | (flag) |
| `--json-only` | Apenas JSON | (flag) |
| `--n8n` | Modo n8n | (flag) |

## 🎯 Teste Rápido Recomendado

Para testar rapidamente no VPS:

```bash
node run-scraper.js \
  --platform=custojusto \
  --url="https://www.custojusto.pt/portugal/imobiliario/moradias/q/Lisboa?f=p" \
  --maxPages=1 \
  --maxAds=3 \
  --debug
```

Este comando:
- ✅ Roda em headless automaticamente (VPS)
- ✅ Processa apenas 1 página
- ✅ Limita a 3 anúncios (rápido)
- ✅ Mostra logs detalhados
- ✅ Retorna JSON completo

## 🔄 Próximos Passos

Após testar com sucesso:
1. Ajuste `--maxPages` e `--maxAds` conforme necessário
2. Use `--mode=new` para detectar apenas novos anúncios
3. Integre com n8n usando `--n8n` flag
4. Configure cron jobs para execução automática

