import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getElectricityPrices, upsertElectricityPrices } from '@/lib/price-store';
import { fetchElectricityPrices, fetchAllElectricityPrices, EU_COUNTRIES } from '@/lib/eurostat-fetcher';
import { HISTORICAL_ELECTRICITY_PRICES } from '@/lib/historical-electricity-data';
import { authenticateRequest } from '@/lib/api-auth';

const VALID_COUNTRIES = new Set(EU_COUNTRIES);
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };

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
  // Authenticate external requests (same-origin bypasses auth)
  const authError = await authenticateRequest(request);
  if (authError) return authError;

  const country = request.nextUrl.searchParams.get('country')?.toUpperCase() || 'IT';

  if (!VALID_COUNTRIES.has(country)) {
    return NextResponse.json(
      { error: 'Invalid country code' },
      { status: 400 },
    );
  }

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
      }, { headers: CACHE_HEADERS });
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
      }, { headers: CACHE_HEADERS });
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
    }, { headers: CACHE_HEADERS });
  }

  return NextResponse.json(
    { error: `No electricity price data available for country: ${country}` },
    { status: 404 },
  );
}
