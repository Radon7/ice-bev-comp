'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  cumulativeCost: Record<string, number[]>;
  horizonYears: number;
}

const COLORS: Record<string, string> = {
  'Gasoline (Euro 95)': '#2196F3',
  'Diesel': '#FF9800',
  'Electric (BEV)': '#4CAF50',
};

export default function CumulativeCost({ cumulativeCost, horizonYears }: Props) {
  const names = Object.keys(cumulativeCost);
  const data = [];

  for (let y = 0; y <= horizonYears; y++) {
    const row: Record<string, number> = { year: y };
    for (const name of names) {
      row[name] = Math.round(cumulativeCost[name][y]);
    }
    data.push(row);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Cumulative Spending Over Time (Median)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -2 }} />
          <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} width={50} />
          <Tooltip formatter={(v) => `€${Number(v).toLocaleString()}`} />
          <Legend />
          {names.map(name => (
            <Line key={name} dataKey={name} stroke={COLORS[name] ?? '#999'} strokeWidth={2.5}
              dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
