'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { BreakevenPoint } from '@/lib/types';

interface Props {
  breakeven: BreakevenPoint[];
  currentKm: number;
}

export default function BreakevenChart({ breakeven, currentKm }: Props) {
  const data = breakeven.map(b => ({
    km: `${b.km / 1000}k`,
    evWinRate: +b.evWinRate.toFixed(1),
    kmValue: b.km,
  }));

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">EV Win Rate by Annual Driving Distance</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="km" />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} width={40} />
          <Tooltip formatter={(v) => `${v}%`} />
          <ReferenceLine y={50} stroke="red" strokeDasharray="5 5" label={{ value: '50%', fill: 'red', fontSize: 11 }} />
          <Bar dataKey="evWinRate" name="EV cheapest %" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.kmValue === currentKm ? '#15803d' : '#4CAF50'}
                opacity={entry.kmValue === currentKm ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
