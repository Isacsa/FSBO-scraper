const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { calculatePricePerSqm } = require('../src/services/valuation/pricePerSqm');
const { median, percentile, removeOutliers, calculateStats, buildBenchmarks, lookupBenchmark, getConfidence, getAreaBand, weightedMedian } = require('../src/services/valuation/zoneBenchmarks');
const { calculateAdjustments, applyAdjustments, parseFloor } = require('../src/services/valuation/adjustmentFactors');
const { calculateOpportunityScore, getLabel } = require('../src/services/valuation/opportunityScore');
const { generateReport } = require('../src/services/valuation/reportGenerator');
const { analyzeBatch, analyzeBatchWithDiagnostics } = require('../src/services/valuation');

console.log('  Valuation module tests\n');

// ─── pricePerSqm ───

{
  console.log('  pricePerSqm');

  // Valid with area_useful
  const r1 = calculatePricePerSqm({ price: 150000, property: { area_useful: 100, area_total: 120 } });
  assert.strictEqual(r1.valid, true);
  assert.strictEqual(r1.price_per_sqm, 1500);
  assert.strictEqual(r1.area_source, 'area_useful');
  console.log('    valid area_useful');

  // Fallback to area_total
  const r2 = calculatePricePerSqm({ price: 200000, property: { area_useful: null, area_total: 80 } });
  assert.strictEqual(r2.valid, true);
  assert.strictEqual(r2.price_per_sqm, 2500);
  assert.strictEqual(r2.area_source, 'area_total');
  console.log('    fallback area_total');

  // No area
  const r3 = calculatePricePerSqm({ price: 100000, property: {} });
  assert.strictEqual(r3.valid, false);
  assert.strictEqual(r3.reason, 'no_valid_area');
  console.log('    no area');

  // Price too low
  const r4 = calculatePricePerSqm({ price: 100, property: { area_useful: 50 } });
  assert.strictEqual(r4.valid, false);
  assert.strictEqual(r4.reason, 'invalid_price');
  console.log('    price too low');

  // Price too high
  const r5 = calculatePricePerSqm({ price: 10000000, property: { area_useful: 50 } });
  assert.strictEqual(r5.valid, false);
  assert.strictEqual(r5.reason, 'invalid_price');
  console.log('    price too high');

  // Area below minimum
  const r6 = calculatePricePerSqm({ price: 50000, property: { area_useful: 5 } });
  assert.strictEqual(r6.valid, false);
  assert.strictEqual(r6.reason, 'no_valid_area');
  console.log('    area below minimum');

  // Zero area
  const r7 = calculatePricePerSqm({ price: 50000, property: { area_useful: 0, area_total: 0 } });
  assert.strictEqual(r7.valid, false);
  console.log('    zero area');

  // No property object
  const r8 = calculatePricePerSqm({ price: 50000 });
  assert.strictEqual(r8.valid, false);
  assert.strictEqual(r8.reason, 'no_valid_area');
  console.log('    no property object');

  console.log('    all passed\n');
}

// ─── zoneBenchmarks stats ───

{
  console.log('  zoneBenchmarks statistics');

  assert.strictEqual(median([1, 2, 3, 4, 5]), 3);
  assert.strictEqual(median([1, 2, 3, 4]), 2.5);
  assert.strictEqual(median([7]), 7);
  assert.strictEqual(median([]), 0);
  console.log('    median');

  assert.strictEqual(percentile([10, 20, 30, 40, 50], 25), 20);
  assert.strictEqual(percentile([10, 20, 30, 40, 50], 75), 40);
  assert.strictEqual(percentile([5], 50), 5);
  console.log('    percentile');

  // Outlier removal
  const withOutliers = [100, 200, 210, 220, 230, 240, 250, 1000];
  const cleaned = removeOutliers(withOutliers);
  assert.ok(!cleaned.includes(1000), 'should remove high outlier');
  assert.ok(cleaned.includes(200), 'should keep normal values');
  console.log('    outlier removal');

  // Confidence levels (high=20, medium=12, low=8, marginal=3)
  assert.strictEqual(getConfidence(25), 'high');
  assert.strictEqual(getConfidence(20), 'high');
  assert.strictEqual(getConfidence(15), 'medium');
  assert.strictEqual(getConfidence(12), 'medium');
  assert.strictEqual(getConfidence(10), 'low');
  assert.strictEqual(getConfidence(8), 'low');
  assert.strictEqual(getConfidence(5), 'marginal');
  assert.strictEqual(getConfidence(3), 'marginal');
  assert.strictEqual(getConfidence(2), 'insufficient');
  console.log('    confidence levels');

  // calculateStats needs >= MIN_COMPARABLES (3) after outlier removal
  const tooFew = [100, 200];
  assert.strictEqual(calculateStats(tooFew), null);
  console.log('    too few for stats');

  // 3 items: exactly at MIN_COMPARABLES, should work
  const justEnough = [1000, 1100, 1200];
  const statsMin = calculateStats(justEnough);
  assert.ok(statsMin !== null);
  assert.strictEqual(statsMin.count, 3);
  assert.strictEqual(statsMin.confidence, 'marginal');
  console.log('    marginal confidence at MIN_COMPARABLES');

  const enough = [1000, 1100, 1200, 1300, 1400, 1500, 1600];
  const stats = calculateStats(enough);
  assert.ok(stats !== null);
  assert.strictEqual(stats.median, 1300);
  assert.strictEqual(stats.count, 7);
  console.log('    valid stats');

  // Enriched entries with scraped_at
  const enriched = [
    { value: 1000, scraped_at: '2026-04-09T00:00:00Z' },
    { value: 1100, scraped_at: '2026-04-09T00:00:00Z' },
    { value: 1200, scraped_at: '2026-04-09T00:00:00Z' },
    { value: 1300, scraped_at: '2026-04-09T00:00:00Z' },
  ];
  const statsEnriched = calculateStats(enriched, Date.now());
  assert.ok(statsEnriched !== null);
  assert.strictEqual(statsEnriched.count, 4);
  console.log('    enriched entries work');

  console.log('    all passed\n');
}

