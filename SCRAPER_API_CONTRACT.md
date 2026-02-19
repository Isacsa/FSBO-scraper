# Scraper ↔ APP API Contract

**Version**: 1.0  
**Scraper role**: Stateless data producer (scrape → clean → push)  
**APP role**: Canonical layer (validation, dedupe, history, alerts)  
**APP stack**: Fastify (`apps/api`) + Postgres (Supabase)

---

## Authentication

All requests from the scraper require:

| Header | Description |
|--------|-------------|
| `Authorization: Bearer <SCRAPER_API_KEY>` | API key identifying the tenant |
| `X-Tenant-Id: <uuid>` | Tenant UUID |
| `Content-Type: application/json` | Always JSON |

---

## Endpoints

### `GET /api/scraper/configs`

Returns active scraper configurations for the authenticated tenant.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `active_only` | boolean | `true` | Filter inactive configs |

**Response (200):**

```json
{
  "configs": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "area_label": "Viana do Castelo",
      "sources": {
        "olx": "https://www.olx.pt/imoveis/meadela/q-moradia/",
        "custojusto": "https://www.custojusto.pt/viana-do-castelo/imobiliario/moradias?f=p",
        "casasapo": "https://casa.sapo.pt/comprar-apartamentos/arcos-de-valdevez/",
        "imovirtual": "https://www.imovirtual.com/pt/resultados/comprar/apartamento/viana-do-castelo/viana-do-castelo?limit=36&ownerTypeSingleSelect=PRIVATE"
      },
      "options": { "maxPages": 5, "maxAds": 30 },
      "schedule_interval_hours": 96,
      "is_active": true,
      "last_run_at": "2026-01-20T03:00:00.000Z",
      "last_run_status": "completed"
    }
  ]
}
```

The scraper uses `last_run_at` + `schedule_interval_hours` to decide whether to run a config.

---

### `POST /api/scraper/ingest`

Receive a batch of scraped listings from one source.

**Extra Headers:**

| Header | Description |
|--------|-------------|
| `X-Idempotency-Key: <runId>` | UUID v4 for replay protection |

**Request Body:**

```json
{
  "run_id": "uuid-v4",
  "config_id": "uuid",
  "source": "olx",
  "area_query": "Viana do Castelo",
  "scraped_at": "2026-01-23T12:00:00Z",
  "duration_ms": 45000,
  "items": [
    {
      "external_id": "ad123",
      "canonical_url": "https://www.olx.pt/d/anuncio/...",
      "title": "Apartamento T2",
      "description": "...",
      "price": 150000,
      "location": {
        "district": "Viana do Castelo",
        "municipality": "Viana do Castelo",
        "parish": "Meadela",
        "lat": 41.6918,
        "lng": -8.8347
      },
      "property": {
        "type": "apartamento",
        "tipology": "T2",
        "area_total": null,
        "area_useful": 85,
        "year": 2005,
        "floor": "2",
        "condition": "usado"
      },
      "advertiser": {
        "name": "Manuel",
        "is_agency": false,
        "url": "https://www.olx.pt/ads/user/xyz/"
      },
      "photos": ["https://..."],
      "features": ["Garagem", "Certificado Energético: C"],
      "fsbo_score": 65,
      "fingerprint": "md5hash",
      "signals": {
        "watermark": false,
        "professional_photos": false,
        "agency_keywords": []
      }
    }
  ],
  "meta": {
    "total_scraped": 25,
    "dedupe_removed_local": 0,
    "scraper_version": "1.0.0"
  }
}
```

**Field types (important):**

| Field | Type | Notes |
|-------|------|-------|
| `price` | `number \| null` | Integer, euros. NOT a string. |
| `location.lat/lng` | `number \| null` | Float. NOT a string. |
| `property.area_*` | `number \| null` | Integer, m². NOT a string. |
| `property.year` | `number \| null` | Integer (e.g. 2005). |
| `advertiser.is_agency` | `boolean \| null` | |
| `photos`, `features` | `string[]` | Always arrays, can be empty. |

**Response (200 OK):**

```json
{
  "accepted": true,
  "run_id": "uuid",
  "items_received": 25,
  "items_new": 12,
  "items_updated": 8,
  "items_duplicate": 5,
  "price_drops_detected": 2
}
```

**Response (409 Conflict — replay):**

```json
{
  "accepted": true,
  "run_id": "uuid",
  "replayed": true,
  "message": "Run already processed"
}
```

**Error responses:**

| Status | Description |
|--------|-------------|
| 400 | Invalid payload or missing config |
| 401 | Missing or invalid API key / tenant |
| 409 | Run already processed (idempotency) |
| 429 | Rate limited (respect `Retry-After` header) |
| 500 | Server error (retryable) |

---

## APP-side behavior (for implementers)

### Deduplication

The APP deduplicates by two composite unique keys:

1. `(tenant_id, source, external_id)` — primary, when `external_id` is present
2. `(tenant_id, source, canonical_url)` — fallback, always available

PostgreSQL allows multiple NULLs in unique constraints, so listings without `external_id` use the URL key.

### History tracking

- `first_seen_at`: set to `NOW()` on first INSERT
- `last_seen_at`: updated to `NOW()` on every upsert (including duplicates)
- `last_price` / `last_price_at`: updated when price changes

### Price drop detection

During upsert, if `new_price < existing_price`:
- Insert into `price_events` with `old_price`, `new_price`, `change_pct`
- This data drives tenant notifications/alerts

### Run tracking

Each `run_id` creates a `ScraperRun` record with:
- Counters: `items_new`, `items_updated`, `items_duplicate`
- Status: `COMPLETED`, `FAILED`, `PARTIAL`
- Replay of the same `run_id` returns 409

---

## Scheduling

The scraper runs daily via cron (`0 3 * * *`) and checks:

```
if (now - config.last_run_at >= config.schedule_interval_hours)
  → run
else
  → skip
```

CLI flags:
- `--run-now`: bypass threshold, run immediately
- `--config-id=<uuid>`: run only a specific config
- `--dry-run`: scrape + clean + build payload, but don't push

---

## Cron setup

### systemd timer (VPS)

```bash
# /etc/systemd/system/fsbo-scraper.service
[Unit]
Description=FSBO Scraper

[Service]
Type=oneshot
WorkingDirectory=/opt/fsbo-scraper
ExecStart=/usr/bin/node scripts/scrape-and-push.js
EnvironmentFile=/opt/fsbo-scraper/.env

# /etc/systemd/system/fsbo-scraper.timer
[Unit]
Description=Run FSBO scraper daily

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Docker (scheduled container)

```dockerfile
# In existing Dockerfile, add:
CMD ["node", "scripts/scrape-and-push.js"]
```

Run with a scheduler (e.g., Docker Swarm, Kubernetes CronJob, or `cron` on host).

---

## Testing locally

```bash
# 1. Start the APP Fastify locally
cd /path/to/trovelaipropos && pnpm --filter @trovelai/api dev

# 2. Test with fixture
curl -X POST http://localhost:3001/api/scraper/ingest \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "X-Tenant-Id: YOUR_TENANT_UUID" \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/ingest-payload.json

# 3. Verify response (should show items_new: 2)

# 4. Replay same curl → should get 409

# 5. Dry-run scrape
node scripts/validate-integration.js --platform=olx --url="https://www.olx.pt/imoveis/meadela/q-moradia/"

# 6. Full integration
APP_API_URL=http://localhost:3001 SCRAPER_API_KEY=YOUR_KEY SCRAPER_TENANT_ID=YOUR_ID \
  node scripts/scrape-and-push.js --run-now --config-id=YOUR_CONFIG
```
