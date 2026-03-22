'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { CarParams, SimConfig, SimResults, DEFAULT_CARS, DEFAULT_CONFIG } from '@/lib/types';
import { runSimulation } from '@/lib/simulation';
import { PricePoint, HISTORICAL_PRICES } from '@/lib/historical-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useColorMode } from '@/components/ThemeRegistry';
import ParameterPanel from '@/components/ParameterPanel';
import ResultsSummary from '@/components/ResultsSummary';
import SensitivityTable from '@/components/SensitivityTable';
import PriceSimChart from '@/components/charts/PriceSimChart';
import TcoDistribution from '@/components/charts/TcoDistribution';
import CumulativeCost from '@/components/charts/CumulativeCost';
import BreakevenChart from '@/components/charts/BreakevenChart';
import AnnualCostChart from '@/components/charts/AnnualCostChart';

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString()}`;
}

export default function Home() {
  const { mode, toggleColorMode } = useColorMode();
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
  const names = results ? Object.keys(results.tco) : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Fuel vs Electric Car</h1>
            {dataSource === 'live' && (
              <Badge variant="default" className="bg-emerald-600/80 text-white text-[10px]">
                Live data
              </Badge>
            )}
          </div>
          <button
            onClick={toggleColorMode}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 pb-2">
          <p className="text-xs text-muted-foreground">
            Monte Carlo simulation &middot; Italy &middot; Calibrated on EC Oil Bulletin data
            {dataSource === 'live' && ` (${prices.length} observations)`}
          </p>
        </div>
      </header>

      {/* Main layout: sidebar + content */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar */}
          <div className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-[80px] lg:max-h-[calc(100vh-100px)]">
            <Card className="lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
              <CardContent className="pt-4">
                <ParameterPanel
                  cars={cars}
                  config={config}
                  onCarsChange={setCars}
                  onConfigChange={setConfig}
                  onRun={run}
                  running={running}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Loading prices */}
            {loadingPrices && !results && (
              <Card className="flex flex-col items-center gap-3 py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Fetching latest fuel prices from EC Oil Bulletin...
                </p>
              </Card>
            )}

            {/* Results */}
            {results && (
              <div className="relative">
                {/* Running overlay */}
                {running && (
                  <div className="absolute inset-0 z-10 rounded-2xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white">
                      Running {config.nSimulations.toLocaleString()} simulations...
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* TCO Header */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold tracking-tight">{config.horizonYears}-Year TCO</h2>
                    <span className="text-xs text-muted-foreground">
                      ({config.annualKm.toLocaleString()} km/yr)
                    </span>
                  </div>

                  {/* Vehicle cards + Win Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ResultsSummary results={results} />

                    {/* Win Rate highlight */}
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">EV Win Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-5xl font-bold tracking-tighter text-emerald-400">
                          {(results.winRates['Electric (BEV)'] ?? 0).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          of {config.nSimulations.toLocaleString()} simulations
                        </p>
                        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${results.winRates['Electric (BEV)'] ?? 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Comparison cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {names.includes('Electric (BEV)') && names.includes('Gasoline (Euro 95)') && (() => {
                      const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Electric (BEV)'].mean;
                      const evWins = results.winRates['Electric (BEV)'] ?? 0;
                      return (
                        <Card className="bg-white/[0.02] backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-sm">EV vs Gasoline</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className={`text-sm font-semibold ${saving > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {saving > 0 ? `EV saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              EV cheaper in {evWins.toFixed(0)}% of sims
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                    {names.includes('Electric (BEV)') && names.includes('Diesel') && (() => {
                      const saving = results.tco['Diesel'].mean - results.tco['Electric (BEV)'].mean;
                      return (
                        <Card className="bg-white/[0.02] backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-sm">EV vs Diesel</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className={`text-sm font-semibold ${saving > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {saving > 0 ? `EV saves ${fmt(saving)}` : `Diesel saves ${fmt(-saving)}`}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                    {names.includes('Diesel') && names.includes('Gasoline (Euro 95)') && (() => {
                      const saving = results.tco['Gasoline (Euro 95)'].mean - results.tco['Diesel'].mean;
                      return (
                        <Card className="bg-white/[0.02] backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="text-sm">Diesel vs Gasoline</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className={`text-sm font-semibold ${saving > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {saving > 0 ? `Diesel saves ${fmt(saving)}` : `Gasoline saves ${fmt(-saving)}`}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>

                  {/* Charts bento grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Price Simulations — full width */}
                    <Card className="lg:col-span-3 bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>Price Simulations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <PriceSimChart title="Euro 95" bands={results.pathsE95}
                            currentPrice={lastPrice.euro95} horizonYears={config.horizonYears}
                            color="#3b82f6" unit="/L" />
                          <PriceSimChart title="Diesel" bands={results.pathsDiesel}
                            currentPrice={lastPrice.diesel} horizonYears={config.horizonYears}
                            color="#f97316" unit="/L" />
                          <PriceSimChart title="Electricity" bands={results.pathsElec}
                            currentPrice={config.electricityPrice} horizonYears={config.horizonYears}
                            color="#10b981" unit="/kWh" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* TCO Distribution — 2 cols */}
                    <Card className="lg:col-span-2 bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>TCO Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TcoDistribution tco={results.tco} horizonYears={config.horizonYears} annualKm={config.annualKm} />
                      </CardContent>
                    </Card>

                    {/* Breakeven — 1 col */}
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>Breakeven by Distance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BreakevenChart breakeven={results.breakeven} currentKm={config.annualKm} />
                      </CardContent>
                    </Card>

                    {/* Cumulative Cost — 2 cols */}
                    <Card className="lg:col-span-2 bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>Cumulative Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CumulativeCost cumulativeCost={results.cumulativeCost} horizonYears={config.horizonYears} />
                      </CardContent>
                    </Card>

                    {/* Annual Cost — 1 col */}
                    <Card className="bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>Annual Energy Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AnnualCostChart annualEnergyCost={results.annualEnergyCost} horizonYears={config.horizonYears} />
                      </CardContent>
                    </Card>

                    {/* Sensitivity — full width */}
                    <Card className="lg:col-span-3 bg-white/[0.02] backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle>Sensitivity Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SensitivityTable
                          sensitivityEvPrice={results.sensitivityEvPrice}
                          sensitivityElecPrice={results.sensitivityElecPrice}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Footer */}
                <p className="text-[11px] text-muted-foreground/60 text-center mt-6 pb-4">
                  Data: European Commission Weekly Oil Bulletin ({results.dataPoints} weekly observations, {results.dateRange}).
                  {dataSource === 'live' ? ' (live)' : ' (embedded snapshot)'}
                  {' '}Electricity: ARERA Q1 2026 reference rate.
                  <br />
                  Model: Geometric Brownian Motion (correlated fuels, independent electricity).
                  {' '}{config.nSimulations.toLocaleString()} Monte Carlo simulations, {config.horizonYears}-year horizon.
                </p>
              </div>
            )}

            {!results && !running && !loadingPrices && (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">Click &ldquo;Run Simulation&rdquo; to start</p>
              </Card>
            )}

            {running && !results && !loadingPrices && (
              <Card className="flex flex-col items-center gap-3 py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Running {config.nSimulations.toLocaleString()} simulations...
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
