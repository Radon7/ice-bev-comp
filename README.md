# Fuel vs Electric Car TCO Simulator

A Monte Carlo simulation tool that compares the Total Cost of Ownership (TCO) of gasoline, diesel, and electric vehicles over a configurable time horizon, calibrated for the Italian market.

Live fuel prices from the EC Oil Bulletin and electricity prices from Eurostat are fetched automatically, with embedded historical fallbacks.

## Quick Start

```bash
npm install
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
| Data Parsing | xlsx (for EC Oil Bulletin) |

## Documentation

Full documentation is in the [`docs/`](./docs/) folder:

- [Architecture Overview](./docs/architecture.md)
- [Simulation Engine](./docs/simulation-engine.md)
- [Components Reference](./docs/components.md)
- [Charts & Visualizations](./docs/charts.md)
- [API Reference](./docs/api.md)
- [Configuration & Defaults](./docs/configuration.md)
