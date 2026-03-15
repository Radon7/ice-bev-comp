'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

export default function Home() {
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
    // setTimeout gives React a tick to paint the spinner before heavy computation.
    // We enforce a minimum visible duration so the user sees feedback.
    const minDuration = 400; // ms
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

  // Fetch live prices on mount, then run simulation
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
        // Fall back to embedded data (already set as default)
      } finally {
        if (!cancelled) {
          setLoadingPrices(false);
        }
      }
    }

    fetchPrices().then(() => {
      if (!cancelled) {
        // Run simulation after prices are loaded
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Fuel vs Electric Car</h1>
            {dataSource === 'live' && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                Live data
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Monte Carlo simulation &middot; Italy &middot; Calibrated on EC Oil Bulletin data
            {dataSource === 'live' && ` (${prices.length} observations)`}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar: Parameters */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 sticky top-6">
              <ParameterPanel
                cars={cars}
                config={config}
                onCarsChange={setCars}
                onConfigChange={setConfig}
                onRun={run}
                running={running}
              />
            </div>
          </aside>

          {/* Main: Results */}
          <main className="flex-1 space-y-6">
            {loadingPrices && !results && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-12">
                <Spinner text="Fetching latest fuel prices from EC Oil Bulletin..." />
              </div>
            )}

            {results && (
              <div className="relative space-y-6">
                {/* Overlay spinner when re-running */}
                {running && (
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-24 bg-gray-950/60 backdrop-blur-sm rounded-xl">
                    <Spinner text={`Running ${config.nSimulations.toLocaleString()} simulations...`} />
                  </div>
                )}
                {/* Summary cards */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
                  <ResultsSummary results={results} horizonYears={config.horizonYears} annualKm={config.annualKm} />
                </div>

                {/* Price simulations */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
                  <h2 className="text-lg font-bold mb-4">Price Simulations</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                </div>

                {/* TCO charts */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
                  <h2 className="text-lg font-bold mb-4">Total Cost of Ownership</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TcoDistribution tco={results.tco} horizonYears={config.horizonYears} annualKm={config.annualKm} />
                    <CumulativeCost cumulativeCost={results.cumulativeCost} horizonYears={config.horizonYears} />
                  </div>
                </div>

                {/* Breakeven + Annual cost */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
                  <h2 className="text-lg font-bold mb-4">Breakeven & Annual Costs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BreakevenChart breakeven={results.breakeven} currentKm={config.annualKm} />
                    <AnnualCostChart annualEnergyCost={results.annualEnergyCost} horizonYears={config.horizonYears} />
                  </div>
                </div>

                {/* Sensitivity */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5">
                  <h2 className="text-lg font-bold mb-4">Sensitivity Analysis</h2>
                  <SensitivityTable
                    sensitivityEvPrice={results.sensitivityEvPrice}
                    sensitivityElecPrice={results.sensitivityElecPrice}
                  />
                </div>

                {/* Footer */}
                <div className="text-xs text-gray-400 text-center py-4 space-y-1">
                  <p>
                    Data: European Commission Weekly Oil Bulletin ({results.dataPoints} weekly observations, {results.dateRange}).
                    {dataSource === 'live' ? ' (live)' : ' (embedded snapshot)'}
                    {' '}Electricity: ARERA Q1 2026 reference rate.
                  </p>
                  <p>
                    Model: Geometric Brownian Motion (correlated fuels, independent electricity).
                    {config.nSimulations.toLocaleString()} Monte Carlo simulations, {config.horizonYears}-year horizon.
                  </p>
                </div>
              </div>
            )}

            {!results && !running && !loadingPrices && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-12 text-center text-gray-500">
                Click &ldquo;Run Simulation&rdquo; to start
              </div>
            )}

            {running && !results && !loadingPrices && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-12">
                <Spinner text={`Running ${config.nSimulations.toLocaleString()} simulations...`} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
