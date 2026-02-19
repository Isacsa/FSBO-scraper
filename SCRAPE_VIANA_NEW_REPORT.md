# Execucao Scrapes Viana (4 URLs) - Relatorio

Data de execucao: 2026-02-19

## URLs testados
- OLX: `https://www.olx.pt/imoveis/meadela/q-moradia/`
- CustoJusto: `https://www.custojusto.pt/viana-do-castelo/imobiliario/moradias?f=p`
- CasaSapo: `https://casa.sapo.pt/comprar-apartamentos/arcos-de-valdevez/`
- Imovirtual: `https://www.imovirtual.com/pt/resultados/comprar/apartamento/viana-do-castelo/viana-do-castelo?limit=36&ownerTypeSingleSelect=PRIVATE&by=DEFAULT&direction=DESC`

## Resultado por scraper

### 1) OLX
- `success`: `true`
- `count`: `25`
- `duration_ms`: `646348`
- output: `data/output_olx_viana_new.json`
- log: `data/log_olx_viana_new.txt`

Notas de qualidade:
- Resultado abaixo de 30 (25 anuncios).
- Aparecem anuncios fora do alvo "moradia" (ex.: garagem, armazem, quarto, sepultura).
- Aparecem URLs de outro portal dentro do resultado (`imovirtual.com`) em alguns itens.
- Log com avisos pontuais de localizacao/anunciante/fotos em falta e parsing de data.

Fase provavel do problema (quando qualidade cai):
- `listings` (filtro por tipo de anuncio insuficiente e mistura de links nao alvo).

---

### 2) CustoJusto
- `success`: `true`
- `count`: `16`
- `duration_ms`: `311310`
- output: `data/output_custojusto_viana_new.json`
- log: `data/log_custojusto_viana_new.txt`

Notas de qualidade:
- Resultado abaixo de 30 (16 anuncios).
- Itens incluem localizacoes fora do foco esperado (ex.: Moncao, Melgaco, Ponte de Lima, etc.).
- Campo `description` vem com muito ruido (CSS/HTML/texto de layout inteiro da pagina em varios itens).
- Alguns campos de localizacao/parish aparecem truncados ou misturados.

Fase provavel do problema (quando qualidade cai):
- `parse` (extracao de conteudo principal do anuncio) e `listings` (filtro geografico).

---

### 3) CasaSapo
- `success`: `true`
- `count`: `6`
- `duration_ms`: `137716`
- output: `data/output_casasapo_viana_new.json`
- log: `data/log_casasapo_viana_new.txt`

Notas de qualidade:
- Resultado bastante abaixo de 30 (6 anuncios), mas coerente com o URL bastante especifico (apartamentos em Arcos de Valdevez).
- Sem erros no log (ficheiro vazio).
- Campos extraidos com qualidade razoavel, embora `features` venha muito verboso.

Fase provavel do problema (quando qualidade cai):
- `listings` (escopo reduzido do URL de pesquisa).

---

### 4) Imovirtual
- `success`: `true`
- `count`: `5`
- `duration_ms`: `93034`
- output: `data/output_imovirtual_viana_new.json`
- log: `data/log_imovirtual_viana_new.txt`

Notas de qualidade:
- Resultado bastante abaixo de 30 (5 anuncios).
- Existem duplicados de conteudo com variacao de URL (`/pt/anuncio/...` e `/hpr/pt/anuncio/...`).
- Alguns mapeamentos de campos parecem ruidosos (ex.: `property.type` como `garagem` em anuncio T3/T2).
- Log sem erro fatal; apenas aviso de validacao de filtro `PRIVATE`.

Fase provavel do problema (quando qualidade cai):
- `listings` (baixa oferta no recorte atual) e `parse/normalize` (mapeamento de tipo/area em alguns casos).

## Resumo consolidado
- Total extraido: `52` anuncios (25 + 16 + 6 + 5).
- Nenhum scraper falhou tecnicamente (`success=true` nos 4).
- Nenhum atingiu 30 anuncios neste recorte.
- Gargalo principal observado: qualidade de `listings`/filtro por contexto (categoria/local/tipo) e algum ruido de `parse` em CustoJusto/Imovirtual.

## Proximos passos incrementais (sem reescrever logica de portal)
1. Validar e endurecer filtro de links no `listings` (manter apenas links do proprio portal e da categoria alvo).
2. Em CustoJusto, reforcar extracao de `description` para ignorar CSS/layout (captura de bloco semantico do anuncio).
3. Em Imovirtual, normalizar URL canonica para reduzir duplicados (`/hpr/` vs normal).
4. Manter estes mesmos URLs como baseline e repetir execucao apos ajustes pequenos para comparar `count` e qualidade.
