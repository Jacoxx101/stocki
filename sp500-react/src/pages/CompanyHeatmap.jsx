import { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Flame, ArrowUpDown } from 'lucide-react';

const METRICS = [
  { key: 'ytd', label: 'YTD Return', type: 'return' },
  { key: '1_year', label: '1Y Return', type: 'return' },
  { key: 'profit_margin', label: 'Profit Margin', type: 'ratio' },
  { key: 'revenue_growth', label: 'Revenue Growth', type: 'ratio' },
  { key: 'pe_ratio', label: 'P/E Ratio', type: 'value' },
  { key: 'volatility', label: 'Volatility', type: 'value' },
];

function formatPct(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

function formatValue(val, metric) {
  if (val === null || val === undefined || Number.isNaN(val)) return 'N/A';
  if (metric === 'pe_ratio' || metric === 'volatility') return val.toFixed(1);
  const pct = (val * 100).toFixed(0);
  return val > 0 ? `+${pct}%` : `${pct}%`;
}

function metricStyle(percentile) {
  if (percentile === null || percentile === undefined || Number.isNaN(percentile)) {
    return { backgroundColor: '#d1d5db', color: '#111827' };
  }

  // percentile is 0..1 — map directly to hue: red(0) → yellow(55) → green(120)
  const hue = percentile * 120;
  const saturation = 78;
  const lightness = 48;

  return {
    backgroundColor: `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`,
    color: '#fff',
  };
}

function percentileRank(values, value, invert = false) {
  const clean = values.filter(v => v !== null && v !== undefined && !Number.isNaN(v));
  if (!clean.length || value === null || value === undefined || Number.isNaN(value)) return null;

  const below = clean.filter(v => v < value).length;
  const tied = clean.filter(v => v === value).length;
  const rank = (below + 0.5 * tied) / clean.length;               // smoothed percentile 0..1
  return invert ? 1 - rank : rank;
}

export default function CompanyHeatmap() {
  const data = useData();
  const [selectedSector, setSelectedSector] = useState('All');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortAsc, setSortAsc] = useState(false);

  if (!data) {
    return <div className="text-gray-500">Loading company heatmap...</div>;
  }

  const companies = data.companies || [];
  const sectors = ['All', ...Object.keys(data.sector_summary || {}).sort()];

  const visibleCompanies = useMemo(() => {
    let rows = selectedSector === 'All' ? companies : companies.filter(c => c.sector === selectedSector);

    const metricValues = {};
    METRICS.forEach(({ key }) => {
      metricValues[key] = rows.map(c => {
        if (key === 'ytd') return c.historical_data?.ytd_return ?? c.returns?.ytd;
        if (key === '1_year') return c.historical_data?.one_year_return ?? c.returns?.['1_year'];
        if (key === 'profit_margin') return c.financials?.profit_margin;
        if (key === 'revenue_growth') return c.growth_data?.revenue_growth;
        if (key === 'pe_ratio') return c.financials?.pe_ratio;
        if (key === 'volatility') return c.historical_data?.volatility;
        return null;
      });
    });

    rows = rows.map(c => {
      const ytd = c.historical_data?.ytd_return ?? c.returns?.ytd;
      const oneYear = c.historical_data?.one_year_return ?? c.returns?.['1_year'];
      const profitMargin = c.financials?.profit_margin;
      const revenueGrowth = c.growth_data?.revenue_growth;
      const pe = c.financials?.pe_ratio;
      const vol = c.historical_data?.volatility;

      return {
        ...c,
        metricValues: {
          ytd,
          '1_year': oneYear,
          profit_margin: profitMargin,
          revenue_growth: revenueGrowth,
          pe_ratio: pe,
          volatility: vol,
        },
      };
    });

    rows.sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (sortBy === 'market_cap') {
        av = a.market_cap || 0;
        bv = b.market_cap || 0;
      } else if (sortBy === 'name') {
        av = a.name;
        bv = b.name;
      } else {
        av = a.metricValues?.[sortBy];
        bv = b.metricValues?.[sortBy];
      }

      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });

    return rows;
  }, [companies, selectedSector, sortBy, sortAsc]);

  const metricRanges = useMemo(() => {
    const ranges = {};
    METRICS.forEach(({ key }) => {
      const values = visibleCompanies
        .map(c => c.metricValues?.[key])
        .filter(v => v !== null && v !== undefined && !Number.isNaN(v));
      ranges[key] = {
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
      };
    });
    return ranges;
  }, [visibleCompanies]);

  const allMetricValues = useMemo(() => {
    const map = {};
    METRICS.forEach(({ key }) => {
      map[key] = visibleCompanies
        .map(c => c.metricValues?.[key])
        .filter(v => v !== null && v !== undefined && !Number.isNaN(v));
    });
    return map;
  }, [visibleCompanies]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Flame className="w-7 h-7 text-orange-500" />
          Company Performance Heatmap
        </h1>
        <p className="text-gray-500 mt-1">Compare companies using the same metrics as the sector heatmap</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sector</label>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="market_cap">Market Cap</option>
              <option value="name">Name</option>
              <option value="ytd">YTD Return</option>
              <option value="1_year">1Y Return</option>
              <option value="profit_margin">Profit Margin</option>
              <option value="revenue_growth">Revenue Growth</option>
              <option value="pe_ratio">P/E Ratio</option>
              <option value="volatility">Volatility</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
            <button
              onClick={() => setSortAsc(v => !v)}
              className="border rounded-lg px-3 py-2 text-sm flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortAsc ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Company Performance Heatmap</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-600 sticky left-0 bg-gray-50">Company</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Sector</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Market Cap</th>
                {METRICS.map(metric => (
                  <th key={metric.key} className="text-center py-3 px-3 font-semibold text-gray-600">
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map(company => (
                <tr key={company.symbol} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 sticky left-0 bg-white hover:bg-gray-50 z-10">
                    <Link to={`/company/${company.symbol}`} className="font-medium text-blue-600 hover:underline">
                      {company.symbol}
                    </Link>
                    <div className="text-xs text-gray-500 truncate max-w-[220px]">{company.name}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{company.sector}</td>
                  <td className="py-3 px-4 text-right font-medium">${(company.market_cap / 1e9).toFixed(1)}B</td>
                  {METRICS.map(metric => {
                    const raw = company.metricValues?.[metric.key];
                    const percentile = percentileRank(
                      allMetricValues[metric.key],
                      raw,
                      metric.key === 'pe_ratio' || metric.key === 'volatility'
                    );
                    const tone = metricStyle(percentile);
                    return (
                      <td key={metric.key} className="py-2 px-3 text-center">
                        <div className="rounded-md py-2 px-3 font-medium" style={tone}>
                          {formatValue(raw, metric.key)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-gray-500">Strong</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-gray-500">Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-gray-500">Weak</span>
          </div>
        </div>
      </div>
    </div>
  );
}
