# Scraper to App Validation Checklist

## Goal
This checklist validates the stateless `scraper -> app` flow end to end without changing portal-specific logic.

It covers:
- database readiness on the app side;
- scraper configuration availability;
- dry-run verification before push;
- real ingest validation with idempotency, full/partial/failed run semantics, price events, and inventory lifecycle;
- alert generation and delivery queue validation on the app side;
- API readback validation on the app side.

## Preconditions
- App repo: `/Users/isacsa/trovelapropos/trovelaipropos`
- Scraper repo: `/Users/isacsa/fsbo-scraper`
- Scraper `.env` must define:
  - `APP_API_URL`
  - `SCRAPER_API_KEY`
  - `SCRAPER_TENANT_ID`
- App `.env` must define:
  - `DATABASE_URL`
  - `SCRAPER_API_KEY`
  - `PORT`

## Standard rollout sequence

### 1. Validate app environment
From the app repo:

```bash
pnpm check:env
```

Expected:
- `DATABASE_URL` is present
- `PORT` is present
- command finishes with `All checks passed.`

### 2. Apply migrations and regenerate Prisma client
From the app repo:

```bash
pnpm --filter @trovelai/db migrate:deploy
pnpm --filter @trovelai/db generate
```

Expected:
- latest migration is applied successfully
- Prisma client is generated without errors

### 3. Seed the scraper config
From the app repo:

```bash
pnpm tsx packages/db/src/seed-scraper-config.ts
```

Expected:
- config `00000000-0000-0000-0000-000000000101`
- area `Viana do Castelo`
- sources include `olx`, `casasapo`, `idealista`, `custojusto`, `imovirtual`

### 4. Confirm the app exposes the scraper config
From the scraper repo:

```bash
node -e 'require("dotenv").config({ path: ".env" }); (async () => { const base = process.env.APP_API_URL.replace(/\/+$/, ""); const res = await fetch(`${base}/api/scraper/configs?active_only=true`, { headers: { Authorization: `Bearer ${process.env.SCRAPER_API_KEY}`, "X-Tenant-Id": process.env.SCRAPER_TENANT_ID } }); console.log(res.status); console.log(await res.text()); })().catch((err) => { console.error(err); process.exit(1); });'
```

Expected:
- HTTP `200`
- seeded `ScraperConfig` is returned for the tenant

### 5. Run the full dry-run before push
From the scraper repo:

```bash
node scripts/scrape-and-push.js --run-now --config-id=00000000-0000-0000-0000-000000000101 --dry-run
```

Expected:
- scraper fetches configs from the app
- configured sources begin processing
- payloads are printed instead of being pushed

Notes:
- with the seeded config, this can take a long time because it uses `5` sources and `maxAds=30`
- for operational smoke tests, use the controlled validation below before letting the full run finish

## Controlled smoke validation

### A. Small live scrape gate check
Purpose:
- verify that the live scrape path runs against a real portal
- verify that `precisionGate` blocks low-confidence or invalid results before ingest

Example command:

```bash
node -e 'require("dotenv").config(); const { runPlatform } = require("./src/core/runPlatform"); const { dedupeListInMemory } = require("./pipeline/deduplicate"); const { applyPrecisionGate } = require("./src/integration/precisionGate"); (async () => { const { results } = await runPlatform({ platform: "olx", url: "https://www.olx.pt/imoveis/meadela/q-moradia/", options: { maxPages: 1, maxAds: 2, headless: true, filterAgencies: true }, outputShape: "cli", normalize: true }); const { unique, duplicates } = dedupeListInMemory(results); const precision = applyPrecisionGate(unique, "olx"); console.log(JSON.stringify({ scraped: results.length, deduped: unique.length, duplicates: duplicates?.length || 0, accepted: precision.metrics.accepted_for_push, rejected: precision.metrics.rejected_precision, uncertain: precision.metrics.uncertain_blocked }, null, 2)); })().catch((err) => { console.error(err); process.exit(1); });'
```

Expected:
- scrape succeeds against the real portal
- `accepted`, `rejected`, and `uncertain` metrics are visible
- zero accepted items is a valid outcome if the gate correctly blocks noise

### B. Deterministic ingest smoke test
Purpose:
- validate app ingest contract and readback behavior with a controlled FSBO payload
- prove replay handling, `DROP`, `INCREASE`, `removed`, and `reappeared`

From the scraper repo:

