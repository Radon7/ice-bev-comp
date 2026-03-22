'use client';

import { SimResults } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const VEHICLE_STYLES: Record<string, { border: string; text: string }> = {
  'Gasoline (Euro 95)': { border: 'border-l-blue-500', text: 'text-blue-400' },
  'Diesel': { border: 'border-l-orange-500', text: 'text-orange-400' },
  'Electric (BEV)': { border: 'border-l-emerald-500', text: 'text-emerald-400' },
};

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString()}`;
}

export default function ResultsSummary({ results }: { results: SimResults }) {
  const names = Object.keys(results.tco);
  const bestName = names.reduce((a, b) =>
    results.tco[a].mean < results.tco[b].mean ? a : b
  );

  return (
    <>
      {names.map((name) => {
        const s = results.tco[name];
        const isBest = name === bestName;
        const styles = VEHICLE_STYLES[name] ?? { border: 'border-l-gray-500', text: 'text-gray-400' };
        return (
          <Card
            key={name}
            className={`border-l-4 ${styles.border} bg-white/[0.03] backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200 hover:shadow-lg`}
          >
            <CardHeader>
              <CardTitle className={`text-sm font-medium ${styles.text}`}>
                {name}
              </CardTitle>
              {isBest && (
                <CardAction>
                  <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                    Best
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight">{fmt(s.mean)}</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-muted-foreground">Median: {fmt(s.median)}</p>
                <p className="text-xs text-muted-foreground">Range: {fmt(s.p5)} – {fmt(s.p95)}</p>
                <p className="text-xs text-muted-foreground">Win rate: {results.winRates[name]?.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
