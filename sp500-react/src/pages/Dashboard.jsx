import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, Building2, Activity, BarChart3, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Treemap } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'];

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

export default function Dashboard() {
  const data = useData();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const companies = data.companies || [];
  const sectorSummary = data.sector_summary || {};

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No company data available</div>
      </div>
    );
  }

  const totalMC = companies.reduce((sum, c) => sum + (c.market_cap || 0), 0);
  const companiesWithPE = companies.filter(c => c.financials?.pe_ratio && !isNaN(c.financials.pe_ratio));
  const avgPE = companiesWithPE.length > 0 ? companiesWithPE.reduce((sum, c) => sum + c.financials.pe_ratio, 0) / companiesWithPE.length : 0;

  const companiesWithYTD = companies.filter(c => c.returns?.ytd !== undefined && !isNaN(c.returns.ytd));
  const avgYTD = companiesWithYTD.length > 0 ? companiesWithYTD.reduce((sum, c) => sum + c.returns.ytd, 0) / companiesWithYTD.length : 0;

  const companiesWith1Y = companies.filter(c => c.returns?.['1_year'] !== undefined && !isNaN(c.returns['1_year']));
  const avg1Y = companiesWith1Y.length > 0 ? companiesWith1Y.reduce((sum, c) => sum + c.returns['1_year'], 0) / companiesWith1Y.length : 0;

  const sectorData = Object.entries(sectorSummary).map(([name, info]) => ({
    name,
    value: info.company_count || 0,
    marketCap: (info.total_market_cap || 0) / 1e9,
  }));

  const sectorMCData = Object.entries(sectorSummary)
    .map(([name, info]) => ({ name, marketCap: (info.total_market_cap || 0) / 1e9 }))
    .sort((a, b) => b.marketCap - a.marketCap);

  const topYTD = [...companies]
    .filter(c => c.returns?.ytd !== undefined && !isNaN(c.returns.ytd))
    .sort((a, b) => b.returns.ytd - a.returns.ytd)
    .slice(0, 10);

  const bottomYTD = [...companies]
    .filter(c => c.returns?.ytd !== undefined && !isNaN(c.returns.ytd))
    .sort((a, b) => a.returns.ytd - b.returns.ytd)
    .slice(0, 10);

  const top15 = companies.slice(0, 15);

  // Build heatmap data - sector by metric grid
  const heatmapMetrics = ['ytd', 'one_year_return', 'profit_margin', 'revenue_growth', 'pe_ratio', 'volatility'];
  const heatmapMetricLabels = ['YTD Return', '1Y Return', 'Profit Margin', 'Revenue Growth', 'P/E Ratio', 'Volatility'];

  const heatmapData = Object.entries(sectorSummary).map(([sector, sdata]) => {
    const sectorCompanies = companies.filter(c => c.sector === sector);
    const metricValues = {};

    heatmapMetrics.forEach(metric => {
      let vals;
      if (metric === 'ytd') {
        vals = sectorCompanies.map(c => c.returns?.ytd).filter(v => v !== undefined && !isNaN(v));
      } else if (metric === 'one_year_return') {
        vals = sectorCompanies.map(c => c.historical_data?.one_year_return).filter(v => v !== undefined && !isNaN(v));
      } else if (metric === 'profit_margin') {
        vals = sectorCompanies.map(c => c.financials?.profit_margin).filter(v => v !== undefined && !isNaN(v));
      } else if (metric === 'revenue_growth') {
        vals = sectorCompanies.map(c => c.growth_data?.revenue_growth).filter(v => v !== undefined && !isNaN(v));
      } else if (metric === 'pe_ratio') {
        vals = sectorCompanies.map(c => c.financials?.pe_ratio).filter(v => v !== undefined && !isNaN(v) && v > 0);
      } else if (metric === 'volatility') {
        vals = sectorCompanies.map(c => c.historical_data?.volatility).filter(v => v !== undefined && !isNaN(v));
      }

      if (vals && vals.length > 0) {
        metricValues[metric] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
      } else {
        metricValues[metric] = null;
      }
    });

    return { sector, ...metricValues };
  });

  // Normalize for heatmap colors
  const normalizedHeatmap = heatmapData.map(sectorRow => {
    const normalized = { sector: sectorRow.sector };
    heatmapMetrics.forEach(metric => {
      const val = sectorRow[metric];
      if (val !== null) {
        if (metric === 'pe_ratio' || metric === 'volatility') {
          // For these, lower is better, so normalize inversely
          const maxVal = Math.max(...heatmapData.map(s => s[metric] || 0).filter(v => v > 0));
          normalized[metric] = maxVal > 0 ? 1 - (val / maxVal) : 0.5;
        } else {
          // For return/margin/growth metrics, higher is better
          const maxVal = Math.max(...heatmapData.map(s => s[metric] || 0));
          normalized[metric] = maxVal > 0 ? val / maxVal : 0.5;
        }
      } else {
        normalized[metric] = 0.5;
      }
    });
    return normalized;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">S&P 500 Explorer</h1>
        <p className="text-gray-500 mt-1">Comprehensive data for all {companies.length} companies ranked by market cap</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard icon={Building2} label="Companies" value={companies.length.toString()} />
        <MetricCard icon={DollarSign} label="Total Market Cap" value={formatB(totalMC)} />
        <MetricCard icon={Activity} label="Avg P/E" value={avgPE ? avgPE.toFixed(1) : 'N/A'} />
        <MetricCard icon={TrendingUp} label="Avg YTD Return" value={formatPct(avgYTD)} color={avgYTD >= 0 ? 'text-green-600' : 'text-red-600'} />
        <MetricCard icon={BarChart3} label="Avg 1Y Return" value={formatPct(avg1Y)} color={avg1Y >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* Sector Heatmap */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Sector Performance Heatmap
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold text-gray-600">Sector</th>
                {heatmapMetricLabels.map(label => (
                  <th key={label} className="text-center py-2 px-2 font-semibold text-gray-600">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalizedHeatmap.map(row => {
                const originalRow = heatmapData.find(h => h.sector === row.sector);
                return (
                  <tr key={row.sector} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{row.sector}</td>
                    {heatmapMetrics.map(metric => (
                      <td key={metric} className="py-1 px-1 text-center">
                        <div
                          className="rounded-md py-2 px-3 font-medium text-white"
                          style={{
                            backgroundColor: getHeatmapColor(row[metric]),
                            color: row[metric] > 0.3 && row[metric] < 0.7 ? '#fff' : '#000'
                          }}
                        >
                          {originalRow[metric] !== null ? (
                            metric === 'pe_ratio' || metric === 'volatility' ? (
                              originalRow[metric].toFixed(1)
                            ) : metric === 'profit_margin' || metric === 'revenue_growth' || metric === 'ytd_return' || metric === 'one_year_return' ? (
                              `${(originalRow[metric] * 100).toFixed(0)}%`
                            ) : (
                              originalRow[metric].toFixed(2)
                            )
                          ) : 'N/A'}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-gray-500">Strong (Green)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-gray-500">Neutral (Yellow)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-gray-500">Weak (Red)</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Sector Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sectorData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} companies`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Sector Market Cap</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sectorMCData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(0)}B`} />
              <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 11}} />
              <Tooltip formatter={(v) => [`$${v.toFixed(1)}B`, 'Market Cap']} />
              <Bar dataKey="marketCap" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top 10 YTD Performers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Rank</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">YTD Return</th>
                </tr>
              </thead>
              <tbody>
                {topYTD.map(c => (
                  <tr key={c.symbol} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-500">{c.rank}</td>
                    <td className="py-2 px-2">
                      <Link to={`/company/${c.symbol}`} className="font-medium text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-2">{c.name}</td>
                    <td className="py-2 px-2 text-right font-medium text-green-600">
                      +{formatPct(c.returns.ytd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Bottom 10 YTD Performers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Rank</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">YTD Return</th>
                </tr>
              </thead>
              <tbody>
                {bottomYTD.map(c => (
                  <tr key={c.symbol} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-500">{c.rank}</td>
                    <td className="py-2 px-2">
                      <Link to={`/company/${c.symbol}`} className="font-medium text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-2">{c.name}</td>
                    <td className="py-2 px-2 text-right font-medium text-red-600">
                      {formatPct(c.returns.ytd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Largest companies */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Top 15 Largest Companies</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Rank</th>
                <th className="text-left py-2 px-3">Symbol</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Sector</th>
                <th className="text-right py-2 px-3">Market Cap</th>
                <th className="text-right py-2 px-3">P/E</th>
                <th className="text-right py-2 px-3">YTD Return</th>
              </tr>
            </thead>
            <tbody>
              {top15.map(c => (
                <tr key={c.symbol} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-500">{c.rank}</td>
                  <td className="py-2 px-3">
                    <Link to={`/company/${c.symbol}`} className="font-medium text-blue-600 hover:underline">{c.symbol}</Link>
                  </td>
                  <td className="py-2 px-3">{c.name}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{c.sector}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{formatB(c.market_cap)}</td>
                  <td className="py-2 px-3 text-right">{c.financials?.pe_ratio ? c.financials.pe_ratio.toFixed(1) : 'N/A'}</td>
                  <td className={`py-2 px-3 text-right font-medium ${c.returns?.ytd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPct(c.returns?.ytd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getHeatmapColor(value) {
  if (value === null || value === undefined) return '#9ca3af';
  if (value >= 0.7) return '#22c55e';
  if (value >= 0.5) return '#eab308';
  if (value >= 0.3) return '#f97316';
  return '#ef4444';
}

function MetricCard({ icon: Icon, label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}