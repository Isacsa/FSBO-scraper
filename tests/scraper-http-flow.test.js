const assert = require('assert');

const { pullConfigs } = require('../src/integration/pullConfigs');
const { pushBatch } = require('../src/integration/pushBatch');

console.log('\nScraper HTTP flow tests');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

(async () => {
  await runTest('pullConfigs sends auth headers and returns configs', async () => {
    let capturedUrl = null;
    let capturedOptions = null;

    const configs = await pullConfigs({
      apiUrl: 'https://app.example.com/',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      timeout: 4321,
      httpClient: {
        async get(url, options) {
          capturedUrl = url;
          capturedOptions = options;
          return {
            data: {
              configs: [{ id: 'cfg-1' }],
            },
          };
        },
      },
    });

    assert.equal(capturedUrl, 'https://app.example.com/api/scraper/configs');
    assert.equal(capturedOptions.headers.Authorization, 'Bearer secret-key');
    assert.equal(capturedOptions.headers['X-Tenant-Id'], 'tenant-123');
    assert.equal(capturedOptions.params.active_only, true);
    assert.equal(capturedOptions.timeout, 4321);
    assert.deepEqual(configs, [{ id: 'cfg-1' }]);
  });

  await runTest('pullConfigs rejects unexpected response shapes', async () => {
    await assert.rejects(
      () =>
        pullConfigs({
          apiUrl: 'https://app.example.com',
          apiKey: 'secret-key',
          tenantId: 'tenant-123',
          httpClient: {
            async get() {
              return { data: { ok: true } };
            },
          },
        }),
      /Unexpected response/
    );
  });

  await runTest('pushBatch sends ingest headers and succeeds on first attempt', async () => {
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedOptions = null;

    const payload = { run_id: 'run-1', items: [{ id: 1 }] };
    const result = await pushBatch(payload, {
      apiUrl: 'https://app.example.com/',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      httpClient: {
        async post(url, body, options) {
          capturedUrl = url;
          capturedPayload = body;
          capturedOptions = options;
          return { status: 200, data: { accepted: true }, headers: {} };
        },
      },
      sleepFn: async () => {
        throw new Error('sleep should not be called');
      },
    });

    assert.equal(capturedUrl, 'https://app.example.com/api/scraper/ingest');
    assert.equal(capturedPayload, payload);
    assert.equal(capturedOptions.headers.Authorization, 'Bearer secret-key');
    assert.equal(capturedOptions.headers['X-Tenant-Id'], 'tenant-123');
    assert.equal(capturedOptions.headers['X-Idempotency-Key'], 'run-1');
    assert.equal(result.accepted, true);
  });

  await runTest('pushBatch treats 409 replay as idempotent success', async () => {
    const logs = [];
    const response = await pushBatch({ run_id: 'run-409', items: [] }, {
      apiUrl: 'https://app.example.com',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      logger: (msg) => logs.push(msg),
      httpClient: {
        async post() {
          return {
            status: 409,
            data: { replay: true, run_id: 'run-409' },
            headers: {},
          };
        },
      },
    });

    assert.equal(response.replay, true);
    assert.ok(logs.some((msg) => msg.includes('already processed')));
  });

  await runTest('pushBatch respects Retry-After on 429 and retries', async () => {
    const sleepCalls = [];
    let attempts = 0;

    const response = await pushBatch({ run_id: 'run-429', items: [] }, {
      apiUrl: 'https://app.example.com',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      httpClient: {
        async post() {
          attempts++;
          if (attempts === 1) {
            return {
              status: 429,
              data: { error: 'rate_limited' },
              headers: { 'retry-after': '7' },
            };
          }
          return {
            status: 200,
            data: { attempts },
            headers: {},
          };
        },
      },
      sleepFn: async (ms) => sleepCalls.push(ms),
    });

    assert.equal(attempts, 2);
    assert.deepEqual(sleepCalls, [7000]);
    assert.equal(response.attempts, 2);
  });

  await runTest('pushBatch retries 5xx responses with backoff', async () => {
    const sleepCalls = [];
    let attempts = 0;

    const response = await pushBatch({ run_id: 'run-500', items: [] }, {
      apiUrl: 'https://app.example.com',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      httpClient: {
        async post() {
          attempts++;
          if (attempts === 1) {
            return {
              status: 503,
              data: { error: 'temporary' },
              headers: {},
            };
          }
          return {
            status: 200,
            data: { recovered: true },
            headers: {},
          };
        },
      },
      sleepFn: async (ms) => sleepCalls.push(ms),
    });

    assert.equal(attempts, 2);
    assert.deepEqual(sleepCalls, [5000]);
    assert.equal(response.recovered, true);
  });

  await runTest('pushBatch retries network timeouts with backoff', async () => {
    const sleepCalls = [];
    let attempts = 0;

    const response = await pushBatch({ run_id: 'run-timeout', items: [] }, {
      apiUrl: 'https://app.example.com',
      apiKey: 'secret-key',
      tenantId: 'tenant-123',
      httpClient: {
        async post() {
          attempts++;
          if (attempts === 1) {
            const error = new Error('socket timed out');
            error.code = 'ECONNABORTED';
            throw error;
          }
          return {
            status: 200,
            data: { recovered: true },
            headers: {},
          };
        },
      },
      sleepFn: async (ms) => sleepCalls.push(ms),
    });

    assert.equal(attempts, 2);
    assert.deepEqual(sleepCalls, [5000]);
    assert.equal(response.recovered, true);
  });

  await runTest('pushBatch fails fast on invalid 4xx responses', async () => {
    const sleepCalls = [];

    await assert.rejects(
      () =>
        pushBatch({ run_id: 'run-400', items: [] }, {
          apiUrl: 'https://app.example.com',
          apiKey: 'secret-key',
          tenantId: 'tenant-123',
          httpClient: {
            async post() {
              return {
                status: 400,
                data: { error: 'bad_request' },
                headers: {},
              };
            },
          },
          sleepFn: async (ms) => sleepCalls.push(ms),
        }),
      /Client error 400/
    );

    assert.deepEqual(sleepCalls, []);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
