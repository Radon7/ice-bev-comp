/**
 * Run all SQL migrations against the database.
 * Reads POSTGRES_URL from environment (or .env.local via dotenv).
 *
 * Usage: npx tsx scripts/migrate.ts
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('POSTGRES_URL not set. Create .env.local or set the env var.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  console.log('Connected to database.');

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Running ${file}...`);
    await client.query(sql);
    console.log(`  Done.`);
  }

  await client.end();
  console.log('All migrations complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