// ─── zoneBenchmarks build + lookup ───

{
  console.log('  zoneBenchmarks build + lookup');

  const listings = [];
  // Generate 10 fake listings in same zone
  for (let i = 0; i < 10; i++) {
    listings.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/${i}`,
    });
  }

  const map = buildBenchmarks(listings);
  assert.ok(map.size > 0, 'should have benchmarks');

  // Exact lookup with area
  const b1 = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', map, { area: 80 },
  );
  assert.ok(b1 !== null, 'should find exact benchmark');
  assert.strictEqual(b1.level, 'freguesia+tipo+tipologia+area');
  assert.strictEqual(b1.fallback_used, false);
  console.log('    exact lookup with area');

  // Lookup without area — falls back to non-area level
  const b1b = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', map,
  );
  assert.ok(b1b !== null, 'should find benchmark without area');
  assert.strictEqual(b1b.level, 'freguesia+tipo+tipologia');
  console.log('    lookup without area');

  // Fallback: different parish same municipality
  const b2 = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
    'apartamento', 'T2', map, { area: 80 },
  );
  assert.ok(b2 !== null, 'should fallback to concelho level');
  assert.ok(b2.level.startsWith('concelho'), `expected concelho fallback, got ${b2.level}`);
  assert.strictEqual(b2.fallback_used, true);
  console.log('    fallback to concelho');

  // Fallback: different municipality same district
  const b3 = lookupBenchmark(
    { district: 'Porto', municipality: 'Gaia', parish: 'Mafamude' },
    'apartamento', '', map,
  );
  assert.ok(b3 !== null, 'should fallback to distrito level');
  assert.strictEqual(b3.level, 'distrito+tipo');
  console.log('    fallback to distrito');

  // No match at all
  const b4 = lookupBenchmark(
    { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    'moradia', 'T5', map,
  );
  assert.strictEqual(b4, null, 'should return null for unknown zone');
  console.log('    no match returns null');

  // Leave-one-out
  const mapExclude = buildBenchmarks(listings, { excludeUrl: 'https://example.com/0' });
  const bExclude = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', mapExclude,
  );
  assert.ok(bExclude !== null);
  assert.ok(bExclude.stats.count <= 9, 'should have fewer items after exclusion');
  console.log('    leave-one-out');

  console.log('    all passed\n');
}

// ─── adjustmentFactors ───

{
  console.log('  adjustmentFactors');

  // Condition: novo
  const a1 = calculateAdjustments({ property: { condition: 'novo' } });
  assert.strictEqual(a1.adjustment_pct, 0.10);
  assert.ok(a1.adjustments_applied.length > 0);
  console.log('    condition novo');

  // Condition: por renovar
  const a2 = calculateAdjustments({ property: { condition: 'por renovar' } });
  assert.strictEqual(a2.adjustment_pct, -0.15);
  console.log('    condition por renovar');

  // Year old
  const a3 = calculateAdjustments({ property: { year: 1970, condition: 'usado' } });
  assert.strictEqual(a3.adjustment_pct, -0.05);
  console.log('    year old');

  // Combined: por renovar + old year + cave
  const a4 = calculateAdjustments({ property: { condition: 'por renovar', year: 1950, floor: 'Cave' } });
  assert.strictEqual(a4.adjustment_pct, -0.15 + -0.15 + -0.12);
  assert.strictEqual(a4.adjustments_applied.length, 3);
  console.log('    combined adjustments');

  // Apply to benchmark
  const applied = applyAdjustments(1500, { property: { condition: 'novo' } });
  assert.strictEqual(applied.raw_benchmark, 1500);
  assert.strictEqual(applied.adjusted_benchmark, 1650); // 1500 * 1.10
  console.log('    apply to benchmark');

  // Floor parsing
  assert.strictEqual(parseFloor('Cave'), 'Cave');
  assert.strictEqual(parseFloor('R/C'), 'R/C');
  assert.strictEqual(parseFloor('3'), 3);
  assert.strictEqual(parseFloor(null), null);
  console.log('    floor parsing');

  console.log('    all passed\n');
}

// ─── opportunityScore ───

{
  console.log('  opportunityScore');

  // Far below benchmark -> high score
  const o1 = calculateOpportunityScore(700, 1000);
  assert.ok(o1.score >= 8, `expected >= 8, got ${o1.score}`);
  assert.ok(o1.deviation_pct < -25);
  console.log('    far below -> high score');

  // At benchmark -> ~4
  const o2 = calculateOpportunityScore(1000, 1000);
  assert.ok(o2.score >= 4 && o2.score <= 5, `expected 4-5, got ${o2.score}`);
  assert.ok(Math.abs(o2.deviation_pct) < 1);
  console.log('    at benchmark -> fair');

  // Above benchmark -> low score
  const o3 = calculateOpportunityScore(1300, 1000);
  assert.ok(o3.score <= 3, `expected <= 3, got ${o3.score}`);
  assert.ok(o3.deviation_pct > 20);
  console.log('    above benchmark -> low score');

  // FSBO bonus
  const o4 = calculateOpportunityScore(800, 1000, { fsbo_score: 80 });
  const o4noBonus = calculateOpportunityScore(800, 1000);
  assert.ok(o4.score >= o4noBonus.score, 'FSBO should increase score');
  assert.ok(o4.bonuses.length > 0);
  console.log('    FSBO bonus');

  // Days online bonus
  const o5 = calculateOpportunityScore(800, 1000, { days_online: 90 });
  assert.ok(o5.bonuses.some(b => b.includes('dias')));
  console.log('    days online bonus');

  // Labels
  assert.strictEqual(getLabel(9), 'Oportunidade excepcional');
  assert.strictEqual(getLabel(6), 'Boa oportunidade');
  assert.strictEqual(getLabel(4), 'Preco justo');
  assert.strictEqual(getLabel(2), 'Acima do mercado');
  assert.strictEqual(getLabel(1), 'Sobrevalorizado');
  console.log('    labels');

  // Invalid benchmark
  const o6 = calculateOpportunityScore(1000, 0);
  assert.strictEqual(o6.score, null);
  console.log('    invalid benchmark');

  console.log('    all passed\n');
}

// ─── reportGenerator ───

{
  console.log('  reportGenerator');

  const listings = [];
  for (let i = 0; i < 10; i++) {
    listings.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/${i}`,
      title: `Apt T2 ${i}`,
      fsbo_score: 75,
      days_online: 30,
    });
  }

  const benchmarkMap = buildBenchmarks(listings);

  // Report for item below average
  const cheapItem = {
    price: 80000,
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    url: 'https://example.com/cheap',
    title: 'Apt T2 Barato',
    fsbo_score: 80,
    days_online: 70,
  };

  const report = generateReport(cheapItem, benchmarkMap);
  assert.strictEqual(report.evaluable, true);
  assert.ok(report.summary.score >= 5, `expected score >= 5, got ${report.summary.score}`);
  assert.ok(report.summary.deviation_pct < 0, 'should be below benchmark');
  assert.ok(report.summary.price_per_sqm === 1000);
  assert.ok(report.reasons.length > 0);
  assert.ok(report.property.url === 'https://example.com/cheap');
  assert.ok(report.analysis.fsbo_advantage !== null);
  assert.ok(report.analysis.days_online !== null);
  console.log('    valid report structure');

  // Non-evaluable: no area
  const noArea = generateReport(
    { price: 100000, property: {}, location: {} },
    benchmarkMap,
  );
  assert.strictEqual(noArea.evaluable, false);
  assert.strictEqual(noArea.reason, 'no_valid_area');
  console.log('    non-evaluable report');

  // Non-evaluable: no benchmark
  const noBench = generateReport(
    { price: 100000, property: { area_useful: 80, type: 'moradia' }, location: { district: 'Faro' } },
    benchmarkMap,
  );
  assert.strictEqual(noBench.evaluable, false);
  assert.strictEqual(noBench.reason, 'no_benchmark');
  console.log('    no benchmark report');

  console.log('    all passed\n');
}

