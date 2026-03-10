# Price Tracker

Monitors property prices across Portuguese real estate portals and detects significant price drops over time.

Unlike the main FSBO scraper (which filters for private sellers only), the price tracker tracks **all sale listings** — both agency and private — to catch price reductions.

## How it works

```
pullConfigs (GET /api/scraper/configs, filter priceTracker.enabled)
  → runPlatform (filterPrivateOnly: false, filterAgencies: false)
  → cleanItem (portal-aware normalization)
  → dedupeListInMemory (fingerprint-based)
  → filterSalesOnly (valid URL + not rent + not forbidden category)
  → loadPriceState (JSON from data/price-history/<configId>.json)
  → upsertListings (new entries or price changes → history)
  → pruneStale (remove not seen in 90 days)
  → detectDrops (first_seen_price → current_price >= threshold)
  → savePriceState (atomic write with file lock)
  → buildPriceDropPayload → pushPriceDrops (POST /api/scraper/price-drops)
```

### State persistence

Each config gets a JSON file in `data/price-history/`:

```json
{
  "version": 1,
  "updated_at": "2026-03-10T12:00:00.000Z",
  "listings": {
    "https://www.olx.pt/d/anuncio/moradia-t3-ID123.html": {
      "external_id": "123",
      "source": "olx",
      "title": "Moradia T3 Viana",
      "first_seen_at": "2026-03-01T...",
      "first_seen_price": 250000,
      "last_seen_at": "2026-03-10T...",
      "current_price": 210000,
      "price_history": [
        { "price": 250000, "seen_at": "2026-03-01T..." },
        { "price": 230000, "seen_at": "2026-03-05T..." },
        { "price": 210000, "seen_at": "2026-03-10T..." }
      ],
      "location": { "district": "Viana do Castelo" },
      "property": { "type": "moradia", "tipology": "T3" },
      "advertiser": { "name": "João", "is_agency": false }
    }
  }
}
```

Price history is capped at 20 entries per listing. Listings not seen in 90 days are pruned.

## Differences vs FSBO scraper

| Feature | FSBO scraper | Price tracker |
|---------|-------------|---------------|
| **Goal** | Find private sellers | Detect price drops |
| **Listings** | Private only (`filterPrivateOnly: true`) | All sales (`filterPrivateOnly: false`) |
| **Filter** | Precision gate (FSBO score >= 60, no agencies) | Sales-only (valid URL, not rent, not garages) |
| **State** | Stateless (single run) | Persistent JSON per config |
| **Output** | Items for ingest | Price drop events with history |
| **Endpoint** | `POST /api/scraper/ingest` | `POST /api/scraper/price-drops` |
| **Schedule** | `schedule_interval_hours` | Same, via `priceTracker.enabled` flag |

## CLI

```bash
# Production orchestrator
node scripts/price-tracker.js                          # respects schedule
node scripts/price-tracker.js --run-now                # force immediate run
node scripts/price-tracker.js --dry-run                # output to stdout, no API push
node scripts/price-tracker.js --config-id=<uuid>       # single config only
node scripts/price-tracker.js --drop-threshold=0.20    # override default 15%
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--run-now` | false | Bypass schedule check, run immediately |
| `--dry-run` | false | Output payload to stdout instead of pushing |
| `--config-id=<uuid>` | all | Process only this config |
| `--drop-threshold=<n>` | 0.15 | Min drop fraction to flag (0.15 = 15%) |

## Output — price_drops payload

```json
{
  "run_id": "uuid",
  "config_id": "uuid",
  "source": "olx",
  "event_type": "price_drops",
  "area_label": "Viana do Castelo",
  "detected_at": "2026-03-10T12:00:00.000Z",
  "duration_ms": 15000,
  "events": [
    {
      "canonical_url": "https://www.olx.pt/d/anuncio/moradia-t3-ID123.html",
      "external_id": "123",
      "source": "olx",
      "title": "Moradia T3 Viana",
      "location": { "district": "Viana do Castelo" },
      "property": { "type": "moradia", "tipology": "T3", "area_useful": 120 },
      "advertiser": { "name": "João", "is_agency": false },
      "price_data": {
        "first_seen_price": 250000,
        "current_price": 210000,
        "drop_percent": 16.0,
        "drop_absolute": 40000,
        "first_seen_at": "2026-03-01T...",
        "last_seen_at": "2026-03-10T...",
        "days_tracked": 9,
        "price_history": [
          { "price": 250000, "seen_at": "2026-03-01T..." },
          { "price": 210000, "seen_at": "2026-03-10T..." }
        ]
      }
    }
  ],
  "meta": {
    "total_tracked": 45,
    "total_scraped_this_run": 30,
    "new_listings": 5,
    "price_changes": 3,
    "drops_detected": 1,
    "scraper_version": "1.0.0"
  }
}
```

