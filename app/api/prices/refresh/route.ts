import { NextResponse } from 'next/server';
import { fetchAllECPrices } from '@/lib/ec-fetcher';
import { upsertPrices, logRefresh } from '@/lib/price-store';

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
  // Verify auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const prices = await fetchAllECPrices();
    const rowsUpserted = await upsertPrices(prices);
    await logRefresh({ rowsUpserted });

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
    await logRefresh({ error: message }).catch(() => {
      // If even logging fails (DB down), just continue
    });

    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }
}

export const GET = handleRefresh;
export const POST = handleRefresh;
