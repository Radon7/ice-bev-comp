// Embedded snapshot of Italian household electricity prices (medium consumption band: 2500-4999 kWh/yr).
// Source: Eurostat dataset nrg_pc_204, all taxes included, EUR/kWh.
// Used as fallback when the live Eurostat API is unavailable.

import { ElectricityPricePoint } from './types';

export const HISTORICAL_ELECTRICITY_PRICES: ElectricityPricePoint[] = [
  { date: '2008-S1', price: 0.2031 },
  { date: '2008-S2', price: 0.2227 },
  { date: '2009-S1', price: 0.2098 },
  { date: '2009-S2', price: 0.1997 },
  { date: '2010-S1', price: 0.1965 },
  { date: '2010-S2', price: 0.1920 },
  { date: '2011-S1', price: 0.1987 },
  { date: '2011-S2', price: 0.2065 },
  { date: '2012-S1', price: 0.2132 },
  { date: '2012-S2', price: 0.2297 },
  { date: '2013-S1', price: 0.2292 },
  { date: '2013-S2', price: 0.2323 },
  { date: '2014-S1', price: 0.2446 },
  { date: '2014-S2', price: 0.2338 },
  { date: '2015-S1', price: 0.2450 },
  { date: '2015-S2', price: 0.2428 },
  { date: '2016-S1', price: 0.2450 },
  { date: '2016-S2', price: 0.2428 },
  { date: '2017-S1', price: 0.2342 },
  { date: '2017-S2', price: 0.2261 },
  { date: '2018-S1', price: 0.2132 },
  { date: '2018-S2', price: 0.2080 },
  { date: '2019-S1', price: 0.2067 },
  { date: '2019-S2', price: 0.2161 },
  { date: '2020-S1', price: 0.2301 },
  { date: '2020-S2', price: 0.2341 },
  { date: '2021-S1', price: 0.2226 },
  { date: '2021-S2', price: 0.2153 },
  { date: '2022-S1', price: 0.2259 },
  { date: '2022-S2', price: 0.2360 },
  { date: '2023-S1', price: 0.3115 },
  { date: '2023-S2', price: 0.3641 },
  { date: '2024-S1', price: 0.3782 },
  { date: '2024-S2', price: 0.3347 },
  { date: '2025-S1', price: 0.3274 },
];
