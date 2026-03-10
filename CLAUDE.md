# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies + browser
npm install
npx playwright install chromium

# Run tests
npm test                          # main test suite (node tests/test.js)
npm run test:headless             # browser headless tests

# Production orchestrator
npm run scrape-push               # respects schedule_interval_hours
node scripts/scrape-and-push.js --run-now          # force immediate run
node scripts/scrape-and-push.js --config-id=<uuid> # single config
node scripts/scrape-and-push.js --dry-run          # no push to API

# Diagnostics
node run-scraper.js --platform=olx --url="https://..." --n8n
node scripts/validate-integration.js --platform=olx --url="..."
npm run lobstr:test -- --url="https://www.idealista.pt/..."

# Valuation / market analysis
npm run analyze -- --input=data/output_olx_viana_new.json --format=text
npm run analyze -- --input=file1.json,file2.json --min-score=7
npm run analyze -- --input=data/output_olx_viana_new.json --district="Porto"
```

## Architecture

**Purpose:** Stateless scraper microservice that extracts FSBO (For Sale By Owner) property listings from Portuguese real estate portals and pushes them to a Fastify app API.

### Canonical Production Flow

```
pullConfigs (GET /api/scraper/configs)
  → runPlatform (portal-specific Playwright scraper)
  → dataCleaner (normalize raw portal output)
  → dedupeListInMemory (fingerprint-based local dedupe)
  → applyPrecisionGate (URL validation + FSBO filtering)
  → toIngestPayload (convert to APP contract schema)
  → pushBatch (POST /api/scraper/ingest, 3 retries with backoff)
```

### Key Modules

- **`src/core/registry.js`** — Maps platform name → scraper module
- **`src/core/runPlatform.js`** — Unified runner; normalizes varied scraper return shapes to `results[]`
- **`src/integration/precisionGate.js`** — Multi-stage filter: valid canonical URL → no forbidden categories (rooms, garages, burials) → not rent-only → FSBO score ≥ 60 OR positive signals → reject if agency detected
- **`src/integration/dataCleaner.js`** — Portal-aware normalization (prices, text, field validation)
- **`src/integration/toIngestPayload.js`** — Scraper schema → APP ingest schema
- **`src/services/fsboSignals.js`** — FSBO scoring (0–100): detects agency keywords, anti-agency phrases, owner-direct indicators; returns `fsbo_decision` (fsbo|agency|uncertain)
- **`src/services/valuation/`** — Property valuation engine: price/m2 calculation, zone benchmarks with hierarchical fallback, opportunity scoring (1–10), adjustment factors, report generation in PT
- **`src/scrapers/<portal>/`** — Portal-specific Playwright implementations (OLX, Imovirtual, CustoJusto, CasaSapo); Idealista uses Lobstr.io API instead

### Portal Coverage

| Platform | Approach |
|---|---|
| OLX | Playwright (largest portal, multi-page) |
| Imovirtual | Playwright |
| Idealista | Lobstr.io API (`src/scrapers/idealista_lobstr/`) |
| CustoJusto | Playwright |
| CasaSapo | Playwright (experimental) |

### Environment Variables

```bash
APP_API_URL=        # Fastify app base URL
SCRAPER_API_KEY=    # Bearer token
SCRAPER_TENANT_ID=  # Tenant identifier
LOBSTR_API_KEY=     # Idealista/Lobstr API (if using Idealista)
IDEALISTA_SQUID_ID= # Proxy ID for Idealista
```

### Ingest API Contract

`POST /api/scraper/ingest` with headers `Authorization: Bearer <key>`, `X-Tenant-Id`, `X-Idempotency-Key: <run_id>`.

Each item has: `external_id`, `canonical_url`, `title`, `price`, `location`, `property`, `advertiser`, `photos`, `features`, `fsbo_score`, `signals`.

### Deprecated (do not use in production)

- `pipeline/incremental.js` — old state tracking
- `server.js` / `src/routes/` — legacy Express API, kept only for troubleshooting
- Manual Idealista scripts — use Lobstr instead
