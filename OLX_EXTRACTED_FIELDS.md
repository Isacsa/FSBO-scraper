# Informações Extraídas dos Anúncios OLX

Este documento lista todas as informações que o scraper consegue extrair dos anúncios do OLX.

## Campos Principais

### 1. **Informações Básicas do Anúncio**
- `source`: Plataforma (sempre "olx")
- `ad_id`: ID único do anúncio extraído da URL
- `url`: URL completa do anúncio
- `title`: Título do anúncio
- `description`: Descrição completa do imóvel
- `timestamp`: Data/hora do scraping (ISO format)

### 2. **Datas**
- `published_date`: Data de publicação do anúncio (ISO format)
- `updated_date`: Data da última atualização (se disponível)
- `days_online`: Número de dias desde a publicação (calculado automaticamente)

### 3. **Preço**
- `price`: Preço do imóvel (string numérica, em euros)

### 4. **Localização**
- `location.district`: Distrito (ex: "Viana do Castelo")
- `location.municipality`: Município/Concelho
- `location.parish`: Freguesia
- `location.lat`: Latitude (coordenadas GPS)
- `location.lng`: Longitude (coordenadas GPS)

### 5. **Propriedade/Imóvel**
- `property.type`: Tipo de imóvel (ex: "moradia", "apartamento", "terreno")
- `property.tipology`: Tipologia (ex: "T2", "T3", "T4")
- `property.area_total`: Área total (m²)
- `property.area_useful`: Área útil (m²)
- `property.year`: Ano de construção
- `property.floor`: Andar/Piso
- `property.condition`: Condição (ex: "novo", "usado", "renovado", "ruína")

### 6. **Características/Features**
- `features`: Array de características extraídas, incluindo:
  - Certificado Energético
  - Garagem
  - Elevador
  - Varanda
  - Casas de Banho
  - Andar
  - Ano
  - Condição

### 7. **Fotos**
- `photos`: Array de URLs das fotos em alta resolução (máximo 1920px de largura)

### 8. **Anunciante**
- `advertiser.name`: Nome do anunciante
- `advertiser.total_ads`: Número total de anúncios do anunciante
- `advertiser.is_agency`: Boolean indicando se é agência (detectado automaticamente)
- `advertiser.url`: URL do perfil do anunciante

### 9. **Sinais FSBO (For Sale By Owner)**
- `signals.watermark`: Se as fotos têm marca d'água
- `signals.duplicate`: Se o anúncio parece ser duplicado
- `signals.professional_photos`: Se as fotos parecem profissionais
- `signals.agency_keywords`: Array de palavras-chave de agência encontradas
- `signals.is_agency`: Se é detectado como agência (baseado em heurísticas)

### 10. **Campos Adicionais (Pipeline)**
- `_fingerprint`: Hash único do anúncio (para deduplicação)
- `_fsbo_score`: Score FSBO (0-100, quanto maior mais provável ser particular)
- `_fsbo_reasons`: Array de razões para o score FSBO

## Notas Importantes

1. **Campos Opcionais**: Muitos campos podem ser `null` se não estiverem disponíveis no anúncio
2. **Normalização**: Todos os dados são normalizados e limpos antes de serem retornados
3. **Detecção de Agências**: O sistema tenta detectar automaticamente se é agência, mas quando já está filtrado por particulares, não filtra novamente
4. **Coordenadas GPS**: Podem não estar disponíveis em todos os anúncios
5. **Fotos**: São sempre extraídas em alta resolução quando disponíveis

## Exemplo de Output Completo

```json
{
  "source": "olx",
  "ad_id": "IMihL",
  "url": "https://www.olx.pt/d/anuncio/terreno-em-cerveira-IDIMihL.html",
  "published_date": "2025-12-01T00:00:00.000Z",
  "updated_date": null,
  "timestamp": "2025-12-09T18:31:04.775Z",
  "days_online": 8,
  "title": "Terreno em Cerveira",
  "description": "Terreno em Cerveira com 800 m2...",
  "location": {
    "district": "Viana do Castelo",
    "municipality": "Viana do Castelo",
    "parish": "Vila Praia de Âncora",
    "lat": "41.6918",
    "lng": "-8.8347"
  },
  "price": "90000",
  "property": {
    "type": "terreno",
    "tipology": null,
    "area_total": null,
    "area_useful": null,
    "year": "2023",
    "floor": null,
    "condition": "novo"
  },
  "features": [],
  "photos": [
    "https://ireland.apollo.olxcdn.com:443/v1/files/..."
  ],
  "advertiser": {
    "name": "francteix",
    "total_ads": "1",
    "is_agency": false,
    "url": "https://www.olx.pt/ads/user/hN9Zn/"
  },
  "signals": {
    "watermark": false,
    "duplicate": false,
    "professional_photos": false,
    "agency_keywords": []
  },
  "_fingerprint": "e8748d95e30ce5e3db32185e36583b19",
  "_fsbo_score": 75,
  "_fsbo_reasons": [
    "Nome do anunciante não parece ser agência",
    "Fotos não parecem profissionais",
    "Telefone não disponível",
    "1 fotos (típico de FSBO)",
    "Anunciante confirmado como particular"
  ]
}
```

