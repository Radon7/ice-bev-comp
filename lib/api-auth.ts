import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hashKey, validateApiKey, touchApiKey } from './api-keys';

const RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100', 10);
const WINDOW_MS = 60_000; // 1 minute

/** In-memory sliding window rate limiter (per API key hash). */
const windows = new Map<string, { count: number; start: number }>();

function isRateLimited(keyHash: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = windows.get(keyHash);

  if (!entry || now - entry.start > WINDOW_MS) {
    windows.set(keyHash, { count: 1, start: now });
    return { limited: false, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

/** Check if the request comes from the same origin (frontend). */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) return false;

  // Same-origin: origin or referer matches the host
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // No origin or referer — likely a server-side or curl request, require auth
  return false;
}

/**
 * Authenticate an API request. Same-origin requests pass through.
 * External requests must provide a valid X-API-Key header.
 *
 * Returns null if authorized, or a NextResponse with the error.
 */
export async function authenticateRequest(
  request: NextRequest,
): Promise<NextResponse | null> {
  // Same-origin requests (frontend) bypass auth and rate limiting
  if (isSameOrigin(request)) return null;

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-Key header' },
      { status: 401 },
    );
  }

  const keyHash = hashKey(apiKey);

  // Validate key against database
  const record = await validateApiKey(keyHash);
  if (!record) {
    return NextResponse.json(
      { error: 'Invalid or revoked API key' },
      { status: 401 },
    );
  }

  // Rate limiting
  const { limited, retryAfter } = isRateLimited(keyHash);
  if (limited) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  // Track usage (fire-and-forget)
  touchApiKey(keyHash).catch(() => {});

  return null;
}
