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

function tipologyToNumber(tip) {
  const match = (tip || '').match(/T(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ── CustoJusto price scale ──
// Index → euros. Non-linear scale used by CustoJusto's pe/ps params.
const CUSTOJUSTO_PRICE_SCALE = [
  0, 10000, 20000, 30000, 40000, 50000,           // 0-5: 10k steps
  75000, 100000, 125000, 150000, 175000, 200000,   // 6-11: 25k steps
  225000, 250000,                                   // 12-13: 25k steps
  300000, 350000, 400000, 450000, 500000,           // 14-18: 50k steps
  550000, 600000, 650000, 700000,                   // 19-22: 50k steps
  800000, 900000, 1000000,                          // 23-25: 100k steps
];

/**
 * Convert euro price to CustoJusto index.
 * For 'max': round UP (include more expensive → be inclusive).
 * For 'min': round DOWN (include cheaper → be inclusive).
 */
function custoJustoPriceToIndex(euros, direction) {
  if (!euros || euros <= 0) return null;
  if (euros >= 1000000) return 25;

  if (direction === 'max') {
    // Find smallest index whose value >= euros
    for (let i = 0; i < CUSTOJUSTO_PRICE_SCALE.length; i++) {
      if (CUSTOJUSTO_PRICE_SCALE[i] >= euros) return i;
    }
    return 25;
  }
  // direction === 'min': find largest index whose value <= euros
  for (let i = CUSTOJUSTO_PRICE_SCALE.length - 1; i >= 0; i--) {
    if (CUSTOJUSTO_PRICE_SCALE[i] <= euros) return i;
  }
  return 0;
}

/**
 * Convert tipologies array to CustoJusto ros/roe range.
 * CustoJusto scale: 3=T0, 4=T1, 5=T2, 6=T3, 7=T4, 8=T5, 9=T6+
 */
function custoJustoTipologyRange(tipologies) {
  if (!tipologies || tipologies.length === 0) return null;
  const nums = tipologies.map(tipologyToNumber).filter(n => n !== null);
  if (nums.length === 0) return null;
  return { ros: Math.min(...nums) + 3, roe: Math.max(...nums) + 3 };
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
 * Format: /pt/resultados/comprar/{type},{tipologies}/{district-slug}/{municipality-slug}?params
 * Tipologies go in the path (comma-separated), not as query params.
 */
function buildImovirtualUrls(criteria) {
  const urls = [];
  const districtSlug = toSlug(criteria.district);

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      // Tipologies in path: apartamento,t2,t3
      const tips = (criteria.tipologies || []).map(t => t.toLowerCase());
      const typePath = tips.length > 0 ? `${type},${tips.join(',')}` : type;
      const base = `https://www.imovirtual.com/pt/resultados/comprar/${typePath}/${districtSlug}/${munSlug}`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('priceMax', String(criteria.priceMax));
      if (criteria.priceMin) params.set('priceMin', String(criteria.priceMin));
      params.set('ownerTypeSingleSelect', 'ALL');

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
 * Format: /imoveis/{category}/q-{Municipality-Name}/?params
 * OLX uses subcategory paths + search query with original casing.
 * Tipology filter: search[filter_enum_tipologia][0]=t2
 */
function buildOlxUrls(criteria) {
  const urls = [];

  for (const municipality of criteria.municipalities || []) {
    // OLX keeps original casing, just replace spaces with hyphens
    const munQuery = municipality.replace(/\s+/g, '-');
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const category = OLX_CATEGORY_MAP[type] || 'apartamento-casa-a-venda';
      const base = `https://www.olx.pt/imoveis/${category}/q-${munQuery}/`;
      const params = new URLSearchParams();

      if (criteria.priceMax) params.set('search[filter_float_price:to]', String(criteria.priceMax));
      if (criteria.priceMin) params.set('search[filter_float_price:from]', String(criteria.priceMin));

      for (const tip of criteria.tipologies || []) {
        params.set('search[filter_enum_tipologia][0]', tip.toLowerCase());
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
 * Format: /{district-slug}/{municipality-slug}/imobiliario/{type-plural}-venda?ros=X&roe=Y&pe=Z&ps=W
 * Prices and tipologies use indexed scales, not raw values.
 */
function buildCustoJustoUrls(criteria) {
  const urls = [];
  const districtSlug = toSlug(criteria.district);

  for (const municipality of criteria.municipalities || []) {
    const munSlug = toSlug(municipality);
    for (const type of criteria.propertyTypes || ['apartamento', 'moradia']) {
      const typePlural = pluralize(type) + '-venda';
      const base = `https://www.custojusto.pt/${districtSlug}/${munSlug}/imobiliario/${typePlural}`;
      const params = new URLSearchParams();

      // Price: convert euros to CustoJusto index scale
      const peIdx = criteria.priceMax ? custoJustoPriceToIndex(criteria.priceMax, 'max') : null;
      const psIdx = criteria.priceMin ? custoJustoPriceToIndex(criteria.priceMin, 'min') : null;
      if (peIdx !== null) params.set('pe', String(peIdx));
      if (psIdx !== null) params.set('ps', String(psIdx));

      // Tipology: convert T2,T3 → ros/roe index range
      const tipRange = custoJustoTipologyRange(criteria.tipologies);
      if (tipRange) {
        params.set('ros', String(tipRange.ros));
        params.set('roe', String(tipRange.roe));
      }

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
  custoJustoPriceToIndex,
  custoJustoTipologyRange,
  PORTAL_BUILDERS,
  DEFAULT_PORTALS,
};
