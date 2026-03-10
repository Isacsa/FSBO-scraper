/**
 * Adjustment factors: normalizes benchmark expectations based on
 * condition, year, and floor.
 */

const {
  CONDITION_ADJUSTMENTS,
  YEAR_ADJUSTMENTS,
  FLOOR_ADJUSTMENTS,
  HIGH_FLOOR_THRESHOLD,
  HIGH_FLOOR_ADJUSTMENT,
} = require('./constants');

/**
 * Parse floor value to a numeric representation.
 * @param {string|number|null} floor
 * @returns {string|number|null} - 'Cave', 'R/C', numeric floor, or null
 */
function parseFloor(floor) {
  if (floor === null || floor === undefined) return null;
  const s = String(floor).trim();
  if (/^cave$/i.test(s)) return 'Cave';
  if (/^r\/?c$/i.test(s)) return 'R/C';
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * Calculate combined adjustment factor for a property.
 *
 * @param {Object} item - cleaned listing item
 * @returns {{ raw_benchmark: null, adjustment_pct: number, adjustments_applied: string[] }}
 */
function calculateAdjustments(item) {
  const prop = item.property || {};
  const adjustments = [];
  let totalAdjustment = 0;

  // Condition adjustment
  const condition = (prop.condition || '').toLowerCase().trim();
  if (condition && CONDITION_ADJUSTMENTS[condition] !== undefined) {
    const adj = CONDITION_ADJUSTMENTS[condition];
    if (adj !== 0) {
      totalAdjustment += adj;
      adjustments.push(`${condition}: ${adj >= 0 ? '+' : ''}${Math.round(adj * 100)}%`);
    }
  }

  // Year adjustment
  const year = typeof prop.year === 'number' ? prop.year : null;
  if (year !== null) {
    for (const band of YEAR_ADJUSTMENTS) {
      if (year <= band.max) {
        if (band.adjustment !== 0) {
          totalAdjustment += band.adjustment;
          adjustments.push(`ano ${year}: ${band.adjustment >= 0 ? '+' : ''}${Math.round(band.adjustment * 100)}%`);
        }
        break;
      }
    }
  }

  // Floor adjustment
  const floor = parseFloor(prop.floor);
  if (floor !== null) {
    if (typeof floor === 'string' && FLOOR_ADJUSTMENTS[floor] !== undefined) {
      const adj = FLOOR_ADJUSTMENTS[floor];
      if (adj !== 0) {
        totalAdjustment += adj;
        adjustments.push(`piso ${floor}: ${adj >= 0 ? '+' : ''}${Math.round(adj * 100)}%`);
      }
    } else if (typeof floor === 'number' && floor >= HIGH_FLOOR_THRESHOLD) {
      totalAdjustment += HIGH_FLOOR_ADJUSTMENT;
      adjustments.push(`piso ${floor}: +${Math.round(HIGH_FLOOR_ADJUSTMENT * 100)}%`);
    }
  }

  return {
    adjustment_pct: Math.round(totalAdjustment * 100) / 100,
    adjustments_applied: adjustments,
  };
}

/**
 * Apply adjustment factor to a benchmark value.
 *
 * @param {number} benchmarkPricePerSqm - raw median benchmark
 * @param {Object} item - property item for adjustment context
 * @returns {{ raw_benchmark: number, adjustment_pct: number, adjusted_benchmark: number, adjustments_applied: string[] }}
 */
function applyAdjustments(benchmarkPricePerSqm, item) {
  const { adjustment_pct, adjustments_applied } = calculateAdjustments(item);
  const adjusted = Math.round(benchmarkPricePerSqm * (1 + adjustment_pct));

  return {
    raw_benchmark: benchmarkPricePerSqm,
    adjustment_pct,
    adjusted_benchmark: adjusted,
    adjustments_applied,
  };
}

module.exports = { calculateAdjustments, applyAdjustments, parseFloor };
