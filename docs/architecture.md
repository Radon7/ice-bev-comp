# Architecture Overview

## High-Level Design

The app is a **client-side rendered** Next.js application with a single API route for live data fetching. All simulation logic runs in the browser.

```
┌─────────────────────────────────────────────────────────┐
│                    page.tsx (Client)                     │
│  State: cars, config, results, prices, running          │
│  Fetches live prices from /api/prices on mount          │
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
┌─────────────────────────┐
│  Price Data             │
│  - Live: /api/prices    │
│  - Fallback: embedded   │
│    historical-data.ts   │
└─────────────────────────┘
```

## Project Structure

```
app/
├── api/prices/route.ts     Server-side API route (live prices)
├── layout.tsx              Root layout, fonts, metadata
├── page.tsx                Main page - state management & layout
└── globals.css             Minimal global styles

components/
├── ParameterPanel.tsx      Simulation controls (left sidebar)
├── ResultsSummary.tsx      TCO summary cards
├── SensitivityTable.tsx    Sensitivity analysis tables
├── ThemeRegistry.tsx       MUI theme provider & dark/light toggle
└── charts/
    ├── AnnualCostChart.tsx  Annual fuel/energy costs (line)
    ├── BreakevenChart.tsx   EV win rate by distance (bar)
    ├── CumulativeCost.tsx   Cumulative spending over time (line)
    ├── PriceSimChart.tsx    Price simulation percentiles (area)
    └── TcoDistribution.tsx  TCO histogram (bar)

lib/
├── types.ts                TypeScript interfaces & default values
├── simulation.ts           Monte Carlo engine (core logic)
└── historical-data.ts      Embedded 52-week EC Oil Bulletin snapshot
```

## Data Flow

1. **On mount**: `page.tsx` fetches live fuel prices from `/api/prices`
2. **User adjusts parameters**: `ParameterPanel` updates `cars` and `config` state via callbacks
3. **User clicks "Run Simulation"**: `runSimulation()` executes client-side with current state
4. **Results propagate**: All child components re-render with new `SimulationResult` data

## Rendering Strategy

- **Client-side only**: The main page and all components use `'use client'` directive
- **Server-side**: Only the `/api/prices` route runs on the server (fetches and parses the EC Oil Bulletin Excel file)
- **No SSR for simulation**: All Monte Carlo computation happens in the browser to avoid server load

## Theming

The `ThemeRegistry` component provides:
- MUI theme configuration with custom palette
- Dark/light mode toggle via `useColorMode()` hook
- Color scheme: blue (gasoline), orange (diesel), green (electric)
- Dark mode uses deep blue backgrounds (`#0a0f1a`, `#111827`)

## State Management

All state lives in `page.tsx` using React `useState`:

| State | Type | Purpose |
|-------|------|---------|
| `cars` | `CarParams[]` | Vehicle parameters (3 cars) |
| `config` | `SimConfig` | Simulation configuration |
| `results` | `SimulationResult \| null` | Simulation output |
| `prices` | `PriceData[] \| null` | Live fuel prices |
| `running` | `boolean` | Simulation in-progress flag |
| `loadingPrices` | `boolean` | Price fetch in-progress flag |

No external state management library is used. Props flow down, callbacks flow up.
