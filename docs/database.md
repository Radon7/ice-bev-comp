# Database

The app uses a Postgres database to store fuel prices from the EC Oil Bulletin for all EU countries. This replaces the previous approach of fetching and parsing the XLSX on every cold start.

## Schema

**Migration file**: `scripts/migrations/001_create_tables.sql`

### fuel_prices

Stores weekly fuel prices for all EU countries since 2005.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `date` | DATE | Price observation date |
| `country` | TEXT | ISO 2-letter country code (IT, DE, FR, ...) |
| `fuel_type` | TEXT | Fuel type identifier (see below) |
| `price_eur_l` | NUMERIC(6,3) | Price in EUR per liter |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |

**Unique constraint**: `(date, country, fuel_type)` — prevents duplicate entries and enables upsert on refresh.

**Indexes**:
- `idx_prices_country_fuel_date` on `(country, fuel_type, date)` — optimized for the main query pattern
- `idx_prices_date` on `(date)` — for freshness checks

### Fuel Types

| Identifier | Description |
|------------|-------------|
| `euro95` | Euro Super 95 unleaded gasoline |
| `diesel` | Automotive diesel |
| `heating_oil` | Heating oil |
| `fuel_oil_1` | Heavy fuel oil (type 1) |
| `fuel_oil_2` | Heavy fuel oil (type 2) |
| `lpg` | Liquefied petroleum gas |

The simulation currently uses `euro95` and `diesel`. The other fuel types are stored for completeness and future use.

### electricity_prices

Stores semi-annual electricity prices for all EU countries from the Eurostat `nrg_pc_204` dataset.

**Migration file**: `scripts/migrations/002_create_electricity_prices.sql`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `date` | TEXT | Semi-annual period label (e.g. `2024-S1`, `2024-S2`) |
| `country` | TEXT | ISO 2-letter country code (IT, DE, FR, ...) |
| `price_eur_kwh` | NUMERIC(8,4) | Price in EUR per kWh (all taxes included) |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |

**Unique constraint**: `(date, country)` — prevents duplicate entries and enables upsert on refresh.

**Indexes**:
- `idx_elec_country_date` on `(country, date)` — optimized for per-country queries

### refresh_log

Tracks refresh attempts for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `started_at` | TIMESTAMPTZ | When the refresh started (defaults to NOW()) |
| `completed_at` | TIMESTAMPTZ | When the refresh finished |
| `rows_upserted` | INT | Number of rows inserted/updated |
| `error` | TEXT | Error message if the refresh failed (NULL on success) |
| `source` | TEXT | `'fuel_prices'` or `'electricity_prices'` (defaults to `'fuel_prices'`) |

## Data Statistics

### Fuel Prices

- **Countries**: 28 (EU27 + UK)
- **Fuel types**: 6 per country
- **Total rows**: ~128,000 (from 2005 to present)
- **Storage**: ~6 MB
- **Update frequency**: Weekly (Monday 14:00 UTC via Vercel cron)

### Electricity Prices

- **Countries**: 28 (EU27 + UK)
- **Data points**: ~34 semi-annual observations per country (from 2008)
- **Total rows**: ~950
- **Storage**: ~50 KB
- **Update frequency**: Monthly (1st of month at 15:00 UTC via Vercel cron)

## Production Deployment (Vercel)

### 1. Create the database

Go to your Vercel project dashboard → **Storage** tab → **Create Database** → **Postgres (Neon)**. Vercel auto-injects `POSTGRES_URL` and related env vars into your project.

### 2. Run the schema migration

In the Vercel Storage dashboard, click on your database → **SQL Editor**. Paste and run the contents of both migration files in order:
1. `scripts/migrations/001_create_tables.sql` — creates `fuel_prices` and `refresh_log` tables
2. `scripts/migrations/002_create_electricity_prices.sql` — creates `electricity_prices` table and adds `source` column to `refresh_log`

### 3. Set CRON_SECRET

Go to **Settings** → **Environment Variables**. Vercel auto-generates `CRON_SECRET` for cron jobs. If it's not present, add it manually with any secure random string.

### 4. Deploy

Push and merge the branch. Vercel deploys automatically.

### 5. Initial backfill

After the first deploy, trigger manual refreshes to populate all historical data:

```bash
# Fuel prices (~128K rows, 5-10s)
curl -H "Authorization: Bearer <your-CRON_SECRET>" \
  https://your-app.vercel.app/api/prices/refresh

# Electricity prices (~950 rows, 2-3s)
curl -H "Authorization: Bearer <your-CRON_SECRET>" \
  https://your-app.vercel.app/api/electricity-prices/refresh
```

### 6. Verify

- Visit `https://your-app.vercel.app/api/prices` — should return `"source": "database"`
- Visit `https://your-app.vercel.app/api/prices?country=DE` to confirm multi-country fuel works
- Visit `https://your-app.vercel.app/api/electricity-prices` — should return `"source": "database"`
- Visit `https://your-app.vercel.app/api/electricity-prices?country=DE` to confirm multi-country electricity works
- Check the Vercel Postgres dashboard to see the rows

After this, two crons run automatically — no further action needed.

## Local Development Setup

### 1. Start Postgres with Docker

