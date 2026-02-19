/**
 * Simple JSON state store with best-effort file locking.
 *
 * Used for incremental detection (NEW/UPDATED/REMOVED) without a DB.
 */

const fs = require('fs');
const path = require('path');

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function writeJsonAtomic(filePath, data) {
  ensureDirForFile(filePath);
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withFileLock(lockPath, fn, options = {}) {
  const { retries = 50, retryDelayMs = 50 } = options;

  ensureDirForFile(lockPath);

  for (let attempt = 0; attempt <= retries; attempt++) {
    let fd = null;
    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, String(process.pid));
      const result = await fn();
      try {
        fs.closeSync(fd);
      } catch (e) {}
      try {
        fs.unlinkSync(lockPath);
      } catch (e) {}
      return result;
    } catch (e) {
      try {
        if (fd) fs.closeSync(fd);
      } catch (e2) {}

      // If lock exists, wait and retry.
      if (e && e.code === 'EEXIST' && attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }

      // If failed for another reason (or retries exhausted), run without lock.
      return await fn();
    }
  }

  // Should not reach here
  return await fn();
}

module.exports = {
  readJson,
  writeJsonAtomic,
  withFileLock
};

