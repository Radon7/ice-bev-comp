# Simulation Engine

The core simulation logic lives in `lib/simulation.ts`. It is a TypeScript port of `montecarlo_fuel.py` implementing Monte Carlo TCO analysis with Geometric Brownian Motion (GBM) price modeling.

## Overview

The engine runs N independent simulations (default: 5,000), each generating random fuel/electricity price paths over the configured horizon. For each path it computes the total cost of ownership for all three vehicle types, then aggregates statistics across all runs.

## Step-by-Step Process

### 1. Load Historical Prices

The simulation accepts either live EC Oil Bulletin data or falls back to an embedded 52-week snapshot (`lib/historical-data.ts`). It extracts weekly Euro95 and Diesel prices in EUR/L.

### 2. Calibrate GBM Parameters

From historical weekly prices, the engine computes:

- **Log returns**: `r(t) = ln(P(t) / P(t-1))`
- **Drift (mu)**: Mean of log returns, annualized
- **Volatility (sigma)**: Standard deviation of log returns, annualized
- **Correlation**: Pearson correlation between Euro95 and Diesel log returns

These parameters drive the stochastic price simulation.

### 3. Generate Correlated Price Paths

For each simulation run:

1. Generate two independent standard normal variates (Z1, Z2) using the **Box-Muller transform**
2. Apply **Cholesky decomposition** to correlate them:
   ```
   Z_euro95 = Z1
   Z_diesel = rho * Z1 + sqrt(1 - rho^2) * Z2
   ```
3. Step forward weekly using GBM:
   ```
   S(t+dt) = S(t) * exp((mu - sigma^2/2) * dt + sigma * sqrt(dt) * Z)
   ```

This produces realistic correlated fuel price paths where Euro95 and Diesel move together but not identically.

### 4. Electricity Price Paths

Electricity is modeled independently with configurable GBM parameters:
- Default drift: 2% per year
- Default volatility: 8% per year

The effective electricity price accounts for mixed charging:
```
effective_price = home_share * base_price * home_factor
               + (1 - home_share) * base_price * public_premium
```

Default: 80% home charging at 0.75x price + 20% public at 1.5x price.

### 5. Compute TCO

For each simulation path and each vehicle:

```
TCO = purchase_price
    + SUM(weekly_fuel_cost * 52 * horizon_years)
    + SUM(annual_maintenance + insurance + tax) * horizon_years
    - residual_value
```

Where:
- **Weekly fuel cost** = `(annual_km / 52) * (consumption / 100) * price(t)`
- **Residual value** = `purchase_price * (1 - depreciation_rate) ^ horizon_years`
- **EV tax**: Free for first 5 years (Italian exemption), then EUR 100/year

### 6. Aggregate Statistics

Across all N simulations:

| Metric | Description |
|--------|-------------|
| Mean TCO | Average total cost |
| Median TCO | 50th percentile |
| P5, P95 | 5th and 95th percentile (confidence interval) |
| Std Dev | Spread of outcomes |
| Win Rate | % of simulations where this vehicle has the lowest TCO |

### 7. Breakeven Analysis

Re-runs the win rate calculation for annual driving distances from 5,000 to 40,000 km (in 5,000 km steps), showing how mileage affects EV competitiveness.

### 8. Cumulative Cost Over Time

Tracks the median cumulative spending trajectory year-by-year:
```
cumulative(year) = purchase_price + SUM(fuel_cost(1..year)) + SUM(fixed_costs(1..year))
```

This reveals crossover points where the EV's higher purchase price is offset by lower running costs.

### 9. Annual Energy Costs

Extracts the median annual fuel/energy cost per year (excluding fixed costs), showing how price trajectories differ across vehicle types.

### 10. Sensitivity Analysis

Two sensitivity sweeps:

1. **EV purchase price** (EUR 28k-40k in 2k steps): For each price point, compute the % of simulations where EV beats gasoline
2. **Electricity price** (EUR 0.20-0.40/kWh in 0.02 steps): Same metric

## Key Mathematical Details

### Geometric Brownian Motion

GBM is the standard model for asset prices. It assumes:
- Returns are log-normally distributed
- Volatility is constant over time
- Price cannot go negative

The discrete-time update for weekly steps:
```
dt = 1/52
S(t+1) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
```

### Box-Muller Transform

Converts two uniform random numbers (U1, U2) into two independent standard normals:
```
Z1 = sqrt(-2*ln(U1)) * cos(2*pi*U2)
Z2 = sqrt(-2*ln(U1)) * sin(2*pi*U2)
```

### Correlation via Cholesky

To correlate Euro95 and Diesel prices:
```
Z_diesel = rho * Z_euro95 + sqrt(1 - rho^2) * Z_independent
```

This ensures the two fuel prices have the empirically observed correlation while each follows its own GBM process.
