# Configuration & Defaults

All default values are defined in `lib/types.ts`.

## Simulation Configuration (`SimConfig`)

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `nSimulations` | 5,000 | 1,000-10,000 | Number of Monte Carlo runs |
| `horizonYears` | 10 | 1-20 | Ownership period in years |
| `annualKm` | 15,000 | 5,000-50,000 | Annual driving distance |
| `electricityPrice` | 0.33 | 0.10-0.60 | Fallback electricity price (EUR/kWh). Overridden by latest Eurostat data when available |
| `electricityDrift` | 0 | - | Annual price drift for electricity (0 = no trend assumption). Overridable via `NEXT_PUBLIC_ELECTRICITY_DRIFT` env var |
| `electricityVol` | 0.08 | - | Annual price volatility for electricity (parametric) |
| `homeChargingShare` | 0.80 | 0-1 | Fraction of charging done at home |
| `homeChargingPriceFactor` | 0.75 | 0-1 | Multiplier on electricity price for home charging (off-peak/domestic tariffs) |
| `publicChargingPremium` | 1.50 | 1-3 | Multiplier for public charging cost |

## Vehicle Parameters (`CarParams`)

### Gasoline (Euro 95)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Gasoline (Euro 95)" | Display name |
| `fuelType` | "euro95" | Fuel type identifier |
| `purchasePrice` | 25,000 | Purchase price (EUR) |
| `consumptionPer100km` | 6.5 | Fuel consumption (L/100km) |
| `annualMaintenance` | 800 | Annual maintenance (EUR/year) |
| `insuranceAnnual` | 600 | Annual insurance (EUR/year) |
| `annualTax` | 250 | Annual road tax (EUR/year) |
| `depreciationRate` | 0.15 | Annual depreciation rate |

### Diesel

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Diesel" | Display name |
| `fuelType` | "diesel" | Fuel type identifier |
| `purchasePrice` | 27,000 | Purchase price (EUR) |
| `consumptionPer100km` | 5.0 | Fuel consumption (L/100km) |
| `annualMaintenance` | 900 | Annual maintenance (EUR/year) |
| `insuranceAnnual` | 600 | Annual insurance (EUR/year) |
| `annualTax` | 300 | Annual road tax (EUR/year) |
| `depreciationRate` | 0.15 | Annual depreciation rate |

### Electric (BEV)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | "Electric (BEV)" | Display name |
| `fuelType` | "electric" | Fuel type identifier |
| `purchasePrice` | 35,000 | Purchase price (EUR) |
| `consumptionPer100km` | 16.0 | Energy consumption (kWh/100km) |
| `annualMaintenance` | 350 | Annual maintenance (EUR/year) |
| `insuranceAnnual` | 550 | Annual insurance (EUR/year) |
| `annualTax` | 0 | Road tax (EUR/year, exempt first 5 years) |
| `depreciationRate` | 0.18 | Annual depreciation rate |
| `taxExemptYears` | 5 | Years of road tax exemption |
| `annualTaxAfterExempt` | 100 | Road tax after exemption period (EUR/year) |

## Data Sources

- **Fuel prices**: EC Oil Bulletin weekly data (Italy, taxes included). Live API with embedded fallback (~1,000 weekly observations since 2005)
- **Electricity prices**: Eurostat `nrg_pc_204` semi-annual data (Italian household, 2500-4999 kWh band, all taxes included). Live API with embedded fallback (35 observations since 2008)

## Italian Market Specifics

- **EV tax exemption**: No road tax for the first 5 years of ownership, then EUR 100/year
- **Home charging factor**: 0.75x base electricity price (accounts for off-peak/domestic tariffs)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ELECTRICITY_DRIFT` | `0` | Annual electricity price drift for GBM simulation. Set in Vercel dashboard or `.env.local`. Inlined at build time |

## TypeScript Types

```typescript
interface CarParams {
  name: string;
  fuelType: "euro95" | "diesel" | "electric";
  purchasePrice: number;
  consumptionPer100km: number;  // L/100km or kWh/100km
  annualMaintenance: number;    // EUR/year
  insuranceAnnual: number;      // EUR/year
  annualTax: number;            // EUR/year
  depreciationRate: number;     // 0-1
  taxExemptYears?: number;
  annualTaxAfterExempt?: number;
}

interface ElectricityPricePoint {
  date: string;   // e.g. "2024-S1"
  price: number;  // EUR/kWh, all taxes included
}

interface SimConfig {
  nSimulations: number;
  horizonYears: number;
  annualKm: number;
  electricityPrice: number;
  electricityDrift: number;
  electricityVol: number;
  homeChargingShare: number;
  homeChargingPriceFactor: number;
  publicChargingPremium: number;
}
```
