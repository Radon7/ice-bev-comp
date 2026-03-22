'use client';

import { Box, Typography, Slider, Button, Stack, Divider } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: -0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontFamily="monospace" fontWeight={600}>{formatted}</Typography>
      </Box>
      <Slider
        size="small"
        value={value} min={min} max={max} step={step}
        onChange={(_, v) => onChange(v as number)}
      />
    </Box>
  );
}

const BORDER_COLORS: Record<string, string> = {
  euro95: '#2196F3',
  diesel: '#FF9800',
  electric: '#4CAF50',
};

function CarSection({ car, index, onChange }: {
  car: CarParams; index: number;
  onChange: (idx: number, car: CarParams) => void;
}) {
  return (
    <Box sx={{ borderLeft: 3, borderColor: BORDER_COLORS[car.fuelType] ?? 'grey.500', pl: 2 }}>
      <Typography variant="subtitle2" gutterBottom>{car.name}</Typography>
      <Stack spacing={0}>
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
      </Stack>
    </Box>
  );
}

export default function ParameterPanel({ cars, config, onCarsChange, onConfigChange, onRun, running }: Props) {
  const updateCar = (idx: number, car: CarParams) => {
    const next = [...cars];
    next[idx] = car;
    onCarsChange(next);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>Simulation</Typography>
        <Stack spacing={0}>
          <ParamSlider label="Horizon" value={config.horizonYears} min={1} max={15} step={1} unit="yr"
            onChange={v => onConfigChange({ ...config, horizonYears: v })} />
          <ParamSlider label="Simulations" value={config.nSimulations} min={1000} max={10000} step={1000} unit="sims"
            onChange={v => onConfigChange({ ...config, nSimulations: v })} />
          <ParamSlider label="Annual driving" value={config.annualKm} min={5000} max={40000} step={1000} unit="km"
            onChange={v => onConfigChange({ ...config, annualKm: v })} />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>Electricity</Typography>
        <Stack spacing={0}>
          <ParamSlider label="Current price" value={config.electricityPrice} min={0.10} max={0.50} step={0.01} unit="€/kWh"
            onChange={v => onConfigChange({ ...config, electricityPrice: v })} />
          <ParamSlider label="Home charging share" value={config.homeChargingShare} min={0} max={1} step={0.05} unit="%"
            onChange={v => onConfigChange({ ...config, homeChargingShare: v })} />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>Vehicles</Typography>
        <Stack spacing={2}>
          {cars.map((car, i) => (
            <CarSection key={car.fuelType} car={car} index={i} onChange={updateCar} />
          ))}
        </Stack>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onRun}
        disabled={running}
        startIcon={<PlayArrowIcon />}
      >
        {running ? 'Running...' : 'Run Simulation'}
      </Button>
    </Stack>
  );
}
