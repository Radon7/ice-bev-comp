import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const EC_OIL_BULLETIN_URL =
  'https://energy.ec.europa.eu/document/download/906e60ca-8b6a-44e7-8589-652854d2fd3f_en';

// Italy column indices in the "Prices with taxes" sheet (0-based)
const IT_EURO95_COL = 128;
const IT_DIESEL_COL = 129;
const DATA_START_ROW = 3; // 0-based row index where price data begins (row 4 in 1-based)

// In-memory cache: refresh at most once per 24 hours
let cache: { data: { date: string; euro95: number; diesel: number }[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      source: 'ec_oil_bulletin',
      cached: true,
      count: cache.data.length,
      prices: cache.data,
    });
  }

  try {
    const res = await fetch(EC_OIL_BULLETIN_URL, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    const ws = wb.Sheets['Prices with taxes'];
    if (!ws) throw new Error('Sheet "Prices with taxes" not found');

    const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
    });

    const prices: { date: string; euro95: number; diesel: number }[] = [];

    for (let i = DATA_START_ROW; i < rows.length; i++) {
      const row = rows[i];
      const dateVal = row[0];
      const e95Val = row[IT_EURO95_COL];
      const dieselVal = row[IT_DIESEL_COL];

      if (dateVal == null || e95Val == null || dieselVal == null) continue;

      // Parse date — XLSX may give a serial number or string
      let dateStr: string;
      if (typeof dateVal === 'number') {
        // Excel serial date → JS Date
        const d = XLSX.SSF.parse_date_code(dateVal);
        dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      } else {
        const d = new Date(String(dateVal));
        if (isNaN(d.getTime())) continue;
        dateStr = d.toISOString().slice(0, 10);
      }

      const e95 = Number(e95Val);
      const diesel = Number(dieselVal);
      if (isNaN(e95) || isNaN(diesel) || e95 <= 0 || diesel <= 0) continue;

      // Prices are in €/1000L → convert to €/L, round to 3 decimals
      prices.push({
        date: dateStr,
        euro95: Math.round((e95 / 1000) * 1000) / 1000,
        diesel: Math.round((diesel / 1000) * 1000) / 1000,
      });
    }

    // Sort by date ascending
    prices.sort((a, b) => a.date.localeCompare(b.date));

    cache = { data: prices, fetchedAt: Date.now() };

    return NextResponse.json({
      source: 'ec_oil_bulletin',
      cached: false,
      count: prices.length,
      prices,
    });
  } catch (err) {
    // If we have stale cache, return it
    if (cache) {
      return NextResponse.json({
        source: 'ec_oil_bulletin',
        cached: true,
        stale: true,
        count: cache.data.length,
        prices: cache.data,
      });
    }
    return NextResponse.json(
      { error: `Failed to fetch EC Oil Bulletin: ${err instanceof Error ? err.message : err}` },
      { status: 502 },
    );
  }
}
