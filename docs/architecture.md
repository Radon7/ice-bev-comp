# Architecture Overview

## High-Level Design

The app is a **client-side rendered** Next.js application with two API routes for live data fetching. All simulation logic runs in the browser.

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
┌──────────────────────────────────────┐
│  Price Data                          │
│  - Fuel: /api/prices                 │
│    Fallback: lib/historical-data.ts  │
│  - Elec: /api/electricity-prices     │
│    Fallback: lib/historical-         │
│             electricity-data.ts      │
└──────────────────────────────────────┘
```

## Project Structure

```
app/
├── api/
│   ├── prices/route.ts                Server-side API (live fuel prices)
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
├── types.ts                           TypeScript interfaces & default values
├── simulation.ts                      Monte Carlo engine (core logic)
├── historical-data.ts                 Embedded EC Oil Bulletin snapshot (~1,000 weekly obs)
├── historical-electricity-data.ts     Embedded Eurostat snapshot (35 semi-annual obs)
└── utils.ts                           Utility functions (cn helper)
```

## Data Flow

1. **On mount**: `page.tsx` fetches live fuel prices from `/api/prices` and electricity prices from `/api/electricity-prices` in parallel
2. **User adjusts parameters**: `ParameterPanel` updates `cars` and `config` state via callbacks
3. **User clicks "Run Simulation"**: `runSimulation()` executes client-side with current state
4. **Results propagate**: All child components re-render with new `SimResults` data

## Rendering Strategy

- **Client-side only**: The main page and all components use `'use client'` directive
- **Server-side**: Two API routes run on the server:
  - `/api/prices` — fetches and parses the EC Oil Bulletin Excel file
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
