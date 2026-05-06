import { useState } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Scale, Plus, X } from 'lucide-react';

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatPct(val) {
  if (val === null || val === undefined) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

export default function ComparisonTool() {
  const data = useData();
  const [selected, setSelected] = useState([]);

  if (!data) return null;

  const toggleCompany = (symbol) => {
    if (selected.includes(symbol)) {
      setSelected(selected.filter(s => s !== symbol));
    } else if (selected.length < 5) {
      setSelected([...selected, symbol]);
    }
  };

  const compareCompanies = data.companies.filter(c => selected.includes(c.symbol));

  const metrics = [
    { key: 'market_cap', label: 'Market Cap', format: formatB },
    { key: 'revenue', label: 'Revenue', format: formatB, path: 'financials.revenue' },
    { key: 'pe', label: 'P/E', format: (v) => v ? v.toFixed(1) : 'N/A', path: 'financials.pe_ratio' },
    { key: 'profit_margin', label: 'Profit Margin', format: formatPct, path: 'financials.profit_margin' },
    { key: 'roe', label: 'ROE', format: formatPct, path: 'financials.return_on_equity' },
    { key: 'revenue_growth', label: 'Revenue Growth', format: formatPct, path: 'growth_data.revenue_growth' },
    { key: 'ytd', label: 'YTD Return', format: formatPct, path: 'historical_data.ytd_return' },
    { key: 'one_year', label: '1Y Return', format: formatPct, path: 'historical_data.one_year_return' },
    { key: 'beta', label: 'Beta', format: (v) => v ? v.toFixed(2) : 'N/A', path: 'financials.beta' },
    { key: 'dividend_yield', label: 'Dividend Yield', format: formatPct, path: 'dividend_data.dividend_yield' },
    { key: 'employees', label: 'Employees', format: (v) => v ? v.toLocaleString() : 'N/A', path: 'company_details.full_time_employees' },
    { key: 'price_target', label: 'Price Target', format: (v) => v ? `$${v.toFixed(2)}` : 'N/A', path: 'growth_data.target_mean_price' },
  ];

  const getValue = (company, path) => {
    const parts = path.split('.');
    let val = company;
    for (const part of parts) {
      val = val?.[part];
      if (val === undefined) break;
    }
    return val;
  };

  // Radar chart data
  const radarMetrics = ['profit_margin', 'revenue_growth', 'ytd', 'roe'];
  const radarLabels = ['Profit Margin', 'Revenue Growth', 'YTD Return', 'ROE'];

  const radarData = radarLabels.map((label, idx) => {
    const point = { subject: label };
    compareCompanies.forEach(c => {
      const val = getValue(c, metrics.find(m => m.key === radarMetrics[idx])?.path);
      // Normalize to 0-1 range for radar
      const allVals = compareCompanies.map(comp => getValue(comp, metrics.find(m => m.key === radarMetrics[idx])?.path)).filter(v => v !== undefined && v !== null);
      const min = Math.min(...allVals);
      const max = Math.max(...allVals);
      point[c.symbol] = max !== min ? ((val - min) / (max - min)) * 100 : 50;
    });
    return point;
  });

  const [chartMetric, setChartMetric] = useState('market_cap');
  const chartMetricInfo = metrics.find(m => m.key === chartMetric);
  const chartData = compareCompanies.map(c => ({
    name: c.symbol,
    value: getValue(c, chartMetricInfo?.path) || c.market_cap,
  }));

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Scale className="w-7 h-7" />
          Comparison Tool
        </h1>
        <p className="text-gray-500 mt-1">Compare up to 5 companies side-by-side</p>
      </div>

      {/* Company Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Select Companies ({selected.length}/5)</h2>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {data.companies.map(c => (
            <button
              key={c.symbol}
              onClick={() => toggleCompany(c.symbol)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected.includes(c.symbol)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selected.includes(c.symbol) && <X className="w-3 h-3" />}
              {c.symbol}
            </button>
          ))}
        </div>
      </div>

      {compareCompanies.length >= 2 ? (
        <>
          {/* Comparison Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Side-by-Side Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                    {compareCompanies.map(c => (
                      <th key={c.symbol} className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[120px]">
                        <Link to={`/company/${c.symbol}`} className="text-blue-600 hover:underline">{c.symbol}</Link>
                        <div className="text-xs text-gray-400 font-normal">{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(m => (
                    <tr key={m.key} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-700">{m.label}</td>
                      {compareCompanies.map(c => {
                        const val = m.path ? getValue(c, m.path) : c[m.key];
                        return (
                          <td key={c.symbol} className="py-3 px-4 text-center">
                            {m.format(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Performance Radar</h2>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {compareCompanies.map((c, i) => (
                    <Radar key={c.symbol} name={c.symbol} dataKey={c.symbol} stroke={colors[i]} fill={colors[i]} fillOpacity={0.1} />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Metric Comparison</h2>
                <select
                  value={chartMetric}
                  onChange={e => setChartMetric(e.target.value)}
                  className="border rounded-lg px-3 py-1 text-sm"
                >
                  {metrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => {
                    if (chartMetric === 'market_cap' || chartMetric === 'revenue') return `$${(v/1e9).toFixed(0)}B`;
                    return v;
                  }} />
                  <Tooltip formatter={(v) => [chartMetricInfo?.format(v) || v, chartMetricInfo?.label]} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Select at least 2 companies</h3>
          <p className="text-gray-500 mt-1">Choose companies from the selector above to compare them</p>
        </div>
      )}
    </div>
  );
}