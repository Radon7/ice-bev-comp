import { randomBytes, createHash } from 'crypto';
import { sql } from './db';

const KEY_PREFIX = 'cbk_';

/** Generate a new API key. Returns the raw key (show once) and its hash (store in DB). */
export function generateApiKey(): { key: string; keyHash: string } {
  const raw = KEY_PREFIX + randomBytes(32).toString('base64url');
  return { key: raw, keyHash: hashKey(raw) };
}

/** Hash an API key for storage/lookup. */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Validate a key hash against the DB. Returns the key record if valid and not revoked. */
export async function validateApiKey(
  keyHash: string,
): Promise<{ id: number; name: string } | null> {
  const { rows } = await sql`
    SELECT id, name FROM api_keys
    WHERE key_hash = ${keyHash} AND revoked_at IS NULL
  `;
  if (rows.length === 0) return null;
  return rows[0] as { id: number; name: string };
}

/** Update last_used_at and increment request_count (fire-and-forget). */
export async function touchApiKey(keyHash: string): Promise<void> {
  await sql`
    UPDATE api_keys
    SET last_used_at = now(), request_count = request_count + 1
    WHERE key_hash = ${keyHash}
  `;
}

/** Insert a new API key record. Returns the id. */
export async function insertApiKey(
  name: string,
  keyHash: string,
): Promise<number> {
  const { rows } = await sql`
    INSERT INTO api_keys (name, key_hash)
    VALUES (${name}, ${keyHash})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}
