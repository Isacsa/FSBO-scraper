/**
 * Seletores CSS específicos para OLX
 */

module.exports = {
  title: [
    '[data-testid="offer_title"] h4',
    '[data-cy="offer_title"] h4',
    '[data-testid="offer_title"]',
    '[data-cy="offer_title"]',
    'h4.css-1au435n',
    'h1[class*="title"]',
    'h2[class*="title"]',
    'h3[class*="title"]',
    'h4[class*="title"]',
    'h1',
    'h2',
    'h4'
  ],
  
  price: [
    '[data-testid="ad-price-container"] h3',
    '[data-cy="ad-price-container"] h3',
    '[data-testid="ad-price-container"]',
    '[data-cy="ad-price-container"]',
    'h3.css-yauxmy',
    'h3:has-text("€")',
    'h2:has-text("€")',
    'h1:has-text("€")',
    'strong:has-text("€")',
    'span:has-text("€")',
    'div:has-text("€")',
    '[class*="price"] h3',
    '[class*="price"] h2',
    '[class*="price"]'
  ],
  
  location: [
    '.css-1deibjd p',
    'div.css-1deibjd > p',
    '[data-testid="location"]',
    '[data-cy="location"]'
  ],
  
  published: [
    '[data-testid="ad-posted-at"]',
    '[data-cy="ad-posted-at"]',
    'p:has-text("Publicado")',
    'time'
  ],
  
  seller: {
    name: [
      'h4[data-testid="user-profile-user-name"]',
      '[data-testid="user-profile-link"] h4',
      'h4:has-text("")'
    ],
    url: [
      '[data-testid="user-profile-link"]',
      'a[href*="/ads/user/"]'
    ]
  },
  
  description: [
    'h3:has-text("Descrição") + *',
    '[data-testid="ad-description"]',
    '[data-cy="ad-description"]',
    '[class*="description"]'
  ],
  
  photos: [
    'img[src*="olxcdn"]',
    'img[data-src*="olxcdn"]',
    '[class*="gallery"] img',
    '[class*="image"] img',
    'img[alt*="anúncio"]'
  ],
  
  features: {
    container: [
      '[class*="features"]',
      '[data-testid="features"]',
      '[data-cy="features"]'
    ],
    items: [
      '[class*="feature"]',
      '[class*="characteristic"]',
      'p:has-text(":")'
    ]
  },
  
  property: {
    type: [
      'p:has-text("Tipologia")',
      'p:has-text("Tipo")',
      '[class*="property-type"]'
    ],
    area: [
      'p:has-text("Área")',
      'p:has-text("m²")',
      '[class*="area"]'
    ],
    year: [
      'p:has-text("Ano")',
      'p:has-text("Construção")',
      '[class*="year"]'
    ],
    floor: [
      'p:has-text("Andar")',
      'p:has-text("Piso")',
      '[class*="floor"]'
    ],
    condition: [
      'p:has-text("Condição")',
      'p:has-text("Estado")',
      '[class*="condition"]'
    ],
    bathrooms: [
      'p:has-text("Casas de Banho")',
      'p:has-text("WC")',
      '[class*="bathroom"]'
    ],
    energy: [
      'p:has-text("Certificado Energético")',
      'p:has-text("Energia")',
      '[class*="energy"]'
    ],
    garage: [
      'p:has-text("Garagem")',
      'p:has-text("Estacionamento")',
      '[class*="garage"]'
    ],
    elevator: [
      'p:has-text("Elevador")',
      'p:has-text("Ascensor")',
      '[class*="elevator"]'
    ],
    balcony: [
      'p:has-text("Varanda")',
      'p:has-text("Terraço")',
      '[class*="balcony"]'
    ]
  },
  
  map: {
    container: '[class*="map"]',
    lat: '[data-lat]',
    lng: '[data-lng]',
    iframe: 'iframe[src*="maps"]'
  }
};

