'use client';

import { CarParams, SimConfig } from '@/lib/types';

interface Props {
  cars: CarParams[];
  config: SimConfig;
  onCarsChange: (cars: CarParams[]) => void;
  onConfigChange: (config: SimConfig) => void;
  onRun: () => void;
  running: boolean;
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-mono font-medium">
          {unit === '€' ? `€${value.toLocaleString()}` :
           unit === '€/kWh' ? `€${value.toFixed(2)}/kWh` :
           unit === '%' ? `${(value * 100).toFixed(0)}%` :
           unit === 'km' ? `${value.toLocaleString()} km` :
           unit === 'yr' ? `${value} yr` :
           unit === 'sims' ? `${value.toLocaleString()}` :
           `${value} ${unit}`}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

function CarSection({ car, index, onChange }: {
  car: CarParams; index: number;
  onChange: (idx: number, car: CarParams) => void;
}) {
  const colors: Record<string, string> = {
    euro95: 'border-blue-500',
    diesel: 'border-orange-500',
    electric: 'border-green-500',
  };

  return (
    <div className={`border-l-4 ${colors[car.fuelType]} pl-3 space-y-2`}>
      <h4 className="font-semibold text-sm">{car.name}</h4>
      <Slider label="Purchase price" value={car.purchasePrice} min={15000} max={60000} step={1000}
        unit="€" onChange={v => onChange(index, { ...car, purchasePrice: v })} />
      <Slider label="Consumption" value={car.consumptionPer100km}
        min={car.fuelType === 'electric' ? 10 : 3} max={car.fuelType === 'electric' ? 25 : 12}
        step={0.5} unit={car.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}
        onChange={v => onChange(index, { ...car, consumptionPer100km: v })} />
      <Slider label="Maintenance/yr" value={car.annualMaintenance} min={100} max={2000} step={50}
        unit="€" onChange={v => onChange(index, { ...car, annualMaintenance: v })} />
      <Slider label="Insurance/yr" value={car.insuranceAnnual} min={200} max={1500} step={50}
        unit="€" onChange={v => onChange(index, { ...car, insuranceAnnual: v })} />
      <Slider label="Tax (bollo)/yr" value={car.annualTax} min={0} max={500} step={25}
        unit="€" onChange={v => onChange(index, { ...car, annualTax: v })} />
      <Slider label="Depreciation rate" value={car.depreciationRate} min={0.05} max={0.30} step={0.01}
        unit="%" onChange={v => onChange(index, { ...car, depreciationRate: v })} />
    </div>
  );
}

export default function ParameterPanel({ cars, config, onCarsChange, onConfigChange, onRun, running }: Props) {
  const updateCar = (idx: number, car: CarParams) => {
    const next = [...cars];
    next[idx] = car;
    onCarsChange(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-3">Simulation</h3>
        <div className="space-y-2">
          <Slider label="Horizon" value={config.horizonYears} min={1} max={15} step={1} unit="yr"
            onChange={v => onConfigChange({ ...config, horizonYears: v })} />
          <Slider label="Simulations" value={config.nSimulations} min={1000} max={10000} step={1000} unit="sims"
            onChange={v => onConfigChange({ ...config, nSimulations: v })} />
          <Slider label="Annual driving" value={config.annualKm} min={5000} max={40000} step={1000} unit="km"
            onChange={v => onConfigChange({ ...config, annualKm: v })} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3">Electricity</h3>
        <div className="space-y-2">
          <Slider label="Current price" value={config.electricityPrice} min={0.10} max={0.50} step={0.01} unit="€/kWh"
            onChange={v => onConfigChange({ ...config, electricityPrice: v })} />
          <Slider label="Home charging share" value={config.homeChargingShare} min={0} max={1} step={0.05} unit="%"
            onChange={v => onConfigChange({ ...config, homeChargingShare: v })} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-3">Vehicles</h3>
        <div className="space-y-4">
          {cars.map((car, i) => (
            <CarSection key={car.fuelType} car={car} index={i} onChange={updateCar} />
          ))}
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
      >
        {running ? 'Running simulation...' : 'Run Simulation'}
      </button>
    </div>
  );
}
