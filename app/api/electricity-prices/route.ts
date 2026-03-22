import { NextResponse } from 'next/server';
import { ElectricityPricePoint } from '@/lib/types';

const EUROSTAT_URL =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204' +
  '?format=JSON&geo=IT&unit=KWH&currency=EUR&tax=I_TAX&nrg_cons=KWH2500-4999&lang=EN';

// In-memory cache: refresh at most once per 24 hours
let cache: { data: ElectricityPricePoint[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface EurostatResponse {
  dimension: {
    time: {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    };
  };
  value: Record<string, number>;
  size: number[];
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      source: 'eurostat_nrg_pc_204',
      cached: true,
      count: cache.data.length,
      prices: cache.data,
    });
  }

  try {
    const res = await fetch(EUROSTAT_URL, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json: EurostatResponse = await res.json();

    // Build index-to-time-label mapping
    const timeIndex = json.dimension.time.category.index; // e.g. { "2008-S1": 0, "2008-S2": 1, ... }
    const indexToTime: string[] = [];
    for (const [label, idx] of Object.entries(timeIndex)) {
      indexToTime[idx] = label;
    }

    // Extract prices, mapping value keys (stringified indices) to time labels
    const prices: ElectricityPricePoint[] = [];
    for (const [key, value] of Object.entries(json.value)) {
      const idx = parseInt(key, 10);
      const timeLabel = indexToTime[idx];
      if (timeLabel && typeof value === 'number' && value > 0) {
        prices.push({
          date: timeLabel,
          price: Math.round(value * 10000) / 10000, // 4 decimal places
        });
      }
    }

    // Sort by date ascending
    prices.sort((a, b) => a.date.localeCompare(b.date));

    cache = { data: prices, fetchedAt: Date.now() };

    return NextResponse.json({
      source: 'eurostat_nrg_pc_204',
      cached: false,
      count: prices.length,
      prices,
    });
  } catch (err) {
    // Return stale cache if available
    if (cache) {
      return NextResponse.json({
        source: 'eurostat_nrg_pc_204',
        cached: true,
        stale: true,
        count: cache.data.length,
        prices: cache.data,
      });
    }
    return NextResponse.json(
      { error: `Failed to fetch Eurostat data: ${err instanceof Error ? err.message : err}` },
      { status: 502 },
    );
  }
}
