'use client';

import { SimResults } from '@/lib/types';

const COLORS: Record<string, string> = {
  'Gasoline (Euro 95)': 'bg-blue-50 border-blue-500 dark:bg-blue-950',
  'Diesel': 'bg-orange-50 border-orange-500 dark:bg-orange-950',
  'Electric (BEV)': 'bg-green-50 border-green-500 dark:bg-green-950',
};

const TEXT_COLORS: Record<string, string> = {
  'Gasoline (Euro 95)': 'text-blue-700 dark:text-blue-300',
  'Diesel': 'text-orange-700 dark:text-orange-300',
  'Electric (BEV)': 'text-green-700 dark:text-green-300',
};

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString()}`;
}

export default function ResultsSummary({ results, horizonYears, annualKm }: {
  results: SimResults; horizonYears: number; annualKm: number;
}) {
  const names = Object.keys(results.tco);
  const bestName = names.reduce((a, b) =>
    results.tco[a].mean < results.tco[b].mean ? a : b
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h2 className="text-xl font-bold">{horizonYears}-Year TCO</h2>
        <span className="text-sm text-gray-500">({annualKm.toLocaleString()} km/yr)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {names.map(name => {
          const s = results.tco[name];
          const isBest = name === bestName;
          return (
            <div key={name} className={`rounded-lg border-l-4 p-4 ${COLORS[name] ?? 'bg-gray-50 border-gray-500'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-semibold text-sm ${TEXT_COLORS[name] ?? ''}`}>{name}</h3>
                {isBest && (
                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Best</span>
                )}
              </div>
              <div className="text-2xl font-bold">{fmt(s.mean)}</div>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div>Median: {fmt(s.median)}</div>
                <div>Range: {fmt(s.p5)} – {fmt(s.p95)}</div>
                <div>Win rate: {results.winRates[name]?.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {names.includes('Electric (BEV)') && names.includes('Gasoline (Euro 95)') && (() => {
          const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Electric (BEV)'].mean;
          const evWins = results.winRates['Electric (BEV)'] ?? 0;
          return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
              <div className="font-medium">EV vs Gasoline</div>
              <div className={saving > 0 ? 'text-green-600' : 'text-red-600'}>
                {saving > 0 ? `EV saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
              </div>
              <div className="text-gray-500">EV cheaper in {evWins.toFixed(0)}% of sims</div>
            </div>
          );
        })()}
        {names.includes('Electric (BEV)') && names.includes('Diesel') && (() => {
          const saving = results.tco['Diesel'].mean - results.tco['Electric (BEV)'].mean;
          return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
              <div className="font-medium">EV vs Diesel</div>
              <div className={saving > 0 ? 'text-green-600' : 'text-red-600'}>
                {saving > 0 ? `EV saves ${fmt(saving)}` : `Diesel saves ${fmt(-saving)}`}
              </div>
            </div>
          );
        })()}
        {names.includes('Diesel') && names.includes('Gasoline (Euro 95)') && (() => {
          const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Diesel'].mean;
          return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
              <div className="font-medium">Diesel vs Gasoline</div>
              <div className={saving > 0 ? 'text-green-600' : 'text-red-600'}>
                {saving > 0 ? `Diesel saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        GBM calibrated on {results.dataPoints} weekly observations ({results.dateRange}).
        {' '}mu_e95={results.calibration.muE95.toFixed(4)}, sigma_e95={results.calibration.sigmaE95.toFixed(4)},
        {' '}rho={results.calibration.correlation.toFixed(4)}
      </div>
    </div>
  );
}
