# Fuel vs Electric Car TCO Simulator

A Monte Carlo simulation tool that compares the Total Cost of Ownership (TCO) of gasoline, diesel, and electric vehicles over a configurable time horizon.

Fuel prices for all 28 EU countries (since 2005) are stored in a Postgres database, refreshed weekly from the EC Oil Bulletin. Electricity prices come from Eurostat. The app works without a database too — it falls back to live EC fetch and embedded historical data.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the full setup with a local database (Docker Postgres, migrations, seeding all EU countries), see the [Local Development Setup](./docs/local-setup.md) guide.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| Charts | Recharts 3 |
| Language | TypeScript 5 |
| Database | Postgres (pg driver, Neon/Vercel Postgres compatible) |
| Data Parsing | xlsx (for EC Oil Bulletin) |

## Documentation

Full documentation is in the [`docs/`](./docs/) folder:

- [Local Development Setup](./docs/local-setup.md)
- [Architecture Overview](./docs/architecture.md)
- [Database](./docs/database.md)
- [Simulation Engine](./docs/simulation-engine.md)
- [Components Reference](./docs/components.md)
- [Charts & Visualizations](./docs/charts.md)
- [API Reference](./docs/api.md)
- [Configuration & Defaults](./docs/configuration.md)
