'use client';

import { useState, useCallback, useEffect } from 'react';
import { CarParams, SimConfig, SimResults, DEFAULT_CARS, DEFAULT_CONFIG } from '@/lib/types';
import { runSimulation } from '@/lib/simulation';
import ParameterPanel from '@/components/ParameterPanel';
import ResultsSummary from '@/components/ResultsSummary';
import SensitivityTable from '@/components/SensitivityTable';
import PriceSimChart from '@/components/charts/PriceSimChart';
import TcoDistribution from '@/components/charts/TcoDistribution';
import CumulativeCost from '@/components/charts/CumulativeCost';
import BreakevenChart from '@/components/charts/BreakevenChart';
import AnnualCostChart from '@/components/charts/AnnualCostChart';
import { HISTORICAL_PRICES } from '@/lib/historical-data';

export default function Home() {
  const [cars, setCars] = useState<CarParams[]>(DEFAULT_CARS);
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<SimResults | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    setRunning(true);
    // Use requestAnimationFrame to let the UI update before blocking
    requestAnimationFrame(() => {
      const r = runSimulation(cars, config);
      setResults(r);
      setRunning(false);
    });
  }, [cars, config]);

  // Run on first mount
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lastPrice = HISTORICAL_PRICES[HISTORICAL_PRICES.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Fuel vs Electric Car</h1>
          <p className="text-sm text-gray-500">
            Monte Carlo simulation &middot; Italy &middot; Calibrated on EC Oil Bulletin data
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
            {results && (
              <>
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
                    Electricity: ARERA Q1 2026 reference rate.
                  </p>
                  <p>
                    Model: Geometric Brownian Motion (correlated fuels, independent electricity).
                    {config.nSimulations.toLocaleString()} Monte Carlo simulations, {config.horizonYears}-year horizon.
                  </p>
                </div>
              </>
            )}

            {!results && !running && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-12 text-center text-gray-500">
                Click &ldquo;Run Simulation&rdquo; to start
              </div>
            )}

            {running && !results && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-12 text-center text-gray-500">
                Running simulation...
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
