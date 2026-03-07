/**
 * Push a scraper batch to the APP Fastify API with retries and backoff.
 * Stateless — no persistent state between runs.
 *
 * Retry policy:
 *   3 attempts, backoff 5s → 15s → 45s
 *   Retry on: 5xx, timeout, network error
 *   No retry on: 4xx (except 429)
 *   429: respect Retry-After header
 */

const axios = require('axios');

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MULTIPLIER = 3;
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Push an ingest payload to the APP Fastify API.
 *
 * @param {Object} payload - full ingest payload (from buildIngestPayload)
 * @param {Object} options
 * @param {string} options.apiUrl - base URL (e.g. "https://api.app.com")
 * @param {string} options.apiKey - scraper API key
 * @param {string} options.tenantId - tenant UUID
 * @param {number} [options.maxRetries=3]
 * @param {Function} [options.logger] - log function (default: console.error)
 * @returns {Promise<Object>} API response data
 * @throws {Error} after all retries exhausted
 */
async function pushBatch(payload, {
  apiUrl,
  apiKey,
  tenantId,
  maxRetries = DEFAULT_RETRIES,
  logger = console.error,
  httpClient = axios,
  sleepFn = sleep,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/scraper/ingest`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-Tenant-Id': tenantId,
    'X-Idempotency-Key': payload.run_id,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await httpClient.post(url, payload, {
        headers,
        timeout: requestTimeoutMs,
        maxContentLength: 10 * 1024 * 1024,
        validateStatus: () => true,
      });

      const { status, data } = response;

      // Success
      if (status >= 200 && status < 300) {
        return data;
      }

      // Idempotency replay — not an error
      if (status === 409) {
        logger(`[pushBatch] Run ${payload.run_id} already processed (409). Skipping.`);
        return data;
      }

      // Rate limited
      if (status === 429) {
        const retryAfter = parseInt(response.headers['retry-after'] || '30', 10);
        logger(`[pushBatch] Rate limited (429). Waiting ${retryAfter}s before retry.`);
        await sleepFn(retryAfter * 1000);
        continue;
      }

      // Client error (4xx except 429) — don't retry
      if (status >= 400 && status < 500) {
        const errMsg = `[pushBatch] Client error ${status}: ${JSON.stringify(data)}`;
        logger(errMsg);
        throw new Error(errMsg);
      }

      // Server error (5xx) — retry
      lastError = new Error(`[pushBatch] Server error ${status}: ${JSON.stringify(data)}`);
      logger(`[pushBatch] Attempt ${attempt}/${maxRetries} failed: ${status}. Retrying...`);
    } catch (err) {
      if (err.message?.startsWith('[pushBatch] Client error')) {
        throw err; // Don't retry client errors
      }
      lastError = err;
      const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ERR_NETWORK';

      if (isTimeout || isNetwork || err.response?.status >= 500) {
        logger(`[pushBatch] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying...`);
      } else {
        throw err;
      }
    }

    // Backoff before next attempt
    if (attempt < maxRetries) {
      const delay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
      await sleepFn(delay);
    }
  }

  throw lastError || new Error('[pushBatch] All retries exhausted');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { pushBatch };
