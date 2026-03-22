# API Reference

## GET /api/prices

Returns weekly fuel prices (Euro 95 + Diesel) for any EU country, with a 3-tier fallback strategy.

**File**: `app/api/prices/route.ts`

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `country` | string | `IT` | ISO 3166-1 alpha-2 country code (e.g. `DE`, `FR`, `ES`). Case-insensitive |

### Response

```json
{
  "source": "database",
  "cached": true,
  "stale": false,
  "country": "IT",
  "count": 1042,
  "prices": [
    {
      "date": "2025-03-10",
      "euro95": 1.802,
      "diesel": 1.704
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | `"database"`, `"ec_oil_bulletin"`, or `"embedded_fallback"` |
| `cached` | boolean | Whether the response came from a stored source |
| `stale` | boolean | Present when data is older than 8 days |
| `country` | string | Country code used for the query |
| `count` | number | Number of price records |
| `prices` | PriceData[] | Weekly price records |

### Price Data Object

| Field | Type | Unit |
|-------|------|------|
| `date` | string | ISO date (YYYY-MM-DD) |
| `euro95` | number | EUR per liter |
| `diesel` | number | EUR per liter |

### 3-Tier Fallback

| Tier | Source | When used |
|------|--------|-----------|
| 1 | **Postgres database** | Default path. Data populated by weekly cron refresh |
| 2 | **Live EC Oil Bulletin** | If DB is empty or unavailable. Parsed data is also persisted to DB in the background |
| 3 | **Embedded historical data** | Last resort, Italy only. Compiled-in snapshot (~1,000 weekly observations) |

Data is considered stale if the most recent record is older than 8 days. Stale data is still returned (with `stale: true`) while a background refresh is not triggered automatically on reads.

### Supported Countries

All 28 EU countries are supported (EU27 + UK): AT, BE, BG, CY, CZ, DE, DK, EE, EL, ES, FI, FR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK, UK.

### Error Handling

| Scenario | Behavior |
|----------|----------|
| DB unavailable | Falls through to tier 2 (live EC fetch) |
| EC site unreachable | Falls through to tier 3 (embedded, Italy only) |
| Country not found in any tier | Returns 404 with error message |

---

## POST /api/prices/refresh

Cron endpoint that downloads the EC Oil Bulletin, parses all countries and fuel types, and upserts everything into the Postgres database. Also accepts GET.

**File**: `app/api/prices/refresh/route.ts`

### Authentication

Protected by `CRON_SECRET` environment variable. Vercel crons send this automatically.

```
Authorization: Bearer <CRON_SECRET>
```

Returns 401 if the secret is missing or incorrect.

### Response (success)

```json
{
  "ok": true,
  "rowsUpserted": 128000,
  "countries": 28,
  "totalParsed": 128000,
  "durationMs": 12500
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` on success |
| `rowsUpserted` | number | Total rows inserted/updated in the database |
| `countries` | number | Number of unique countries parsed |
| `totalParsed` | number | Total price rows parsed from the XLSX |
| `durationMs` | number | Total execution time in milliseconds |

### Response (failure)

```json
{
  "ok": false,
  "error": "Error: EC Oil Bulletin HTTP 503",
  "durationMs": 31000
}
```

Returns status 502. The error is also logged in the `refresh_log` table for monitoring.

### Schedule

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/prices/refresh",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

Runs every **Monday at 14:00 UTC**. The EC Oil Bulletin is typically updated on Monday mornings, so this timing allows the data to be available before the refresh.

---

## GET /api/electricity-prices

Fetches live electricity prices from the Eurostat `nrg_pc_204` dataset.

**File**: `app/api/electricity-prices/route.ts`

### Response

```json
{
  "source": "eurostat_nrg_pc_204",
  "cached": false,
  "count": 35,
  "prices": [
    {
      "date": "2024-S1",
      "price": 0.2876
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Always `"eurostat_nrg_pc_204"` |
| `cached` | boolean | Whether the response came from cache |
| `stale` | boolean | Present and `true` when returning expired cache after a fetch failure |
| `count` | number | Number of price records |
| `prices` | ElectricityPricePoint[] | Semi-annual price records |

### Electricity Price Object

| Field | Type | Unit |
|-------|------|------|
| `date` | string | Period label (e.g. `"2024-S1"`, `"2023-S2"`) |
| `price` | number | EUR per kWh (all taxes included, 4 decimal places) |

### Data Source

The endpoint queries the Eurostat JSON API:
- **Dataset**: `nrg_pc_204` (electricity prices for household consumers)
- **Country**: Italy (`geo=IT`)
- **Unit**: EUR per kWh
- **Tax band**: All taxes included (`tax=I_TAX`)
- **Consumption band**: 2,500-4,999 kWh/year (`nrg_cons=KWH2500-4999`)
- **Timeout**: 30 seconds

### Caching

- Responses are cached in-memory for **24 hours**
- On fetch failure, stale cache is returned if available (with `stale: true` flag)
- Cache key is time-based (not request-based)

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Eurostat API unreachable | Returns stale cache if available; otherwise 502 |
| Parse error | Returns stale cache if available; otherwise 502 |
| No cached data | Returns error JSON with status 502 |

### Fallback

If the API is unavailable, the simulation engine falls back to embedded historical data in `lib/historical-electricity-data.ts` (35 semi-annual observations since 2008).
