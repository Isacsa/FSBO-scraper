const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { calculatePricePerSqm } = require('../src/services/valuation/pricePerSqm');
const { median, percentile, removeOutliers, calculateStats, buildBenchmarks, lookupBenchmark, getConfidence } = require('../src/services/valuation/zoneBenchmarks');
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

  // Confidence levels
  assert.strictEqual(getConfidence(20), 'high');
  assert.strictEqual(getConfidence(15), 'high');
  assert.strictEqual(getConfidence(12), 'medium');
  assert.strictEqual(getConfidence(10), 'medium');
  assert.strictEqual(getConfidence(7), 'low');
  assert.strictEqual(getConfidence(5), 'low');
  assert.strictEqual(getConfidence(3), 'insufficient');
  console.log('    confidence levels');

  // calculateStats needs >= MIN_COMPARABLES after outlier removal
  const tooFew = [100, 200, 300];
  assert.strictEqual(calculateStats(tooFew), null);
  console.log('    too few for stats');

  const enough = [1000, 1100, 1200, 1300, 1400, 1500, 1600];
  const stats = calculateStats(enough);
  assert.ok(stats !== null);
  assert.strictEqual(stats.median, 1300);
  assert.strictEqual(stats.count, 7);
  console.log('    valid stats');

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

  // Exact lookup
  const b1 = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Cedofeita' },
    'apartamento', 'T2', map,
  );
  assert.ok(b1 !== null, 'should find exact benchmark');
  assert.strictEqual(b1.level, 'freguesia+tipo+tipologia');
  console.log('    exact lookup');

  // Fallback: different parish same municipality
  const b2 = lookupBenchmark(
    { district: 'Porto', municipality: 'Porto', parish: 'Bonfim' },
    'apartamento', 'T2', map,
  );
  assert.ok(b2 !== null, 'should fallback to concelho level');
  assert.ok(b2.level.startsWith('concelho'), `expected concelho fallback, got ${b2.level}`);
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

  // 4 items → should NOT produce a benchmark (below MIN_COMPARABLES)
  const fourItems = [];
  for (let i = 0; i < 4; i++) {
    fourItems.push({
      price: 100000 + i * 10000,
      property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
      location: { district: 'Faro', municipality: 'Faro', parish: 'Se' },
      url: `https://example.com/four-${i}`,
    });
  }
  const fourBench = buildBenchmarks(fourItems);
  const fourLookup = lookupBenchmark(
    { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    'apartamento', 'T2', fourBench
  );
  assert.strictEqual(fourLookup, null, '4 items should produce no benchmark');
  console.log(`    4 items -> no benchmark (MIN_COMPARABLES=${MIN_COMPARABLES})`);

  // 5 items → should produce a benchmark
  const fiveItems = [...fourItems, {
    price: 150000,
    property: { type: 'apartamento', tipology: 'T2', area_useful: 80 },
    location: { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    url: 'https://example.com/five-4',
  }];
  const fiveBench = buildBenchmarks(fiveItems);
  const fiveLookup = lookupBenchmark(
    { district: 'Faro', municipality: 'Faro', parish: 'Se' },
    'apartamento', 'T2', fiveBench
  );
  assert.ok(fiveLookup !== null, '5 items should produce a benchmark');
  console.log(`    5 items -> benchmark exists (median: ${fiveLookup.stats.median})`);

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

console.log('  All valuation tests passed\n');
