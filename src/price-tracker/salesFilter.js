/**
 * Sales-only filter for price tracker.
 *
 * Reuses precisionGate helpers but strips all FSBO/agency logic —
 * only keeps: valid URL + not forbidden category + not rent-only.
 */

const { isRentOnly, hasValidCanonicalUrl, hasForbiddenCategory } = require('../integration/precisionGate');

function filterSalesOnly(items, source) {
  return items.filter(item => {
    if (!hasValidCanonicalUrl(item, source)) return false;
    if (hasForbiddenCategory(item)) return false;
    if (isRentOnly(item)) return false;
    return true;
  });
}

module.exports = { filterSalesOnly };
