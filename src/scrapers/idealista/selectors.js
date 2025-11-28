/**
 * Seletores CSS específicos para Idealista
 * Seletores robustos que não dependem de classes auto-geradas
 */

module.exports = {
  title: [
    'h1',
    '[class*="title"]',
    '[class*="header"] h1',
    'h1[class*="detail"]',
    '[data-testid*="title"]'
  ],
  
  price: [
    'span[class*="price"]',
    '[class*="price"] strong',
    '[class*="price"] span',
    'strong:has-text("€")',
    '[data-testid*="price"]',
    '[class*="main-price"]',
    '[class*="detail-price"]'
  ],
  
  location: [
    '[class*="location"]',
    '[class*="address"]',
    '[class*="breadcrumb"]',
    '[data-testid*="location"]',
    'a[href*="#map"]',
    '[class*="detail-location"]',
    '[itemprop="address"]'
  ],
  
  published: [
    '[class*="published"]',
    '[class*="date"]',
    '[class*="posted"]',
    'time',
    '[datetime]',
    '[class*="detail-date"]',
    'span:has-text("Publicado")',
    'span:has-text("Atualizado")'
  ],
  
  advertiser: {
    name: [
      '[class*="advertiser"] [class*="name"]',
      '[class*="owner"] [class*="name"]',
      '[class*="seller"] [class*="name"]',
      '[class*="contact"] [class*="name"]',
      '[class*="agent"] [class*="name"]',
      'h3[class*="name"]',
      'h4[class*="name"]',
      '[data-testid*="advertiser-name"]'
    ],
    url: [
      'a[href*="/imobiliarias/"]',
      'a[href*="/agentes/"]',
      'a[href*="/empresas/"]',
      '[class*="advertiser"] a',
      '[class*="owner"] a',
      '[class*="contact"] a',
      '[data-testid*="advertiser-link"]'
    ],
    ami: [
      '[class*="ami"]',
      '[class*="license"]',
      'span:has-text("AMI")',
      '[data-testid*="ami"]'
    ]
  },
  
  description: [
    '[class*="description"]',
    '[class*="detail-description"]',
    '[class*="content"]',
    '[class*="text"]',
    '[id*="description"]',
    'div:has-text("Descrição") + div',
    '[itemprop="description"]'
  ],
  
  photos: [
    'img[src*="idealista"]',
    'img[data-src*="idealista"]',
    '[class*="gallery"] img',
    '[class*="photo"] img',
    '[class*="image"] img',
    '[class*="carousel"] img',
    '[class*="slider"] img',
    '[data-testid*="photo"] img'
  ],
  
  features: {
    container: [
      '[class*="features"]',
      '[class*="characteristics"]',
      '[class*="details"]',
      '[class*="specs"]',
      '[class*="properties"]',
      '[data-testid*="features"]'
    ],
    items: [
      '[class*="feature"]',
      '[class*="characteristic"]',
      '[class*="detail-item"]',
      '[class*="spec"]',
      'li[class*="feature"]',
      'div[class*="feature"]'
    ]
  },
  
  property: {
    type: [
      '[class*="property-type"]',
      '[class*="type"]',
      'span:has-text("Apartamento")',
      'span:has-text("Moradia")',
      'span:has-text("Terreno")',
      '[data-testid*="property-type"]'
    ],
    tipology: [
      '[class*="tipology"]',
      '[class*="bedrooms"]',
      '[class*="rooms"]',
      'span:has-text("T")',
      '[class*="rooms"]',
      '[data-testid*="tipology"]'
    ],
    area: {
      total: [
        '[class*="area-total"]',
        '[class*="area-bruta"]',
        'span:has-text("Área total")',
        'span:has-text("m²")',
        '[data-testid*="area-total"]'
      ],
      useful: [
        '[class*="area-useful"]',
        '[class*="area-util"]',
        'span:has-text("Área útil")',
        '[data-testid*="area-useful"]'
      ]
    },
    year: [
      '[class*="year"]',
      '[class*="construction"]',
      '[class*="built"]',
      'span:has-text("Ano")',
      'span:has-text("Construção")',
      '[data-testid*="year"]'
    ],
    floor: [
      '[class*="floor"]',
      '[class*="level"]',
      '[class*="andar"]',
      'span:has-text("Andar")',
      'span:has-text("Piso")',
      '[data-testid*="floor"]'
    ],
    condition: [
      '[class*="condition"]',
      '[class*="state"]',
      '[class*="status"]',
      'span:has-text("Condição")',
      'span:has-text("Estado")',
      '[data-testid*="condition"]'
    ],
    bathrooms: [
      '[class*="bathroom"]',
      '[class*="wc"]',
      'span:has-text("Casas de banho")',
      'span:has-text("WC")',
      '[data-testid*="bathrooms"]'
    ],
    energy: [
      '[class*="energy"]',
      '[class*="certificate"]',
      '[class*="certificado"]',
      'span:has-text("Certificado")',
      '[class*="energy-rating"]',
      '[data-testid*="energy"]'
    ],
    garage: [
      '[class*="garage"]',
      '[class*="parking"]',
      '[class*="estacionamento"]',
      'span:has-text("Garagem")',
      'span:has-text("Estacionamento")',
      '[data-testid*="garage"]'
    ],
    elevator: [
      '[class*="elevator"]',
      '[class*="ascensor"]',
      'span:has-text("Elevador")',
      'span:has-text("Ascensor")',
      '[data-testid*="elevator"]'
    ],
    balcony: [
      '[class*="balcony"]',
      '[class*="terrace"]',
      '[class*="varanda"]',
      '[class*="terraco"]',
      'span:has-text("Varanda")',
      'span:has-text("Terraço")',
      '[data-testid*="balcony"]'
    ],
    pool: [
      '[class*="pool"]',
      '[class*="piscina"]',
      'span:has-text("Piscina")',
      '[data-testid*="pool"]'
    ],
    land: [
      '[class*="land"]',
      '[class*="terreno"]',
      'span:has-text("Terreno")',
      '[data-testid*="land"]'
    ]
  },
  
  map: {
    container: '[class*="map"]',
    iframe: 'iframe[src*="maps"]',
    lat: '[data-lat]',
    lng: '[data-lng]'
  },
  
  adId: [
    '[class*="ad-id"]',
    '[class*="reference"]',
    '[class*="ref"]',
    'span:has-text("Ref.")',
    'span:has-text("ID")',
    '[data-testid*="ad-id"]'
  ]
};

