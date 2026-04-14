# FSBO Scraper — Alto Minho Coverage Audit

**Data:** 2026-04-14
**Contexto:** O scraper nao esta a captar imoveis em zonas rurais e vilas do Alto Minho. Exemplo: anuncio IDIYToo (T3 em Ponte de Lima) encontrado pelo scraper (em olx_cache.json, 2026-03-27) mas nunca chegou ao output final.

---

## 1. Como o scraper define zonas de pesquisa

O scraper e **stateless e config-driven**. Puxa configs da APP API via `pullConfigs()`. Cada config tem:
```json
{
  "id": "uuid",
  "area_label": "Viana do Castelo",
  "sources": {
    "olx": "https://www.olx.pt/meadela/q-moradia/",
    "custojusto": "https://www.custojusto.pt/portugal/q/Viana%20do%20castelo?f=p",
    "imovirtual": "https://www.imovirtual.com/pt/resultados/comprar/apartamento/viana-do-castelo/viana-do-castelo"
  }
}
```

### Problemas nas URLs actuais

| Plataforma | URL usada | Problema |
|---|---|---|
| OLX | `/meadela/q-moradia/` | Pesquisa apenas na freguesia de Meadela, nao no distrito |
| CustoJusto | `/portugal/q/Viana%20do%20castelo?f=p` | Pesquisa global, sem categoria de imobiliario — retorna ruido |
| Imovirtual | `/comprar/apartamento/viana-do-castelo/viana-do-castelo` | So apartamentos, so na cidade de Viana do Castelo |

- **Pesquisa por concelho ou distrito?** — Nao. As URLs sao ao nivel de freguesia (OLX) ou cidade (Imovirtual).
- **Nomes de localidade ou coordenadas?** — Nomes, via slugs nos URLs. Sem coordenadas/raio.
- **Limite de raio geografico?** — Nao ha raio. O limite e o scope da URL.
- **Paginacao?** — Funciona (maxPages=5, maxAds=30 por defeito), mas o universo de resultados ja e limitado pelas URLs estreitas.

---

## 2. Cobertura por zona — Resultados scraper vs realidade

### Distrito de Viana do Castelo

| Zona | Plataforma | Resultados scraper | Resultados reais (estimativa) | Diferenca | Causa |
|---|---|---:|---:|---|---|
| **Viana do Castelo (cidade)** | OLX | ~8 | 30+ | -22 | URL so cobre Meadela, nao o concelho inteiro |
| | CustoJusto | 1 | 15+ | -14 | URL global sem filtro de imobiliario |
| | Imovirtual | 5 | 20+ | -15 | So apartamentos, so cidade VdC |
| **Ponte de Lima** | OLX | 0 (directo) | 20+ | -20 | Concelho nao incluido na URL de pesquisa |
| | CustoJusto | 0 | 10+ | -10 | URL global nao especifica concelho |
| | Imovirtual | 0 | 10+ | -10 | URL nao cobre Ponte de Lima |
| **Arcos de Valdevez** | OLX | 0 | 10+ | -10 | Concelho nao incluido |
| | CustoJusto | 0 | 5+ | -5 | URL global |
| | Imovirtual | 0 | 5+ | -5 | Nao coberto |
| **Ponte da Barca** | OLX | 0 | 5+ | -5 | Nao coberto |
| | CustoJusto | 0 | 3+ | -3 | Nao coberto |
| **Paredes de Coura** | OLX | 0 | 3+ | -3 | Nao coberto |
| **Moncao** | OLX | 0 | 5+ | -5 | Nao coberto |
| **Melgaco** | OLX | 0 | 3+ | -3 | Nao coberto |
| **Valenca** | OLX | 0 | 5+ | -5 | Nao coberto |
| **Vila Nova de Cerveira** | OLX | 0 | 3+ | -3 | Nao coberto |
| **Caminha** | OLX | 0 | 5+ | -5 | Nao coberto |

**Nota:** O ad IDIYToo (Ponte de Lima) aparece no `olx_cache.json` (first_seen: 2026-03-27) porque o scraper o encontrou numa pesquisa mais ampla num determinado momento, mas nao aparece no output final. O ad foi bloqueado no pipeline (ver secao 3).

### Freguesias especificas mencionadas

| Freguesia | Concelho | No dataset? | No scraper? | Notas |
|---|---|---|---|---|
| Arcozelo | Ponte de Lima | Sim | Via cache | Unica freguesia de PdL no dataset |
| Freixo | Ponte de Lima | Nao | Nao | Falta no dataset |
| Brandara | Ponte de Lima | Nao | Nao | Falta no dataset |
| Refoios | Ponte de Lima | Nao | Nao | Falta no dataset |
| Facha | Ponte de Lima | Nao | Nao | Falta no dataset |
| Bertiandos | Ponte de Lima | Nao | Nao | Falta no dataset |
| Estoraos | Ponte de Lima | Nao | Nao | Falta no dataset |
| Moreira do Lima | Ponte de Lima | Nao | Nao | Falta no dataset |
| Santa Comba | Ponte de Lima | Nao | Nao | Falta no dataset |
| Paco | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Jolda | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Sabadim | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Grade | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Prozelo | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Sao Jorge | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Giela | Arcos de Valdevez | Nao | Nao | Falta no dataset |
| Vila Nova de Muia | Ponte da Barca | Nao | Nao | Falta no dataset |
| Bravaes | Ponte da Barca | Nao | Nao | Falta no dataset |
| Crasto | Ponte da Barca | Nao | Nao | Falta no dataset |
| Lindoso | Ponte da Barca | Nao | Nao | Falta no dataset |
| Entre Ambos-os-Rios | Ponte da Barca | Nao | Nao | Falta no dataset |
| Areosa | Viana do Castelo | Nao | Nao | Falta no dataset |
| Darque | Viana do Castelo | Nao | Nao | Falta no dataset |
| Santa Marta de Portuzelo | Viana do Castelo | Nao | Nao | Falta no dataset |
| Afife | Viana do Castelo | Nao | Nao | Falta no dataset |
| Carreco | Viana do Castelo | Nao | Nao | Falta no dataset |

