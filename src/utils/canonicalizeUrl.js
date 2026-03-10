/**
 * Canonicalize a listing URL — strip query, hash, trailing slashes, normalise hostname.
 *
 * Extracted from pipeline/deduplicate.js so non-deprecated modules can import it.
 */

function canonicalizeAdUrl(url) {
  if (!url || typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');

    if (parsed.hostname.endsWith('imovirtual.com')) {
      parsed.pathname = parsed.pathname.replace(/\/hpr\//g, '/');
    }

    return parsed.toString();
  } catch (error) {
    return String(url).trim();
  }
}

module.exports = { canonicalizeAdUrl };
