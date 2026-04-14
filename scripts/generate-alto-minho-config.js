#!/usr/bin/env node

/**
 * Generates APP API config JSON for the Alto Minho region.
 *
 * Usage:
 *   node scripts/generate-alto-minho-config.js
 *   node scripts/generate-alto-minho-config.js --no-border    # exclude border concelhos
 *   node scripts/generate-alto-minho-config.js --flat          # flat URL list instead of config
 */

const { generateAltoMinhoSources, ALTO_MINHO_CONCELHOS, BORDER_CONCELHOS } = require('../src/utils/altoMinhoUrls');

const args = process.argv.slice(2);
const includeBorder = !args.includes('--no-border');
const flat = args.includes('--flat');

const sources = generateAltoMinhoSources({ includeBorder });

if (flat) {
  // Print a flat list of all URLs grouped by platform
  for (const [platform, urls] of Object.entries(sources)) {
    console.log(`\n# ${platform} (${urls.length} URLs)`);
    for (const url of urls) {
      console.log(url);
    }
  }

  const total = Object.values(sources).reduce((sum, urls) => sum + urls.length, 0);
  console.log(`\n# Total: ${total} URLs across ${Object.keys(sources).length} platforms`);
} else {
  // Print as APP API config JSON
  const config = {
    area_label: 'Alto Minho' + (includeBorder ? ' + Limítrofes' : ''),
    sources,
    options: {
      maxPages: 10,
      maxAds: 60,
    },
    _coverage: {
      alto_minho_concelhos: ALTO_MINHO_CONCELHOS,
      border_concelhos: includeBorder ? BORDER_CONCELHOS : [],
    },
  };

  console.log(JSON.stringify(config, null, 2));
}
