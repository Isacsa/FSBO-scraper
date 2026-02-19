# Execução Scrapes Viana + Relatório

Data da execução: `2026-02-19`

## Objetivo
- Executar scraping para os 3 URLs fornecidos, com alvo de até **30 anúncios por website**.
- Gerar outputs JSON e registar diagnóstico quando não atingir o alvo.

URLs testados:
- OLX: `https://www.olx.pt/meadela/q-moradia/`
- CustoJusto: `https://www.custojusto.pt/portugal/q/Viana%20do%20castelo?f=p`
- Imovirtual: `https://www.imovirtual.com/pt/resultados/comprar/apartamento/viana-do-castelo/viana-do-castelo`

## Comandos executados

```bash
node run-scraper.js --platform=olx --url="https://www.olx.pt/meadela/q-moradia/" --mode=full --maxPages=5 --maxAds=30 --n8n > data/output_olx_viana_30.json 2> data/log_olx_viana_30.txt

node run-scraper.js --platform=custojusto --url="https://www.custojusto.pt/portugal/q/Viana%20do%20castelo?f=p" --mode=full --maxPages=5 --maxAds=30 --n8n > data/output_custojusto_viana_30.json 2> data/log_custojusto_viana_30.txt

node run-scraper.js --platform=imovirtual --url="https://www.imovirtual.com/pt/resultados/comprar/apartamento/viana-do-castelo/viana-do-castelo" --mode=full --maxPages=5 --maxAds=30 --n8n > data/output_imovirtual_viana_30.json 2> data/log_imovirtual_viana_30.txt
```

## Resumo rápido

| Website | Status | Count | Duração |
|---|---:|---:|---:|
| OLX | success | 10 | ~600s |
| CustoJusto | success | 1 | ~93s |
| Imovirtual | success | 5 | ~91s |

Resultado: **não foi possível chegar a 30 anúncios** em nenhum dos 3 com os URLs/heurísticas atuais.

---

## 1) OLX

Ficheiros:
- `data/output_olx_viana_30.json`
- `data/log_olx_viana_30.txt`

Output (extrato):
```json
{
  "success": true,
  "platform": "olx",
  "duration_ms": 599903,
  "count": 10,
  "meta": {
    "total_results": 10,
    "duplicates_removed": 0,
    "incremental": {
      "new": 10,
      "updated": 0,
      "unchanged": 0,
      "removed": 0
    }
  }
}
```

Observações:
- Foram extraídos vários anúncios **fora de imobiliário** (ex.: motor fora de bordo, livros, etc.), indicando baixa precisão na extração de cards/links para esse URL.
- Logs com muitos avisos de localização:
```text
[OLX Extract] ⚠️  Localização não encontrada
```

---

## 2) CustoJusto

Ficheiros:
- `data/output_custojusto_viana_30.json`
- `data/log_custojusto_viana_30.txt`

Output (extrato):
```json
{
  "success": true,
  "platform": "custojusto",
  "duration_ms": 93471,
  "count": 1,
  "meta": {
    "total_results": 1,
    "duplicates_removed": 0,
    "incremental": {
      "new": 1,
      "updated": 0,
      "unchanged": 0,
      "removed": 0
    }
  }
}
```

Observações:
- O URL usado (`/portugal/q/Viana%20do%20castelo?f=p`) é pesquisa global e não está estritamente focado em imobiliário/listagem por concelho.
- A própria página mostra mistura de categorias (não só imóveis), o que aumenta ruído para o scraper ([fonte](https://www.custojusto.pt/portugal/q/Viana%20do%20castelo?f=p)).
- Logs:
```text
[CustoJusto Extract] ⚠️  AVISO: Parâmetro f=p não encontrado na URL!
[CustoJusto Extract] ⚠️  Adicionando f=p para filtrar apenas particulares...
[CustoJusto Extract] ⚠️  Nenhum seletor encontrou elementos, tentando extrair mesmo assim...
```

---

## 3) Imovirtual

Ficheiros:
- `data/output_imovirtual_viana_30.json`
- `data/log_imovirtual_viana_30.txt`

Output (extrato):
```json
{
  "success": true,
  "platform": "imovirtual",
  "duration_ms": 91509,
  "count": 5,
  "meta": {
    "total_results": 5,
    "duplicates_removed": 0,
    "incremental": {
      "new": 4,
      "updated": 0,
      "unchanged": 1,
      "removed": 0
    }
  }
}
```

Observações:
- O scraper funcionou melhor dos 3, mas ainda distante de 30 anúncios com estes limites e a disponibilidade/paginação efetiva da query.
- Log:
```text
[Imovirtual Listings] ⚠️  AVISO: Filtro de particulares não encontrado na URL!
[Imovirtual Listings] ⚠️  Adicionando ownerTypeSingleSelect=PRIVATE...
```

---

## Diagnóstico (sem alterar lógica do portal)

### Ponto principal
- Atingir 30 anúncios depende fortemente da **qualidade da URL de listagem** e dos **seletores de cards** de cada portal.
- Neste teste, os 3 runs não falharam tecnicamente (`success=true`), mas tiveram **recall baixo** (10/1/5).

### Causas prováveis por portal
- **OLX**: URL/extração está a puxar links não-imobiliário; falta precisão no filtro de links de listagem para “moradias”.
- **CustoJusto**: URL global `portugal/q/...` gera muita mistura de categorias; seletor não encontrou bem a estrutura esperada de cards imobiliário.
- **Imovirtual**: melhor resultado, mas ainda com universo limitado para chegar a 30 dentro dos limites de páginas atuais.

### Próximos passos recomendados (incrementais)
1. Testar URLs mais específicas de imobiliário por portal (sem mexer na lógica de parse).
2. Aumentar `--maxPages` para 10 apenas nos portais que devolvem poucos resultados.
3. No OLX/CustoJusto, ajustar apenas filtro de URL de anúncio na fase de listagem (mudança mínima de seletor/filtro, sem reestruturar parser).
4. Repetir corrida e comparar `count` + qualidade sem mudar schema de output.