// ─── analyzeBatch ───

{
  console.log('  analyzeBatch');

  const items = [];
  for (let i = 0; i < 15; i++) {
    items.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 70 + i * 2, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/batch-${i}`,
      title: `Apt T2 batch ${i}`,
    });
  }

  const result = analyzeBatch(items);
  assert.ok(result.reports.length === 15);
  assert.ok(result.stats.total === 15);
  assert.ok(result.stats.evaluated > 0);
  assert.ok(result.stats.benchmark_zones > 0);

  // Reports should be sorted by score descending
  const scores = result.reports
    .filter(r => r.evaluable)
    .map(r => r.summary.score);
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i - 1] >= scores[i], 'should be sorted descending');
  }
  console.log('    batch analysis with sorting');

  console.log('    all passed\n');
}

// ─── Golden cases: known expected valuations ───

{
  console.log('  golden cases');

  // Create a homogeneous batch of 10 apartments at ~1500 EUR/m2
  const batch = [];
  for (let i = 0; i < 10; i++) {
    batch.push({
      price: 120000 + i * 5000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/golden-${i}`,
      title: `Golden T2 ${i}`,
    });
  }
  // Batch price/m2 range: 1500 to 2062.5, median ~1781

  // Case 1: Cheap apartment well below median → score >= 7
  const cheap = {
    price: 100000, // 1250 EUR/m2
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    url: 'https://example.com/golden-cheap',
    title: 'Golden cheap',
  };

  // Case 2: Expensive apartment well above median → score <= 3
  const expensive = {
    price: 300000, // 3750 EUR/m2
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    url: 'https://example.com/golden-expensive',
    title: 'Golden expensive',
  };

  // Case 3: Fair price near median → score 4-6
  const fair = {
    price: 140000, // 1750 EUR/m2, close to median
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    url: 'https://example.com/golden-fair',
    title: 'Golden fair',
  };

  const allItems = [...batch, cheap, expensive, fair];
  const result = analyzeBatch(allItems);

  const cheapReport = result.reports.find(r => r.property.url === 'https://example.com/golden-cheap');
  const expensiveReport = result.reports.find(r => r.property.url === 'https://example.com/golden-expensive');
  const fairReport = result.reports.find(r => r.property.url === 'https://example.com/golden-fair');

  assert.ok(cheapReport.evaluable, 'cheap should be evaluable');
  assert.ok(cheapReport.summary.score >= 7, `cheap score should be >= 7, got ${cheapReport.summary.score}`);
  console.log(`    cheap: score ${cheapReport.summary.score} (expected >= 7)`);

  assert.ok(expensiveReport.evaluable, 'expensive should be evaluable');
  assert.ok(expensiveReport.summary.score <= 3, `expensive score should be <= 3, got ${expensiveReport.summary.score}`);
  console.log(`    expensive: score ${expensiveReport.summary.score} (expected <= 3)`);

  assert.ok(fairReport.evaluable, 'fair should be evaluable');
  assert.ok(fairReport.summary.score >= 4 && fairReport.summary.score <= 6, `fair score should be 4-6, got ${fairReport.summary.score}`);
  console.log(`    fair: score ${fairReport.summary.score} (expected 4-6)`);

  console.log('    all passed\n');
}

