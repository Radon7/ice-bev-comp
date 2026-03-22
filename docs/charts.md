# Charts & Visualizations

All charts use [Recharts](https://recharts.org/) and follow a consistent color scheme:
- **Blue** (`#2196F3`): Gasoline (Euro95)
- **Orange** (`#FF9800`): Diesel
- **Green** (`#4CAF50`): Electric (BEV)

---

## Price Simulation Chart

**File**: `components/charts/PriceSimChart.tsx`

Three side-by-side area charts showing simulated price paths.

| Detail | Value |
|--------|-------|
| Chart type | Area (filled bands) |
| X-axis | Years (0 to horizon) |
| Y-axis | Price (EUR/L or EUR/kWh) |
| Bands | 5th percentile, Median, 95th percentile |

**Purpose**: Visualizes price uncertainty. Wide bands indicate high volatility; narrow bands indicate predictable prices. Electricity typically shows narrower bands than fossil fuels.

---

## TCO Distribution

**File**: `components/charts/TcoDistribution.tsx`

Histogram showing the probability distribution of total costs.

| Detail | Value |
|--------|-------|
| Chart type | Stacked bar |
| X-axis | Cost bins (EUR, in thousands) |
| Y-axis | Frequency (% of simulations) |
| Series | One per vehicle type |
| Bins | 20 equal-width bins |

**Purpose**: Shows the full range of possible outcomes. Overlapping distributions indicate uncertainty about which vehicle is cheapest; separated distributions indicate a clear winner.

---

## Cumulative Cost

**File**: `components/charts/CumulativeCost.tsx`

Line chart tracking total spending over time.

| Detail | Value |
|--------|-------|
| Chart type | Line |
| X-axis | Year (0 to horizon) |
| Y-axis | Cumulative net cost (EUR) |
| Series | Median path for each vehicle |

**Purpose**: Reveals crossover points. The EV line starts higher (purchase price) but grows slower (cheaper fuel + maintenance). Where lines cross is the breakeven point.

---

## Breakeven Chart

**File**: `components/charts/BreakevenChart.tsx`

Bar chart showing EV competitiveness at different driving distances.

| Detail | Value |
|--------|-------|
| Chart type | Grouped bar |
| X-axis | Annual driving distance (5k-40k km) |
| Y-axis | EV win rate (%) |
| Series | EV vs Gasoline, EV vs Diesel |

**Purpose**: Answers "how much do I need to drive for an EV to make sense?" Higher mileage generally favors EVs because fuel savings compound while the purchase price difference is fixed.

---

## Annual Cost Chart

**File**: `components/charts/AnnualCostChart.tsx`

Line chart showing yearly fuel/energy costs.

| Detail | Value |
|--------|-------|
| Chart type | Line |
| X-axis | Year (1 to horizon) |
| Y-axis | Annual fuel/energy cost (EUR) |
| Series | Median cost for each vehicle |

**Purpose**: Shows running cost trajectories without the purchase price. Highlights how fossil fuel price volatility creates more year-to-year variation than electricity.
