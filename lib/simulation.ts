/**
 * Monte Carlo simulation engine for fuel vs electric car TCO.
 *
 * Port of montecarlo_fuel.py — Geometric Brownian Motion with
 * correlated fuel prices and independent electricity price paths.
 */

import { CarParams, SimConfig, SimResults, TcoStats, PercentileBands } from './types';
import { PricePoint, HISTORICAL_PRICES } from './historical-data';

// ── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: uniform → standard normal */
function normalRandom(rng: () => number): number {
  let u1: number, u2: number;
  do { u1 = rng(); } while (u1 === 0);
  u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── GBM Calibration ─────────────────────────────────────────────────────────

function calibrateGBM(prices: number[]) {
  const n = prices.length;
  const logReturns = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    logReturns[i] = Math.log(prices[i + 1] / prices[i]);
  }

  const dt = 1 / 52;
  let sum = 0;
  for (let i = 0; i < logReturns.length; i++) sum += logReturns[i];
  const muWeekly = sum / logReturns.length;

  let sumSq = 0;
  for (let i = 0; i < logReturns.length; i++) {
    sumSq += (logReturns[i] - muWeekly) ** 2;
  }
  const sigmaWeekly = Math.sqrt(sumSq / (logReturns.length - 1));

  return {
    mu: muWeekly / dt,
    sigma: sigmaWeekly / Math.sqrt(dt),
    logReturns,
  };
}

// ── Percentile computation ──────────────────────────────────────────────────