// ─── Statistical invariants ───

{
  console.log('  statistical invariants');

  // Homogeneous batch: median item should score ~4-5
  const homoBatch = [];
  for (let i = 0; i < 12; i++) {
    homoBatch.push({
      price: 150000,
      property: { type: 'apartamento', tipology: 'T3', area_useful: 100, condition: 'usado' },
      location: { district: 'Lisboa', municipality: 'Lisboa', parish: 'Arroios' },
      url: `https://example.com/inv-${i}`,
    });
  }

  const homoResult = analyzeBatch(homoBatch);
  const homoScores = homoResult.reports.filter(r => r.evaluable).map(r => r.summary.score);
  if (homoScores.length > 0) {
    const avgScore = homoScores.reduce((a, b) => a + b, 0) / homoScores.length;
    assert.ok(avgScore >= 3.5 && avgScore <= 5.5, `homogeneous batch avg score should be ~4-5, got ${avgScore}`);
    console.log(`    homogeneous batch avg score: ${avgScore}`);
  }

  // Monotonicity: cheaper item should score >= more expensive item (same zone)
  const monoBatch = [];
  for (let i = 0; i < 10; i++) {
    monoBatch.push({
      price: 100000 + i * 20000, // 100k to 280k
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Matosinhos', parish: 'Leca' },
      url: `https://example.com/mono-${i}`,
    });
  }

  const monoResult = analyzeBatch(monoBatch);
  const monoEval = monoResult.reports.filter(r => r.evaluable);
  // Sort by price ascending
  monoEval.sort((a, b) => a.property.price - b.property.price);
  for (let i = 1; i < monoEval.length; i++) {
    assert.ok(
      monoEval[i - 1].summary.score >= monoEval[i].summary.score,
      `monotonicity: price ${monoEval[i - 1].property.price} scored ${monoEval[i - 1].summary.score} should be >= price ${monoEval[i].property.price} scored ${monoEval[i].summary.score}`
    );
  }
  console.log(`    monotonicity: ${monoEval.length} items verified`);

  // Cheapest should score higher than most expensive
  if (monoEval.length >= 2) {
    assert.ok(monoEval[0].summary.score > monoEval[monoEval.length - 1].summary.score,
      'cheapest should score higher than most expensive');
    console.log('    cheapest > most expensive');
  }

  console.log('    all passed\n');
}

