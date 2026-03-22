'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TcoStats } from '@/lib/types';

interface Props {
  tco: Record<string, TcoStats>;
  horizonYears: number;
  annualKm: number;
}

const COLORS: Record<string, string> = {
  'Gasoline (Euro 95)': '#2196F3',
  'Diesel': '#FF9800',
  'Electric (BEV)': '#4CAF50',
};

export default function TcoDistribution({ tco, horizonYears, annualKm }: Props) {
  const allValues: number[] = [];
  for (const s of Object.values(tco)) {
    for (let i = 0; i < s.values.length; i++) allValues.push(s.values[i]);
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const nBins = 20;
  const binWidth = (max - min) / nBins;

  const names = Object.keys(tco);
  const data = [];

  for (let b = 0; b < nBins; b++) {
    const lo = min + b * binWidth;
    const hi = lo + binWidth;
    const row: Record<string, number | string> = {
      bin: `€${Math.round(lo / 1000)}k`,
    };
    for (const name of names) {
      let count = 0;
      const vals = tco[name].values;
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] >= lo && vals[i] < hi) count++;
      }
      row[name] = count / vals.length;
    }
    data.push(row);
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">
        TCO Distribution ({annualKm.toLocaleString()} km/yr, {horizonYears}-yr)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="bin" interval={0} fontSize={9} angle={-45} textAnchor="end" height={45} />
          <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} width={40} />
          <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
          <Legend />
          {names.map(name => (
            <Bar key={name} dataKey={name} fill={COLORS[name] ?? '#999'} opacity={0.6} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
