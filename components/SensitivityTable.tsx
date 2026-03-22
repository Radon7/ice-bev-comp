'use client';

import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Stack,
} from '@mui/material';

interface Props {
  sensitivityEvPrice: { price: number; winRate: number }[];
  sensitivityElecPrice: { price: number; winRate: number }[];
}

function WinBar({ rate }: { rate: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 140 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(rate, 100)}
        sx={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            bgcolor: rate > 50 ? 'success.main' : 'error.main',
          },
        }}
      />
      <Typography variant="caption" fontFamily="monospace" sx={{ minWidth: 32 }}>
        {rate.toFixed(0)}%
      </Typography>
    </Stack>
  );
}

export default function SensitivityTable({ sensitivityEvPrice, sensitivityElecPrice }: Props) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>EV Purchase Price Sensitivity</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          % of simulations where EV beats gasoline
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>EV Price</TableCell>
                <TableCell>Win Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sensitivityEvPrice.map(row => (
                <TableRow key={row.price}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{`€${row.price.toLocaleString()}`}</TableCell>
                  <TableCell><WinBar rate={row.winRate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>Electricity Price Sensitivity</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          % of simulations where EV beats gasoline
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Elec. Price</TableCell>
                <TableCell>Win Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sensitivityElecPrice.map(row => (
                <TableRow key={row.price}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{`€${row.price.toFixed(2)}/kWh`}</TableCell>
                  <TableCell><WinBar rate={row.winRate} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