// ─── Type contamination test ───

{
  console.log('  type contamination');

  const items = [];
  // 6 apartments at ~2000 EUR/m2
  for (let i = 0; i < 6; i++) {
    items.push({
      price: 160000 + i * 5000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
      url: `https://example.com/apt-${i}`,
    });
  }
  // 6 garages at ~200 EUR/m2 (very cheap per m2)
  for (let i = 0; i < 6; i++) {
    items.push({
      price: 5000 + i * 500,
      property: { type: 'garagem', tipology: '', area_useful: 25, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
      url: `https://example.com/garage-${i}`,
    });
  }

  const benchmarkMap = buildBenchmarks(items);

  // Apartment benchmark should not be dragged down by garages
  const aptBench = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
    'apartamento', 'T2', benchmarkMap
  );
  assert.ok(aptBench !== null, 'should have apartment benchmark');
  assert.ok(aptBench.stats.median > 1500, `apartment median should be > 1500 EUR/m2, got ${aptBench.stats.median}`);

  // Garage benchmark should be separate
  const garageBench = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
    'garagem', '', benchmarkMap
  );
  assert.ok(garageBench !== null, 'should have garage benchmark');
  assert.ok(garageBench.stats.median < 500, `garage median should be < 500 EUR/m2, got ${garageBench.stats.median}`);

  console.log(`    apartment median: ${aptBench.stats.median} EUR/m2 (garage: ${garageBench.stats.median} EUR/m2)`);
  console.log('    all passed\n');
}

// ─── MIN_COMPARABLES threshold edge cases ───

