# Estratégia FSBO por Website

Este ficheiro resume **como o projeto tenta encontrar anúncios FSBO** em cada portal suportado, com base na lógica atual do código. O objetivo é documentar a estratégia real usada hoje, sem assumir que todos os websites funcionam da mesma forma.

Importante:
- As heurísticas **não são equivalentes entre portais**.
- Em alguns websites, o scraper tenta obter **“particulares” diretamente pela listagem**.
- Noutros, a estratégia é **extrair anúncios candidatos** e depois aplicar heurísticas para excluir agências.
- O documento descreve o estado atual, não uma versão “ideal”.

## Visão geral

O projeto suporta atualmente estes websites:

- `OLX`
- `CustoJusto`
- `CasaSapo`
- `Imovirtual`
- `Idealista` (via `Lobstr`)

A pipeline base é parecida em todos:

1. detetar se a URL é de **listagem** ou **anúncio individual**
2. extrair URLs da listagem
3. abrir cada anúncio individual
4. fazer parse
5. normalizar para o schema final
6. opcionalmente aplicar:
   - filtro de agências
   - cache de “novos”
   - sinais FSBO

## Estratégia comum do projeto

Existem duas camadas principais:

### 1. Filtro por fonte / listagem

Quando possível, o projeto tenta **partir logo de uma listagem já filtrada para particulares**. Isso reduz falsos positivos e evita depender só de heurísticas depois.

Exemplos:
- `CustoJusto`: força `f=p`
- `Imovirtual`: força `ownerTypeSingleSelect=PRIVATE`
- `CasaSapo`: usa ausência de telefone visível como proxy de particular

### 2. Heurísticas transversais

Quando o portal não garante particulares de forma forte, entram os sinais FSBO em [`src/services/fsboSignals.js`](src/services/fsboSignals.js):

- keywords de agência no nome, título ou descrição
- padrões profissionais (`AMI`, `REF`, `consultor imobiliário`, etc.)
- URL de perfil com padrões de agência
- número total de anúncios do anunciante
- watermarks / fotos profissionais
- cache de duplicados por fingerprint

Estas heurísticas são especialmente relevantes no `OLX` e em fluxos onde o portal não entrega um filtro “private only” suficientemente confiável.

## OLX

### Estratégia atual

No `OLX`, a abordagem é **mista**:

1. tentar filtrar particulares já na listagem
2. abrir cada anúncio individual
3. aplicar heurísticas de agência quando necessário

O scraper principal está em [`src/scrapers/olx/olx.scraper.js`](src/scrapers/olx/olx.scraper.js).

### Como identifica listagem vs anúncio

O `OLX` usa uma função própria para distinguir URLs de listagem de URLs individuais:

- URLs com `/ad/` ou `/anuncio/` e slug comprido são tratadas como anúncio individual
- URLs terminadas com `/` ou contendo `?q=` / `/q-` são tratadas como listagem

### Como tenta encontrar FSBO

Na listagem:

- o scraper tenta adicionar um filtro de particulares
- se a URL já estiver filtrada por particulares, desativa o filtro extra de agências
- se não estiver, aplica depois `filterAgencies()`

No detalhe:

- calcula sinais FSBO
- usa `advertiser.is_agency` e `signals.is_agency`
- pode visitar o perfil do anunciante para ver `total_ads`

### Heurísticas específicas

As heurísticas mais usadas no `OLX` são:

- nome do anunciante
- URL do perfil
- total de anúncios
- texto da descrição
- sinais de fotos profissionais / watermark

### Pontos fortes

- Boa capacidade de extrair listagens
- Sistema mais rico de exclusão de agências
- Pode aproveitar o perfil do anunciante para refinar a decisão

### Limitações / riscos

- Há casos em que aparecem URLs de outros domínios misturados nos resultados
- O filtro por particulares não é sempre suficiente sozinho
- Abertura anúncio-a-anúncio torna o processo lento
- Há falsos positivos: anúncios não residenciais podem passar

## CustoJusto

### Estratégia atual

No `CustoJusto`, a estratégia principal é **usar o próprio filtro do portal para particulares**.

O scraper considera que a base para FSBO é uma URL com `f=p`, documentado em [`CUSTOJUSTO_README.md`](CUSTOJUSTO_README.md).

### Como tenta encontrar FSBO

Na listagem:

- valida se `f=p` está presente
- se não estiver, adiciona automaticamente esse parâmetro
- preserva `f=p` ao paginar

No detalhe:

- extrai anúncio completo
- normaliza para o schema do projeto
- por regra, assume `advertiser.is_agency = false`

### Interpretação prática

O `CustoJusto` é o portal onde a estratégia é mais “declarativa”:

- em vez de inferir agência depois, o projeto tenta **confiar no filtro do portal**
- o FSBO vem da query de listagem mais do que de uma análise pesada do anunciante

### Pontos fortes

- Estratégia simples e consistente
- Menos dependência de heurísticas frágeis
- Bom encaixe com cache de “novos”

### Limitações / riscos

- Se `f=p` não for respeitado corretamente pelo website, o scraper assume demasiado
- O projeto tende a marcar anúncios como FSBO por confiança no filtro
- Pode haver ruído estrutural na descrição e em alguns campos de localização

## CasaSapo

### Estratégia atual

No `CasaSapo`, a estratégia é diferente: o scraper usa um **proxy baseado na presença ou ausência de telefone visível no card da listagem**.

O comportamento aparece em [`src/scrapers/casasapo/casasapo.extract.js`](src/scrapers/casasapo/casasapo.extract.js).

### Como tenta encontrar FSBO

