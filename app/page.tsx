'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, Chip, Container, Box, Paper,
  CircularProgress, Backdrop, Stack, IconButton,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '@/components/ThemeRegistry';
import { CarParams, SimConfig, SimResults, DEFAULT_CARS, DEFAULT_CONFIG } from '@/lib/types';
import { runSimulation } from '@/lib/simulation';
import { PricePoint, HISTORICAL_PRICES } from '@/lib/historical-data';
import ParameterPanel from '@/components/ParameterPanel';
import ResultsSummary from '@/components/ResultsSummary';
import SensitivityTable from '@/components/SensitivityTable';
import PriceSimChart from '@/components/charts/PriceSimChart';
import TcoDistribution from '@/components/charts/TcoDistribution';
import CumulativeCost from '@/components/charts/CumulativeCost';
import BreakevenChart from '@/components/charts/BreakevenChart';
import AnnualCostChart from '@/components/charts/AnnualCostChart';

export default function Home() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const [cars, setCars] = useState<CarParams[]>(DEFAULT_CARS);
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<SimResults | null>(null);
  const [running, setRunning] = useState(false);
  const [prices, setPrices] = useState<PricePoint[]>(HISTORICAL_PRICES);
  const [dataSource, setDataSource] = useState<'embedded' | 'live'>('embedded');
  const [loadingPrices, setLoadingPrices] = useState(true);
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  const run = useCallback(() => {
    setRunning(true);
    const minDuration = 400;
    const start = performance.now();
    setTimeout(() => {
      const r = runSimulation(cars, config, 42, pricesRef.current);
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, minDuration - elapsed);
      setTimeout(() => {
        setResults(r);
        setRunning(false);
      }, remaining);
    }, 50);
  }, [cars, config]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && json.prices?.length > 0) {
          setPrices(json.prices);
          pricesRef.current = json.prices;
          setDataSource('live');
        }
      } catch {
        // Fall back to embedded data
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    }

    fetchPrices().then(() => {
      if (!cancelled) {
        setRunning(true);
        requestAnimationFrame(() => {
          const r = runSimulation(DEFAULT_CARS, DEFAULT_CONFIG, 42, pricesRef.current);
          setResults(r);
          setRunning(false);
        });
      }
    });

    return () => { cancelled = true; };
  }, []);

  const lastPrice = prices[prices.length - 1];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap>Fuel vs Electric Car</Typography>
            {dataSource === 'live' && (
              <Chip label="Live data" color="success" size="small" />
            )}
          </Stack>
          <IconButton onClick={toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Monte Carlo simulation &middot; Italy &middot; Calibrated on EC Oil Bulletin data
            {dataSource === 'live' && ` (${prices.length} observations)`}
          </Typography>
        </Box>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, alignItems: 'flex-start' }}>
          {/* Sidebar */}
          <Box sx={{
            width: { lg: 320 },
            flexShrink: 0,
            alignSelf: 'flex-start',
            position: { lg: 'sticky' },
            top: { lg: 80 },
            maxHeight: { lg: 'calc(100vh - 100px)' },
          }}>
            <Paper sx={{ p: 3, maxHeight: { lg: 'calc(100vh - 100px)' }, overflowY: 'auto' }}>
              <ParameterPanel
                cars={cars}
                config={config}
                onCarsChange={setCars}
                onConfigChange={setConfig}
                onRun={run}
                running={running}
              />
            </Paper>
          </Box>

          {/* Main content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Loading prices spinner */}
            {loadingPrices && !results && (
              <Paper sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Fetching latest fuel prices from EC Oil Bulletin...
                </Typography>
              </Paper>
            )}

            {/* Results */}
            {results && (
              <Box sx={{ position: 'relative' }}>
                {/* Running overlay */}
                <Backdrop
                  open={running}
                  sx={{
                    position: 'absolute',
                    zIndex: 10,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <CircularProgress />
                  <Typography variant="body2" color="white">
                    Running {config.nSimulations.toLocaleString()} simulations...
                  </Typography>
                </Backdrop>

                <Stack spacing={3}>
                  {/* Summary */}
                  <Paper sx={{ p: 3 }}>
                    <ResultsSummary results={results} horizonYears={config.horizonYears} annualKm={config.annualKm} />
                  </Paper>

                  {/* Price simulations */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Price Simulations</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                      <PriceSimChart
                        title="Euro 95" bands={results.pathsE95}
                        currentPrice={lastPrice.euro95} horizonYears={config.horizonYears}
                        color="#2196F3" unit="/L"
                      />
                      <PriceSimChart
                        title="Diesel" bands={results.pathsDiesel}
                        currentPrice={lastPrice.diesel} horizonYears={config.horizonYears}
                        color="#FF9800" unit="/L"
                      />
                      <PriceSimChart
                        title="Electricity" bands={results.pathsElec}
                        currentPrice={config.electricityPrice} horizonYears={config.horizonYears}
                        color="#4CAF50" unit="/kWh"
                      />
                    </Box>
                  </Paper>

                  {/* TCO charts */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Total Cost of Ownership</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <TcoDistribution tco={results.tco} horizonYears={config.horizonYears} annualKm={config.annualKm} />
                      <CumulativeCost cumulativeCost={results.cumulativeCost} horizonYears={config.horizonYears} />
                    </Box>
                  </Paper>

                  {/* Breakeven & Annual */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Breakeven &amp; Annual Costs</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <BreakevenChart breakeven={results.breakeven} currentKm={config.annualKm} />
                      <AnnualCostChart annualEnergyCost={results.annualEnergyCost} horizonYears={config.horizonYears} />
                    </Box>
                  </Paper>

                  {/* Sensitivity */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Sensitivity Analysis</Typography>
                    <SensitivityTable
                      sensitivityEvPrice={results.sensitivityEvPrice}
                      sensitivityElecPrice={results.sensitivityElecPrice}
                    />
                  </Paper>

                  {/* Footer */}
                  <Typography variant="caption" color="text.secondary" align="center" component="div" sx={{ py: 2 }}>
                    Data: European Commission Weekly Oil Bulletin ({results.dataPoints} weekly observations, {results.dateRange}).
                    {dataSource === 'live' ? ' (live)' : ' (embedded snapshot)'}
                    {' '}Electricity: ARERA Q1 2026 reference rate.
                    <br />
                    Model: Geometric Brownian Motion (correlated fuels, independent electricity).
                    {' '}{config.nSimulations.toLocaleString()} Monte Carlo simulations, {config.horizonYears}-year horizon.
                  </Typography>
                </Stack>
              </Box>
            )}

            {!results && !running && !loadingPrices && (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Click &ldquo;Run Simulation&rdquo; to start
                </Typography>
              </Paper>
            )}

            {running && !results && !loadingPrices && (
              <Paper sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Running {config.nSimulations.toLocaleString()} simulations...
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
