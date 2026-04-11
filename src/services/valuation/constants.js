/**
 * Valuation system constants and configuration.
 */

const MIN_COMPARABLES = 3;
const MIN_RELIABLE = 8;
const LEAVE_ONE_OUT_THRESHOLD = 20;
const BENCHMARK_CACHE_MAX_AGE_DAYS = 180;
const TEMPORAL_DECAY_DAYS = 90;

// Sanity filters
const MIN_AREA_SQM = 10;
const MAX_AREA_SQM = 50000;
const MIN_PRICE_EUR = 5000;
const MAX_PRICE_EUR = 5000000;

// Condition adjustments (multiplier offset from baseline "usado")
const CONDITION_ADJUSTMENTS = {
  novo: 0.10,
  renovado: 0.05,
  usado: 0,
  'por renovar': -0.15,
  'para recuperar': -0.15,
  'em construcao': 0.05,
  'em construção': 0.05,
};

// Year-based adjustments
const YEAR_ADJUSTMENTS = [
  { max: 1960, adjustment: -0.15 },
  { max: 1980, adjustment: -0.05 },
  { max: 2000, adjustment: -0.02 },
  { max: 2015, adjustment: 0 },
  { max: Infinity, adjustment: 0.05 },
];

// Floor adjustments
const FLOOR_ADJUSTMENTS = {
  Cave: -0.12,
  'R/C': -0.03,
  // Floors 1-3: 0 (baseline)
  // 4+: small premium
};
const HIGH_FLOOR_THRESHOLD = 4;
const HIGH_FLOOR_ADJUSTMENT = 0.03;

// Opportunity score bands: [maxDeviation, minScore, maxScore]
// Deviation = (price_per_sqm - adjusted_benchmark) / adjusted_benchmark
const OPPORTUNITY_BANDS = [
  { maxDev: -0.30, minScore: 9, maxScore: 10 },
  { maxDev: -0.20, minScore: 7, maxScore: 9 },
  { maxDev: -0.10, minScore: 5, maxScore: 7 },
  { maxDev: 0.00, minScore: 4, maxScore: 5 },
  { maxDev: 0.10, minScore: 3, maxScore: 4 },
  { maxDev: 0.20, minScore: 1, maxScore: 3 },
  { maxDev: Infinity, minScore: 1, maxScore: 1 },
];

// Bonus adjustments to opportunity score
const FSBO_BONUS = 0.5;
const FSBO_BONUS_THRESHOLD = 70;
const DAYS_ONLINE_BONUS = 0.5;
const DAYS_ONLINE_BONUS_THRESHOLD = 60;

// Area bands for benchmark grouping (m²)
const AREA_BANDS = [
  { label: 'xs', max: 60 },
  { label: 's', max: 90 },
  { label: 'm', max: 120 },
  { label: 'l', max: 180 },
  { label: 'xl', max: Infinity },
];

// Confidence levels based on number of comparables
const CONFIDENCE_LEVELS = {
  high: 20,
  medium: 12,
  low: 8,
  marginal: 3,
};

// Opportunity labels
const OPPORTUNITY_LABELS = {
  exceptional: { min: 8, label: 'Oportunidade excepcional' },
  great: { min: 6, label: 'Boa oportunidade' },
  fair: { min: 4, label: 'Preco justo' },
  above_market: { min: 2, label: 'Acima do mercado' },
  overpriced: { min: 0, label: 'Sobrevalorizado' },
};

module.exports = {
  MIN_COMPARABLES,
  MIN_RELIABLE,
  LEAVE_ONE_OUT_THRESHOLD,
  BENCHMARK_CACHE_MAX_AGE_DAYS,
  TEMPORAL_DECAY_DAYS,
  AREA_BANDS,
  MIN_AREA_SQM,
  MAX_AREA_SQM,
  MIN_PRICE_EUR,
  MAX_PRICE_EUR,
  CONDITION_ADJUSTMENTS,
  YEAR_ADJUSTMENTS,
  FLOOR_ADJUSTMENTS,
  HIGH_FLOOR_THRESHOLD,
  HIGH_FLOOR_ADJUSTMENT,
  OPPORTUNITY_BANDS,
  FSBO_BONUS,
  FSBO_BONUS_THRESHOLD,
  DAYS_ONLINE_BONUS,
  DAYS_ONLINE_BONUS_THRESHOLD,
  CONFIDENCE_LEVELS,
  OPPORTUNITY_LABELS,
};
