# Local Development Setup

End-to-end guide to get the app running locally from scratch.

## Prerequisites

- **Node.js** 20+ and npm
- **Docker Desktop** (for local Postgres — optional but recommended)
- **Git**

## 1. Clone and install

```bash
git clone <repo-url>
cd webapp
npm install
```

## 2. Start local Postgres (optional)

The database is optional. Without it, the app falls back to fetching the EC Oil Bulletin live on every request, then to an embedded 52-week snapshot for Italy. With Docker Postgres, prices are served in ~20ms instead of ~3-5s.

```bash
docker run -d \
  --name comp-benzina-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=comp_benzina \
  -p 5432:5432 \
  postgres:16-alpine
```

Verify it's running:

```bash
docker ps
```

You should see `comp-benzina-db` with status `Up`.

## 3. Configure environment

Create `.env.local` in the project root (already in `.gitignore`):

```env
# Local Postgres (Docker) — remove these lines to run without a database
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/comp_benzina
POSTGRES_URL_NON_POOLING=postgres://postgres:postgres@localhost:5432/comp_benzina

# Auth token for the /api/prices/refresh endpoint
CRON_SECRET=local-dev-secret

# API rate limiting and CORS (optional)
# API_RATE_LIMIT=100
# ALLOWED_ORIGINS=*
```

If you skip the database, you don't need `.env.local` at all — the app works without it.

## 4. Run database migrations

Skip this step if you're not using the database.

```bash
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/comp_benzina npx tsx scripts/migrate.ts
```

This creates the `fuel_prices`, `electricity_prices`, `refresh_log`, and `api_keys` tables.

## 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is ready to use.

Without a database, the first load takes a few seconds while it downloads the EC Oil Bulletin XLSX. With a database, it's instant (but the database is empty — see step 6).

## 6. Seed the database (optional)

With the dev server running, trigger a full backfill:

```bash
# Fuel prices — all 28 EU countries since 2005 (~128K rows, 5-10s)
curl -H "Authorization: Bearer local-dev-secret" http://localhost:3000/api/prices/refresh

# Electricity prices — all 28 EU countries since 2008 (~950 rows, 2-3s)
curl -H "Authorization: Bearer local-dev-secret" http://localhost:3000/api/electricity-prices/refresh
```

You should see responses like:

```json
{ "ok": true, "rowsUpserted": 127951, "countries": 28, "durationMs": 4640 }
{ "ok": true, "rowsUpserted": 952, "countries": 28, "durationMs": 2100 }
```

## 7. Verify everything works

The API requires authentication for external requests. Create a test API key first:

```bash
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/comp_benzina \
  npx tsx scripts/create-api-key.ts "Local Test"
```

Then test with the key:

```bash
# Fuel prices — Italy (default)
curl -s -H "X-API-Key: <your-key>" http://localhost:3000/api/prices | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"

# Fuel prices — another country
curl -s -H "X-API-Key: <your-key>" "http://localhost:3000/api/prices?country=DE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"

# Electricity prices — Italy (default)
curl -s -H "X-API-Key: <your-key>" http://localhost:3000/api/electricity-prices | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"

# Electricity prices — another country
curl -s -H "X-API-Key: <your-key>" "http://localhost:3000/api/electricity-prices?country=DE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"
```

Note: The frontend (same-origin requests from the browser) works without an API key.

Expected output with database:

```
Source: database, Country: IT, Data points: 1057
Source: database, Country: DE, Data points: 1058
Source: database, Country: IT, Data points: 35
Source: database, Country: DE, Data points: 34
```

Expected output without database:

```
Source: ec_oil_bulletin, Country: IT, Data points: 1057
Source: eurostat_nrg_pc_204, Country: IT, Data points: 35
```

## Docker cheat sheet

```bash
# Stop the database (data persists)
docker stop comp-benzina-db

# Restart (data is still there)
docker start comp-benzina-db

# Connect with psql for debugging
docker exec -it comp-benzina-db psql -U postgres -d comp_benzina

# Check fuel price row counts per country
docker exec comp-benzina-db psql -U postgres -d comp_benzina \
  -c "SELECT country, COUNT(*) FROM fuel_prices GROUP BY country ORDER BY country;"

# Check electricity price row counts per country
docker exec comp-benzina-db psql -U postgres -d comp_benzina \
  -c "SELECT country, COUNT(*) FROM electricity_prices GROUP BY country ORDER BY country;"

# Reset everything (destroys all data)
docker rm -f comp-benzina-db
# Then re-run the docker run command from step 2
```

## Running without Docker

If you don't have Docker, the app still works:

1. Skip steps 2, 4, and 6
2. Don't create `.env.local` (or leave `POSTGRES_URL` unset)
3. The app fetches the EC Oil Bulletin live on the first request (3-5s)
4. Subsequent requests use an in-memory fallback until the server restarts
5. Only Italy data is available (no `?country=` support without the database)

## Troubleshooting

**Port 5432 already in use**: Another Postgres instance is running. Stop it or change the Docker port mapping (e.g. `-p 5433:5432` and update `POSTGRES_URL` accordingly).

**Docker not running**: Start Docker Desktop. You can verify with `docker info`.

**Migration fails**: Make sure the Postgres container is fully started (wait a few seconds after `docker run`). Check connectivity with:

```bash
docker exec comp-benzina-db pg_isready
```

**Refresh returns 401**: Check that `CRON_SECRET` in `.env.local` matches the `Authorization: Bearer <value>` header.

**No data for a country**: Run the seed step (step 6). Without seeding, the database is empty and the app falls back to live EC fetch for Italy only.

## Deploying to production

For Vercel deployment with Neon Postgres, see the [Production Deployment](./database.md#production-deployment-vercel) section in the database docs.