function percentile(arr: Float64Array, p: number): number {
  const sorted = Float64Array.from(arr).sort();
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(arr: Float64Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stdDev(arr: Float64Array): number {
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - m) ** 2;
  return Math.sqrt(s / (arr.length - 1));
}

// ── Effective electricity price ─────────────────────────────────────────────

function effectiveElectricityPrice(
  basePrice: number,
  homeShare: number,
  homeFactor: number,
  publicPremium: number,
): number {
  return homeShare * basePrice * homeFactor + (1 - homeShare) * basePrice * publicPremium;
}

// ── TCO computation for one car across all simulations ──────────────────────

function computeTCO(
  car: CarParams,
  fuelPaths: Float64Array[] | null, // nSims × (nSteps+1), null for electric
  elecPaths: Float64Array[],
  config: SimConfig,
): Float64Array {
  const nSims = elecPaths.length;
  const weeksPerYear = 52;
  const nSteps = config.horizonYears * weeksPerYear;
  const weeklyKm = config.annualKm / weeksPerYear;
  const tco = new Float64Array(nSims);

  const residual = car.purchasePrice * (1 - car.depreciationRate) ** config.horizonYears;

  for (let sim = 0; sim < nSims; sim++) {
    let cost = car.purchasePrice;

    for (let week = 1; week <= nSteps; week++) {
      const year = Math.floor((week - 1) / weeksPerYear);

      if (car.fuelType === 'electric') {
        const kwhNeeded = weeklyKm * car.consumptionPer100km / 100;
        const effPrice = effectiveElectricityPrice(
          elecPaths[sim][week],
          config.homeChargingShare,
          config.homeChargingPriceFactor,
          config.publicChargingPremium,
        );
        cost += kwhNeeded * effPrice;
      } else {
        const litersNeeded = weeklyKm * car.consumptionPer100km / 100;
        cost += litersNeeded * fuelPaths![sim][week];
      }

      if (week % weeksPerYear === 0) {
        cost += car.annualMaintenance + car.insuranceAnnual;
        if (car.fuelType === 'electric') {
          cost += year < (car.taxExemptYears ?? 0)
            ? car.annualTax
            : (car.annualTaxAfterExempt ?? car.annualTax);
        } else {
          cost += car.annualTax;
        }
      }
    }

    tco[sim] = cost - residual;
  }

  return tco;
}

// ── Main simulation ─────────────────────────────────────────────────────────

export function runSimulation(
  cars: CarParams[],
  config: SimConfig,
  seed: number = 42,
  prices?: PricePoint[],
): SimResults {
  // 1. Load historical data (live prices if provided, else embedded snapshot)
  const priceData = prices && prices.length > 0 ? prices : HISTORICAL_PRICES;
  const euro95Prices = priceData.map(p => p.euro95);
  const dieselPrices = priceData.map(p => p.diesel);
  const n = priceData.length;

  // 2. Calibrate GBM
  const calE95 = calibrateGBM(euro95Prices);
  const calDiesel = calibrateGBM(dieselPrices);

  // Correlation
  let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
  const len = calE95.logReturns.length;
  for (let i = 0; i < len; i++) {
    const x = calE95.logReturns[i], y = calDiesel.logReturns[i];
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }
  const correlation = (len * sumXY - sumX * sumY) /
    Math.sqrt((len * sumX2 - sumX * sumX) * (len * sumY2 - sumY * sumY));

  const S0_e95 = euro95Prices[n - 1];
  const S0_diesel = dieselPrices[n - 1];

  // 3. Simulate correlated GBM paths
  const nSims = config.nSimulations;
  const weeksPerYear = 52;
  const nSteps = config.horizonYears * weeksPerYear;
  const dt = 1 / weeksPerYear;

  const rng = mulberry32(seed);

  const drift1 = (calE95.mu - 0.5 * calE95.sigma ** 2) * dt;
  const drift2 = (calDiesel.mu - 0.5 * calDiesel.sigma ** 2) * dt;
  const vol1Sqrt = calE95.sigma * Math.sqrt(dt);
  const vol2Sqrt = calDiesel.sigma * Math.sqrt(dt);
  const rhoFactor = Math.sqrt(1 - correlation ** 2);

  // Allocate paths
  const pathsE95: Float64Array[] = new Array(nSims);
  const pathsDiesel: Float64Array[] = new Array(nSims);

  for (let sim = 0; sim < nSims; sim++) {
    pathsE95[sim] = new Float64Array(nSteps + 1);
    pathsDiesel[sim] = new Float64Array(nSteps + 1);
    pathsE95[sim][0] = S0_e95;
    pathsDiesel[sim][0] = S0_diesel;

    let logS1 = 0, logS2 = 0;
    for (let t = 1; t <= nSteps; t++) {
      const z1 = normalRandom(rng);
      const z2Indep = normalRandom(rng);
      const z2 = correlation * z1 + rhoFactor * z2Indep;

      logS1 += drift1 + vol1Sqrt * z1;
      logS2 += drift2 + vol2Sqrt * z2;

      pathsE95[sim][t] = S0_e95 * Math.exp(logS1);
      pathsDiesel[sim][t] = S0_diesel * Math.exp(logS2);
    }
  }

  // 4. Simulate electricity prices (independent GBM)
  const rngElec = mulberry32(seed + 81);
  const driftElec = (config.electricityDrift - 0.5 * config.electricityVol ** 2) * dt;
  const volElecSqrt = config.electricityVol * Math.sqrt(dt);

  const pathsElec: Float64Array[] = new Array(nSims);
  for (let sim = 0; sim < nSims; sim++) {
    pathsElec[sim] = new Float64Array(nSteps + 1);
    pathsElec[sim][0] = config.electricityPrice;
    let logS = 0;
    for (let t = 1; t <= nSteps; t++) {
      logS += driftElec + volElecSqrt * normalRandom(rngElec);
      pathsElec[sim][t] = config.electricityPrice * Math.exp(logS);
    }
  }

  // 5. Compute percentile bands for charts
  function computeBands(paths: Float64Array[]): PercentileBands {
    const steps = paths[0].length;
    const p5: number[] = new Array(steps);
    const p50: number[] = new Array(steps);
    const p95: number[] = new Array(steps);
    const col = new Float64Array(nSims);

    for (let t = 0; t < steps; t++) {
      for (let s = 0; s < nSims; s++) col[s] = paths[s][t];
      p5[t] = percentile(col, 5);
      p50[t] = percentile(col, 50);
      p95[t] = percentile(col, 95);
    }
    return { p5, p50, p95 };
  }

  const bandsE95 = computeBands(pathsE95);
  const bandsDiesel = computeBands(pathsDiesel);
  const bandsElec = computeBands(pathsElec);

  // 6. Compute TCO for each car
  const tcoResults: Record<string, TcoStats> = {};
  const gasCar = cars.find(c => c.fuelType === 'euro95')!;
  const dieselCar = cars.find(c => c.fuelType === 'diesel')!;
  const evCar = cars.find(c => c.fuelType === 'electric')!;

  for (const car of cars) {
    let fuelPaths: Float64Array[] | null = null;
    if (car.fuelType === 'euro95') fuelPaths = pathsE95;
    else if (car.fuelType === 'diesel') fuelPaths = pathsDiesel;

    const values = computeTCO(car, fuelPaths, pathsElec, config);
    tcoResults[car.name] = {
      mean: mean(values),
      median: percentile(values, 50),
      p5: percentile(values, 5),
      p95: percentile(values, 95),
      stdDev: stdDev(values),
      values,
    };
  }

  // 7. Win rates
  const winRates: Record<string, number> = {};
  const names = cars.map(c => c.name);
  const tcoArrays = names.map(n => tcoResults[n].values);

  for (let i = 0; i < names.length; i++) {
    let wins = 0;
    for (let sim = 0; sim < nSims; sim++) {
      let isMin = true;
      for (let j = 0; j < names.length; j++) {
        if (j !== i && tcoArrays[j][sim] < tcoArrays[i][sim]) {
          isMin = false;
          break;
        }
      }
      if (isMin) wins++;
    }
    winRates[names[i]] = (wins / nSims) * 100;
  }

  // 8. Breakeven analysis
  const breakeven: { km: number; evWinRate: number }[] = [];
  for (let km = 5000; km <= 40000; km += 5000) {
    const tempConfig = { ...config, annualKm: km };
    const tcoGas = computeTCO(gasCar, pathsE95, pathsElec, tempConfig);
    const tcoDiesel = computeTCO(dieselCar, pathsDiesel, pathsElec, tempConfig);
    const tcoEv = computeTCO(evCar, null, pathsElec, tempConfig);
    let evWins = 0;
    for (let s = 0; s < nSims; s++) {
      if (tcoEv[s] < tcoGas[s] && tcoEv[s] < tcoDiesel[s]) evWins++;
    }
    breakeven.push({ km, evWinRate: (evWins / nSims) * 100 });
  }

  // 9. Cumulative cost over time (median)
  const cumulativeCost: Record<string, number[]> = {};
  for (const car of cars) {
    // Track gross spending (purchase + fuel + fixed costs) separately
    const grossSpending = [car.purchasePrice];
    for (let year = 1; year <= config.horizonYears; year++) {
      const weekStart = (year - 1) * weeksPerYear + 1;
      const weekEnd = year * weeksPerYear + 1;

      let annualFuel = 0;
      const weeklyKm = config.annualKm / weeksPerYear;

      for (let w = weekStart; w < weekEnd && w <= nSteps; w++) {
        const col = new Float64Array(nSims);
        if (car.fuelType === 'euro95') {
          for (let s = 0; s < nSims; s++) col[s] = pathsE95[s][w];
          annualFuel += percentile(col, 50) * weeklyKm * car.consumptionPer100km / 100;
        } else if (car.fuelType === 'diesel') {
          for (let s = 0; s < nSims; s++) col[s] = pathsDiesel[s][w];
          annualFuel += percentile(col, 50) * weeklyKm * car.consumptionPer100km / 100;
        } else {
          for (let s = 0; s < nSims; s++) col[s] = pathsElec[s][w];
          const medPrice = percentile(col, 50);
          const effPrice = effectiveElectricityPrice(
            medPrice, config.homeChargingShare, config.homeChargingPriceFactor, config.publicChargingPremium,
          );
          annualFuel += effPrice * weeklyKm * car.consumptionPer100km / 100;
        }
      }

      let annualFixed = car.annualMaintenance + car.insuranceAnnual;
      if (car.fuelType === 'electric') {
        annualFixed += year <= (car.taxExemptYears ?? 0)
          ? car.annualTax
          : (car.annualTaxAfterExempt ?? car.annualTax);
      } else {
        annualFixed += car.annualTax;
      }

      grossSpending.push(grossSpending[grossSpending.length - 1] + annualFuel + annualFixed);
    }
    // Net cost = gross spending - residual value at each year
    const yearly = grossSpending.map((spending, year) => {
      const residual = car.purchasePrice * (1 - car.depreciationRate) ** year;
      return spending - residual;
    });
    cumulativeCost[car.name] = yearly;
  }

  // 10. Annual energy cost (median fuel price at year-end)
  const annualEnergyCost: Record<string, number[]> = {};
  for (const car of cars) {
    const costs: number[] = [];
    for (let year = 1; year <= config.horizonYears; year++) {
      const weekIdx = year * weeksPerYear;
      const col = new Float64Array(nSims);

      if (car.fuelType === 'euro95') {
        for (let s = 0; s < nSims; s++) col[s] = pathsE95[s][weekIdx];
        costs.push(config.annualKm * car.consumptionPer100km / 100 * percentile(col, 50));
      } else if (car.fuelType === 'diesel') {
        for (let s = 0; s < nSims; s++) col[s] = pathsDiesel[s][weekIdx];
        costs.push(config.annualKm * car.consumptionPer100km / 100 * percentile(col, 50));
      } else {
        for (let s = 0; s < nSims; s++) col[s] = pathsElec[s][weekIdx];
        const eff = effectiveElectricityPrice(
          percentile(col, 50), config.homeChargingShare, config.homeChargingPriceFactor, config.publicChargingPremium,
        );
        costs.push(config.annualKm * car.consumptionPer100km / 100 * eff);
      }
    }
    annualEnergyCost[car.name] = costs;
  }

  // 11. Sensitivity: EV purchase price
  const sensitivityEvPrice: { price: number; winRate: number }[] = [];
  for (const price of [28000, 30000, 32000, 35000, 38000, 40000]) {
    const tempEv = { ...evCar, purchasePrice: price };
    const tcoEv = computeTCO(tempEv, null, pathsElec, config);
    const tcoGas = tcoResults[gasCar.name].values;
    let wins = 0;
    for (let s = 0; s < nSims; s++) {
      if (tcoEv[s] < tcoGas[s]) wins++;
    }
    sensitivityEvPrice.push({ price, winRate: (wins / nSims) * 100 });
  }

  // 12. Sensitivity: electricity price
  const sensitivityElecPrice: { price: number; winRate: number }[] = [];
  for (const elecPrice of [0.20, 0.25, 0.28, 0.30, 0.35, 0.40]) {
    const scale = elecPrice / config.electricityPrice;
    const scaledPaths: Float64Array[] = pathsElec.map(p => {
      const sp = new Float64Array(p.length);
      for (let i = 0; i < p.length; i++) sp[i] = p[i] * scale;
      return sp;
    });
    const tcoEv = computeTCO(evCar, null, scaledPaths, config);
    const tcoGas = tcoResults[gasCar.name].values;
    let wins = 0;
    for (let s = 0; s < nSims; s++) {
      if (tcoEv[s] < tcoGas[s]) wins++;
    }
    sensitivityElecPrice.push({ price: elecPrice, winRate: (wins / nSims) * 100 });
  }

  return {
    tco: tcoResults,
    pathsE95: bandsE95,
    pathsDiesel: bandsDiesel,
    pathsElec: bandsElec,
    calibration: {
      muE95: calE95.mu,
      sigmaE95: calE95.sigma,
      muDiesel: calDiesel.mu,
      sigmaDiesel: calDiesel.sigma,
      correlation,
    },
    winRates,
    breakeven,
    cumulativeCost,
    annualEnergyCost,
    sensitivityEvPrice,
    sensitivityElecPrice,
    dataPoints: n,
    dateRange: `${priceData[0].date} to ${priceData[n - 1].date}`,
  };
}