```bash
docker run -d \
  --name comp-benzina-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_prices \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Configure environment

Create `.env.local` in the project root (gitignored):

```env
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/fuel_prices
CRON_SECRET=dev-secret
```

### 3. Run migrations

```bash
npx tsx scripts/migrate.ts
```

This reads all `.sql` files from `scripts/migrations/` in sorted order and executes them against the database.

### 4. Seed data (optional)

Trigger manual refreshes to populate the database with all historical data:

```bash
# Fuel prices (~128K rows, 5-10s)
curl -X POST http://localhost:3000/api/prices/refresh \
  -H "Authorization: Bearer dev-secret"

# Electricity prices (~950 rows, 2-3s)
curl -X POST http://localhost:3000/api/electricity-prices/refresh \
  -H "Authorization: Bearer dev-secret"
```

## Migrations

Migration files live in `scripts/migrations/` and are run by `scripts/migrate.ts`.

**Naming convention**: `NNN_description.sql` (e.g. `001_create_tables.sql`). Files are executed in alphabetical order.

**Runner**: `npx tsx scripts/migrate.ts`

The runner connects using `POSTGRES_URL` from the environment (or `.env.local` via dotenv), reads all `.sql` files from the migrations directory, and executes them sequentially. All migrations use `IF NOT EXISTS` / `IF NOT EXISTS` guards, so they are safe to re-run.

## Refresh Strategy

Two Vercel cron jobs keep the database up to date, defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/prices/refresh", "schedule": "0 14 * * 1" },
    { "path": "/api/electricity-prices/refresh", "schedule": "0 15 1 * *" }
  ]
}
```

### Fuel Prices — Weekly Cron

Every Monday at 14:00 UTC:

1. Vercel sends a request to `/api/prices/refresh` with `Authorization: Bearer <CRON_SECRET>`
2. `ec-fetcher.ts` downloads the EC Oil Bulletin XLSX
3. The dynamic parser auto-discovers country and fuel type columns from XLSX headers
4. All parsed rows are upserted into `fuel_prices` in batches of 500 (using `ON CONFLICT ... DO UPDATE`)
5. The result is logged in `refresh_log` with `source = 'fuel_prices'`

### Electricity Prices — Monthly Cron

On the 1st of each month at 15:00 UTC:

1. Vercel sends a request to `/api/electricity-prices/refresh` with `Authorization: Bearer <CRON_SECRET>`
2. `eurostat-fetcher.ts` queries the Eurostat JSON API for all 28 EU countries
3. All parsed rows are upserted into `electricity_prices` (using `ON CONFLICT ... DO UPDATE`)
4. The result is logged in `refresh_log` with `source = 'electricity_prices'`

Eurostat publishes electricity prices semi-annually. The monthly cron ensures we catch new data promptly without over-fetching.

### Opportunistic Backfill

When `/api/prices` falls through to tier 2 (live EC fetch), the parsed data is also persisted to the database in the background. This ensures the DB gets populated even if the cron has not run yet.

### Dynamic XLSX Parser

The parser (`lib/ec-fetcher.ts`) auto-discovers columns from the XLSX header row using the pattern `<CC>_price_with_tax_<fuel_suffix>`. This means it automatically adapts if the EC adds new countries or reorders columns.

## Monitoring

### refresh_log Table

Query the `refresh_log` table to check refresh health:

```sql
-- Last 5 refresh attempts (all sources)
SELECT * FROM refresh_log ORDER BY started_at DESC LIMIT 5;

-- Last successful fuel refresh
SELECT completed_at, rows_upserted
FROM refresh_log
WHERE source = 'fuel_prices' AND error IS NULL AND completed_at IS NOT NULL
ORDER BY completed_at DESC
LIMIT 1;

-- Last successful electricity refresh
SELECT completed_at, rows_upserted
FROM refresh_log
WHERE source = 'electricity_prices' AND error IS NULL AND completed_at IS NOT NULL
ORDER BY completed_at DESC
LIMIT 1;

-- Recent failures
SELECT started_at, source, error
FROM refresh_log
WHERE error IS NOT NULL
ORDER BY started_at DESC
LIMIT 5;
```

### Data Freshness

The `/api/prices` endpoint includes a `stale` flag in the response when the most recent data is older than 8 days. This can be monitored externally.

```sql
-- Check freshness per country
SELECT country, MAX(date) AS latest_date
FROM fuel_prices
GROUP BY country
ORDER BY latest_date DESC;
```

### Programmatic Access

`lib/price-store.ts` exports `getLatestRefresh()` which returns the timestamp and row count of the last successful refresh. This can be used for health checks or dashboard integrations.

## Key Files

| File | Purpose |
|------|---------|
| `lib/db.ts` | Postgres client (pg Pool with tagged template SQL) |
| `lib/ec-fetcher.ts` | Dynamic XLSX parser for all EU countries and fuel types |
| `lib/eurostat-fetcher.ts` | Eurostat JSON API fetcher for electricity prices (all EU countries) |
| `lib/price-store.ts` | Data access layer (fuel + electricity prices, refresh logging) |
| `app/api/prices/refresh/route.ts` | Fuel price cron endpoint (weekly, protected by CRON_SECRET) |
| `app/api/electricity-prices/refresh/route.ts` | Electricity price cron endpoint (monthly, protected by CRON_SECRET) |
| `scripts/migrations/001_create_tables.sql` | Database schema (fuel_prices + refresh_log) |
| `scripts/migrations/002_create_electricity_prices.sql` | Database schema (electricity_prices + refresh_log source column) |
| `scripts/migrate.ts` | Migration runner |
| `scripts/inspect-bulletin.ts` | Dev tool: inspect XLSX structure |
| `vercel.json` | Cron schedule definitions (weekly fuel + monthly electricity) |
