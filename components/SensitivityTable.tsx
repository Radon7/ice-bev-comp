'use client';

interface Props {
  sensitivityEvPrice: { price: number; winRate: number }[];
  sensitivityElecPrice: { price: number; winRate: number }[];
}

function WinBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.min(rate, 100)}%`,
            backgroundColor: rate > 50 ? '#4CAF50' : '#EF4444',
          }}
        />
      </div>
      <span className="text-xs font-mono w-10">{rate.toFixed(0)}%</span>
    </div>
  );
}

export default function SensitivityTable({ sensitivityEvPrice, sensitivityElecPrice }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">EV Purchase Price Sensitivity</h3>
        <p className="text-xs text-gray-500 mb-2">% of simulations where EV beats gasoline</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">EV Price</th>
              <th className="py-1">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {sensitivityEvPrice.map(row => (
              <tr key={row.price} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1 font-mono">{`€${row.price.toLocaleString()}`}</td>
                <td className="py-1"><WinBar rate={row.winRate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Electricity Price Sensitivity</h3>
        <p className="text-xs text-gray-500 mb-2">% of simulations where EV beats gasoline</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Elec. Price</th>
              <th className="py-1">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {sensitivityElecPrice.map(row => (
              <tr key={row.price} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-1 font-mono">{`€${row.price.toFixed(2)}/kWh`}</td>
                <td className="py-1"><WinBar rate={row.winRate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
