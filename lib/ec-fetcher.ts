import ExcelJS from 'exceljs';

const EC_OIL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en';

const DATA_START_ROW = 4; // ExcelJS rows are 1-indexed; data starts at row 4 (header is row 1)

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
function discoverColumns(headerRow: ExcelJS.Row): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const pricePattern = /^([A-Z]{2,3})_price_with_tax_(.+)$/;

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = cell.value;
    if (header == null || typeof header !== 'string') return;

    const match = header.match(pricePattern);
    if (!match) return;

    const [, country, suffix] = match;

    // Skip EU/EUR aggregate columns — we only want individual countries
    if (country === 'EU' || country === 'EUR') return;

    const fuelType = matchFuelType(suffix, country);
    if (!fuelType) return;

    mappings.push({ col: colNumber, country, fuelType });
  });

  return mappings;
}

/** Parse an Excel cell value (Date object, number, or string) to YYYY-MM-DD. */
function parseDate(dateVal: ExcelJS.CellValue): string | null {
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  if (typeof dateVal === 'number') {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + dateVal * 86400000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  return null;
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
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(buf) as any);

  const ws = workbook.getWorksheet('Prices with taxes');
  if (!ws) throw new Error('Sheet "Prices with taxes" not found');

  const headerRow = ws.getRow(1);
  const columnMappings = discoverColumns(headerRow);
  if (columnMappings.length === 0) {
    throw new Error('No price columns discovered from XLSX headers');
  }

  const results: FuelPriceRow[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < DATA_START_ROW) return;

    const dateVal = row.getCell(1).value;
    if (dateVal == null) return;

    const dateStr = parseDate(dateVal);
    if (!dateStr) return;

    for (const { col, country, fuelType } of columnMappings) {
      const val = row.getCell(col).value;
      if (val == null) continue;

      const price = Number(val);
      if (isNaN(price) || price <= 0) continue;

      // Prices are in EUR/1000L → convert to EUR/L
      const priceEurL = Math.round((price / 1000) * 1000) / 1000;

      results.push({ date: dateStr, country, fuelType, priceEurL });
    }
  });

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
