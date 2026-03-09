const assert = require('assert');

const { main } = require('../scripts/scrape-and-push');

console.log('\nScrape-and-push orchestrator tests');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

function createWritableCapture() {
  const chunks = [];
  return {
    chunks,
    write(chunk) {
      chunks.push(String(chunk));
    },
    toString() {
      return chunks.join('');
    },
  };
}

function parseLogLines(stderrCapture) {
  return stderrCapture
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

(async () => {
  await runTest('main uses app configs, filters precision.accepted, and avoids push in dry-run', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    const exits = [];
    const calls = {
      pullConfigs: 0,
      runPlatform: 0,
      buildIngestPayload: 0,
      pushBatch: 0,
    };

    const acceptedItems = [
      { canonical_url: 'https://www.olx.pt/d/anuncio/apartamento-t2-ID123.html', title: 'Accepted item' },
    ];

    const result = await main({
      argv: ['--dry-run'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      now: new Date('2026-01-23T12:00:00.000Z').getTime(),
      stdout,
      stderr,
      exit: (code) => exits.push(code),
      deps: {
        randomUUID: () => 'run-123',
        async pullConfigs() {
          calls.pullConfigs++;
          return [
            {
              id: 'cfg-run',
              area_label: 'Viana do Castelo',
              last_run_at: '2026-01-01T00:00:00.000Z',
              schedule_interval_hours: 24,
              sources: {
                olx: 'https://www.olx.pt/imoveis/viana-do-castelo/',
              },
              options: {
                maxAds: 10,
              },
            },
            {
              id: 'cfg-skip',
              area_label: 'Skip me',
              last_run_at: '2026-01-23T10:00:00.000Z',
              schedule_interval_hours: 24,
              sources: {
                olx: 'https://www.olx.pt/imoveis/porto/',
              },
            },
          ];
        },
        async runPlatform() {
          calls.runPlatform++;
          return {
            results: [
              { id: 'raw-1', title: 'Candidate A' },
              { id: 'raw-2', title: 'Candidate B' },
            ],
          };
        },
        dedupeListInMemory(items) {
          return {
            unique: items,
            duplicates: [],
          };
        },
        applyPrecisionGate(items, platform) {
          assert.equal(platform, 'olx');
          assert.equal(items.length, 2);
          return {
            accepted: acceptedItems,
            rejected: [{ id: 'raw-2' }],
            uncertain: [],
            metrics: {
              accepted_for_push: 1,
              rejected_precision: 1,
              uncertain_blocked: 0,
            },
          };
        },
        buildIngestPayload(input) {
          calls.buildIngestPayload++;
          assert.deepEqual(input.rawItems, acceptedItems);
          assert.equal(input.totalScraped, 2);
          return {
            run_id: input.runId,
            source: input.source,
            items: input.rawItems,
          };
        },
        async pushBatch() {
          calls.pushBatch++;
          return { ok: true };
        },
      },
    });

    assert.deepEqual(exits, []);
    assert.equal(calls.pullConfigs, 1);
    assert.equal(calls.runPlatform, 1);
    assert.equal(calls.buildIngestPayload, 1);
    assert.equal(calls.pushBatch, 0);
    assert.equal(result.exitCode, 0);
    assert.equal(result.summary.configsProcessed, 1);
    assert.equal(result.summary.configsSkipped, 1);
    assert.equal(result.summary.totalItems, 1);

    const payload = JSON.parse(stdout.toString().trim());
    assert.equal(payload.items.length, 1);
    assert.equal(payload.run_id, 'run-123');

    const logs = parseLogLines(stderr);
    const scrapeLog = logs.find((entry) => entry.message.includes('Scraped 2 items'));
    assert.ok(scrapeLog);
    assert.equal(scrapeLog.accepted_for_push, 1);
    assert.equal(scrapeLog.rejected_precision, 1);
    assert.equal(scrapeLog.uncertain_blocked, 0);
  });

  await runTest('main pushes accepted payload in live mode', async () => {
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();
    const pushedPayloads = [];

    const result = await main({
      argv: ['--run-now', '--config-id=cfg-live'],
      env: {
        APP_API_URL: 'https://app.example.com',
        SCRAPER_API_KEY: 'secret-key',
        SCRAPER_TENANT_ID: 'tenant-123',
      },
      stdout,
      stderr,
      exit: () => {
        throw new Error('exit should not be called');
      },
      deps: {
        randomUUID: () => 'run-live',
        async pullConfigs() {
          return [
            {
              id: 'cfg-live',
              area_label: 'Live config',
              sources: {
                olx: 'https://www.olx.pt/imoveis/lisboa/',
              },
            },
          ];
        },
        async runPlatform() {
          return {
            results: [{ id: 'raw-live', title: 'Accepted live item' }],
          };
        },
        dedupeListInMemory(items) {
          return { unique: items, duplicates: [] };
        },
        applyPrecisionGate(items) {
          return {
            accepted: items,
            rejected: [],
            uncertain: [],
            metrics: {
              accepted_for_push: items.length,
              rejected_precision: 0,
              uncertain_blocked: 0,
            },
          };
        },
        buildIngestPayload(input) {
          return {
            run_id: input.runId,
            source: input.source,
            items: input.rawItems,
          };
        },
        async pushBatch(payload, options) {
          pushedPayloads.push({ payload, options });
          return { items_new: payload.items.length };
        },
      },
    });

    assert.equal(result.exitCode, 0);
    assert.equal(pushedPayloads.length, 1);
    assert.equal(pushedPayloads[0].payload.items.length, 1);
    assert.equal(pushedPayloads[0].options.apiUrl, 'https://app.example.com');
    assert.equal(pushedPayloads[0].options.apiKey, 'secret-key');
    assert.equal(pushedPayloads[0].options.tenantId, 'tenant-123');
    assert.equal(stdout.toString(), '');

    const logs = parseLogLines(stderr);
    assert.ok(logs.some((entry) => entry.message.includes('Pushed olx run successfully')));
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
