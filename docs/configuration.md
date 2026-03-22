# Configuration & Defaults

All default values are defined in `lib/types.ts`.

## Simulation Configuration (`SimConfig`)

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `numSimulations` | 5,000 | 1,000-10,000 | Number of Monte Carlo runs |
| `horizonYears` | 10 | 1-20 | Ownership period in years |
| `annualKm` | 15,000 | 5,000-50,000 | Annual driving distance |
| `electricityPrice` | 0.33 | 0.10-0.60 | Base electricity price (EUR/kWh) |
| `homeChargingShare` | 0.80 | 0-1 | Fraction of charging done at home |
| `publicChargingPremium` | 1.50 | 1-3 | Multiplier for public charging cost |
| `electricityDrift` | 0 | - | Annual price drift for electricity (0 = no trend assumption). Overridable via `NEXT_PUBLIC_ELECTRICITY_DRIFT` env var |
| `electricityVol` | 0.08 | - | Annual price volatility for electricity (parametric) |

## Vehicle Parameters (`CarParams`)

### Gasoline (Euro95)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Benzina" | Display name |
| `fuel` | "euro95" | Fuel type identifier |
| `purchasePrice` | 25,000 | Purchase price (EUR) |
| `consumption` | 6.5 | Fuel consumption (L/100km) |
| `maintenanceCost` | 800 | Annual maintenance (EUR/year) |
| `insuranceCost` | 600 | Annual insurance (EUR/year) |
| `taxCost` | 250 | Annual road tax (EUR/year) |
| `depreciationRate` | 0.15 | Annual depreciation rate |

### Diesel

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Diesel" | Display name |
| `fuel` | "diesel" | Fuel type identifier |
| `purchasePrice` | 27,000 | Purchase price (EUR) |
| `consumption` | 5.0 | Fuel consumption (L/100km) |
| `maintenanceCost` | 900 | Annual maintenance (EUR/year) |
| `insuranceCost` | 600 | Annual insurance (EUR/year) |
| `taxCost` | 300 | Annual road tax (EUR/year) |
| `depreciationRate` | 0.15 | Annual depreciation rate |

### Electric (BEV)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Elettrica" | Display name |
| `fuel` | "electric" | Fuel type identifier |
| `purchasePrice` | 35,000 | Purchase price (EUR) |
| `consumption` | 16.0 | Energy consumption (kWh/100km) |
| `maintenanceCost` | 350 | Annual maintenance (EUR/year) |
| `insuranceCost` | 550 | Annual insurance (EUR/year) |
| `taxCost` | 0 | Road tax (EUR/year, exempt 5 yrs) |
| `depreciationRate` | 0.18 | Annual depreciation rate |

## Italian Market Specifics

- **EV tax exemption**: No road tax for the first 5 years of ownership, then EUR 100/year
- **Fuel prices**: Sourced from EC Oil Bulletin, specific to Italy (includes taxes)
- **Electricity prices**: Sourced from Eurostat nrg_pc_204 (Italian household, 2500-4999 kWh band, all taxes)
- **Home charging factor**: 0.75x base electricity price (accounts for off-peak/domestic tariffs)

## TypeScript Types

```typescript
interface CarParams {
  name: string;
  fuel: "euro95" | "diesel" | "electric";
  purchasePrice: number;
  consumption: number;        // L/100km or kWh/100km
  maintenanceCost: number;    // EUR/year
  insuranceCost: number;      // EUR/year
  taxCost: number;            // EUR/year
  depreciationRate: number;   // 0-1
}

interface SimConfig {
  numSimulations: number;
  horizonYears: number;
  annualKm: number;
  electricityPrice: number;
  electricityDrift: number;
  electricityVol: number;
  homeChargingShare: number;
  publicChargingPremium: number;
}

interface PriceData {
  date: string;
  euro95: number;
  diesel: number;
}
```