---

## 3. Analise do pipeline — Onde se perdem anuncios

### Caso IDIYToo (T3 Ponte de Lima)

O anuncio foi encontrado pelo scraper e adicionado ao cache OLX, mas nao chegou ao output. Rastreio do pipeline:

1. **Scrape** — Encontrado (esta em `olx_cache.json`, `first_seen: 2026-03-27`)
2. **Dedupe** — Passa (URL unico)
3. **FSBO Scoring** — Score = 60 (baseline 50 + 10 por `advertiser_marked_private`)
   - `fsbo_decision = 'uncertain'` (precisa >= 70 para 'fsbo')
4. **Precision Gate** — Verifica `uncertain` com score 60 >= 60 → deveria ser ACEITE
   - **MAS**: Se o preco for < 2000 E nao houver sale hint → REJEITADO como arrendamento
   - Bug: "Vende-se" (no titulo) NAO esta nos `SALE_HINT_PATTERNS` (so tem "venda", "vender", "comprar", "compra")

### Filtros problematicos para zonas rurais

| Filtro | Ficheiro | Impacto rural | Severidade |
|---|---|---|---|
| **Price < 2000 = rent** | precisionGate.js:145-148 | Terrenos/ruinas rurais baratos (<2000) rejeitados | MEDIA |
| **"vende-se" ausente** | precisionGate.js:36-41 | Titulo mais comum em PT nao reconhecido como venda | ALTA |
| **FSBO score = 60 exacto** | fsboSignals.js:556 | Margem zero — qualquer sinal negativo bloqueia | ALTA |
| **Uncertain sem score >= 60** | precisionGate.js:198-206 | Items sem dados de anunciante bloqueados | MEDIA |

---

## 4. Cobertura de plataformas

| Plataforma | Coberta? | Notas |
|---|---|---|
| OLX | Sim | Maior portal, mas URLs de pesquisa estreitas |
| CustoJusto | Sim | URL global sem filtro de categoria = ruido |
| Imovirtual | Sim | So apartamentos na cidade de VdC |
| CasaSapo | Sim | Experimental, sem configs activas para VdC |
| Idealista | Sim (via Lobstr) | Sem configs activas para VdC |
| Facebook Marketplace | Nao | Nao suportado pelo scraper |

### Filtro de profissionais/agencias

O scraper filtra agencias em multiplas camadas:
1. **OLX URL filter**: `search[private_business]=private` (adicionado automaticamente)
2. **FSBO scoring**: Analise de keywords, padroes, numero de anuncios do anunciante
3. **Precision gate**: Rejeita `agency_signal` e `uncertain` sem score alto

**Risco de over-filtering**: Particulares com nomes parecidos com agencias (ex: "Joao Imobiliaria" sendo nome pessoal) podem ser falsamente rejeitados. O threshold de FSBO score = 60 e apertado.

### Deduplicacao cross-platform

O `dedupeListInMemory` usa fingerprinting baseado em URL. Funciona dentro de cada run, mas nao entre plataformas (um anuncio no OLX e CustoJusto aparece como dois items distintos). A precision gate valida que o URL pertence ao portal correcto, evitando cross-contamination.

---

## 5. Causas raiz resumidas

1. **URLs de pesquisa demasiado estreitas** — Cobrem apenas uma freguesia/cidade, nao o distrito inteiro
2. **"Vende-se" ausente nos SALE_HINT_PATTERNS** — O indicador de venda mais comum em PT nao e reconhecido
3. **Formato single-URL por plataforma** — Impossivel cobrir multiplos tipos de imovel ou concelhos
4. **Location dataset incompleto** — ~250 freguesias do Alto Minho em falta
5. **FSBO score no limite exacto** — `advertiser_marked_private` da +10 (50→60), margem zero para o threshold de 60

---

## 6. Recomendacoes

1. Corrigir `SALE_HINT_PATTERNS` — adicionar "vende-se", "vendo", "a venda" + indicadores de URL
2. Expandir location dataset com todas as freguesias do Alto Minho
3. Suportar arrays de URLs por plataforma nos orchestrators
4. Aumentar bonus `advertiser_marked_private` de +10 para +15
5. Criar gerador de URLs para o Alto Minho completo
6. Configurar URLs ao nivel de distrito (OLX, Imovirtual) e concelho (CustoJusto, CasaSapo)
