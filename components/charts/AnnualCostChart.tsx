'use client';

import { Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  annualEnergyCost: Record<string, number[]>;
  horizonYears: number;
}

const COLORS: Record<string, string> = {
  'Gasoline (Euro 95)': '#2196F3',
  'Diesel': '#FF9800',
  'Electric (BEV)': '#4CAF50',
};

export default function AnnualCostChart({ annualEnergyCost, horizonYears }: Props) {
  const names = Object.keys(annualEnergyCost);
  const data = [];

  for (let y = 0; y < horizonYears; y++) {
    const row: Record<string, number> = { year: y + 1 };
    for (const name of names) {
      row[name] = Math.round(annualEnergyCost[name][y]);
    }
    data.push(row);
  }

  return (
    <div>
      <Typography variant="subtitle2" gutterBottom>Projected Annual Fuel/Energy Cost (Median)</Typography>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -2 }} />
          <YAxis tickFormatter={v => `€${v}`} width={50} />
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
