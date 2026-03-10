/**
 * Opportunity score calculator (1-10).
 * Maps price deviation from benchmark to a score with linear interpolation.
 */

const {
  OPPORTUNITY_BANDS,
  FSBO_BONUS,
  FSBO_BONUS_THRESHOLD,
  DAYS_ONLINE_BONUS,
  DAYS_ONLINE_BONUS_THRESHOLD,
  OPPORTUNITY_LABELS,
} = require('./constants');

/**
 * Get label for a given score.
 * @param {number} score
 * @returns {string}
 */
function getLabel(score) {
  if (score >= OPPORTUNITY_LABELS.exceptional.min) return OPPORTUNITY_LABELS.exceptional.label;
  if (score >= OPPORTUNITY_LABELS.great.min) return OPPORTUNITY_LABELS.great.label;
  if (score >= OPPORTUNITY_LABELS.fair.min) return OPPORTUNITY_LABELS.fair.label;
  if (score >= OPPORTUNITY_LABELS.above_market.min) return OPPORTUNITY_LABELS.above_market.label;
  return OPPORTUNITY_LABELS.overpriced.label;
}

/**
 * Calculate opportunity score from price deviation.
 *
 * @param {number} pricePerSqm - property's price/m2
 * @param {number} adjustedBenchmark - zone benchmark adjusted for property characteristics
 * @param {Object} [options]
 * @param {number} [options.fsbo_score] - FSBO confidence score
 * @param {number} [options.days_online] - days the listing has been online
 * @returns {{ score: number, label: string, deviation_pct: number, bonuses: string[] }}
 */
function calculateOpportunityScore(pricePerSqm, adjustedBenchmark, options = {}) {
  if (!adjustedBenchmark || adjustedBenchmark <= 0) {
    return { score: null, label: null, deviation_pct: null, bonuses: [] };
  }

  const deviation = (pricePerSqm - adjustedBenchmark) / adjustedBenchmark;
  const deviationPct = Math.round(deviation * 1000) / 10; // e.g., -17.3

  // Find the matching band and interpolate
  let baseScore = 1;
  let prevMaxDev = -Infinity;
  let prevMaxScore = 10;

  for (const band of OPPORTUNITY_BANDS) {
    if (deviation <= band.maxDev) {
      // Linear interpolation within this band
      const bandRange = band.maxDev - prevMaxDev;
      const scoreRange = prevMaxScore - band.minScore;
      if (bandRange === 0 || !isFinite(bandRange)) {
        baseScore = band.maxScore;
      } else {
        const position = (deviation - prevMaxDev) / bandRange;
        baseScore = prevMaxScore - position * scoreRange;
      }
      break;
    }
    prevMaxDev = band.maxDev;
    prevMaxScore = band.minScore;
  }

  // Apply bonuses
  const bonuses = [];
  let bonus = 0;

  const fsboScore = options.fsbo_score;
  if (typeof fsboScore === 'number' && fsboScore >= FSBO_BONUS_THRESHOLD) {
    bonus += FSBO_BONUS;
    bonuses.push('FSBO (sem comissao ~5%)');
  }

  const daysOnline = options.days_online;
  if (typeof daysOnline === 'number' && daysOnline >= DAYS_ONLINE_BONUS_THRESHOLD) {
    bonus += DAYS_ONLINE_BONUS;
    bonuses.push(`${daysOnline} dias no mercado`);
  }

  const finalScore = Math.max(1, Math.min(10, Math.round((baseScore + bonus) * 10) / 10));

  return {
    score: finalScore,
    label: getLabel(finalScore),
    deviation_pct: deviationPct,
    bonuses,
  };
}

module.exports = { calculateOpportunityScore, getLabel };
