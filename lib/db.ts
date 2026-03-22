import pg from 'pg';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not set');
    }
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

/**
 * Tagged template for SQL queries.
 * Works with both local Postgres and Vercel Postgres (Neon).
 *
 * Usage: const { rows } = await sql`SELECT * FROM fuel_prices WHERE country = ${country}`;
 */
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  // Build parameterized query from template literal
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      text += `$${i + 1}`;
    }
  }
  const result = await getPool().query(text, values);
  return { rows: result.rows };
}

/**
 * Run a raw SQL query string (for bulk inserts with dynamic VALUES).
 */
sql.query = async function query(text: string, values?: unknown[]) {
  return getPool().query(text, values);
};
