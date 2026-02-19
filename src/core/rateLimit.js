/**
 * Very small in-process rate limiting & concurrency helpers.
 *
 * Default is NO limiting (keeps current behavior).
 * Enable via env:
 * - FSBO_RATE_LIMIT_RPS=1.5        (per-host pacing)
 * - FSBO_RATE_LIMIT_JITTER=0.2     (0..1 fraction)
 * - FSBO_MAX_CONCURRENT_SCRAPES=2  (global semaphore)
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getRateLimitConfig() {
  const rps = parseNumber(process.env.FSBO_RATE_LIMIT_RPS, 0);
  const jitter = Math.max(0, Math.min(1, parseNumber(process.env.FSBO_RATE_LIMIT_JITTER, 0.2)));
  return { rps, jitter };
}

// key -> nextAllowedMs
const nextAllowedByKey = new Map();

async function rateLimitWait(key) {
  const { rps, jitter } = getRateLimitConfig();
  if (!rps || rps <= 0) return;

  const intervalMs = Math.max(1, Math.round(1000 / rps));
  const now = Date.now();
  const nextAllowed = nextAllowedByKey.get(key) || now;

  const scheduled = Math.max(now, nextAllowed);
  let delay = scheduled - now;

  if (delay > 0 && jitter > 0) {
    const j = delay * jitter * (Math.random() - 0.5) * 2; // ± jitter%
    delay = Math.max(0, Math.round(delay + j));
  }

  if (delay > 0) {
    await sleep(delay);
  }

  nextAllowedByKey.set(key, scheduled + intervalMs);
}

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.max <= 0) return () => {};

    if (this.current < this.max) {
      this.current += 1;
      return () => this.release();
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    }).then(() => {
      this.current += 1;
      return () => this.release();
    });
  }

  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

let semaphore = null;
function getSemaphore() {
  const max = Math.trunc(parseNumber(process.env.FSBO_MAX_CONCURRENT_SCRAPES, 0));
  if (!max || max <= 0) return null;
  if (semaphore && semaphore.max === max) return semaphore;
  semaphore = new Semaphore(max);
  return semaphore;
}

async function withGlobalScrapeSlot(fn) {
  const sem = getSemaphore();
  if (!sem) return await fn();

  const release = await sem.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

module.exports = {
  rateLimitWait,
  withGlobalScrapeSlot
};

