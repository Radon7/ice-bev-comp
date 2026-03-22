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
```

If you skip the database, you don't need `.env.local` at all — the app works without it.

## 4. Run database migrations

Skip this step if you're not using the database.

```bash
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/comp_benzina npx tsx scripts/migrate.ts
```

This creates the `fuel_prices` and `refresh_log` tables.

## 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is ready to use.

Without a database, the first load takes a few seconds while it downloads the EC Oil Bulletin XLSX. With a database, it's instant (but the database is empty — see step 6).

## 6. Seed the database (optional)

With the dev server running, trigger a full backfill of all 28 EU countries since 2005:

```bash
curl -H "Authorization: Bearer local-dev-secret" http://localhost:3000/api/prices/refresh
```

This downloads the EC Oil Bulletin (~3 MB), parses all countries and fuel types, and inserts ~128K rows. Takes about 5-10 seconds.

You should see a response like:

```json
{
  "ok": true,
  "rowsUpserted": 127951,
  "countries": 28,
  "totalParsed": 127951,
  "durationMs": 4640
}
```

## 7. Verify everything works

```bash
# Italy (default)
curl -s http://localhost:3000/api/prices | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"

# Another country
curl -s "http://localhost:3000/api/prices?country=DE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Source: {d[\"source\"]}, Country: {d[\"country\"]}, Data points: {d[\"count\"]}')
"
```

Expected output with database:

```
Source: database, Country: IT, Data points: 1057
Source: database, Country: DE, Data points: 1058
```

Expected output without database:

```
Source: ec_oil_bulletin, Country: IT, Data points: 1057
```

## Docker cheat sheet

```bash
# Stop the database (data persists)
docker stop comp-benzina-db

# Restart (data is still there)
docker start comp-benzina-db

# Connect with psql for debugging
docker exec -it comp-benzina-db psql -U postgres -d comp_benzina

# Check row counts per country
docker exec comp-benzina-db psql -U postgres -d comp_benzina \
  -c "SELECT country, COUNT(*) FROM fuel_prices GROUP BY country ORDER BY country;"

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
