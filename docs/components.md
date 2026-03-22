# Components Reference

## Page (`app/page.tsx`)

The main orchestrator component. Manages all application state and renders the layout:

- **Header**: App title, "Live data" badge, theme toggle button
- **Left sidebar** (sticky): `ParameterPanel` inside a Card
- **Main area**: `ResultsSummary`, all charts, `SensitivityTable`

### Key Behavior

- Fetches live prices from `/api/prices` and `/api/electricity-prices` on mount (in parallel)
- Passes live prices to `runSimulation()` when available, otherwise uses embedded fallbacks
- Shows loading spinner during price fetch and during simulation
- Responsive grid: sidebar collapses on small screens

---

## ParameterPanel

**File**: `components/ParameterPanel.tsx`

Interactive controls for all simulation parameters.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `cars` | `CarParams[]` | Current vehicle parameters |
| `config` | `SimConfig` | Current simulation config |
| `onCarsChange` | `(cars: CarParams[]) => void` | Vehicle param update callback |
| `onConfigChange` | `(config: SimConfig) => void` | Config update callback |
| `onRun` | `() => void` | Trigger simulation |
| `running` | `boolean` | Disable controls during simulation |

### Sections

1. **Simulation Settings**: Horizon (years), number of simulations, annual driving (km)
2. **Electricity Settings**: Base price, home charging share, public charging premium
3. **Vehicle Cards** (one per car): Sliders for purchase price, consumption, maintenance, insurance, tax, depreciation

---

## ResultsSummary

**File**: `components/ResultsSummary.tsx`

Displays vehicle TCO cards after simulation.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `results` | `SimResults` | Full simulation output |

### Display

- **3 vehicle cards**: Mean, Median, P5-P95 range, color-coded left border (blue/orange/emerald)
- **"Best" badge** on the lowest-cost vehicle
- Comparison cards and win rate highlight are rendered directly in `page.tsx`

---

## SensitivityTable

**File**: `components/SensitivityTable.tsx`

Two sensitivity analysis tables.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `sensitivityEvPrice` | `{ price: number; winRate: number }[]` | EV purchase price sensitivity data |
| `sensitivityElecPrice` | `{ price: number; winRate: number }[]` | Electricity price sensitivity data |

### Tables

1. **EV Purchase Price Sensitivity** (EUR 28k-40k): EV win rate vs gasoline at each price point
2. **Electricity Price Sensitivity** (EUR 0.20-0.40/kWh): EV win rate vs gasoline at each price

Cells show a progress bar colored emerald when EV wins >50%, red when <50%.

---

## ThemeRegistry

**File**: `components/ThemeRegistry.tsx`

Dark/light mode provider using Tailwind CSS class strategy.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `ThemeRegistry` | Component | Wraps app in `ColorModeContext.Provider` |
| `useColorMode` | Hook | Returns `{ mode, toggleColorMode }` |

### Behavior

- Toggles the `dark` class on `document.documentElement`
- Persists preference to `localStorage` under the key `theme`
- Defaults to dark mode on first visit
