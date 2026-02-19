#!/usr/bin/env node

/**
 * Dry-run validation script: scrape → clean → build payload → validate
 * Does NOT push to the APP. Outputs the payload to stdout for inspection.
 *
 * Usage:
 *   node scripts/validate-integration.js --platform=olx --url="https://www.olx.pt/..."
 *   node scripts/validate-integration.js --platform=custojusto --url="https://..."
 *   node scripts/validate-integration.js --platform=imovirtual --url="https://..."
 *   node scripts/validate-integration.js --platform=casasapo --url="https://..."
 *
 * Options:
 *   --platform=<name>   Portal to scrape (required)
 *   --url=<url>         Listing URL to scrape (required)
 *   --max-ads=<n>       Max ads to scrape (default: 5)
 *   --raw               Also output raw scraper data for comparison
 */

const crypto = require('crypto');
const { runPlatform } = require('../src/core/runPlatform');
const { buildIngestPayload } = require('../src/integration/toIngestPayload');
const { deduplicate } = require('../pipeline/deduplicate');

const args = process.argv.slice(2);

function getArg(name) {
  const flag = args.find(a => a.startsWith(`--${name}=`));
  return flag ? flag.split('=').slice(1).join('=') : null;
}

const PLATFORM = getArg('platform');
const URL = getArg('url');
const MAX_ADS = parseInt(getArg('max-ads') || '5', 10);
const SHOW_RAW = args.includes('--raw');

function log(msg) {
  process.stderr.write(`[validate] ${msg}\n`);
}

async function main() {
  if (!PLATFORM || !URL) {
    process.stderr.write(`Usage: node scripts/validate-integration.js --platform=olx --url="https://..."\n`);
    process.stderr.write(`Supported platforms: olx, custojusto, imovirtual, casasapo, idealista\n`);
    process.exit(1);
  }

  log(`Scraping ${PLATFORM} from ${URL} (max ${MAX_ADS} ads)...`);

  const startMs = Date.now();
  const { results } = await runPlatform({
    platform: PLATFORM,
    url: URL,
    options: { maxPages: 2, maxAds: MAX_ADS, headless: true },
    outputShape: 'cli',
    normalize: true,
  });

  const durationMs = Date.now() - startMs;
  log(`Scraped ${results.length} items in ${durationMs}ms`);

  if (results.length === 0) {
    log('No items scraped. Check URL and selectors.');
    process.exit(1);
  }

  if (SHOW_RAW) {
    log('─── RAW SCRAPER OUTPUT ───');
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    log('─── END RAW ───');
  }

  // Dedupe
  const { unique: deduped, duplicates } = deduplicate(results);
  log(`After dedupe: ${deduped.length} unique, ${duplicates?.length || 0} removed`);

  // Build payload
  const payload = buildIngestPayload({
    runId: crypto.randomUUID(),
    configId: '00000000-0000-0000-0000-000000000000',
    source: PLATFORM,
    areaQuery: 'validation-test',
    rawItems: deduped,
    durationMs,
    dedupeRemovedLocal: duplicates?.length || 0,
  });

  log('─── INGEST PAYLOAD ───');
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');

  // Validate payload structure
  const issues = validatePayload(payload);
  if (issues.length > 0) {
    log('─── VALIDATION ISSUES ───');
    for (const issue of issues) {
      log(`  ⚠ ${issue}`);
    }
  } else {
    log('Payload structure is valid.');
  }

  log(`Done. ${payload.items.length} items ready for ingest.`);
}

function validatePayload(payload) {
  const issues = [];

  if (!payload.run_id) issues.push('Missing run_id');
  if (!payload.config_id) issues.push('Missing config_id');
  if (!payload.source) issues.push('Missing source');
  if (!payload.scraped_at) issues.push('Missing scraped_at');
  if (!Array.isArray(payload.items)) issues.push('items is not an array');

  for (let i = 0; i < (payload.items || []).length; i++) {
    const item = payload.items[i];
    if (!item.canonical_url) {
      issues.push(`items[${i}]: missing canonical_url`);
    }
    if (item.price !== null && typeof item.price !== 'number') {
      issues.push(`items[${i}]: price should be number or null, got ${typeof item.price}`);
    }
    if (item.location?.lat !== null && typeof item.location?.lat !== 'number') {
      issues.push(`items[${i}]: location.lat should be number or null`);
    }
    if (item.property?.area_useful !== null && typeof item.property?.area_useful !== 'number') {
      issues.push(`items[${i}]: property.area_useful should be number or null`);
    }
  }

  return issues;
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  if (err.stack) log(err.stack);
  process.exit(1);
});
