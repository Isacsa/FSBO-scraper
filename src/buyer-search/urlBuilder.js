/**
 * URL builder for buyer search.
 *
 * Generates filtered search URLs for each portal based on buyer criteria.
 * Each portal has its own URL format and query parameter conventions.
 *
 * Portal-specific logic is isolated per builder function so individual
 * portals can be adjusted independently when URL formats change.
 */

// ── Slug helper ──

/**
 * Convert a Portuguese location name to a URL slug.
 * "Ponte de Lima" → "ponte-de-lima"
 * "Viana do Castelo" → "viana-do-castelo"
 */
function toSlug(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Tipology helpers ──

const IMOVIRTUAL_ROOMS_MAP = {
  T0: 'STUDIO',
  T1: 'ONE',
  T2: 'TWO',
  T3: 'THREE',
  T4: 'FOUR',
  T5: 'FIVE',
};

function tipologyToRoomCount(tip) {
  const match = (tip || '').match(/T(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ── Property type helpers ──

function pluralize(type) {
  if (type === 'apartamento') return 'apartamentos';
  if (type === 'moradia') return 'moradias';
  if (type === 'terreno') return 'terrenos';
  if (type === 'casa') return 'casas';
  if (type === 'quinta') return 'quintas';
  return type + 's';
}

// ── Portal builders ──

/**
 * Imovirtual URL builder.
 * Format: /pt/resultados/comprar/{type}/{district-slug}/{municipality-slug}?params
 */
function buildImovirtualUrls(criteria) {
  const urls = [];
  const districtSlug = toSlug(criteria.district);

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const base = `https://www.imovirtual.com/pt/resultados/comprar/${type}/${districtSlug}/${munSlug}`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('priceMax', String(criteria.priceMax));
      if (criteria.priceMin) params.set('priceMin', String(criteria.priceMin));

      // Rooms filter — Imovirtual uses word-based enum
      for (const tip of criteria.tipologies || []) {
        const roomWord = IMOVIRTUAL_ROOMS_MAP[tip.toUpperCase()];
        if (roomWord) {
          params.set('roomsNumber', `[${roomWord}]`);
        }
      }

      const qs = params.toString();
      urls.push({
        platform: 'imovirtual',
        url: qs ? `${base}?${qs}` : base,
        propertyType: type,
      });
    }
  }
  return urls;
}

// OLX subcategory slugs — maps property type to the correct OLX category path
const OLX_CATEGORY_MAP = {
  apartamento: 'apartamento-casa-a-venda',
  moradia: 'casas-moradias-para-arrendar-vender',
  terreno: 'terrenos-quintas',
  quinta: 'terrenos-quintas',
};

/**
 * OLX URL builder.
 * Format: /imoveis/{category}/q-{municipality-slug}/?params
 * OLX uses subcategory paths + search query, not municipality in the path.
 */
function buildOlxUrls(criteria) {
  const urls = [];

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const category = OLX_CATEGORY_MAP[type] || 'apartamento-casa-a-venda';
      const base = `https://www.olx.pt/imoveis/${category}/q-${munSlug}/`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('search[filter_float_price:to]', String(criteria.priceMax));
      if (criteria.priceMin) params.set('search[filter_float_price:from]', String(criteria.priceMin));

      for (const tip of criteria.tipologies || []) {
        const rooms = tipologyToRoomCount(tip);
        if (rooms !== null) {
          params.set('search[filter_enum_rooms][0]', String(rooms));
        }
      }

      const qs = params.toString();
      urls.push({
        platform: 'olx',
        url: qs ? `${base}?${qs}` : base,
        propertyType: type,
      });
    }
  }
  return urls;
}

/**
 * CustoJusto URL builder.
 * Format: /{district-slug}/{municipality-slug}/imobiliario/{type-plural}?params
 */
function buildCustoJustoUrls(criteria) {
  const urls = [];
  const districtSlug = toSlug(criteria.district);

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const typePlural = pluralize(type);
      const base = `https://www.custojusto.pt/${districtSlug}/${munSlug}/imobiliario/${typePlural}`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('pe', String(criteria.priceMax));
      if (criteria.priceMin) params.set('ps', String(criteria.priceMin));

      const qs = params.toString();
      urls.push({
        platform: 'custojusto',
        url: qs ? `${base}?${qs}` : base,
        propertyType: type,
      });
    }
  }
  return urls;
}

/**
 * CasaSapo URL builder.
 * Format: /comprar-{type-plural}/{municipality-slug}/?params
 */
function buildCasaSapoUrls(criteria) {
  const urls = [];

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const typePlural = pluralize(type);
      const base = `https://casa.sapo.pt/comprar-${typePlural}/${munSlug}/`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('pmax', String(criteria.priceMax));
      if (criteria.priceMin) params.set('pmin', String(criteria.priceMin));

      const qs = params.toString();
      urls.push({
        platform: 'casasapo',
        url: qs ? `${base}?${qs}` : base,
        propertyType: type,
      });
    }
  }
  return urls;
}

/**
 * Idealista URL builder.
 * Format: /comprar-{type-plural}/{municipality-slug}/
 * Note: Price/room filters are applied via Lobstr API params, not URL.
 */
function buildIdealistaUrls(criteria) {
  const urls = [];

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const typePlural = pluralize(type);
      urls.push({
        platform: 'idealista',
        url: `https://www.idealista.pt/comprar-${typePlural}/${munSlug}/`,
        propertyType: type,
      });
    }
  }
  return urls;
}

// ── Main entry point ──

const PORTAL_BUILDERS = {
  imovirtual: buildImovirtualUrls,
  olx: buildOlxUrls,
  custojusto: buildCustoJustoUrls,
  casasapo: buildCasaSapoUrls,
  idealista: buildIdealistaUrls,
};

const DEFAULT_PORTALS = ['imovirtual', 'olx', 'custojusto', 'casasapo', 'idealista'];

/**
 * Build filtered search URLs for all portals from buyer criteria.
 *
 * @param {Object} criteria
 * @param {string[]} [criteria.propertyTypes=['apartamento','moradia']]
 * @param {string[]} [criteria.tipologies] - e.g. ['T3']
 * @param {string} criteria.district - e.g. 'Viana do Castelo'
 * @param {string[]} criteria.municipalities - e.g. ['Ponte de Lima']
 * @param {number} [criteria.priceMin]
 * @param {number} [criteria.priceMax]
 * @param {string[]} [criteria.portals] - subset of portals to use
 * @returns {{ platform: string, url: string, propertyType: string }[]}
 */
function buildSearchUrls(criteria) {
  if (!criteria || !criteria.municipalities || criteria.municipalities.length === 0) {
    return [];
  }
  if (!criteria.district) {
    return [];
  }

  const portals = criteria.portals || DEFAULT_PORTALS;
  const allUrls = [];

  for (const portal of portals) {
    const builder = PORTAL_BUILDERS[portal];
    if (builder) {
      allUrls.push(...builder(criteria));
    }
  }

  return allUrls;
}

module.exports = {
  buildSearchUrls,
  toSlug,
  // Exported for testing
  buildImovirtualUrls,
  buildOlxUrls,
  buildCustoJustoUrls,
  buildCasaSapoUrls,
  buildIdealistaUrls,
  PORTAL_BUILDERS,
  DEFAULT_PORTALS,
};
