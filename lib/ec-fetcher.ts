import * as XLSX from 'xlsx';

const EC_OIL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en';

const DATA_START_ROW = 3;

/** A single parsed price row for any country/fuel combination. */
export interface FuelPriceRow {
  date: string;      // YYYY-MM-DD
  country: string;   // ISO 2-letter code (IT, DE, FR...)
  fuelType: string;  // euro95, diesel, heating_oil, fuel_oil_1, fuel_oil_2, lpg
  priceEurL: number; // EUR per liter (converted from EUR/1000L)
}

/** Column mapping discovered from XLSX headers. */
interface ColumnMapping {
  col: number;
  country: string;
  fuelType: string;
}

/**
 * Fuel type identifiers found in the EC Oil Bulletin header row 0.
 * Maps the suffix in `XX_price_with_tax_<suffix>` to our normalized fuel type names.
 */
const FUEL_TYPE_MAP: Record<string, string> = {
  euro95: 'euro95',
  diesel: 'diesel',
  LPG: 'lpg',
};

/**
 * Build fuel type map dynamically, handling the heating oil naming quirk.
 * The EC bulletin uses `he<CC>ing_oil` (e.g. `heITing_oil`, `heDEing_oil`)
 * for heating oil columns, and `fuel_oil_1` / `fuel_oil_2` for heavy fuel oils.
 */
function matchFuelType(suffix: string, country: string): string | null {
  if (suffix === 'euro95') return 'euro95';
  if (suffix === 'diesel') return 'diesel';
  if (suffix === 'LPG') return 'lpg';
  if (suffix === 'fuel_oil_1') return 'fuel_oil_1';
  if (suffix === 'fuel_oil_2') return 'fuel_oil_2';
  // Heating oil: `he<CC>ing_oil` pattern
  if (suffix === `he${country}ing_oil` || suffix === 'heating_oil') return 'heating_oil';
  return null;
}

/**
 * Dynamically discovers country/fuel column mappings from the XLSX header row.
 *
 * Header row 0 format: `<CC>_price_with_tax_<fuel_suffix>`
 * Where CC is a 2-3 letter country code and fuel_suffix identifies the fuel type.
 *
 * Skips aggregate rows (EU, EUR) and exchange rate columns.
 */
function discoverColumns(headerRow: (string | number | null)[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const pricePattern = /^([A-Z]{2,3})_price_with_tax_(.+)$/;

  for (let col = 0; col < headerRow.length; col++) {
    const header = headerRow[col];
    if (header == null || typeof header !== 'string') continue;

    const match = header.match(pricePattern);
    if (!match) continue;

    const [, country, suffix] = match;

    // Skip EU/EUR aggregate columns — we only want individual countries
    if (country === 'EU' || country === 'EUR') continue;

    const fuelType = matchFuelType(suffix, country);
    if (!fuelType) continue;

    mappings.push({ col, country, fuelType });
  }

  return mappings;
}

/** Parse an Excel date value (serial number or string) to YYYY-MM-DD. */
function parseDate(dateVal: string | number): string | null {
  if (typeof dateVal === 'number') {
    const d = XLSX.SSF.parse_date_code(dateVal);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const d = new Date(String(dateVal));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Downloads the EC Oil Bulletin XLSX and parses ALL countries and fuel types.
 * Returns a flat array of price rows suitable for database insertion.
 */
export async function fetchAllECPrices(): Promise<FuelPriceRow[]> {
  const res = await fetch(EC_OIL_BULLETIN_URL, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`EC Oil Bulletin HTTP ${res.status}`);

  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const ws = wb.Sheets['Prices with taxes'];
  if (!ws) throw new Error('Sheet "Prices with taxes" not found');

  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (rows.length < DATA_START_ROW + 1) {
    throw new Error(`Expected at least ${DATA_START_ROW + 1} rows, got ${rows.length}`);
  }

  // Discover columns from header row 0
  const columnMappings = discoverColumns(rows[0]);
  if (columnMappings.length === 0) {
    throw new Error('No price columns discovered from XLSX headers');
  }

  const results: FuelPriceRow[] = [];

  for (let i = DATA_START_ROW; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row[0];
    if (dateVal == null) continue;

    const dateStr = parseDate(dateVal);
    if (!dateStr) continue;

    for (const { col, country, fuelType } of columnMappings) {
      const val = row[col];
      if (val == null) continue;

      const price = Number(val);
      if (isNaN(price) || price <= 0) continue;

      // Prices are in EUR/1000L → convert to EUR/L
      const priceEurL = Math.round((price / 1000) * 1000) / 1000;

      results.push({ date: dateStr, country, fuelType, priceEurL });
    }
  }

  return results;
}

/**
 * Fetches and returns only a specific country's euro95 + diesel prices.
 * Convenience wrapper matching the existing PricePoint interface.
 */
export async function fetchCountryPrices(
  country: string,
): Promise<{ date: string; euro95: number; diesel: number }[]> {
  const allRows = await fetchAllECPrices();

  // Group by date for the requested country
  const byDate = new Map<string, { euro95?: number; diesel?: number }>();

  for (const row of allRows) {
    if (row.country !== country) continue;
    if (row.fuelType !== 'euro95' && row.fuelType !== 'diesel') continue;

    let entry = byDate.get(row.date);
    if (!entry) {
      entry = {};
      byDate.set(row.date, entry);
    }
    if (row.fuelType === 'euro95') entry.euro95 = row.priceEurL;
    if (row.fuelType === 'diesel') entry.diesel = row.priceEurL;
  }

  const prices: { date: string; euro95: number; diesel: number }[] = [];
  for (const [date, { euro95, diesel }] of byDate) {
    if (euro95 != null && diesel != null) {
      prices.push({ date, euro95, diesel });
    }
  }

  return prices.sort((a, b) => a.date.localeCompare(b.date));
}
