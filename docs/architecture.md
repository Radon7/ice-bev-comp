# Architecture Overview

## High-Level Design

The app is a **client-side rendered** Next.js application with API routes for live data fetching, backed by a **Postgres database** for fuel price storage. All simulation logic runs in the browser.

```
┌─────────────────────────────────────────────────────────┐
│                    page.tsx (Client)                     │
│  State: cars, config, results, prices, elecPrices,      │
│         dataSource, elecDataSource, running              │
│  Fetches live prices on mount from both API endpoints   │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌────────────┐ ┌──────────┐ ┌──────────────────┐
│ Parameter  │ │ Results  │ │    Charts &      │
│ Panel      │ │ Summary  │ │    Tables        │
│ (inputs)   │ │ (output) │ │    (output)      │
└────────────┘ └──────────┘ └──────────────────┘
       │
       │    onRun()
       ▼
┌─────────────────────────┐
│  runSimulation()        │  lib/simulation.ts
│  - Calibrates GBM       │
│  - Generates price paths│
│  - Computes TCO stats   │
│  - Sensitivity analysis │
└─────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Price Data (3-tier fallback)                            │
│                                                          │
│  Fuel prices:                                            │
│    1. Postgres DB  ←  weekly cron refresh                │
│    2. Live EC Oil Bulletin fetch                         │
│    3. Embedded historical data (Italy only, last resort) │
│                                                          │
│  Electricity prices:                                     │
│    - /api/electricity-prices (Eurostat)                   │
│    - Fallback: lib/historical-electricity-data.ts        │
└──────────────────────────────────────────────────────────┘
       ▲
       │  Mondays 14:00 UTC (Vercel cron)
┌──────────────────────────────────────────────────────────┐
│  /api/prices/refresh                                     │
│  Downloads EC Oil Bulletin XLSX → parses all 28          │
│  countries × 6 fuel types → upserts into Postgres        │
└──────────────────────────────────────────────────────────┘
```

## Project Structure

```
app/
├── api/
│   ├── prices/
│   │   ├── route.ts                   Fuel prices API (Postgres → EC live → embedded fallback)
│   │   └── refresh/route.ts           Cron endpoint: refresh all countries from EC Oil Bulletin
│   └── electricity-prices/route.ts    Server-side API (live electricity prices)
├── layout.tsx                         Root layout, fonts, metadata
├── page.tsx                           Main page - state management & layout
└── globals.css                        Minimal global styles

components/
├── ParameterPanel.tsx                 Simulation controls (left sidebar)
├── ResultsSummary.tsx                 TCO summary cards
├── SensitivityTable.tsx               Sensitivity analysis tables
├── ThemeRegistry.tsx                  Dark/light mode provider
├── charts/
│   ├── AnnualCostChart.tsx            Annual fuel/energy costs (line)
│   ├── BreakevenChart.tsx             EV win rate by distance (bar)
│   ├── CumulativeCost.tsx             Cumulative spending over time (line)
│   ├── PriceSimChart.tsx              Price simulation percentiles (area)
│   └── TcoDistribution.tsx            TCO histogram (bar)
└── ui/                                shadcn/ui primitives
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── separator.tsx
    └── slider.tsx

lib/
├── db.ts                              Postgres client (pg Pool, tagged template SQL)
├── ec-fetcher.ts                      Dynamic XLSX parser for all EU countries (6 fuel types)
├── price-store.ts                     Data access layer (getPrices, upsertPrices, logRefresh)
├── types.ts                           TypeScript interfaces & default values
├── simulation.ts                      Monte Carlo engine (core logic)
├── historical-data.ts                 Embedded EC Oil Bulletin snapshot (~1,000 weekly obs)
├── historical-electricity-data.ts     Embedded Eurostat snapshot (35 semi-annual obs)
└── utils.ts                           Utility functions (cn helper)

scripts/
├── migrations/
│   └── 001_create_tables.sql          Database schema (fuel_prices + refresh_log)
├── migrate.ts                         Migration runner (npx tsx scripts/migrate.ts)
└── inspect-bulletin.ts                XLSX structure inspector (dev tool)

vercel.json                            Cron schedule (weekly refresh)
```

## Data Flow

1. **On mount**: `page.tsx` fetches fuel prices from `/api/prices` and electricity prices from `/api/electricity-prices` in parallel
2. **Fuel price resolution** (3-tier fallback):
   - **Tier 1 — Postgres**: Read from the `fuel_prices` table (populated by weekly cron). Fastest path
   - **Tier 2 — Live EC fetch**: If DB is empty or unavailable, download and parse the EC Oil Bulletin XLSX on the fly. Parsed data is also persisted to DB in the background
   - **Tier 3 — Embedded fallback**: If both above fail, use the compiled-in historical snapshot (Italy only)
3. **User adjusts parameters**: `ParameterPanel` updates `cars` and `config` state via callbacks
4. **User clicks "Run Simulation"**: `runSimulation()` executes client-side with current state
5. **Results propagate**: All child components re-render with new `SimResults` data

### Database Refresh Flow

A Vercel cron job triggers `/api/prices/refresh` every Monday at 14:00 UTC:

1. The cron sends a request with `Authorization: Bearer <CRON_SECRET>`
2. `ec-fetcher.ts` downloads the EC Oil Bulletin XLSX (~3 MB)
3. The dynamic parser auto-discovers country/fuel columns from XLSX headers
4. All rows are upserted into `fuel_prices` (ON CONFLICT update)
5. The result is logged in `refresh_log` for monitoring

## Rendering Strategy

- **Client-side only**: The main page and all components use `'use client'` directive
- **Server-side**: API routes run on the server:
  - `/api/prices` — reads fuel prices from Postgres (with live EC fetch and embedded fallback). Supports `?country=` parameter for any EU country
  - `/api/prices/refresh` — cron endpoint that refreshes all countries from the EC Oil Bulletin into Postgres
  - `/api/electricity-prices` — fetches Eurostat JSON API for Italian household electricity prices
- **No SSR for simulation**: All Monte Carlo computation happens in the browser to avoid server load

## Theming

The `ThemeRegistry` component provides dark/light mode support using Tailwind CSS:

- Toggles the `dark` class on `<html>` via `document.documentElement.classList`
- Persists preference in `localStorage`
- Exposes `useColorMode()` hook returning `{ mode, toggleColorMode }`
- Color scheme uses Tailwind classes: blue (gasoline), orange (diesel), emerald (electric)

## State Management

All state lives in `page.tsx` using React `useState`:

| State | Type | Purpose |
|-------|------|---------|
| `cars` | `CarParams[]` | Vehicle parameters (3 cars) |
| `config` | `SimConfig` | Simulation configuration |
| `results` | `SimResults \| null` | Simulation output |
| `prices` | `PricePoint[]` | Fuel prices (live or embedded) |
| `elecPrices` | `ElectricityPricePoint[]` | Electricity prices (live or embedded) |
| `dataSource` | `'embedded' \| 'live'` | Fuel price data origin |
| `elecDataSource` | `'embedded' \| 'live'` | Electricity price data origin |
| `running` | `boolean` | Simulation in-progress flag |
| `loadingPrices` | `boolean` | Price fetch in-progress flag |

No external state management library is used. Props flow down, callbacks flow up.
