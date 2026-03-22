import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getElectricityPrices, upsertElectricityPrices } from '@/lib/price-store';
import { fetchElectricityPrices, fetchAllElectricityPrices } from '@/lib/eurostat-fetcher';
import { HISTORICAL_ELECTRICITY_PRICES } from '@/lib/historical-electricity-data';

/**
 * GET /api/electricity-prices?country=IT
 *
 * Returns semi-annual electricity prices for a country.
 * Default country: IT (backward compatible with the original API).
 *
 * Fallback chain:
 *  1. Postgres database (populated by monthly cron)
 *  2. Live Eurostat API fetch (safety net if DB is empty)
 *  3. Embedded historical data (Italy only, last resort)
 */
export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')?.toUpperCase() || 'IT';

  // --- Tier 1: Read from database ---
  try {
    const prices = await getElectricityPrices(country);
    if (prices && prices.length > 0) {
      return NextResponse.json({
        source: 'database',
        cached: true,
        country,
        count: prices.length,
        prices,
      });
    }
  } catch {
    // DB unavailable — fall through to tier 2
  }

  // --- Tier 2: Live fetch from Eurostat ---
  try {
    const prices = await fetchElectricityPrices(country);
    if (prices.length > 0) {
      // Persist all countries in the background (best-effort)
      fetchAllElectricityPrices()
        .then((allRows) => upsertElectricityPrices(allRows))
        .catch(() => {});

      return NextResponse.json({
        source: 'eurostat_nrg_pc_204',
        cached: false,
        country,
        count: prices.length,
        prices,
      });
    }
  } catch {
    // Live fetch failed — fall through to tier 3
  }

  // --- Tier 3: Embedded fallback (Italy only) ---
  if (country === 'IT') {
    return NextResponse.json({
      source: 'embedded_fallback',
      cached: true,
      stale: true,
      country,
      count: HISTORICAL_ELECTRICITY_PRICES.length,
      prices: HISTORICAL_ELECTRICITY_PRICES,
    });
  }

  return NextResponse.json(
    { error: `No electricity price data available for country: ${country}` },
    { status: 404 },
  );
}
