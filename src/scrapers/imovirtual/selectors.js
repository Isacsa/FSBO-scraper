/**
 * Seletores CSS específicos para Imovirtual
 */

module.exports = {
  title: [
    'h1',
    '[class*="title"]',
    '[data-cy*="title"]'
  ],
  
  price: [
    'strong:has-text("€")',
    '[class*="price"]',
    '[data-cy*="price"]'
  ],
  
  location: [
    'a[href="#map"]',
    '[class*="location"]',
    '[class*="address"]'
  ],
  
  published: [
    'p:has-text("Última atualização")',
    '[class*="published"]',
    '[class*="date"]',
    'time'
  ],
  
  seller: {
    name: [
      'h4:has-text("agência") ~ * strong',
      '[class*="agent"] [class*="name"]',
      '[class*="seller"] [class*="name"]'
    ],
    url: [
      'a[href*="/empresas/"]',
      'a[href*="/agencias-imobiliarias/"]'
    ]
  },
  
  description: [
    'h2:has-text("Descrição") + *',
    '[class*="description"]',
    '[data-cy*="description"]'
  ],
  
  photos: [
    'img[src*="imovirtual"]',
    'img[data-src*="imovirtual"]',
    '[class*="gallery"] img',
    '[class*="image"] img'
  ],
  
  features: {
    container: [
      'h2:has-text("Casa para")',
      'h2:has-text("Apartamento")',
      '[class*="features"]'
    ],
    items: [
      'div > div',
      '[class*="feature"]'
    ]
  },
  
  property: {
    type: [
      'p:has-text("Tipo de imóvel")',
      '[class*="property-type"]'
    ],
    area: [
      'p:has-text("Área")',
      'p:has-text("m²")'
    ],
    year: [
      'p:has-text("Ano")',
      'p:has-text("Construção")'
    ],
    floor: [
      'p:has-text("Andar")',
      'p:has-text("Piso")'
    ],
    condition: [
      'p:has-text("Fase de acabamento")',
      'p:has-text("Condição")'
    ],
    bathrooms: [
      'p:has-text("casas de banho")',
      'p:has-text("WC")'
    ],
    energy: [
      'p:has-text("Certificado Energético")',
      'p:has-text("Energia")'
    ],
    garage: [
      'p:has-text("Garagem")',
      'p:has-text("Estacionamento")'
    ],
    elevator: [
      'p:has-text("Elevador")',
      'p:has-text("Ascensor")'
    ],
    balcony: [
      'p:has-text("Varanda")',
      'p:has-text("Terraço")'
    ]
  },
  
  map: {
    container: '[class*="map"]',
    iframe: 'iframe[src*="maps"]'
  }
};

