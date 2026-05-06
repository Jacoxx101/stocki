import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, TrendingDown, ChevronRight, ChevronDown, Minus } from 'lucide-react';

const RETURN_PERIODS = [
  { key: '1_week', label: '1W' },
  { key: '1_month', label: '1M' },
  { key: '3_month', label: '3M' },
  { key: 'ytd', label: 'YTD' },
  { key: '1_year', label: '1Y' },
];

const METRICS = [
  { key: 'ytd', label: 'YTD Return' },
  { key: '1_year', label: '1Y Return' },
  { key: 'profit_margin', label: 'Profit Margin' },
  { key: 'revenue_growth', label: 'Revenue Growth' },
  { key: 'pe_ratio', label: 'P/E Ratio' },
  { key: 'volatility', label: 'Volatility' },
];

function formatReturn(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const pct = (val * 100).toFixed(1);
  return val > 0 ? `+${pct}%` : `${pct}%`;
}

function formatMarketCap(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function getReturnColor(val) {
  if (val === null || val === undefined) return 'text-gray-500';
  return val >= 0 ? 'text-green-600' : 'text-red-600';
}

function getHeatmapColor(value, metric) {
  if (value === null || value === undefined || isNaN(value)) return '#f59e0b'; // Default orange/yellow for N/A
  
  // For metrics where lower is better, invert the logic
  if (metric === 'pe_ratio' || metric === 'volatility') {
    if (value >= 0.7) return '#22c55e'; // Good (low P/E or volatility)
    if (value >= 0.5) return '#eab308'; // Neutral
    if (value >= 0.3) return '#f97316'; // Warning
    return '#ef4444'; // Bad (high P/E or volatility)
  }
  
  // For metrics where higher is better
  if (value >= 0.7) return '#22c55e'; // Strong green
  if (value >= 0.5) return '#eab308'; // Neutral yellow
  if (value >= 0.3) return '#f97316'; // Warning orange
  return '#ef4444'; // Weak red
}

export default function HeatmapPage() {
  const data = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('1_month');
  const [groupBy, setGroupBy] = useState('sector');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortBy, setSortBy] = useState('return');
  const [sortAsc, setSortAsc] = useState(false);
  const [minMarketCap, setMinMarketCap] = useState(0);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading heatmap...</div>
      </div>
    );
  }

  const companies = data.companies || [];
  const sectorSummary = data.sector_summary || {};
  const subIndustrySummary = data.sub_industry_summary || {};

  const filteredCompanies = useMemo(() =>
    companies.filter(c => (c.market_cap || 0) >= minMarketCap * 1e9),
    [companies, minMarketCap]
  );

  const returnKey = selectedPeriod;

  // Build sector heatmap data (like in Dashboard)
  const sectorHeatmapData = useMemo(() => {
    return Object.entries(sectorSummary).map(([sector, sdata]) => {
      const sectorCompanies = companies.filter(c => c.sector === sector);
      
      // Calculate metrics for each sector
      const metrics = {};
      
      // YTD Return - from returns.ytd
      const ytdReturns = sectorCompanies.map(c => c.returns?.ytd).filter(v => v !== undefined && v !== null);
      metrics.ytd = ytdReturns.length > 0 ? ytdReturns.reduce((a, b) => a + b, 0) / ytdReturns.length : null;
      
      // 1Y Return - from historical_data.one_year_return
      const oneYReturns = sectorCompanies.map(c => c.historical_data?.one_year_return).filter(v => v !== undefined && v !== null && !isNaN(v));
      metrics['1_year'] = oneYReturns.length > 0 ? oneYReturns.reduce((a, b) => a + b, 0) / oneYReturns.length : null;
      
      // Profit Margin - from financials.profit_margin
      const margins = sectorCompanies.map(c => c.financials?.profit_margin).filter(v => v !== undefined && v !== null && !isNaN(v));
      metrics.profit_margin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
      
      // Revenue Growth - from growth_data.revenue_growth
      const growth = sectorCompanies.map(c => c.growth_data?.revenue_growth).filter(v => v !== undefined && v !== null && !isNaN(v));
      metrics.revenue_growth = growth.length > 0 ? growth.reduce((a, b) => a + b, 0) / growth.length : null;
      
      // P/E Ratio - from financials.pe_ratio
      const peRatios = sectorCompanies.map(c => c.financials?.pe_ratio).filter(v => v !== undefined && v !== null && !isNaN(v) && v > 0);
      metrics.pe_ratio = peRatios.length > 0 ? peRatios.reduce((a, b) => a + b, 0) / peRatios.length : null;
      
      // Volatility - from historical_data.volatility
      const volatilities = sectorCompanies.map(c => c.historical_data?.volatility).filter(v => v !== undefined && v !== null && !isNaN(v));
      metrics.volatility = volatilities.length > 0 ? volatilities.reduce((a, b) => a + b, 0) / volatilities.length : null;
      
      return { sector, metrics };
    });
  }, [companies, sectorSummary]);

  // Normalize data for heatmap colors
  const normalizedHeatmap = useMemo(() => {
    const metricRanges = {};
    
    METRICS.forEach(({ key }) => {
      const values = sectorHeatmapData
        .map(s => s.metrics[key])
        .filter(v => v !== null && !isNaN(v));
      
      if (values.length > 0) {
        const max = Math.max(...values);
        const min = Math.min(...values);
        metricRanges[key] = { max, min, range: max - min };
      }
    });
    
    return sectorHeatmapData.map(sectorRow => {
      const normalized = { sector: sectorRow.sector, metrics: {} };
      
      METRICS.forEach(({ key }) => {
        const val = sectorRow.metrics[key];
        const range = metricRanges[key];
        
        if (val !== null && range && range.range > 0) {
          if (key === 'pe_ratio' || key === 'volatility') {
            // Lower is better - invert
            normalized.metrics[key] = 1 - ((val - range.min) / range.range);
          } else {
            // Higher is better
            normalized.metrics[key] = (val - range.min) / range.range;
          }
        } else {
          normalized.metrics[key] = 0.5; // Neutral for missing data
        }
      });
      
      return normalized;
    });
  }, [sectorHeatmapData]);

  const toggleRow = (name) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedRows(newExpanded);
  };

  const buildHeatmapData = () => {
    if (groupBy === 'sector') {
      return Object.entries(sectorSummary).map(([name, sdata]) => {
        const sectorCompanies = filteredCompanies.filter(c => c.sector === name);
        const returns = sectorCompanies.map(c => c.returns?.[returnKey]).filter(v => v !== undefined && v !== null);
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
        const positiveCount = returns.filter(r => r > 0).length;

        const subIndustries = {};
        sectorCompanies.forEach(c => {
          const si = c.sub_industry;
          if (!subIndustries[si]) {
            subIndustries[si] = { companies: [], returns: [] };
          }
          subIndustries[si].companies.push(c);
          if (c.returns?.[returnKey] != null) {
            subIndustries[si].returns.push(c.returns[returnKey]);
          }
        });

        return {
          name,
          type: 'sector',
          return: avgReturn,
          positive_ratio: returns.length > 0 ? positiveCount / returns.length : null,
          market_cap: sdata.total_market_cap,
          company_count: sdata.company_count,
          companies: sectorCompanies,
          subGroups: Object.entries(subIndustries).map(([siName, siData]) => ({
            name: siName,
            return: siData.returns.length > 0 ? siData.returns.reduce((a, b) => a + b, 0) / siData.returns.length : null,
            positive_ratio: siData.returns.length > 0 ? siData.returns.filter(r => r > 0).length / siData.returns.length : null,
            market_cap: siData.companies.reduce((sum, c) => sum + (c.market_cap || 0), 0),
            company_count: siData.companies.length,
            companies: siData.companies,
          })),
        };
      });
    } else if (groupBy === 'sub_industry') {
      return Object.entries(subIndustrySummary)
        .filter(([_, sdata]) => sdata.company_count >= 1)
        .map(([name, sdata]) => {
          const subCompanies = filteredCompanies.filter(c => c.sub_industry === name);
          const returns = subCompanies.map(c => c.returns?.[returnKey]).filter(v => v !== undefined && v !== null);
          const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : null;
          const positiveCount = returns.filter(r => r > 0).length;

          const subCategories = {};
          subCompanies.forEach(c => {
            const sc = c.sub_category || 'Other';
            if (!subCategories[sc]) {
              subCategories[sc] = { companies: [], returns: [] };
            }
            subCategories[sc].companies.push(c);
            if (c.returns?.[returnKey] != null) {
              subCategories[sc].returns.push(c.returns[returnKey]);
            }
          });

          return {
            name,
            type: 'sub_industry',
            sector: sdata.sector,
            return: avgReturn,
            positive_ratio: returns.length > 0 ? positiveCount / returns.length : null,
            market_cap: sdata.total_market_cap,
            company_count: sdata.company_count,
            companies: subCompanies,
            subGroups: Object.entries(subCategories).map(([scName, scData]) => ({
              name: scName,
              return: scData.returns.length > 0 ? scData.returns.reduce((a, b) => a + b, 0) / scData.returns.length : null,
              positive_ratio: scData.returns.length > 0 ? scData.returns.filter(r => r > 0).length / scData.returns.length : null,
              market_cap: scData.companies.reduce((sum, c) => sum + (c.market_cap || 0), 0),
              company_count: scData.companies.length,
              companies: scData.companies,
            })),
          };
        });
    }
    return [];
  };

  const heatmapData = useMemo(buildHeatmapData, [filteredCompanies, groupBy, sectorSummary, subIndustrySummary, returnKey]);

  const sortedHeatmapData = useMemo(() => {
    const sorted = [...heatmapData];
    sorted.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'return') {
        valA = a.return ?? -999;
        valB = b.return ?? -999;
      } else if (sortBy === 'market_cap') {
        valA = a.market_cap || 0;
        valB = b.market_cap || 0;
      } else if (sortBy === 'positive_ratio') {
        valA = a.positive_ratio ?? 0;
        valB = b.positive_ratio ?? 0;
      } else if (sortBy === 'name') {
        valA = a.name;
        valB = b.name;
      } else {
        valA = a.company_count;
        valB = b.company_count;
      }
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
    return sorted;
  }, [heatmapData, sortBy, sortAsc]);

  const sortedByReturn = [...filteredCompanies]
    .filter(c => c.returns?.[returnKey] !== null && c.returns?.[returnKey] !== undefined)
    .sort((a, b) => (b.returns?.[returnKey] || 0) - (a.returns?.[returnKey] || 0));

  const topGainers = sortedByReturn.slice(0, 10);
  const topLosers = sortedByReturn.slice(-10).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Flame className="w-7 h-7 text-orange-500" />
          Sector Heatmap
        </h1>
        <p className="text-gray-500 mt-1">Performance analysis with drill-down by sub-sector</p>
      </div>

      {/* Sector Performance Heatmap - Grid Style */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Sector Performance Heatmap
          </h2>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">Sector</th>
                {METRICS.map(m => (
                  <th key={m.key} className="text-center py-2 px-1 font-semibold text-gray-600 text-xs">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectorHeatmapData.map((row, idx) => {
                const normalizedRow = normalizedHeatmap[idx];
                return (
                  <tr key={row.sector} className="border-b last:border-b-0">
                    <td className="py-2 px-2 font-medium text-gray-900 whitespace-nowrap">
                      {row.sector}
                    </td>
                    {METRICS.map(({ key }) => {
                      const value = row.metrics[key];
                      const normalizedValue = normalizedRow?.metrics[key];
                      const bgColor = getHeatmapColor(normalizedValue, key);
                      
                      let displayValue = 'N/A';
                      if (value !== null && !isNaN(value)) {
                        if (key === 'pe_ratio' || key === 'volatility') {
                          displayValue = value.toFixed(1);
                        } else {
                          displayValue = `${(value * 100).toFixed(0)}%`;
                        }
                      }
                      
                      return (
                        <td key={key} className="py-1 px-1">
                          <div
                            className="rounded-lg py-2 px-1 text-center text-xs font-bold text-white"
                            style={{ backgroundColor: bgColor }}
                          >
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex items-center justify-center gap-4 text-xs">
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

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Period</label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {RETURN_PERIODS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Group By</label>
            <select
              value={groupBy}
              onChange={e => { setGroupBy(e.target.value); setExpandedRows(new Set()); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="sector">Sector</option>
              <option value="sub_industry">Sub-Industry</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="return">Return</option>
              <option value="market_cap">Market Cap</option>
              <option value="positive_ratio">% Positive</option>
              <option value="company_count">Count</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Min Market Cap</label>
            <select
              value={minMarketCap}
              onChange={e => setMinMarketCap(parseFloat(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="0">All</option>
              <option value="10">$10B+</option>
              <option value="50">$50B+</option>
              <option value="100">$100B+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drill-down Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {groupBy === 'sector' ? 'Sector' : 'Sub-Industry'} Drill-down
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  {groupBy === 'sector' ? 'Sector' : 'Sub-Industry'}
                </th>
                <th className="text-center py-3 px-3 font-semibold text-gray-600">Companies</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-600">Market Cap</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">Return</th>
                <th className="text-center py-3 px-3 font-semibold text-gray-600">% Positive</th>
              </tr>
            </thead>
            <tbody>
              {sortedHeatmapData.map(row => {
                const isExpanded = expandedRows.has(row.name);
                const hasChildren = row.subGroups?.length > 0;

                return (
                  <>
                    <tr
                      key={row.name}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => hasChildren && toggleRow(row.name)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {hasChildren ? (
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          ) : (
                            <Minus className="w-4 h-4 text-gray-300" />
                          )}
                          <span className="font-medium text-gray-900">{row.name}</span>
                          {row.type === 'sub_industry' && (
                            <span className="text-xs text-gray-500">({row.sector})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">{row.company_count}</td>
                      <td className="py-3 px-3 text-right font-medium">{formatMarketCap(row.market_cap)}</td>
                      <td className={`py-3 px-4 text-center font-bold ${getReturnColor(row.return)}`}>
                        {row.return !== null ? formatReturn(row.return) : 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.positive_ratio !== null ? `${(row.positive_ratio * 100).toFixed(0)}%` : 'N/A'}
                      </td>
                    </tr>

                    {/* Expanded Sub-groups */}
                    {isExpanded && row.subGroups?.map(sub => (
                      <tr key={`${row.name}|${sub.name}`} className="bg-gray-50 border-b">
                        <td className="py-2 px-4 pl-12">
                          <span className="text-gray-700">{sub.name}</span>
                        </td>
                        <td className="py-2 px-3 text-center text-sm text-gray-600">{sub.company_count}</td>
                        <td className="py-2 px-3 text-right text-sm text-gray-600">{formatMarketCap(sub.market_cap)}</td>
                        <td className={`py-2 px-4 text-center text-sm font-bold ${getReturnColor(sub.return)}`}>
                          {sub.return !== null ? formatReturn(sub.return) : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-center text-sm text-gray-600">
                          {sub.positive_ratio !== null ? `${(sub.positive_ratio * 100).toFixed(0)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600">
            <TrendingUp className="w-5 h-5" />
            Top 10 Gainers ({selectedPeriod.toUpperCase()})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Rank</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">Return</th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map(c => (
                  <tr key={c.symbol} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-500">{c.rank}</td>
                    <td className="py-2 px-2">
                      <Link to={`/company/${c.symbol}`} className="font-medium text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-2">{c.name}</td>
                    <td className="py-2 px-2 text-right font-medium text-green-600">
                      {formatReturn(c.returns?.[returnKey])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
            <TrendingDown className="w-5 h-5" />
            Top 10 Losers ({selectedPeriod.toUpperCase()})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Rank</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">Return</th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map(c => (
                  <tr key={c.symbol} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-500">{c.rank}</td>
                    <td className="py-2 px-2">
                      <Link to={`/company/${c.symbol}`} className="font-medium text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-2">{c.name}</td>
                    <td className="py-2 px-2 text-right font-medium text-red-600">
                      {formatReturn(c.returns?.[returnKey])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}