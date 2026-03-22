'use client';

interface Props {
  sensitivityEvPrice: { price: number; winRate: number }[];
  sensitivityElecPrice: { price: number; winRate: number }[];
}

function WinBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rate > 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono min-w-[32px]">{rate.toFixed(0)}%</span>
    </div>
  );
}

function SensSection({ title, subtitle, rows, formatPrice }: {
  title: string;
  subtitle: string;
  rows: { price: number; winRate: number }[];
  formatPrice: (p: number) => string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 font-medium text-muted-foreground">
              {title.includes('Purchase') ? 'EV Price' : 'Elec. Price'}
            </th>
            <th className="text-left py-1.5 font-medium text-muted-foreground">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.price} className="border-b border-border/50">
              <td className="py-1.5 font-mono text-xs">{formatPrice(row.price)}</td>
              <td className="py-1.5"><WinBar rate={row.winRate} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SensitivityTable({ sensitivityEvPrice, sensitivityElecPrice }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SensSection
        title="EV Purchase Price Sensitivity"
        subtitle="% of simulations where EV beats gasoline"
        rows={sensitivityEvPrice}
        formatPrice={(p) => `€${p.toLocaleString()}`}
      />
      <SensSection
        title="Electricity Price Sensitivity"
        subtitle="% of simulations where EV beats gasoline"
        rows={sensitivityElecPrice}
        formatPrice={(p) => `€${p.toFixed(2)}/kWh`}
      />
    </div>
  );
}