{
  console.log('  MIN_COMPARABLES threshold');

  const { MIN_COMPARABLES } = require('../src/services/valuation/constants');

  // 2 items → should NOT produce a benchmark (below MIN_COMPARABLES=3)
  const twoItems = [];
  for (let i = 0; i < 2; i++) {
    twoItems.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
      location: { district: 'Faro', municipality: 'Faro', parish: 'Se' },
      url: `https://example.com/two-${i}`,
    });
  }
  const twoBench = buildBenchmarks(twoItems);
  const twoLookup = lookupBenchmark(
    { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    'apartamento', 'T2', twoBench
  );
  assert.strictEqual(twoLookup, null, '2 items should produce no benchmark');
  console.log(`    2 items -> no benchmark (MIN_COMPARABLES=${MIN_COMPARABLES})`);

  // 3 items → should produce a benchmark (marginal confidence)
  const threeItems = [...twoItems, {
    price: 120000,
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
    location: { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    url: 'https://example.com/three-2',
  }];
  const threeBench = buildBenchmarks(threeItems);
  const threeLookup = lookupBenchmark(
    { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    'apartamento', 'T2', threeBench
  );
  assert.ok(threeLookup !== null, '3 items should produce a benchmark');
  assert.strictEqual(threeLookup.stats.confidence, 'marginal');
  console.log(`    3 items -> benchmark with marginal confidence (median: ${threeLookup.stats.median})`);

  // 5 items with 1 extreme outlier → may drop below MIN after outlier removal
  const fiveWithOutlier = [];
  for (let i = 0; i < 4; i++) {
    fiveWithOutlier.push({
      price: 100000 + i * 5000,
      property: { type: 'moradia', tipology: 'T3', area_useful: 100 },
      location: { district: 'Faro', municipality: 'Loule', parish: 'Almancil' },
      url: `https://example.com/outlier-${i}`,
    });
  }
  fiveWithOutlier.push({
    price: 5000000, // extreme outlier
    property: { type: 'moradia', tipology: 'T3', area_useful: 100 },
    location: { district: 'Faro', municipality: 'Loule', parish: 'Almancil' },
    url: 'https://example.com/outlier-extreme',
  });
  const outlierBench = buildBenchmarks(fiveWithOutlier);
  const outlierLookup = lookupBenchmark(
    { district: 'Faro', municipality: 'Loule', parish: 'Almancil' },
    'moradia', 'T3', outlierBench
  );
  // After outlier removal, may have < 5 → null OR exactly 5 at wider level
  // The test just verifies robustness, no crash
  console.log(`    5 items with outlier -> benchmark: ${outlierLookup ? 'yes' : 'null (outlier removed, below min)'}`);

  console.log('    all passed\n');
}

// ─── analyzeBatchWithDiagnostics ───

{
  console.log('  analyzeBatchWithDiagnostics');

  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/diag-${i}`,
      title: `Diag T2 ${i}`,
    });
  }

  const result = analyzeBatchWithDiagnostics(items);
  assert.ok(result.diagnostics, 'should have diagnostics');
  assert.ok(result.diagnostics.group_counts, 'should have group counts');
  assert.ok(result.diagnostics.fallback_levels, 'should have fallback levels');
  assert.ok(result.diagnostics.score_distribution, 'should have score distribution');
  assert.ok(result.diagnostics.confidence_counts, 'should have confidence counts');
  assert.ok(Array.isArray(result.diagnostics.warnings), 'should have warnings array');
  console.log(`    diagnostics: ${Object.keys(result.diagnostics.group_counts).length} groups, ${result.diagnostics.warnings.length} warnings`);

  console.log('    all passed\n');
}

// ─── Integration: real data file (if available) ───

{
  const dataFile = path.join(__dirname, '..', 'data', 'output_olx_viana_new.json');
  if (fs.existsSync(dataFile)) {
    console.log('  integration: real OLX data');

    const { cleanItem } = require('../src/integration/dataCleaner');
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const items = (raw.results || []).map(item => cleanItem(item, 'olx'));

    if (items.length >= 5) {
      const result = analyzeBatch(items);
      assert.ok(result.stats.total === items.length);
      assert.ok(result.stats.evaluated >= 0);
      assert.ok(Array.isArray(result.reports));

      const evaluable = result.reports.filter(r => r.evaluable);
      if (evaluable.length > 0) {
        const first = evaluable[0];
        assert.ok(first.summary.score >= 1 && first.summary.score <= 10);
        assert.ok(typeof first.summary.price_per_sqm === 'number');
        assert.ok(typeof first.summary.deviation_pct === 'number');
        assert.ok(first.confidence);
        console.log(`    ${items.length} items -> ${evaluable.length} evaluated, best score: ${first.summary.score}`);
      } else {
        console.log(`    ${items.length} items -> 0 evaluable (insufficient comparables or missing data)`);
      }
    } else {
      console.log('    skipped (fewer than 5 items)');
    }

    console.log('    passed\n');
  } else {
    console.log('  integration: skipped (no data file)\n');
  }
}

// ─── Integration: cross-portal (if data files available) ───

{
  const dataDir = path.join(__dirname, '..', 'data');
  const crossPortalFiles = [
    'output_olx_viana_new.json',
    'output_imovirtual_viana_new.json',
    'output_custojusto_viana_new.json',
    'output_casasapo_viana_new.json',
  ];

  const availableFiles = crossPortalFiles.filter(f => fs.existsSync(path.join(dataDir, f)));

  if (availableFiles.length >= 2) {
    console.log('  integration: cross-portal');

    const { cleanItem } = require('../src/integration/dataCleaner');
    const allItems = [];

    for (const file of availableFiles) {
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const items = raw.results || raw.items || (Array.isArray(raw) ? raw : []);
      const source = file.includes('olx') ? 'olx'
        : file.includes('imovirtual') ? 'imovirtual'
        : file.includes('custojusto') ? 'custojusto'
        : 'casasapo';

      for (const item of items) {
        allItems.push(cleanItem(item, source));
      }
    }

    console.log(`    loaded ${allItems.length} items from ${availableFiles.length} portals`);

    const result = analyzeBatchWithDiagnostics(allItems);

    // Basic sanity checks
    for (const r of result.reports) {
      if (r.evaluable) {
        assert.ok(r.summary.score >= 1 && r.summary.score <= 10, `score out of range: ${r.summary.score}`);
        assert.ok(typeof r.summary.price_per_sqm === 'number', 'price_per_sqm should be number');
        assert.ok(typeof r.summary.deviation_pct === 'number', 'deviation_pct should be number');
      } else {
        assert.ok(r.reason, 'non-evaluable should have reason');
      }
    }

    const evaluated = result.reports.filter(r => r.evaluable);
    console.log(`    ${allItems.length} items -> ${evaluated.length} evaluated, ${result.stats.opportunities} opportunities`);
    console.log(`    diagnostics: ${result.diagnostics.warnings.length} warnings`);

    console.log('    passed\n');
  } else {
    console.log('  integration: cross-portal skipped (need >= 2 data files)\n');
  }
}

// ─── Area bands ───

{
  console.log('  area bands');

  assert.strictEqual(getAreaBand(50), 'xs');
  assert.strictEqual(getAreaBand(60), 'xs');
  assert.strictEqual(getAreaBand(61), 's');
  assert.strictEqual(getAreaBand(90), 's');
  assert.strictEqual(getAreaBand(91), 'm');
  assert.strictEqual(getAreaBand(120), 'm');
  assert.strictEqual(getAreaBand(121), 'l');
  assert.strictEqual(getAreaBand(180), 'l');
  assert.strictEqual(getAreaBand(181), 'xl');
  assert.strictEqual(getAreaBand(500), 'xl');
  assert.strictEqual(getAreaBand(0), '');
  assert.strictEqual(getAreaBand(null), '');
  console.log('    band labels correct');

  // Items of different sizes should NOT be in same most-specific group
  const mixedItems = [];
  for (let i = 0; i < 5; i++) {
    mixedItems.push({
      price: 100000, property: { type: 'apartamento', tipology: 'T2', area_useful: 70 },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/small-${i}`,
    });
    mixedItems.push({
      price: 300000, property: { type: 'apartamento', tipology: 'T2', area_useful: 200 },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/large-${i}`,
    });
  }

  const mixedMap = buildBenchmarks(mixedItems);
  const smallLookup = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', mixedMap, { area: 70 },
  );
  const largeLookup = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', mixedMap, { area: 200 },
  );
  assert.ok(smallLookup !== null, 'small area should find benchmark');
  assert.ok(largeLookup !== null, 'large area should find benchmark');
  // Medians should be different since price/m2 differs
  if (smallLookup.level.includes('area') && largeLookup.level.includes('area')) {
    assert.notStrictEqual(smallLookup.stats.median, largeLookup.stats.median,
      'different area bands should have different medians');
    console.log(`    small area median: ${smallLookup.stats.median}, large area median: ${largeLookup.stats.median}`);
  }

  console.log('    all passed\n');
}

// ─── Weighted median ───

{
  console.log('  weighted median');

  // Equal timestamps → same as simple median
  const now = Date.now();
  const entries = [
    { value: 100, scraped_at: new Date(now).toISOString() },
    { value: 200, scraped_at: new Date(now).toISOString() },
    { value: 300, scraped_at: new Date(now).toISOString() },
  ];
  const wm = weightedMedian(entries, now);
  assert.strictEqual(wm, 200, 'equal timestamps should give simple median');
  console.log('    equal timestamps');

  // No timestamps → simple median fallback
  const plain = [{ value: 10 }, { value: 20 }, { value: 30 }];
  assert.strictEqual(weightedMedian(plain), 20, 'no timestamps should fallback to simple median');
  console.log('    no timestamps fallback');

  // Single entry
  assert.strictEqual(weightedMedian([{ value: 42 }]), 42);
  console.log('    single entry');

  // Recent entries should pull median toward them
  const day = 24 * 60 * 60 * 1000;
  const mixedAge = [
    { value: 1000, scraped_at: new Date(now - 150 * day).toISOString() }, // old, low weight
    { value: 1000, scraped_at: new Date(now - 150 * day).toISOString() },
    { value: 2000, scraped_at: new Date(now).toISOString() },             // recent, high weight
    { value: 2000, scraped_at: new Date(now).toISOString() },
    { value: 2000, scraped_at: new Date(now).toISOString() },
  ];
  mixedAge.sort((a, b) => a.value - b.value);
  const wmMixed = weightedMedian(mixedAge, now);
  assert.ok(wmMixed >= 1500, `weighted median should favor recent entries, got ${wmMixed}`);
  console.log(`    temporal weighting: ${wmMixed} (favors recent 2000 over old 1000)`);

  console.log('    all passed\n');
}

// ─── Benchmark cache ───

{
  console.log('  benchmark cache');

  const {
    emptyState,
    upsertToBenchmarkCache,
    pruneStaleBenchmarks,
    getCacheListingsAsArray,
  } = require('../src/services/valuation/benchmarkCache');

  const state = emptyState();
  assert.deepStrictEqual(state.listings, {});
  console.log('    empty state');

  // Upsert items
  const items = [
    {
      url: 'https://www.olx.pt/d/anuncio/apt-1',
      price: 150000,
      source: 'olx',
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    },
    {
      url: 'https://www.olx.pt/d/anuncio/apt-2',
      price: 200000,
      source: 'olx',
      property: { type: 'apartamento', tipology: 'T3', area_useful: 100 },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    },
    // No area → should be skipped
    {
      url: 'https://www.olx.pt/d/anuncio/no-area',
      price: 100000,
      source: 'olx',
      property: { type: 'apartamento' },
      location: { district: 'Porto' },
    },
  ];

  const result = upsertToBenchmarkCache(state, items, '2026-04-09T00:00:00Z');
  assert.strictEqual(result.newCount, 2, 'should insert 2 (skip item without area)');
  assert.strictEqual(Object.keys(state.listings).length, 2);
  console.log('    upsert items');

  // Update existing
  const updated = upsertToBenchmarkCache(state, [{
    url: 'https://www.olx.pt/d/anuncio/apt-1',
    price: 160000,
    source: 'olx',
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
  }], '2026-04-10T00:00:00Z');
  assert.strictEqual(updated.updatedCount, 1);
  assert.strictEqual(updated.newCount, 0);
  console.log('    update existing');

  // getCacheListingsAsArray
  const arr = getCacheListingsAsArray(state);
  assert.strictEqual(arr.length, 2);
  assert.ok(arr[0].property.type, 'should have nested property');
  assert.ok(arr[0].location.district, 'should have nested location');
  console.log('    cache to array');

  // Pruning
  const staleState = emptyState();
  staleState.listings['old-url'] = { scraped_at: '2025-01-01T00:00:00Z', price_per_sqm: 1000 };
  staleState.listings['recent-url'] = { scraped_at: '2026-04-01T00:00:00Z', price_per_sqm: 1500 };
  const pruned = pruneStaleBenchmarks(staleState, 180);
  assert.strictEqual(pruned, 1, 'should prune 1 old entry');
  assert.ok(staleState.listings['recent-url'], 'recent should remain');
  assert.ok(!staleState.listings['old-url'], 'old should be removed');
  console.log('    pruning');

  console.log('    all passed\n');
}

// ─── Benchmark details in report ───

{
  console.log('  benchmark details in report');

  const listings = [];
  for (let i = 0; i < 10; i++) {
    listings.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://example.com/details-${i}`,
    });
  }

  const benchmarkMap = buildBenchmarks(listings);
  const testItem = {
    price: 120000,
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
    location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    url: 'https://example.com/details-test',
  };

  const report = generateReport(testItem, benchmarkMap);
  assert.ok(report.evaluable);
  assert.ok(report.benchmark_details, 'should have benchmark_details');
  assert.ok(typeof report.benchmark_details.comparables_count === 'number');
  assert.ok(report.benchmark_details.price_sqm_range);
  assert.ok(typeof report.benchmark_details.price_sqm_range.min === 'number');
  assert.ok(typeof report.benchmark_details.price_sqm_range.max === 'number');
  assert.ok(typeof report.benchmark_details.fallback_used === 'boolean');
  console.log(`    benchmark_details: ${report.benchmark_details.comparables_count} comparables, range ${report.benchmark_details.price_sqm_range.min}-${report.benchmark_details.price_sqm_range.max}`);

  console.log('    all passed\n');
}

