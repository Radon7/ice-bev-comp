import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPrices, getLatestDate, upsertPrices } from '@/lib/price-store';
import { fetchAllECPrices, fetchCountryPrices } from '@/lib/ec-fetcher';
import { EU_COUNTRIES } from '@/lib/eurostat-fetcher';
import { HISTORICAL_PRICES } from '@/lib/historical-data';

const VALID_COUNTRIES = new Set(EU_COUNTRIES);

/** Maximum data age before we consider it stale and attempt a live refresh. */
const STALE_DAYS = 8;

function isStale(latestDate: string | null): boolean {
  if (!latestDate) return true;
  const age = Date.now() - new Date(latestDate).getTime();
  return age > STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * GET /api/prices?country=IT
 *
 * Returns weekly fuel prices (euro95 + diesel) for a country.
 * Default country: IT (backward compatible with the original API).
 *
 * Fallback chain:
 *  1. Postgres database (populated by weekly cron)
 *  2. Live EC Oil Bulletin fetch (safety net if DB is empty/stale)
 *  3. Embedded historical data (Italy only, last resort)
 */
export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get('country')?.toUpperCase() || 'IT';

  if (!VALID_COUNTRIES.has(country)) {
    return NextResponse.json(
      { error: 'Invalid country code' },
      { status: 400 },
    );
  }

  // --- Tier 1: Read from database ---
  try {
    const prices = await getPrices(country);
    if (prices && prices.length > 0) {
      const latestDate = await getLatestDate(country);

      return NextResponse.json({
        source: 'database',
        cached: true,
        stale: isStale(latestDate),
        country,
        count: prices.length,
        prices,
      });
    }
  } catch {
    // DB unavailable — fall through to tier 2
  }

  // --- Tier 2: Live fetch from EC Oil Bulletin ---
  try {
    if (country === 'IT') {
      // For Italy, try the quick single-country path first
      const prices = await fetchCountryPrices('IT');
      if (prices.length > 0) {
        // Also persist to DB in the background (best-effort)
        fetchAllECPrices()
          .then((allRows) => upsertPrices(allRows))
          .catch(() => {});

        return NextResponse.json({
          source: 'ec_oil_bulletin',
          cached: false,
          country,
          count: prices.length,
          prices,
        });
      }
    } else {
      // For other countries, we need to fetch + parse all and then filter
      const allRows = await fetchAllECPrices();

      // Persist everything (best-effort)
      upsertPrices(allRows).catch(() => {});

      // Filter to requested country
      const byDate = new Map<string, { euro95?: number; diesel?: number }>();
      for (const row of allRows) {
        if (row.country !== country) continue;
        if (row.fuelType !== 'euro95' && row.fuelType !== 'diesel') continue;
        let entry = byDate.get(row.date);
        if (!entry) {
          entry = {};
          byDate.set(row.date, entry);
        }
        if (row.fuelType === 'euro95') entry.euro95 = row.priceEurL;
        if (row.fuelType === 'diesel') entry.diesel = row.priceEurL;
      }

      const prices: { date: string; euro95: number; diesel: number }[] = [];
      for (const [date, { euro95, diesel }] of byDate) {
        if (euro95 != null && diesel != null) {
          prices.push({ date, euro95, diesel });
        }
      }
      prices.sort((a, b) => a.date.localeCompare(b.date));

      if (prices.length > 0) {
        return NextResponse.json({
          source: 'ec_oil_bulletin',
          cached: false,
          country,
          count: prices.length,
          prices,
        });
      }
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
      count: HISTORICAL_PRICES.length,
      prices: HISTORICAL_PRICES,
    });
  }

  return NextResponse.json(
    { error: `No price data available for country: ${country}` },
    { status: 404 },
  );
}
