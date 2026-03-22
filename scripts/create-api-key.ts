/**
 * CLI script to create a new API key.
 *
 * Usage:
 *   npx tsx scripts/create-api-key.ts "My App Name"
 *
 * The raw API key is printed once and cannot be recovered.
 */
import { generateApiKey, insertApiKey } from '../lib/api-keys';

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: npx tsx scripts/create-api-key.ts "<name>"');
    process.exit(1);
  }

  if (!process.env.POSTGRES_URL) {
    console.error('Error: POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  const { key, keyHash } = generateApiKey();
  const id = await insertApiKey(name, keyHash);

  console.log('');
  console.log(`API key created (id: ${id})`);
  console.log(`Name: ${name}`);
  console.log(`Key:  ${key}`);
  console.log('');
  console.log('Save this key now — it cannot be recovered.');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create API key:', err);
  process.exit(1);
});
