/**
 * URL generator for Alto Minho (Viana do Castelo district) and border concelhos.
 *
 * Generates search URLs for each portal to cover the full region.
 * Reuses the existing urlBuilder.js from buyer-search.
 */

const { toSlug } = require('../buyer-search/urlBuilder');

// All 10 concelhos of Viana do Castelo district
const ALTO_MINHO_CONCELHOS = [
  'Viana do Castelo',
  'Ponte de Lima',
  'Arcos de Valdevez',
  'Ponte da Barca',
  'Caminha',
  'Valença',
  'Monção',
  'Melgaço',
  'Paredes de Coura',
  'Vila Nova de Cerveira',
];

// Border concelhos where clients also buy
const BORDER_CONCELHOS = [
  'Barcelos',
  'Esposende',
  'Vila Verde',
  'Terras de Bouro',
  'Amares',
  'Póvoa de Lanhoso',
  'Vieira do Minho',
  'Montalegre',
];

// District for each border concelho (needed for portal URLs that include district)
const BORDER_CONCELHO_DISTRICT = {
  'Barcelos': 'Braga',
  'Esposende': 'Braga',
  'Vila Verde': 'Braga',
  'Terras de Bouro': 'Braga',
  'Amares': 'Braga',
  'Póvoa de Lanhoso': 'Braga',
  'Vieira do Minho': 'Braga',
  'Montalegre': 'Vila Real',
};

const PROPERTY_TYPES = ['apartamento', 'moradia', 'terreno', 'quinta'];

// OLX subcategory slugs
const OLX_CATEGORY_MAP = {
  apartamento: 'apartamento-casa-a-venda',
  moradia: 'casas-moradias-para-arrendar-vender',
  terreno: 'terrenos-quintas',
  quinta: 'terrenos-quintas',
};

function pluralize(type) {
  if (type === 'apartamento') return 'apartamentos';
  if (type === 'moradia') return 'moradias';
  if (type === 'terreno') return 'terrenos';
  if (type === 'quinta') return 'quintas';
  return type + 's';
}

/**
 * Generate OLX search URLs.
 * Uses district-level URLs for Viana do Castelo (covers all municipalities),
 * and municipality-level URLs for border concelhos.
 */
function generateOlxUrls({ includeBorder = true } = {}) {
  const urls = [];
  const districtSlug = toSlug('Viana do Castelo');

  // District-level: one URL per property type
  for (const type of PROPERTY_TYPES) {
    const category = OLX_CATEGORY_MAP[type] || 'apartamento-casa-a-venda';
    urls.push(
      `https://www.olx.pt/imoveis/${category}/q-${districtSlug}/?search%5Bprivate_business%5D=private`
    );
  }

  // Border concelhos: municipality-level search
  if (includeBorder) {
    for (const concelho of BORDER_CONCELHOS) {
      const slug = toSlug(concelho);
      urls.push(
        `https://www.olx.pt/imoveis/apartamento-casa-a-venda/q-${slug}/?search%5Bprivate_business%5D=private`
      );
    }
  }

  // Dedupe (terreno and quinta share the same OLX category)
  return [...new Set(urls)];
}

/**
 * Generate Imovirtual search URLs.
 * District-level for Viana do Castelo, municipality-level for border.
 */
function generateImovirtualUrls({ includeBorder = true } = {}) {
  const urls = [];
  const districtSlug = toSlug('Viana do Castelo');

  // District-level: one URL per property type
  for (const type of PROPERTY_TYPES) {
    urls.push(
      `https://www.imovirtual.com/pt/resultados/comprar/${type}/${districtSlug}?ownerTypeSingleSelect=PRIVATE`
    );
  }

  // Border concelhos (district varies per concelho)
  if (includeBorder) {
    for (const concelho of BORDER_CONCELHOS) {
      const distSlug = toSlug(BORDER_CONCELHO_DISTRICT[concelho]);
      const slug = toSlug(concelho);
      urls.push(
        `https://www.imovirtual.com/pt/resultados/comprar/moradia/${distSlug}/${slug}?ownerTypeSingleSelect=PRIVATE`
      );
      urls.push(
        `https://www.imovirtual.com/pt/resultados/comprar/apartamento/${distSlug}/${slug}?ownerTypeSingleSelect=PRIVATE`
      );
    }
  }

  return [...new Set(urls)];
}

/**
 * Generate CustoJusto search URLs.
 * Per-concelho (CustoJusto doesn't support district-level real-estate searches).
 */
function generateCustoJustoUrls({ includeBorder = true } = {}) {
  const urls = [];
  const districtSlug = toSlug('Viana do Castelo');

  for (const concelho of ALTO_MINHO_CONCELHOS) {
    const slug = toSlug(concelho);
    urls.push(`https://www.custojusto.pt/${districtSlug}/${slug}/imobiliario?f=p`);
  }

  if (includeBorder) {
    for (const concelho of BORDER_CONCELHOS) {
      const distSlug = toSlug(BORDER_CONCELHO_DISTRICT[concelho]);
      const slug = toSlug(concelho);
      urls.push(`https://www.custojusto.pt/${distSlug}/${slug}/imobiliario?f=p`);
    }
  }

  return urls;
}

/**
 * Generate CasaSapo search URLs.
 * Per-concelho (CasaSapo uses municipality in URL path).
 */
function generateCasaSapoUrls({ includeBorder = true } = {}) {
  const urls = [];

  const concelhos = includeBorder
    ? [...ALTO_MINHO_CONCELHOS, ...BORDER_CONCELHOS]
    : ALTO_MINHO_CONCELHOS;

  for (const concelho of concelhos) {
    const slug = toSlug(concelho);
    urls.push(`https://casa.sapo.pt/comprar-casas/${slug}/`);
  }

  return urls;
}

/**
 * Generate all search URLs for the Alto Minho region.
 *
 * Returns a sources object compatible with APP API config format:
 * { olx: [...urls], imovirtual: [...urls], custojusto: [...urls], casasapo: [...urls] }
 *
 * @param {Object} [options]
 * @param {boolean} [options.includeBorder=true] - Include border concelhos (Barcelos, Esposende, etc.)
 * @returns {Object} sources object with URL arrays per platform
 */
function generateAltoMinhoSources(options = {}) {
  return {
    olx: generateOlxUrls(options),
    imovirtual: generateImovirtualUrls(options),
    custojusto: generateCustoJustoUrls(options),
    casasapo: generateCasaSapoUrls(options),
  };
}

module.exports = {
  generateAltoMinhoSources,
  generateOlxUrls,
  generateImovirtualUrls,
  generateCustoJustoUrls,
  generateCasaSapoUrls,
  ALTO_MINHO_CONCELHOS,
  BORDER_CONCELHOS,
  BORDER_CONCELHO_DISTRICT,
  PROPERTY_TYPES,
};
