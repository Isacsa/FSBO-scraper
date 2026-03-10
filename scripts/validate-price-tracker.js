#!/usr/bin/env node

/**
 * Local validation script for the price-tracker pipeline.
 * Follows the same pattern as validate-integration.js but for price tracking.
 *
 * Usage:
 *   # First run — populates state (0 drops expected)
 *   node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/..."
 *
 *   # Second run (later) — detects price changes
 *   node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/..."
 *
 *   # Simulate a 20% drop for immediate testing
 *   node scripts/validate-price-tracker.js --platform=olx --url="..." --simulate-drop=0.20
 *
 *   # Custom threshold
 *   node scripts/validate-price-tracker.js --platform=olx --url="..." --drop-threshold=0.10
 *
 *   # View current state
 *   node scripts/validate-price-tracker.js --show-state
 *
 *   # More ads (default: 5)
 *   node scripts/validate-price-tracker.js --platform=olx --url="..." --max-ads=10
 *
 * Options:
 *   --platform=<name>        Portal to scrape (required unless --show-state)
 *   --url=<url>              Listing URL (required unless --show-state)
 *   --max-ads=<n>            Max ads to scrape (default: 5)
 *   --drop-threshold=<n>     Drop detection threshold (default: 0.15)
 *   --simulate-drop=<pct>    After scraping, inflate first_seen_price to simulate a drop
 *   --show-state             Show current state files and exit
 *   --raw                    Also output raw scraper data
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const fs = require('fs');
const crypto = require('crypto');

const { runPlatform } = require('../src/core/runPlatform');
const { cleanItem } = require('../src/integration/dataCleaner');
const { dedupeListInMemory } = require('../pipeline/deduplicate');
const { filterSalesOnly } = require('../src/price-tracker/salesFilter');
const { loadPriceState, upsertListings, savePriceState, pruneStale, PRICE_HISTORY_DIR } = require('../src/price-tracker/priceStore');
const { detectDrops } = require('../src/price-tracker/priceComparator');
const { build: buildPriceDropPayload } = require('../src/price-tracker/toPriceDropPayload');

const args = process.argv.slice(2);

function getArg(name) {
  const flag = args.find(a => a.startsWith(`--${name}=`));
  return flag ? flag.split('=').slice(1).join('=') : null;
}

const PLATFORM = getArg('platform');
const URL = getArg('url');
const MAX_ADS = parseInt(getArg('max-ads') || '5', 10);
const DROP_THRESHOLD = parseFloat(getArg('drop-threshold') || '0.15');
const SIMULATE_DROP = getArg('simulate-drop') ? parseFloat(getArg('simulate-drop')) : null;
const SHOW_STATE = args.includes('--show-state');
const SHOW_RAW = args.includes('--raw');

// Use a fixed config ID based on platform+url for consistent state across runs
const CONFIG_ID = PLATFORM && URL
  ? crypto.createHash('md5').update(`${PLATFORM}:${URL}`).digest('hex').slice(0, 8) + '-validate'
  : null;

function log(msg) {
  process.stderr.write(`[price-tracker-validate] ${msg}\n`);
}

function showState() {
  if (!fs.existsSync(PRICE_HISTORY_DIR)) {
    log(`No state directory found at ${PRICE_HISTORY_DIR}`);
    return;
  }

  const files = fs.readdirSync(PRICE_HISTORY_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    log('No state files found.');
    return;
  }

  log(`Found ${files.length} state file(s) in ${PRICE_HISTORY_DIR}:`);
  log('');

  for (const file of files) {
    const filePath = path.join(PRICE_HISTORY_DIR, file);
    try {
      const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const listingCount = Object.keys(state.listings || {}).length;
      const updatedAt = state.updated_at || 'never';

      log(`  ${file}`);
      log(`    Listings: ${listingCount}`);
      log(`    Last updated: ${updatedAt}`);

      if (listingCount > 0) {
        const entries = Object.values(state.listings);
        const prices = entries.map(e => e.current_price).filter(Boolean);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const sources = [...new Set(entries.map(e => e.source).filter(Boolean))];

        log(`    Price range: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`);
        log(`    Sources: ${sources.join(', ')}`);

        // Show entries with price changes
        const withChanges = entries.filter(e => e.price_history && e.price_history.length > 1);
        if (withChanges.length > 0) {
          log(`    Entries with price changes: ${withChanges.length}`);
        }
      }

      log('');
    } catch {
      log(`  ${file} — could not parse`);
    }
  }
}

function simulateDrop(state, dropPercent) {
  let modified = 0;

  for (const entry of Object.values(state.listings)) {
    if (!entry.current_price || entry.current_price <= 0) continue;

    // Inflate first_seen_price so that the "drop" from first to current is >= dropPercent
    // new_first = current / (1 - dropPercent)
    const inflatedFirst = Math.round(entry.current_price / (1 - dropPercent));
    entry.first_seen_price = inflatedFirst;

    // Ensure price_history has at least 2 entries (required by detectDrops)
    if (!entry.price_history || entry.price_history.length < 2) {
      const originalEntry = { price: inflatedFirst, seen_at: entry.first_seen_at };
      const currentEntry = entry.price_history?.[0] || { price: entry.current_price, seen_at: entry.last_seen_at };
      entry.price_history = [originalEntry, currentEntry];
    } else {
      // Update the first entry in history to match inflated price
      entry.price_history[0].price = inflatedFirst;
    }

    modified++;
  }

  return modified;
}

async function main() {
  if (SHOW_STATE) {
    showState();
    return;
  }

  if (!PLATFORM || !URL) {
    process.stderr.write(
      'Usage: node scripts/validate-price-tracker.js --platform=olx --url="https://..."\n' +
      '       node scripts/validate-price-tracker.js --show-state\n\n' +
      'Supported platforms: olx, custojusto, imovirtual, casasapo, idealista\n\n' +
      'Options:\n' +
      '  --max-ads=<n>          Max ads to scrape (default: 5)\n' +
      '  --drop-threshold=<n>   Detection threshold (default: 0.15 = 15%)\n' +
      '  --simulate-drop=<pct>  Simulate a drop (e.g. 0.20 = 20%)\n' +
      '  --show-state           Show current state files\n' +
      '  --raw                  Show raw scraper output\n'
    );
    process.exit(1);
  }

  const now = new Date().toISOString();

  // ─── Step 1: Scrape ───
  log(`Scraping ${PLATFORM} from ${URL} (max ${MAX_ADS} ads)...`);

  const startMs = Date.now();
  const { results } = await runPlatform({
    platform: PLATFORM,
    url: URL,
    options: {
      maxPages: 2,
      maxAds: MAX_ADS,
      maxWait: null,
      headless: true,
      filterAgencies: false,
      filterPrivateOnly: false,
    },
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
    log('--- RAW SCRAPER OUTPUT ---');
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    log('--- END RAW ---');
  }

  // ─── Step 2: Clean + dedupe + filter ───
  const cleaned = results.map(i => cleanItem(i, PLATFORM));
  log(`Cleaned ${cleaned.length} items`);

  const { unique: deduped, duplicates } = dedupeListInMemory(cleaned);
  log(`After dedupe: ${deduped.length} unique, ${duplicates?.length || 0} removed`);

  const salesOnly = filterSalesOnly(deduped, PLATFORM);
  log(`After sales filter: ${salesOnly.length} sales listings (${deduped.length - salesOnly.length} filtered)`);

  if (salesOnly.length === 0) {
    log('No sale listings found after filtering.');
    process.exit(1);
  }

  // ─── Step 3: Load/create state ───
  log(`Using state file: ${CONFIG_ID}.json`);
  const state = loadPriceState(CONFIG_ID);
  const existingCount = Object.keys(state.listings).length;

  if (existingCount > 0) {
    log(`Loaded existing state with ${existingCount} tracked listings`);
  } else {
    log('No existing state — this is the first run for this URL');
  }

  // ─── Step 4: Upsert ───
  const { newCount, priceChanged } = upsertListings(state, salesOnly, now);
  const prunedCount = pruneStale(state, 90);

  log('');
  log('=== UPSERT RESULTS ===');
  log(`  New listings:      ${newCount}`);
  log(`  Price changes:     ${priceChanged}`);
  log(`  Pruned (stale):    ${prunedCount}`);
  log(`  Total tracked:     ${Object.keys(state.listings).length}`);

  // ─── Step 5: Simulate drop (optional) ───
  if (SIMULATE_DROP !== null && SIMULATE_DROP > 0) {
    log('');
    log(`--- SIMULATING ${(SIMULATE_DROP * 100).toFixed(0)}% DROP ---`);
    const modified = simulateDrop(state, SIMULATE_DROP);
    log(`Modified ${modified} listings to simulate drop`);
  }

  // ─── Step 6: Detect drops ───
  const drops = detectDrops(state, DROP_THRESHOLD);

  log('');
  log('=== DROP DETECTION ===');
  log(`  Threshold:         ${(DROP_THRESHOLD * 100).toFixed(0)}%`);
  log(`  Drops detected:    ${drops.length}`);

  if (drops.length > 0) {
    log('');
    log('--- PRICE DROPS ---');
    for (const drop of drops) {
      const { metrics, entry } = drop;
      log(`  ${entry.title || drop.canonical_url}`);
      log(`    ${metrics.firstPrice.toLocaleString()} -> ${metrics.currentPrice.toLocaleString()} (-${metrics.dropPercent.toFixed(1)}%, -${metrics.dropAbsolute.toLocaleString()})`);
      log(`    Days tracked: ${metrics.daysSinceFirst}`);
      log(`    URL: ${drop.canonical_url}`);
      log('');
    }

    // Build payload for inspection
    const payload = buildPriceDropPayload({
      runId: crypto.randomUUID(),
      configId: CONFIG_ID,
      source: PLATFORM,
      areaLabel: 'validation-test',
      drops,
      durationMs,
      now,
      meta: {
        total_tracked: Object.keys(state.listings).length,
        total_scraped_this_run: results.length,
        new_listings: newCount,
        price_changes: priceChanged,
        drops_detected: drops.length,
        simulated: SIMULATE_DROP !== null,
      },
    });

    log('--- PRICE DROP PAYLOAD ---');
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (existingCount === 0) {
    log('');
    log('First run complete. State populated with initial prices.');
    log('Run again later (or with --simulate-drop) to detect price changes.');
  } else {
    log('');
    log('No drops detected above threshold.');
    log(`Tip: Use --simulate-drop=0.20 to test with simulated 20% drops.`);
  }

  // ─── Step 7: Save state ───
  await savePriceState(CONFIG_ID, state);
  log(`State saved to data/price-history/${CONFIG_ID}.json`);

  log('');
  log('Done.');
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  if (err.stack) log(err.stack);
  process.exit(1);
});
