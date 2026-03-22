'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PercentileBands } from '@/lib/types';

interface Props {
  title: string;
  bands: PercentileBands;
  currentPrice: number;
  horizonYears: number;
  color: string;
  unit: string;
}

export default function PriceSimChart({ title, bands, currentPrice, horizonYears, color, unit }: Props) {
  const step = 4;
  const data = [];
  for (let i = 0; i < bands.p50.length; i += step) {
    data.push({
      year: +(i / 52).toFixed(2),
      p5: +bands.p5[i].toFixed(4),
      p50: +bands.p50[i].toFixed(4),
      p95: +bands.p95[i].toFixed(4),
    });
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -2 }} />
          <YAxis domain={['auto', 'auto']} tickFormatter={v => `€${v.toFixed(2)}`} width={55} />
          <Tooltip
            formatter={(v) => `€${Number(v).toFixed(3)} ${unit}`}
            contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--color-foreground)' }}
            itemStyle={{ color: 'var(--color-foreground)' }}
          />
          <ReferenceLine y={currentPrice} stroke="red" strokeDasharray="5 5" label={{ value: `Now: €${currentPrice.toFixed(3)}`, fill: 'red', fontSize: 11 }} />
          <Area dataKey="p95" stroke="none" fill={color} fillOpacity={0.15} name="95th pctl" />
          <Area dataKey="p50" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} name="Median" />
          <Area dataKey="p5" stroke="none" fill="var(--color-card)" fillOpacity={1} name="5th pctl" />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
