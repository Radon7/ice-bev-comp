import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { fetchAllElectricityPrices } from '@/lib/eurostat-fetcher';
import { upsertElectricityPrices, logRefresh } from '@/lib/price-store';

/** Constant-time comparison to prevent timing attacks on secret tokens. */
function verifyBearerToken(authHeader: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * GET/POST /api/electricity-prices/refresh
 *
 * Cron endpoint that fetches electricity prices from Eurostat for all EU countries
 * and upserts them into the database.
 *
 * Runs monthly (1st of each month, 15:00 UTC). Eurostat updates semi-annually
 * but the exact timing varies, so monthly catches updates promptly.
 *
 * Protected by CRON_SECRET.
 */
async function handleRefresh(request: Request) {
  if (!verifyBearerToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const prices = await fetchAllElectricityPrices();
    const rowsUpserted = await upsertElectricityPrices(prices);
    await logRefresh({ source: 'electricity_prices', rowsUpserted });

    const countries = new Set(prices.map((p) => p.country));

    return NextResponse.json({
      ok: true,
      rowsUpserted,
      countries: countries.size,
      totalParsed: prices.length,
      durationMs: Date.now() - startedAt,
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
    console.error('Electricity refresh failed:', err);
    await logRefresh({ source: 'electricity_prices', error: message }).catch(() => {});

    return NextResponse.json(
      { ok: false, error: 'Refresh failed', durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }
}

export const GET = handleRefresh;
export const POST = handleRefresh;
