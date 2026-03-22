# Components Reference

## Page (`app/page.tsx`)

The main orchestrator component. Manages all application state and renders the layout:

- **Top bar**: App title + theme toggle button
- **Left sidebar** (sticky): `ParameterPanel`
- **Main area**: `ResultsSummary`, all charts, `SensitivityTable`

### Key Behavior

- Fetches live prices from `/api/prices` on mount
- Passes live prices to `runSimulation()` when available
- Shows loading spinner during simulation (with iteration count)
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
| `loadingPrices` | `boolean` | Show price loading state |
| `prices` | `PriceData[] \| null` | Live prices to display |

### Sections

1. **Simulation Settings**: Horizon (years), number of simulations, annual driving (km)
2. **Electricity Settings**: Base price, home charging share, public charging premium
3. **Vehicle Cards** (one per car):
   - Color-coded border (blue/orange/green)
   - Sliders: purchase price, consumption, maintenance, insurance, tax, depreciation

---

## ResultsSummary

**File**: `components/ResultsSummary.tsx`

Displays headline TCO results after simulation.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `results` | `SimulationResult` | Full simulation output |
| `config` | `SimConfig` | Config (for display context) |

### Display

- **3 vehicle cards**: Mean, Median, P5-P95 range, Win Rate
- **"Best" badge** on the lowest-cost vehicle
- **3 comparison cards**: EV vs Gasoline, EV vs Diesel, Diesel vs Gasoline
  - Shows EUR savings and percentage difference
- **Calibration info**: Drift (mu), volatility (sigma), correlation for fuel prices

---

## SensitivityTable

**File**: `components/SensitivityTable.tsx`

Two sensitivity analysis tables.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `results` | `SimulationResult` | Contains sensitivity data |

### Tables

1. **EV Purchase Price Sensitivity** (EUR 28k-40k): EV win rate vs gasoline at each price point
2. **Electricity Price Sensitivity** (EUR 0.20-0.40/kWh): EV win rate vs gasoline at each price

Cells are color-coded: green when EV wins >50%, red when <50%.

---

## ThemeRegistry

**File**: `components/ThemeRegistry.tsx`

MUI theme provider with dark/light mode support.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `ThemeRegistry` | Component | Wraps app in MUI `ThemeProvider` |
| `useColorMode` | Hook | Returns `{ mode, toggleColorMode }` |

### Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Primary | `#2196F3` | Gasoline / general UI |
| Secondary | `#FF9800` | Diesel |
| Success | `#4CAF50` | Electric |
| Dark BG | `#0a0f1a` | Dark mode background |
| Dark Paper | `#111827` | Dark mode card surfaces |
