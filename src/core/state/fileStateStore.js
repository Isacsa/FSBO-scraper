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
  const { retries = 50, retryDelayMs = 50, staleLockMs = 30000 } = options;

  ensureDirForFile(lockPath);

  for (let attempt = 0; attempt <= retries; attempt++) {
    let fd = null;
    try {
      fd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(fd, String(process.pid));
      let result;
      try {
        result = await fn();
      } finally {
        try { fs.closeSync(fd); } catch (e) {}
        try { fs.unlinkSync(lockPath); } catch (e) {}
      }
      return result;
    } catch (e) {
      try {
        if (fd) fs.closeSync(fd);
      } catch (e2) {}

      if (e && e.code === 'EEXIST') {
        // Check for stale lock left by a dead process
        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > staleLockMs) {
            console.error(`[FileStateStore] Removing stale lock file (age ${Math.round((Date.now() - stat.mtimeMs) / 1000)}s): ${lockPath}`);
            try { fs.unlinkSync(lockPath); } catch (e3) {}
            continue; // Retry immediately after removing stale lock
          }
        } catch (statErr) {
          // Lock was removed between check — retry
        }

        if (attempt < retries) {
          await sleep(retryDelayMs);
          continue;
        }
      }

      // If failed for another reason or retries exhausted, throw instead of running without lock
      throw new Error(`Failed to acquire file lock after ${retries} retries: ${lockPath}`);
    }
  }

  throw new Error(`Failed to acquire file lock after ${retries} retries: ${lockPath}`);
}

module.exports = {
  readJson,
  writeJsonAtomic,
  withFileLock
};