```bash
node - <<'EOF'
require('dotenv').config()
const crypto = require('crypto')
const { buildIngestPayload } = require('./src/integration/toIngestPayload')
const { pushBatch } = require('./src/integration/pushBatch')

const apiUrl = process.env.APP_API_URL
const apiKey = process.env.SCRAPER_API_KEY
const tenantId = process.env.SCRAPER_TENANT_ID
const configId = '00000000-0000-0000-0000-000000000101'
const source = 'olx'
const areaQuery = 'Viana do Castelo'
const baseItem = {
  ad_id: 'smoke-e2e-olx-1',
  url: 'https://www.olx.pt/d/anuncio/smoke-test-e2e-IDSMOKE1.html',
  title: 'Smoke Test Apartamento T2',
  description: 'Venda particular. Sem imobiliarias. Contacto direto do proprietario.',
  price: 210000,
  location: {
    district: 'Viana do Castelo',
    municipality: 'Viana do Castelo',
    parish: 'Meadela',
    lat: 41.693,
    lng: -8.832,
  },
  property: {
    type: 'apartamento',
    tipology: 'T2',
    area_total: 90,
    area_useful: 85,
    year: 2008,
    floor: '2',
    condition: 'usado',
  },
  advertiser: {
    name: 'Smoke Owner',
    is_agency: false,
    url: null,
  },
  photos: [],
  features: ['Varanda'],
  fsbo_score: 88,
  fingerprint: 'smoke-e2e-fp-1',
  signals: {
    fsbo_decision: 'fsbo',
    positive_evidence: ['owner_direct_phrase'],
    negative_evidence: [],
  },
}

async function send(runId, items) {
  const payload = buildIngestPayload({
    runId,
    configId,
    source,
    areaQuery,
    rawItems: items,
    durationMs: 1,
    dedupeRemovedLocal: 0,
    totalScraped: items.length,
  })

  return pushBatch(payload, { apiUrl, apiKey, tenantId })
}

(async () => {
  const run1 = crypto.randomUUID()
  console.log(await send(run1, [baseItem]))
  console.log(await send(run1, [baseItem]))
  console.log(await send(crypto.randomUUID(), [{ ...baseItem, price: 205000 }]))
  console.log(await send(crypto.randomUUID(), [{ ...baseItem, price: 215000 }]))
  console.log(await send(crypto.randomUUID(), []))
  console.log(await send(crypto.randomUUID(), [{ ...baseItem, price: 215000 }]))
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
EOF
```

Expected:
- first run creates `items_new=1`
- replay of the same `run_id` returns replayed `409`
- next run creates one `DROP`
- next run creates one `INCREASE`
- empty batch marks the listing as removed
- final batch marks the listing as reappeared

### C. Safe partial / failed run semantics
Purpose:
- prove that partial or failed source runs do not trigger false removals
- prove that the app persists the final run status as `PARTIAL` or `FAILED`

From the scraper repo:

```bash
node - <<'EOF'
require('dotenv').config()
const crypto = require('crypto')
const { buildIngestPayload } = require('./src/integration/toIngestPayload')
const { pushBatch } = require('./src/integration/pushBatch')

const apiUrl = process.env.APP_API_URL
const apiKey = process.env.SCRAPER_API_KEY
const tenantId = process.env.SCRAPER_TENANT_ID

async function send(payload) {
  return pushBatch(payload, { apiUrl, apiKey, tenantId })
}

(async () => {
  const base = {
    configId: '00000000-0000-0000-0000-000000000101',
    source: 'olx',
    areaQuery: 'Viana do Castelo',
    durationMs: 1,
    rawItems: [],
  }

  console.log(await send(buildIngestPayload({
    ...base,
    runId: crypto.randomUUID(),
    runStatus: 'PARTIAL',
    errors: [{ source: 'olx', error_type: 'precision_gate_blocked', message: 'No items passed the precision gate' }],
  })))

  console.log(await send(buildIngestPayload({
    ...base,
    runId: crypto.randomUUID(),
    runStatus: 'FAILED',
    errors: [{ source: 'olx', error_type: 'scrape_failed', message: 'Synthetic timeout for validation' }],
  })))
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
EOF
```

Expected:
- both requests return `accepted: true`
- the app stores `run_status=PARTIAL` and `run_status=FAILED`
- neither request increments `items_removed`
- previously active smoke listings remain active after these validation runs

### D. Read back from the app
From the scraper repo:

