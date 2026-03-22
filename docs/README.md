# Fuel vs Electric TCO Simulator - Documentation

A Monte Carlo simulation tool that compares the Total Cost of Ownership (TCO) of gasoline, diesel, and electric vehicles over a configurable time horizon. Supports all 28 EU countries with fuel prices from the EC Oil Bulletin and electricity prices from Eurostat, both stored in a Postgres database.

## Table of Contents

- [Local Development Setup](./local-setup.md)
- [Architecture Overview](./architecture.md)
- [Database](./database.md)
- [Simulation Engine](./simulation-engine.md)
- [Components Reference](./components.md)
- [API Reference](./api.md)
- [Configuration & Defaults](./configuration.md)
- [Charts & Visualizations](./charts.md)

## Quick Start

```bash
npm install

# Start local Postgres (optional — app falls back to live EC fetch + embedded data)
docker run -d --name comp-benzina-db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_prices -p 5432:5432 postgres:16-alpine

# Create .env.local with POSTGRES_URL and CRON_SECRET (see docs/database.md)

# Run migrations
npx tsx scripts/migrate.ts

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| Charts | Recharts 3 |
| Language | TypeScript 5 |
| Database | Postgres (pg driver, Vercel Postgres / Neon compatible) |
| Data Parsing | xlsx (EC Oil Bulletin) + Eurostat JSON API (electricity) |
