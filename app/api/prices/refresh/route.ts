import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { fetchAllECPrices } from '@/lib/ec-fetcher';
import { upsertPrices, logRefresh } from '@/lib/price-store';

/** Constant-time comparison to prevent timing attacks on secret tokens. */
function verifyBearerToken(authHeader: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * POST /api/prices/refresh
 *
 * Cron endpoint that downloads the EC Oil Bulletin, parses all countries,
 * and upserts everything into the database.
 *
 * Protected by CRON_SECRET — Vercel crons send this automatically.
 * Also accepts GET for manual triggers.
 */
async function handleRefresh(request: Request) {
  if (!verifyBearerToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const prices = await fetchAllECPrices();
    const rowsUpserted = await upsertPrices(prices);
    await logRefresh({ source: 'fuel_prices', rowsUpserted });

    const durationMs = Date.now() - startedAt;

    // Count unique countries
    const countries = new Set(prices.map((p) => p.country));

    return NextResponse.json({
      ok: true,
      rowsUpserted,
      countries: countries.size,
      totalParsed: prices.length,
      durationMs,
    });
  } catch (err) {
    let message: string;
    if (err instanceof Error) {
      message = `${err.name}: ${err.message}`;
    } else if (typeof err === 'object' && err !== null) {
      message = JSON.stringify(err, Object.getOwnPropertyNames(err));
    } else {
      message = String(err);
    }
    console.error('Refresh failed:', err);
    await logRefresh({ source: 'fuel_prices', error: message }).catch(() => {
      // If even logging fails (DB down), just continue
    });

    return NextResponse.json(
      { ok: false, error: 'Refresh failed', durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }
}

export const GET = handleRefresh;
export const POST = handleRefresh;
