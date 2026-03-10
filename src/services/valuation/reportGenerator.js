/**
 * Report generator: produces structured valuation reports in Portuguese.
 */

const { calculatePricePerSqm } = require('./pricePerSqm');
const { lookupBenchmark } = require('./zoneBenchmarks');
const { applyAdjustments } = require('./adjustmentFactors');
const { calculateOpportunityScore } = require('./opportunityScore');
const { LEAVE_ONE_OUT_THRESHOLD } = require('./constants');

/**
 * Generate a valuation report for a single property.
 *
 * @param {Object} item - cleaned listing item
 * @param {Map} benchmarkMap - from buildBenchmarks
 * @param {Object[]} [allListings] - full listing set (for leave-one-out)
 * @returns {Object|null} structured report or null if not evaluable
 */
function generateReport(item, benchmarkMap, allListings = null) {
  const ppsm = calculatePricePerSqm(item);
  if (!ppsm.valid) {
    return {
      evaluable: false,
      reason: ppsm.reason,
      property: buildPropertySummary(item),
    };
  }

  const loc = item.location || {};
  const prop = item.property || {};

  // Leave-one-out: rebuild without this item if sample is small
  let effectiveMap = benchmarkMap;
  if (allListings && allListings.length < LEAVE_ONE_OUT_THRESHOLD) {
    const { buildBenchmarks } = require('./zoneBenchmarks');
    effectiveMap = buildBenchmarks(allListings, { excludeUrl: item.url });
  }

  const benchmark = lookupBenchmark(loc, prop.type, prop.tipology, effectiveMap);
  if (!benchmark) {
    return {
      evaluable: false,
      reason: 'no_benchmark',
      property: buildPropertySummary(item),
      price_per_sqm: ppsm.price_per_sqm,
    };
  }

  const adjustment = applyAdjustments(benchmark.stats.median, item);
  const fsboScore = item.fsbo_score ?? item.signals?.fsbo_score ?? null;
  const daysOnline = typeof item.days_online === 'number' ? item.days_online : null;

  const opportunity = calculateOpportunityScore(
    ppsm.price_per_sqm,
    adjustment.adjusted_benchmark,
    { fsbo_score: fsboScore, days_online: daysOnline },
  );

  const reasons = buildReasons(opportunity, adjustment, benchmark, fsboScore, daysOnline);

  return {
    evaluable: true,
    summary: {
      verdict: opportunity.label,
      score: opportunity.score,
      price_per_sqm: ppsm.price_per_sqm,
      benchmark_price_per_sqm: benchmark.stats.median,
      adjusted_benchmark: adjustment.adjusted_benchmark,
      deviation_pct: opportunity.deviation_pct,
    },
    property: buildPropertySummary(item),
    analysis: {
      price_per_sqm_detail: `${ppsm.price_per_sqm} EUR/m2 (${ppsm.area_source})`,
      benchmark_detail: `Mediana zona: ${benchmark.stats.median} EUR/m2 (${benchmark.level}, ${benchmark.stats.count} comparaveis)`,
      adjustments: adjustment.adjustments_applied,
      adjusted_benchmark_detail: adjustment.adjustments_applied.length > 0
        ? `Benchmark ajustado: ${adjustment.adjusted_benchmark} EUR/m2`
        : null,
      deviation: `${opportunity.deviation_pct >= 0 ? '+' : ''}${opportunity.deviation_pct}% vs benchmark ajustado`,
      fsbo_advantage: fsboScore !== null && fsboScore >= 70
        ? 'FSBO - sem comissao de agencia (~5% poupanca)'
        : null,
      days_online: daysOnline !== null ? `${daysOnline} dias no mercado` : null,
    },
    reasons,
    confidence: benchmark.stats.confidence,
    benchmark_level: benchmark.level,
  };
}

/**
 * Build property summary from item.
 */
function buildPropertySummary(item) {
  const loc = item.location || {};
  const prop = item.property || {};
  return {
    url: item.url || null,
    title: item.title || null,
    price: item.price ?? null,
    area: prop.area_useful ?? prop.area_total ?? null,
    location: [loc.parish, loc.municipality, loc.district].filter(Boolean).join(', '),
    type: prop.type ?? null,
    tipology: prop.tipology ?? null,
    condition: prop.condition ?? null,
    year: prop.year ?? null,
  };
}

/**
 * Build human-readable reasons list in Portuguese.
 */
function buildReasons(opportunity, adjustment, benchmark, fsboScore, daysOnline) {
  const reasons = [];
  const dev = opportunity.deviation_pct;

  if (dev !== null && dev < 0) {
    reasons.push(`Preco ${Math.abs(dev)}% abaixo da mediana da zona`);
  } else if (dev !== null && dev > 0) {
    reasons.push(`Preco ${dev}% acima da mediana da zona`);
  } else if (dev !== null) {
    reasons.push('Preco alinhado com a mediana da zona');
  }

  if (fsboScore !== null && fsboScore >= 70) {
    reasons.push('FSBO sem comissao de agencia');
  }

  for (const adj of adjustment.adjustments_applied) {
    if (adj.includes('por renovar') || adj.includes('para recuperar')) {
      reasons.push('Imovel para renovar com potencial de valorizacao');
    } else if (adj.includes('novo')) {
      reasons.push('Imovel novo (premium no preco)');
    }
  }

  if (daysOnline !== null && daysOnline >= 60) {
    reasons.push(`${daysOnline} dias no mercado (possivel margem de negociacao)`);
  }

  if (benchmark.stats.confidence === 'low') {
    reasons.push('Poucos comparaveis na zona (confianca baixa)');
  }

  return reasons;
}

module.exports = { generateReport, buildPropertySummary, buildReasons };
