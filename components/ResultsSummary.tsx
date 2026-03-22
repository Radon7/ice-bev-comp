'use client';

import { Box, Typography, Card, CardContent, Chip, Stack } from '@mui/material';
import { SimResults } from '@/lib/types';

const CARD_COLORS: Record<string, { border: string; bg: string }> = {
  'Gasoline (Euro 95)': { border: '#2196F3', bg: 'rgba(33,150,243,0.08)' },
  'Diesel': { border: '#FF9800', bg: 'rgba(255,152,0,0.08)' },
  'Electric (BEV)': { border: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
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
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">{horizonYears}-Year TCO</Typography>
        <Typography variant="caption" color="text.secondary">
          ({annualKm.toLocaleString()} km/yr)
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {names.map(name => {
          const s = results.tco[name];
          const isBest = name === bestName;
          const colors = CARD_COLORS[name] ?? { border: 'grey', bg: 'transparent' };
          return (
            <Card key={name} variant="outlined" sx={{ borderLeft: 4, borderColor: colors.border, bgcolor: colors.bg }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: colors.border }}>{name}</Typography>
                  {isBest && <Chip label="Best" color="success" size="small" />}
                </Box>
                <Typography variant="h5">{fmt(s.mean)}</Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Median: {fmt(s.median)}</Typography>
                  <Typography variant="caption" color="text.secondary">Range: {fmt(s.p5)} – {fmt(s.p95)}</Typography>
                  <Typography variant="caption" color="text.secondary">Win rate: {results.winRates[name]?.toFixed(1)}%</Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {names.includes('Electric (BEV)') && names.includes('Gasoline (Euro 95)') && (() => {
          const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Electric (BEV)'].mean;
          const evWins = results.winRates['Electric (BEV)'] ?? 0;
          return (
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2">EV vs Gasoline</Typography>
                <Typography variant="body2" color={saving > 0 ? 'success.main' : 'error.main'}>
                  {saving > 0 ? `EV saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  EV cheaper in {evWins.toFixed(0)}% of sims
                </Typography>
              </CardContent>
            </Card>
          );
        })()}
        {names.includes('Electric (BEV)') && names.includes('Diesel') && (() => {
          const saving = results.tco['Diesel'].mean - results.tco['Electric (BEV)'].mean;
          return (
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2">EV vs Diesel</Typography>
                <Typography variant="body2" color={saving > 0 ? 'success.main' : 'error.main'}>
                  {saving > 0 ? `EV saves ${fmt(saving)}` : `Diesel saves ${fmt(-saving)}`}
                </Typography>
              </CardContent>
            </Card>
          );
        })()}
        {names.includes('Diesel') && names.includes('Gasoline (Euro 95)') && (() => {
          const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Diesel'].mean;
          return (
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2">Diesel vs Gasoline</Typography>
                <Typography variant="body2" color={saving > 0 ? 'success.main' : 'error.main'}>
                  {saving > 0 ? `Diesel saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
                </Typography>
              </CardContent>
            </Card>
          );
        })()}
      </Box>

      <Typography variant="caption" color="text.disabled">
        GBM calibrated on {results.dataPoints} weekly observations ({results.dateRange}).
        {' '}mu_e95={results.calibration.muE95.toFixed(4)}, sigma_e95={results.calibration.sigmaE95.toFixed(4)},
        {' '}rho={results.calibration.correlation.toFixed(4)}
      </Typography>
    </Stack>
  );
}
