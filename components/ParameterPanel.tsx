'use client';

import { Play } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CarParams, SimConfig } from '@/lib/types';

interface Props {
  cars: CarParams[];
  config: SimConfig;
  onCarsChange: (cars: CarParams[]) => void;
  onConfigChange: (config: SimConfig) => void;
  onRun: () => void;
  running: boolean;
}

function ParamSlider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  const formatted =
    unit === '€' ? `€${value.toLocaleString()}` :
    unit === '€/kWh' ? `€${value.toFixed(2)}/kWh` :
    unit === '%' ? `${(value * 100).toFixed(0)}%` :
    unit === 'km' ? `${value.toLocaleString()} km` :
    unit === 'yr' ? `${value} yr` :
    unit === 'sims' ? `${value.toLocaleString()}` :
    `${value} ${unit}`;

  return (
    <div className="py-1.5">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono font-semibold">{formatted}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
      />
    </div>
  );
}

const BORDER_COLORS: Record<string, string> = {
  euro95: 'border-l-blue-500',
  diesel: 'border-l-orange-500',
  electric: 'border-l-emerald-500',
};

function CarSection({ car, index, onChange }: {
  car: CarParams; index: number;
  onChange: (idx: number, car: CarParams) => void;
}) {
  return (
    <div className={`border-l-[3px] ${BORDER_COLORS[car.fuelType] ?? 'border-l-gray-500'} pl-3`}>
      <h4 className="text-sm font-medium mb-1">{car.name}</h4>
      <div>
        <ParamSlider label="Purchase price" value={car.purchasePrice} min={15000} max={60000} step={1000}
          unit="€" onChange={v => onChange(index, { ...car, purchasePrice: v })} />
        <ParamSlider label="Consumption" value={car.consumptionPer100km}
          min={car.fuelType === 'electric' ? 10 : 3} max={car.fuelType === 'electric' ? 25 : 12}
          step={0.5} unit={car.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}
          onChange={v => onChange(index, { ...car, consumptionPer100km: v })} />
        <ParamSlider label="Maintenance/yr" value={car.annualMaintenance} min={100} max={2000} step={50}
          unit="€" onChange={v => onChange(index, { ...car, annualMaintenance: v })} />
        <ParamSlider label="Insurance/yr" value={car.insuranceAnnual} min={200} max={1500} step={50}
          unit="€" onChange={v => onChange(index, { ...car, insuranceAnnual: v })} />
        <ParamSlider label="Tax (bollo)/yr" value={car.annualTax} min={0} max={500} step={25}
          unit="€" onChange={v => onChange(index, { ...car, annualTax: v })} />
        <ParamSlider label="Depreciation rate" value={car.depreciationRate} min={0.05} max={0.30} step={0.01}
          unit="%" onChange={v => onChange(index, { ...car, depreciationRate: v })} />
      </div>
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
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold mb-2">Simulation</h3>
        <div>
          <ParamSlider label="Horizon" value={config.horizonYears} min={1} max={15} step={1} unit="yr"
            onChange={v => onConfigChange({ ...config, horizonYears: v })} />
          <ParamSlider label="Simulations" value={config.nSimulations} min={1000} max={10000} step={1000} unit="sims"
            onChange={v => onConfigChange({ ...config, nSimulations: v })} />
          <ParamSlider label="Annual driving" value={config.annualKm} min={5000} max={40000} step={1000} unit="km"
            onChange={v => onConfigChange({ ...config, annualKm: v })} />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base font-semibold mb-2">Electricity</h3>
        <div>
          <ParamSlider label="Current price" value={config.electricityPrice} min={0.10} max={0.50} step={0.01} unit="€/kWh"
            onChange={v => onConfigChange({ ...config, electricityPrice: v })} />
          <ParamSlider label="Home charging share" value={config.homeChargingShare} min={0} max={1} step={0.05} unit="%"
            onChange={v => onConfigChange({ ...config, homeChargingShare: v })} />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-base font-semibold mb-2">Vehicles</h3>
        <div className="space-y-4">
          {cars.map((car, i) => (
            <CarSection key={car.fuelType} car={car} index={i} onChange={updateCar} />
          ))}
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onRun}
        disabled={running}
      >
        <Play className="w-4 h-4 mr-2" />
        {running ? 'Running...' : 'Run Simulation'}
      </Button>
    </div>
  );
}