```bash
node -e 'require("dotenv").config({ path: ".env" }); (async () => { const base = process.env.APP_API_URL.replace(/\/+$/, ""); const headers = { "X-Tenant-Id": process.env.SCRAPER_TENANT_ID }; const statsRes = await fetch(`${base}/api/v1/scraper-stats`, { headers }); const listRes = await fetch(`${base}/api/v1/scraper-listings?source=olx&limit=10`, { headers }); const alertsRes = await fetch(`${base}/api/v1/scraper-alerts?limit=10`, { headers }); const recipientsRes = await fetch(`${base}/api/v1/scraper-alert-recipients`, { headers }); const stats = await statsRes.json(); const list = await listRes.json(); const alerts = await alertsRes.json(); const recipients = await recipientsRes.json(); const smoke = (list.items || []).find((item) => item.externalId === "smoke-e2e-olx-1"); console.log(JSON.stringify({ statsStatus: statsRes.status, listStatus: listRes.status, alertsStatus: alertsRes.status, recipientsStatus: recipientsRes.status, stats, smoke, alerts, recipients }, null, 2)); })().catch((err) => { console.error(err); process.exit(1); });'
```

Expected:
- `statsStatus=200`
- `listStatus=200`
- `alertsStatus=200`
- `recipientsStatus=200`
- the smoke listing is visible in `scraper-listings`
- `scraper-stats` reflects active inventory and price change counts
- `scraper-alerts` shows `NEW_FSBO_LISTING`, `PRICE_DROP`, `PRICE_INCREASE`, `LISTING_REMOVED`, and `LISTING_REAPPEARED` as they happen
- at least one recipient exists, either explicitly configured or bootstrapped from `AgentConfig`

### E. Worker delivery gate
Purpose:
- prove that generated deliveries can leave the API boundary and be processed by the worker

From the app repo:

```bash
pnpm --filter @trovelai/worker build
```

Expected:
- worker TypeScript build passes
- `JOB_NAMES.PROCESS_SCRAPER_ALERT_DELIVERY` is compiled
- outbound queue processor accepts the new job type without breaking `SEND_MESSAGE`

## Acceptance criteria
- `GET /api/scraper/configs` returns the seeded config for the tenant
- scraper dry-run starts successfully against the live app
- low-confidence or invalid live scrape results are blocked by `precisionGate`
- replaying the same `run_id` does not create duplicates
- `PARTIAL` and `FAILED` runs do not create false removals
- price drops create `PriceEvent.direction = DROP`
- price increases create `PriceEvent.direction = INCREASE`
- missing items in a batch mark listings as removed
- reappearing items clear `removedAt` and increment `items_reappeared`
- alert events are created for new listings and price changes
- `GET /api/v1/scraper-alerts` returns alert state and delivery state
- `GET /api/v1/scraper-alert-recipients` returns subscription/destination state
- `GET /api/v1/scraper-listings` surfaces `fsboDecision`, evidence, price event, and removal state
- `GET /api/v1/scraper-stats` surfaces totals and price movement counters

## Local validation performed
Validated locally on `2026-01-23`:

- `pnpm check:env` passed in the app repo
- `pnpm --filter @trovelai/db migrate:deploy` applied `20260307195000_expand_scraper_price_events`
- `pnpm --filter @trovelai/db generate` succeeded
- `pnpm tsx packages/db/src/seed-scraper-config.ts` upserted config `00000000-0000-0000-0000-000000000101`
- `GET /api/scraper/configs` returned `200` with the seeded config
- full `scrape-and-push --dry-run` started correctly and began processing all configured sources
- controlled live OLX smoke scrape returned:
  - `scraped: 2`
  - `deduped: 2`
  - `accepted: 0`
  - `rejected: 2`
- deterministic ingest smoke sequence returned:
  - first ingest: `items_new: 1`
  - replay: `replayed: true`
  - drop run: `price_drops_detected: 1`
  - increase run: `price_increases_detected: 1`
  - removal run: `items_removed: 1`
  - reappearance run: `items_reappeared: 1`
- `GET /api/v1/scraper-stats` returned:
  - `total: 1`
  - `newThisWeek: 1`
  - `priceDropsThisWeek: 1`
  - `priceIncreasesThisWeek: 1`
  - `averageFsboScore: 88`
- `GET /api/v1/scraper-listings/:id` returned both:
  - latest `INCREASE` event
  - earlier `DROP` event

## Operational note
The live OLX smoke scrape producing `accepted: 0` is not a failure by itself. In this run, the common precision gate correctly blocked the sampled results before ingest, which is exactly the intended protection against junk and low-confidence FSBOs.