// ─── Bathroom extraction ───

{
  console.log('  bathroom extraction');

  const { extractBathroomsFromFeatures } = require('../src/integration/dataCleaner');

  assert.strictEqual(extractBathroomsFromFeatures(['Casas de Banho: 2', 'Garagem']), 2);
  assert.strictEqual(extractBathroomsFromFeatures(['Casa de Banho: 1']), 1);
  assert.strictEqual(extractBathroomsFromFeatures(['WC: 3']), 3);
  assert.strictEqual(extractBathroomsFromFeatures(['2 casas de banho']), 2);
  assert.strictEqual(extractBathroomsFromFeatures(['Garagem', 'Piscina']), null);
  assert.strictEqual(extractBathroomsFromFeatures([]), null);
  assert.strictEqual(extractBathroomsFromFeatures(null), null);
  console.log('    pattern matching');

  // Full cleanItem integration
  const { cleanItem } = require('../src/integration/dataCleaner');
  const item = cleanItem({
    url: 'https://www.olx.pt/d/anuncio/test',
    price: '150000',
    property: { type: 'apartamento', area_useful: '80' },
    location: { district: 'Porto' },
    features: ['Casas de Banho: 2', 'Certificado Energetico: B'],
  }, 'olx');
  assert.strictEqual(item.property.bathrooms, 2);
  console.log('    integrated in cleanItem');

  console.log('    all passed\n');
}

