#!/usr/bin/env node

/**
 * CLI: Analyze property valuations from scraped data.
 *
 * Usage:
 *   node scripts/analyze-valuations.js --input=data/output_olx_viana_new.json
 *   node scripts/analyze-valuations.js --input=data/output_olx_viana_new.json --min-score=7
 *   node scripts/analyze-valuations.js --input=data/output_olx_viana_new.json --format=text
 *   node scripts/analyze-valuations.js --input=file1.json,file2.json  # cross-portal
 *   node scripts/analyze-valuations.js --input=data/output_olx_viana_new.json --dry-run
 */

const fs = require('fs');
const path = require('path');
const { cleanItem } = require('../src/integration/dataCleaner');
const { analyzeBatch, analyzeBatchWithDiagnostics } = require('../src/services/valuation');

function parseArgs(argv = process.argv.slice(2)) {
  return {
    input: (() => {
      const flag = argv.find(a => a.startsWith('--input='));
      return flag ? flag.split('=').slice(1).join('=') : null;
    })(),
    minScore: (() => {
      const flag = argv.find(a => a.startsWith('--min-score='));
      return flag ? parseFloat(flag.split('=')[1]) : null;
    })(),
    format: (() => {
      const flag = argv.find(a => a.startsWith('--format='));
      return flag ? flag.split('=')[1] : 'json';
    })(),
    district: (() => {
      const flag = argv.find(a => a.startsWith('--district='));
      return flag ? flag.split('=').slice(1).join('=') : null;
    })(),
    dryRun: argv.includes('--dry-run'),
    diagnostics: argv.includes('--diagnostics'),
  };
}

function loadListings(inputPaths) {
  const files = inputPaths.split(',').map(f => f.trim());
  const allItems = [];

  for (const file of files) {
    const resolved = path.resolve(file);
    if (!fs.existsSync(resolved)) {
      console.error(`[ERRO] Ficheiro nao encontrado: ${resolved}`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const items = raw.results || raw.items || (Array.isArray(raw) ? raw : []);
    const source = raw.platform || detectSourceFromPath(file);

    for (const item of items) {
      allItems.push(cleanItem(item, source));
    }

    console.error(`[INFO] Carregados ${items.length} items de ${path.basename(file)} (${source})`);
  }

  return allItems;
}

function detectSourceFromPath(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (name.includes('olx')) return 'olx';
  if (name.includes('imovirtual')) return 'imovirtual';
  if (name.includes('custojusto')) return 'custojusto';
  if (name.includes('casasapo')) return 'casasapo';
  if (name.includes('idealista')) return 'idealista';
  return 'unknown';
}

function formatText(result) {
  const { reports, stats } = result;
  const lines = [];

  lines.push('='.repeat(70));
  lines.push('  RELATORIO DE AVALIACAO IMOBILIARIA');
  lines.push('='.repeat(70));
  lines.push('');
  lines.push(`Total: ${stats.total} | Avaliados: ${stats.evaluated} | Oportunidades: ${stats.opportunities} | Zonas: ${stats.benchmark_zones}`);
  lines.push('');

  for (const report of reports) {
    if (!report.evaluable) continue;

    const s = report.summary;
    const p = report.property;
    lines.push('-'.repeat(70));
    lines.push(`  ${s.score}/10 - ${s.verdict}`);
    lines.push(`  ${p.title || 'Sem titulo'}`);
    lines.push(`  ${p.location}`);
    lines.push(`  Preco: ${p.price ? p.price.toLocaleString('pt-PT') + ' EUR' : 'N/A'} | Area: ${p.area || 'N/A'} m2 | ${p.tipology || ''} ${p.type || ''}`);
    lines.push('');
    lines.push(`  Preco/m2: ${s.price_per_sqm} EUR | Benchmark: ${s.benchmark_price_per_sqm} EUR | Desvio: ${s.deviation_pct >= 0 ? '+' : ''}${s.deviation_pct}%`);

    if (report.analysis.adjustments.length > 0) {
      lines.push(`  Ajustes: ${report.analysis.adjustments.join(', ')}`);
    }

    if (report.reasons.length > 0) {
      lines.push(`  Razoes: ${report.reasons.join(' | ')}`);
    }

    lines.push(`  Confianca: ${report.confidence} | Nivel: ${report.benchmark_level}`);
    if (p.url) lines.push(`  URL: ${p.url}`);
    lines.push('');
  }

  // Non-evaluable summary
  const nonEval = reports.filter(r => !r.evaluable);
  if (nonEval.length > 0) {
    lines.push('-'.repeat(70));
    lines.push(`  ${nonEval.length} imoveis nao avaliados (sem area/preco ou sem benchmark)`);
  }

  lines.push('='.repeat(70));
  return lines.join('\n');
}

function formatDiagnostics(diag) {
  console.error('\n' + '='.repeat(70));
  console.error('  DIAGNOSTICOS');
  console.error('='.repeat(70));

  console.error('\n  Grupos zona+tipo+tipologia:');
  for (const [group, count] of Object.entries(diag.group_counts)) {
    const marker = count < 5 ? ' [INSUFICIENTE]' : '';
    console.error(`    ${count.toString().padStart(3)} items  ${group}${marker}`);
  }

  console.error('\n  Nivel de fallback usado:');
  for (const [level, count] of Object.entries(diag.fallback_levels)) {
    console.error(`    ${count.toString().padStart(3)} items  ${level}`);
  }

  console.error('\n  Distribuicao de scores:');
  for (const [band, count] of Object.entries(diag.score_distribution)) {
    const bar = '#'.repeat(count);
    console.error(`    ${band.padStart(4)}: ${count.toString().padStart(3)} ${bar}`);
  }

  console.error('\n  Confianca:');
  for (const [level, count] of Object.entries(diag.confidence_counts)) {
    if (count > 0) console.error(`    ${level.padStart(12)}: ${count}`);
  }

  if (diag.warnings.length > 0) {
    console.error('\n  Warnings:');
    for (const w of diag.warnings) {
      console.error(`    ! ${w}`);
    }
  }

  console.error('='.repeat(70) + '\n');
}

function main() {
  const args = parseArgs();

  if (!args.input) {
    console.error('Uso: node scripts/analyze-valuations.js --input=<ficheiro.json> [--min-score=N] [--format=json|text] [--district=X]');
    process.exit(1);
  }

  const items = loadListings(args.input);
  if (items.length === 0) {
    console.error('[ERRO] Nenhum item carregado.');
    process.exit(1);
  }

  // Filter by district if specified
  const filtered = args.district
    ? items.filter(i => (i.location?.district || '').toLowerCase() === args.district.toLowerCase())
    : items;

  console.error(`[INFO] A analisar ${filtered.length} items...`);

  const result = args.diagnostics
    ? analyzeBatchWithDiagnostics(filtered)
    : analyzeBatch(filtered);

  // Filter by min score if specified
  if (args.minScore !== null) {
    result.reports = result.reports.filter(r =>
      r.evaluable && r.summary.score >= args.minScore
    );
  }

  if (args.diagnostics && result.diagnostics) {
    formatDiagnostics(result.diagnostics);
  }

  if (args.dryRun) {
    console.error(`[DRY RUN] ${result.stats.evaluated} avaliados, ${result.stats.opportunities} oportunidades`);
    return;
  }

  if (args.format === 'text') {
    console.log(formatText(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, loadListings, formatText, main };
