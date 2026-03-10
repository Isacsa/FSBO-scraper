/**
 * Push price-drop events to the APP Fastify API.
 *
 * Same retry/backoff policy as pushBatch but targets /api/scraper/price-drops.
 */

const axios = require('axios');

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MULTIPLIER = 3;
const REQUEST_TIMEOUT_MS = 30000;

async function pushPriceDrops(payload, {
  apiUrl,
  apiKey,
  tenantId,
  maxRetries = DEFAULT_RETRIES,
  logger = console.error,
  httpClient = axios,
  sleepFn = sleep,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
}) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/scraper/price-drops`;
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

      if (status >= 200 && status < 300) return data;

      if (status === 409) {
        logger(`[pushPriceDrops] Run ${payload.run_id} already processed (409). Skipping.`);
        return data;
      }

      if (status === 429) {
        const retryAfter = parseInt(response.headers['retry-after'] || '30', 10);
        logger(`[pushPriceDrops] Rate limited (429). Waiting ${retryAfter}s before retry.`);
        await sleepFn(retryAfter * 1000);
        continue;
      }

      if (status >= 400 && status < 500) {
        const errMsg = `[pushPriceDrops] Client error ${status}: ${JSON.stringify(data)}`;
        logger(errMsg);
        throw new Error(errMsg);
      }

      lastError = new Error(`[pushPriceDrops] Server error ${status}: ${JSON.stringify(data)}`);
      logger(`[pushPriceDrops] Attempt ${attempt}/${maxRetries} failed: ${status}. Retrying...`);
    } catch (err) {
      if (err.message?.startsWith('[pushPriceDrops] Client error')) throw err;
      lastError = err;
      const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ERR_NETWORK';

      if (isTimeout || isNetwork || err.response?.status >= 500) {
        logger(`[pushPriceDrops] Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying...`);
      } else {
        throw err;
      }
    }

    if (attempt < maxRetries) {
      const delay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
      await sleepFn(delay);
    }
  }

  throw lastError || new Error('[pushPriceDrops] All retries exhausted');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { pushPriceDrops };