## Testing locally

### Step-by-step with the validation script

```bash
# 1. First run — populates state with initial prices (0 drops expected)
node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/moradias/" --max-ads=5

# 2. Simulate a 20% drop for immediate testing (no need to wait for real changes)
node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/moradias/" --max-ads=5 --simulate-drop=0.20

# 3. View saved state files
node scripts/validate-price-tracker.js --show-state

# 4. Lower the threshold to catch smaller drops
node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/moradias/" --drop-threshold=0.05

# 5. Include raw scraper output for debugging
node scripts/validate-price-tracker.js --platform=olx --url="https://www.olx.pt/imoveis/moradias/" --raw
```

The `--simulate-drop` flag inflates `first_seen_price` in the state to simulate a price reduction. This lets you test the full detection flow without waiting for real price changes.

State files are saved in `data/price-history/` with a deterministic ID based on platform+URL, so running the same command twice uses the same state.

### Unit tests

```bash
npm test                          # runs all tests including price-tracker
node tests/price-tracker.test.js  # price-tracker tests only (45 tests)
```

## Configuration in the APP

The price tracker runs only for configs where `options.priceTracker.enabled` is `true`.

In the APP's config API response:
```json
{
  "id": "config-uuid",
  "sources": {
    "olx": "https://www.olx.pt/imoveis/...",
    "imovirtual": "https://www.imovirtual.com/..."
  },
  "options": {
    "priceTracker": {
      "enabled": true
    }
  },
  "schedule_interval_hours": 96,
  "area_label": "Viana do Castelo",
  "last_run_at": "2026-03-09T..."
}
```

Toggle `priceTracker.enabled` in the APP UI to activate/deactivate price tracking per area.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_API_URL` | Yes | — | Fastify API base URL |
| `SCRAPER_API_KEY` | Yes | — | Bearer token for API auth |
| `SCRAPER_TENANT_ID` | Yes | — | Tenant identifier |
| `PRICE_TRACKER_DROP_THRESHOLD` | No | `0.15` | Default drop threshold (overridden by `--drop-threshold`) |

## APP integration strategy

The following is planned for the APP (Fastify, separate repo):

### New endpoint

```
POST /api/scraper/price-drops
Headers: Authorization: Bearer <key>, X-Tenant-Id, X-Idempotency-Key: <run_id>
Body: price_drops payload (see schema above)
```

### Database model

```sql
CREATE TABLE price_drop_events (
  id              UUID PRIMARY KEY,
  run_id          UUID NOT NULL,
  config_id       UUID REFERENCES scraper_configs(id),
  source          TEXT NOT NULL,
  canonical_url   TEXT NOT NULL,
  external_id     TEXT,
  title           TEXT,
  location        JSONB,
  property        JSONB,
  advertiser      JSONB,
  first_seen_price INTEGER NOT NULL,
  current_price    INTEGER NOT NULL,
  drop_percent     DECIMAL NOT NULL,
  drop_absolute    INTEGER NOT NULL,
  first_seen_at    TIMESTAMPTZ NOT NULL,
  last_seen_at     TIMESTAMPTZ NOT NULL,
  days_tracked     INTEGER NOT NULL,
  price_history    JSONB,
  detected_at      TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_drops_config ON price_drop_events(config_id);
CREATE INDEX idx_price_drops_detected ON price_drop_events(detected_at);
CREATE INDEX idx_price_drops_url ON price_drop_events(canonical_url);
```

### UI tab

- Route: `/price-drops`
- Filters: area, portal, % drop range, price range
- Card per event: title, price before/after, % drop, days tracking, link to listing
- Sparkline chart of price_history per listing
