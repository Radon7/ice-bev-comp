export interface CarParams {
  name: string;
  purchasePrice: number;
  consumptionPer100km: number;
  fuelType: 'euro95' | 'diesel' | 'electric';
  annualMaintenance: number;
  insuranceAnnual: number;
  annualTax: number;
  depreciationRate: number;
  taxExemptYears?: number;
  annualTaxAfterExempt?: number;
}

export interface ElectricityPricePoint {
  date: string;   // e.g. "2024-S1"
  price: number;  // €/kWh, all taxes included
}

export interface SimConfig {
  nSimulations: number;
  horizonYears: number;
  annualKm: number;
  electricityPrice: number;
  electricityVol: number;
  homeChargingShare: number;
  homeChargingPriceFactor: number;
  publicChargingPremium: number;
}

export interface PercentileBands {
  p5: number[];
  p50: number[];
  p95: number[];
}

export interface TcoStats {
  mean: number;
  median: number;
  p5: number;
  p95: number;
  stdDev: number;
  values: Float64Array;
}

export interface CalibrationResult {
  muE95: number;
  sigmaE95: number;
  muDiesel: number;
  sigmaDiesel: number;
  correlation: number;
  muElec: number;
  elecDataPoints: number;
}

export interface BreakevenPoint {
  km: number;
  evWinRate: number;
}

export interface SimResults {
  tco: Record<string, TcoStats>;
  pathsE95: PercentileBands;
  pathsDiesel: PercentileBands;
  pathsElec: PercentileBands;
  calibration: CalibrationResult;
  winRates: Record<string, number>;
  breakeven: BreakevenPoint[];
  cumulativeCost: Record<string, number[]>;
  annualEnergyCost: Record<string, number[]>;
  sensitivityEvPrice: { price: number; winRate: number }[];
  sensitivityElecPrice: { price: number; winRate: number }[];
  dataPoints: number;
  dateRange: string;
  elecDataPoints: number;
  elecDateRange: string;
}

export const DEFAULT_CARS: CarParams[] = [
  {
    name: 'Gasoline (Euro 95)',
    purchasePrice: 25_000,
    consumptionPer100km: 6.5,
    fuelType: 'euro95',
    annualMaintenance: 800,
    insuranceAnnual: 600,
    annualTax: 250,
    depreciationRate: 0.15,
  },
  {
    name: 'Diesel',
    purchasePrice: 27_000,
    consumptionPer100km: 5.0,
    fuelType: 'diesel',
    annualMaintenance: 900,
    insuranceAnnual: 600,
    annualTax: 300,
    depreciationRate: 0.15,
  },
  {
    name: 'Electric (BEV)',
    purchasePrice: 35_000,
    consumptionPer100km: 16.0,
    fuelType: 'electric',
    annualMaintenance: 350,
    insuranceAnnual: 550,
    annualTax: 0,
    depreciationRate: 0.18,
    taxExemptYears: 5,
    annualTaxAfterExempt: 100,
  },
];

export const DEFAULT_CONFIG: SimConfig = {
  nSimulations: 5_000,
  horizonYears: 10,
  annualKm: 15_000,
  electricityPrice: 0.33,
  electricityVol: 0.08,
  homeChargingShare: 0.80,
  homeChargingPriceFactor: 0.75,
  publicChargingPremium: 1.50,
};
