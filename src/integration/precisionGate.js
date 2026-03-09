const { cleanItem } = require('./dataCleaner');

const HOST_BY_SOURCE = {
  olx: ['olx.pt'],
  custojusto: ['custojusto.pt'],
  casasapo: ['casa.sapo.pt', 'casasapo.pt'],
  imovirtual: ['imovirtual.com'],
  idealista: ['idealista.pt'],
};

const FORBIDDEN_CATEGORY_PATTERNS = [
  /\bquarto\b/i,
  /\bgaragem\b/i,
  /\bgaragens\b/i,
  /\barmaz[eé]m\b/i,
  /\barmaz[eé]ns\b/i,
  /\bsepultura\b/i,
  /\bsepulturas\b/i,
];

const RENT_ONLY_PATTERNS = [
  /\barrendar\b/i,
  /\barrendo\b/i,
  /\balugar\b/i,
  /\balugo\b/i,
  /\baluguer\b/i,
  /\brenda mensal\b/i,
  /\brent\b/i,
];

const SALE_HINT_PATTERNS = [
  /\bvenda\b/i,
  /\bvender\b/i,
  /\bcomprar\b/i,
  /\bcompra\b/i,
];

const PLACEHOLDER_ADVERTISERS = new Set([
  'particular',
  'particulares',
  'desconhecido',
  'utilizador',
  'anunciante',
  'advertiser',
  'email sms',
  'email / sms',
  'contactar anunciante',
  'contact seller',
  'private seller',
]);

const POSITIVE_FSBO_PATTERNS = [
  /\bparticular\b/i,
  /\bpropriet[aá]ri[oa]\b/i,
  /\bdono\b/i,
  /\bsem imobili[aá]rias?\b/i,
  /\bsem ag[eê]ncias?\b/i,
  /\bsem media[cç][aã]o\b/i,
];

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchesAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function getCanonicalHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (error) {
    return null;
  }
}

function hasExpectedHost(url, source) {
  const host = getCanonicalHost(url);
  if (!host) return false;
  const allowedHosts = HOST_BY_SOURCE[source] || [];
  return allowedHosts.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function hasValidCanonicalUrl(item, source) {
  if (!item?.url || typeof item.url !== 'string') return false;
  return hasExpectedHost(item.url, source);
}

function extractCandidateText(item) {
  return [
    item?.title,
    item?.description,
    item?.property?.type,
    item?.property?.tipology,
    item?.advertiser?.name,
  ]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ');
}

function hasForbiddenCategory(item) {
  const text = extractCandidateText(item);
  if (!text) return false;
  return matchesAny(FORBIDDEN_CATEGORY_PATTERNS, text);
}

function isRentOnly(item) {
  const text = `${item?.title || ''} ${item?.description || ''} ${item?.url || ''}`;
  const hasRentHint = matchesAny(RENT_ONLY_PATTERNS, text);
  const hasSaleHint = matchesAny(SALE_HINT_PATTERNS, text);
  return hasRentHint && !hasSaleHint;
}

function isPlaceholderAdvertiserName(name) {
  const normalized = normalizeText(name);
  return normalized ? PLACEHOLDER_ADVERTISERS.has(normalized) : false;
}

function hasPositiveFsboEvidence(item) {
  const fsboDecision = item?.fsbo_decision || item?.signals?.fsbo_decision || null;
  if (fsboDecision === 'fsbo') return true;
  if (typeof item?.fsbo_score === 'number' && item.fsbo_score >= 60) return true;
  if (typeof item?.signals?.fsbo_score === 'number' && item.signals.fsbo_score >= 60) return true;
  if (item?.advertiser?.is_agency === false && !isPlaceholderAdvertiserName(item?.advertiser?.name)) {
    return true;
  }
  const text = `${item?.title || ''} ${item?.description || ''}`;
  return matchesAny(POSITIVE_FSBO_PATTERNS, text);
}

function classifyPrecisionDecision(item, source) {
  const reasons = [];
  const fsboDecision = item?.fsbo_decision || item?.signals?.fsbo_decision || null;

  if (!hasValidCanonicalUrl(item, source)) {
    reasons.push('invalid_canonical_url');
    return { decision: 'reject', reasons };
  }

  if (item?._cross_platform) {
    reasons.push('cross_platform_url');
    return { decision: 'reject', reasons };
  }

  if (hasForbiddenCategory(item)) {
    reasons.push('forbidden_category');
    return { decision: 'reject', reasons };
  }

  if (isRentOnly(item)) {
    reasons.push('rent_only_listing');
    return { decision: 'reject', reasons };
  }

  if (fsboDecision === 'agency' || item?.advertiser?.is_agency === true) {
    reasons.push('agency_signal');
    return { decision: 'reject', reasons };
  }

  if (fsboDecision === 'uncertain') {
    reasons.push('uncertain_fsbo_decision');
    return { decision: 'uncertain', reasons };
  }

  if (isPlaceholderAdvertiserName(item?.advertiser?.name) && !hasPositiveFsboEvidence(item)) {
    reasons.push('placeholder_advertiser_without_fsbo_signal');
    return { decision: 'uncertain', reasons };
  }

  if (!hasPositiveFsboEvidence(item)) {
    reasons.push('missing_positive_fsbo_evidence');
    return { decision: 'uncertain', reasons };
  }

  return { decision: 'accept', reasons };
}

function applyPrecisionGate(rawItems, source) {
  const evaluations = (Array.isArray(rawItems) ? rawItems : []).map((rawItem) => {
    const cleaned = cleanItem(rawItem, source);
    const result = classifyPrecisionDecision(cleaned, source);
    return {
      raw: rawItem,
      cleaned,
      decision: result.decision,
      reasons: result.reasons,
    };
  });

  const accepted = evaluations
    .filter((entry) => entry.decision === 'accept')
    .map((entry) => entry.cleaned);
  const rejected = evaluations.filter((entry) => entry.decision === 'reject');
  const uncertain = evaluations.filter((entry) => entry.decision === 'uncertain');

  return {
    accepted,
    rejected,
    uncertain,
    evaluations,
    metrics: {
      total: evaluations.length,
      accepted_for_push: accepted.length,
      rejected_precision: rejected.length,
      uncertain_blocked: uncertain.length,
    },
  };
}

module.exports = {
  applyPrecisionGate,
  classifyPrecisionDecision,
  hasValidCanonicalUrl,
  hasForbiddenCategory,
  isRentOnly,
  isPlaceholderAdvertiserName,
  hasPositiveFsboEvidence,
};
