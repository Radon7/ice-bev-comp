import { NextResponse } from 'next/server';
import { fetchAllElectricityPrices } from '@/lib/eurostat-fetcher';
import { upsertElectricityPrices, logRefresh } from '@/lib/price-store';

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
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      { ok: false, error: message, durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }
}

export const GET = handleRefresh;
export const POST = handleRefresh;
