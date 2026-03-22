import type { ElectricityPricePoint } from './types';

/**
 * Eurostat dataset nrg_pc_204: electricity prices for household consumers.
 * Band: 2500-4999 kWh/year, all taxes included, EUR/kWh.
 */
const EUROSTAT_BASE_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
  '?format=JSON&unit=KWH&currency=EUR&tax=I_TAX&nrg_cons=KWH2500-4999&lang=EN';

/**
 * Eurostat uses different country codes than the EC Oil Bulletin for some countries.
 * Map our standard codes to Eurostat geo codes.
 */
const EUROSTAT_GEO_MAP: Record<string, string> = {
  GR: 'EL', // Greece: EC uses GR, Eurostat uses EL
  UK: 'UK', // UK is UK in both (historical data only)
};

/** All EU countries we track in the fuel_prices table. */
export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
];

/** A single parsed electricity price row. */
export interface ElectricityPriceRow {
  date: string;       // '2024-S1'
  country: string;    // ISO 2-letter (our standard code, e.g. GR not EL)
  priceEurKwh: number; // EUR per kWh
}

interface EurostatResponse {
  dimension: {
    time: {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    };
  };
  value: Record<string, number>;
  size: number[];
}

/**
 * Fetch electricity prices for a single country from Eurostat.
 */
export async function fetchElectricityPrices(
  country: string,
): Promise<ElectricityPricePoint[]> {
  const geoCode = EUROSTAT_GEO_MAP[country] ?? country;
  const url = `${EUROSTAT_BASE_URL}&geo=${encodeURIComponent(geoCode)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Eurostat HTTP ${res.status} for ${country}`);

  const json: EurostatResponse = await res.json();

  const timeIndex = json.dimension.time.category.index;
  const indexToTime: string[] = [];
  for (const [label, idx] of Object.entries(timeIndex)) {
    indexToTime[idx] = label;
  }

  const prices: ElectricityPricePoint[] = [];
  for (const [key, value] of Object.entries(json.value)) {
    const idx = parseInt(key, 10);
    const timeLabel = indexToTime[idx];
    if (timeLabel && typeof value === 'number' && value > 0) {
      prices.push({
        date: timeLabel,
        price: Math.round(value * 10000) / 10000,
      });
    }
  }

  return prices.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch electricity prices for all EU countries.
 * Calls Eurostat one country at a time (API doesn't support multi-geo).
 * Skips countries that return errors (some may not have data).
 */
export async function fetchAllElectricityPrices(
  countries: string[] = EU_COUNTRIES,
): Promise<ElectricityPriceRow[]> {
  const results: ElectricityPriceRow[] = [];

  for (const country of countries) {
    try {
      const prices = await fetchElectricityPrices(country);
      for (const p of prices) {
        results.push({
          date: p.date,
          country,
          priceEurKwh: p.price,
        });
      }
    } catch {
      // Some countries may not have data in this dataset — skip silently
      console.warn(`Eurostat: no electricity data for ${country}, skipping`);
    }
  }

  return results;
}