Na listagem:

- percorre os cards `.property`
- procura a classe `.property-phone`
- interpreta:
  - `com property-phone` -> provável agência
  - `sem property-phone` -> potencial FSBO

Só os anúncios **sem telefone visível** seguem para detalhe.

### No detalhe

- extrai dados completos
- faz parse e normalização
- não depende tanto de um perfil de anunciante como no OLX

### Interpretação prática

Aqui o FSBO não vem de um filtro explícito do portal, mas desta regra:

- **“se o card não expõe telefone, é candidato a particular”**

É uma heurística específica do `CasaSapo`, e deve ser tratada como tal.

### Pontos fortes

- Estratégia simples e barata ainda na listagem
- Elimina muitos anúncios de agência antes do detalhe

### Limitações / riscos

- É uma heurística estrutural do HTML; pode partir com alterações de layout
- “sem telefone” não é garantia absoluta de particular
- Pode perder FSBO legítimos se o portal mudar o modo como mostra o contacto
- O `onlyNew` em CasaSapo já foi identificado historicamente como ponto sensível de cache

## Imovirtual

### Estratégia atual

No `Imovirtual`, o projeto usa o filtro oficial de particulares do website:

- `ownerTypeSingleSelect=PRIVATE`

Isto está documentado em [`IMOVIRTUAL_LISTINGS_README.md`](IMOVIRTUAL_LISTINGS_README.md) e implementado em [`src/scrapers/imovirtual/imovirtual.scraper.js`](src/scrapers/imovirtual/imovirtual.scraper.js).

### Como tenta encontrar FSBO

Na listagem:

- valida se `ownerTypeSingleSelect=PRIVATE` está presente
- adiciona automaticamente se faltar
- preserva esse filtro durante a paginação

No detalhe:

- abre cada anúncio
- extrai e normaliza os dados
- aplica cache de “novos”

### Interpretação prática

Tal como no `CustoJusto`, aqui a estratégia base é:

- **confiar num filtro explícito do portal**

Ou seja, a exclusão de agências tenta acontecer na query, não tanto depois.

### Pontos fortes

- Estratégia clara e fácil de explicar
- Menos necessidade de heurísticas agressivas
- Boa previsibilidade quando o filtro funciona

### Limitações / riscos

- Continua dependente do portal respeitar o filtro PRIVATE
- O detalhe ainda é aberto anúncio a anúncio, o que é lento
- Há erros de qualidade de dados conhecidos em campos como `property.type`, `year` e `floor`

## Idealista

### Estratégia atual

O `Idealista` está integrado via `Lobstr`, não por scraping HTML tradicional, conforme [`IDEALISTA_LOBSTR_README.md`](IDEALISTA_LOBSTR_README.md).

### Como tenta encontrar FSBO

Aqui a estratégia é diferente das restantes:

1. cria uma task no `Lobstr`
2. faz polling até a run terminar
3. recebe resultados estruturados
4. complementa com parse / inferência local

### Heurísticas usadas

Depois de receber os resultados:

- infere tipo de imóvel pelo título
- infere tipologia com base em `bedrooms`
- tenta detetar agência por keywords
- tenta inferir fotos profissionais

### Interpretação prática

No `Idealista`, o projeto **não controla a listagem diretamente no browser** como nos outros portais. Depende da qualidade e do contrato do squid do `Lobstr`.

### Pontos fortes

- Menos fragilidade de selectors HTML
- Resultados já vêm estruturados

### Limitações / riscos

- Dependência externa do `Lobstr`
- Menos controlo fino sobre como distinguir particular vs agência
- Localização e alguns campos podem vir incompletos

## Resumo por portal

| Website | Estratégia principal FSBO | Tipo de confiança |
|---|---|---|
| `OLX` | filtro inicial + heurísticas de agência + perfil do anunciante | média |
| `CustoJusto` | `f=p` (particulares) | média/alta se o portal respeitar o filtro |
| `CasaSapo` | ausência de `.property-phone` no card | média |
| `Imovirtual` | `ownerTypeSingleSelect=PRIVATE` | média/alta se o portal respeitar o filtro |
| `Idealista` | resultados `Lobstr` + heurísticas locais | média |

## O que isto significa na prática

O projeto **não tem uma única definição universal de FSBO**. Em vez disso:

- usa o que cada portal oferece
- tenta aproximar “particular” com filtros nativos quando existem
- complementa com heurísticas quando não existem ou não são suficientes

Isto é importante porque evita uma falsa sensação de consistência:

- `OLX` não deve ser tratado como `CustoJusto`
- `CasaSapo` não deve ser tratado como `Imovirtual`
- `Idealista` tem uma arquitetura própria

## Riscos atuais que afetam a estratégia

Mesmo quando a estratégia está correta no papel, há riscos operacionais:

- mudanças de HTML/DOM dos portais
- filtros do portal deixarem de ser respeitados
- anúncios fora da categoria alvo entrarem na listagem
- cross-posting entre portais
- qualidade de dados inconsistente no detalhe
- cache local influenciar o conceito de “novo”

## Recomendação de leitura complementar

Se quiseres aprofundar por portal:

- [`OLX_LISTINGS_README.md`](OLX_LISTINGS_README.md)
- [`CUSTOJUSTO_README.md`](CUSTOJUSTO_README.md)
- [`IMOVIRTUAL_LISTINGS_README.md`](IMOVIRTUAL_LISTINGS_README.md)
- [`IDEALISTA_LOBSTR_README.md`](IDEALISTA_LOBSTR_README.md)
- [`src/services/fsboSignals.js`](src/services/fsboSignals.js)

