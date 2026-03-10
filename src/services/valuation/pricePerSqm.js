/**
 * Price per square meter calculator.
 */

const {
  MIN_AREA_SQM,
  MAX_AREA_SQM,
  MIN_PRICE_EUR,
  MAX_PRICE_EUR,
} = require('./constants');

/**
 * Calculate price per sqm for a cleaned listing item.
 *
 * @param {Object} item - cleaned listing (from dataCleaner or APP)
 * @returns {{ price_per_sqm: number|null, area_source: string|null, area_used: number|null, valid: boolean, reason: string|null }}
 */
function calculatePricePerSqm(item) {
  const price = typeof item.price === 'number' ? item.price : null;
  if (price === null || price < MIN_PRICE_EUR || price > MAX_PRICE_EUR) {
    return { price_per_sqm: null, area_source: null, area_used: null, valid: false, reason: 'invalid_price' };
  }

  const prop = item.property || {};
  const areaUseful = typeof prop.area_useful === 'number' ? prop.area_useful : null;
  const areaTotal = typeof prop.area_total === 'number' ? prop.area_total : null;

  let area = null;
  let areaSource = null;

  if (areaUseful !== null && areaUseful >= MIN_AREA_SQM && areaUseful <= MAX_AREA_SQM) {
    area = areaUseful;
    areaSource = 'area_useful';
  } else if (areaTotal !== null && areaTotal >= MIN_AREA_SQM && areaTotal <= MAX_AREA_SQM) {
    area = areaTotal;
    areaSource = 'area_total';
  }

  if (area === null) {
    return { price_per_sqm: null, area_source: null, area_used: null, valid: false, reason: 'no_valid_area' };
  }

  const pricePerSqm = Math.round(price / area);

  if (pricePerSqm < 50 || pricePerSqm > 50000) {
    return { price_per_sqm: null, area_source: areaSource, area_used: area, valid: false, reason: 'price_per_sqm_out_of_range' };
  }

  return { price_per_sqm: pricePerSqm, area_source: areaSource, area_used: area, valid: true, reason: null };
}

module.exports = { calculatePricePerSqm };
