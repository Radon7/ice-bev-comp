# Fuel vs Electric TCO Simulator - Documentation

A Monte Carlo simulation tool that compares the Total Cost of Ownership (TCO) of gasoline, diesel, and electric vehicles over a configurable time horizon, calibrated for the Italian market.

## Table of Contents

- [Architecture Overview](./architecture.md)
- [Simulation Engine](./simulation-engine.md)
- [Components Reference](./components.md)
- [API Reference](./api.md)
- [Configuration & Defaults](./configuration.md)
- [Charts & Visualizations](./charts.md)

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
| UI | React 19, Material-UI 7, Tailwind CSS 4 |
| Charts | Recharts 3 |
| Language | TypeScript 5 |
| Data Parsing | xlsx (for EC Oil Bulletin) |