// ─── analyzeBatchWithCache ───

{
  console.log('  analyzeBatchWithCache');

  const { analyzeBatchWithCache } = require('../src/services/valuation');

  // Mock cache dependencies
  let savedState = null;
  const mockDeps = {
    withBenchmarkCacheLock: async (configId, fn) => {
      const state = { version: 1, updated_at: null, listings: {} };
      const result = await fn(state);
      savedState = state;
      return result;
    },
  };

  const items = [];
  for (let i = 0; i < 8; i++) {
    items.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80, condition: 'usado' },
      location: { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
      url: `https://www.olx.pt/d/anuncio/cache-${i}`,
      source: 'olx',
    });
  }

  analyzeBatchWithCache('test-config', items, mockDeps).then(result => {
    assert.ok(result.reports.length === 8, 'should have 8 reports');
    assert.ok(result.stats.evaluated > 0, 'should have evaluated items');
    assert.ok(result.stats.cache, 'should have cache meta');
    assert.ok(result.stats.cache.cacheSize > 0, 'cache should have entries');
    assert.ok(savedState !== null, 'state should have been saved');
    console.log(`    cache: ${result.stats.cache.cacheSize} entries, ${result.stats.cache.newInCache} new`);
    console.log('    all passed\n');
  }).catch(err => {
    console.error(`  FAIL  analyzeBatchWithCache: ${err.message}`);
    process.exitCode = 1;
  });
}

console.log('  All valuation tests passed\n');
