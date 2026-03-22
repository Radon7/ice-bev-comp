import { sql } from './db';
import type { FuelPriceRow } from './ec-fetcher';

/** Result of querying prices for a single country. */
export interface StoredPricePoint {
  date: string;
  euro95: number;
  diesel: number;
}

/**
 * Get euro95 + diesel prices for a country from the database.
 * Returns null if no data is found.
 */
export async function getPrices(country: string): Promise<StoredPricePoint[] | null> {
  const { rows } = await sql`
    SELECT date, fuel_type, price_eur_l
    FROM fuel_prices
    WHERE country = ${country}
      AND fuel_type IN ('euro95', 'diesel')
    ORDER BY date ASC
  `;

  if (rows.length === 0) return null;

  // Pivot: group by date, combine euro95 + diesel into one row
  const byDate = new Map<string, { euro95?: number; diesel?: number }>();
  for (const row of rows) {
    const dateStr = row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date);
    let entry = byDate.get(dateStr);
    if (!entry) {
      entry = {};
      byDate.set(dateStr, entry);
    }
    if (row.fuel_type === 'euro95') entry.euro95 = Number(row.price_eur_l);
    if (row.fuel_type === 'diesel') entry.diesel = Number(row.price_eur_l);
  }

  const prices: StoredPricePoint[] = [];
  for (const [date, { euro95, diesel }] of byDate) {
    if (euro95 != null && diesel != null) {
      prices.push({ date, euro95, diesel });
    }
  }

  return prices.length > 0 ? prices : null;
}

/**
 * Get the most recent data date for a country.
 * Used to check data freshness.
 */
export async function getLatestDate(country: string): Promise<string | null> {
  const { rows } = await sql`
    SELECT MAX(date) as max_date
    FROM fuel_prices
    WHERE country = ${country}
  `;
  if (!rows[0]?.max_date) return null;
  const d = rows[0].max_date;
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

/**
 * Bulk upsert price rows into the database.
 * Uses ON CONFLICT to handle re-imports gracefully.
 * Processes in batches to avoid query size limits.
 */
export async function upsertPrices(prices: FuelPriceRow[]): Promise<number> {
  if (prices.length === 0) return 0;

  const BATCH_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < prices.length; i += BATCH_SIZE) {
    const batch = prices.slice(i, i + BATCH_SIZE);

    // Build a VALUES clause for the batch
    const values = batch
      .map(
        (p) =>
          `('${p.date}', '${p.country}', '${p.fuelType}', ${p.priceEurL})`,
      )
      .join(',\n');

    await sql.query(`
      INSERT INTO fuel_prices (date, country, fuel_type, price_eur_l)
      VALUES ${values}
      ON CONFLICT (date, country, fuel_type)
      DO UPDATE SET price_eur_l = EXCLUDED.price_eur_l
    `);

    totalUpserted += batch.length;
  }

  return totalUpserted;
}

/** Log a refresh attempt. */
export async function logRefresh(result: {
  rowsUpserted?: number;
  error?: string;
}): Promise<void> {
  if (result.error) {
    await sql`
      INSERT INTO refresh_log (completed_at, error)
      VALUES (NOW(), ${result.error})
    `;
  } else {
    await sql`
      INSERT INTO refresh_log (completed_at, rows_upserted)
      VALUES (NOW(), ${result.rowsUpserted ?? 0})
    `;
  }
}

/** Get the latest successful refresh info. */
export async function getLatestRefresh(): Promise<{
  completedAt: string;
  rowsUpserted: number;
} | null> {
  const { rows } = await sql`
    SELECT completed_at, rows_upserted
    FROM refresh_log
    WHERE error IS NULL AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    completedAt: rows[0].completed_at instanceof Date
      ? rows[0].completed_at.toISOString()
      : String(rows[0].completed_at),
    rowsUpserted: Number(rows[0].rows_upserted),
  };
}
