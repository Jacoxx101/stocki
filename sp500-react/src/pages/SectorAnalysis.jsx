import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Activity, DollarSign, Target, BarChart3, Flame } from 'lucide-react';

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatM(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e6).toFixed(1)}M`;
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

function getReturnColor(val) {
  if (val === null || val === undefined) return 'text-gray-500';
  return val >= 0 ? 'text-green-600' : 'text-red-600';
}

function getCompanyReturn(company, key) {
  if (key === '1_year') return company.historical_data?.one_year_return ?? company.returns?.['1_year'];
  if (key === 'ytd') return company.historical_data?.ytd_return ?? company.returns?.ytd;
  return company.returns?.[key];
}

const RETURN_PERIODS = [
  { key: '1_week', label: '1 Week', shortLabel: '1W' },
  { key: '1_month', label: '1 Month', shortLabel: '1M' },
  { key: 'ytd', label: 'YTD', shortLabel: 'YTD' },
  { key: '1_year', label: '1 Year', shortLabel: '1Y' },
];

export default function SectorAnalysis() {
  const data = useData();
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1_month');

  if (!data) return null;

  const sectors = Object.keys(data.sector_summary).sort();
  const currentSector = selectedSector || sectors[0];
  const sectorInfo = data.sector_summary[currentSector];
  const sectorCompanies = data.companies.filter(c => c.sector === currentSector);

  // Calculate sector metrics
  const sectorMetrics = useMemo(() => {
    const mktCaps = sectorCompanies.map(c => c.market_cap).filter(Boolean);
    const peRatios = sectorCompanies.map(c => c.financials?.pe_ratio).filter(v => v && !isNaN(v));
    const margins = sectorCompanies.map(c => c.financials?.profit_margin).filter(v => v && !isNaN(v));
    const ytdReturns = sectorCompanies.map(c => getCompanyReturn(c, 'ytd')).filter(v => v !== null && v !== undefined && !isNaN(v));
    const oneYearReturns = sectorCompanies.map(c => getCompanyReturn(c, '1_year')).filter(v => v !== null && v !== undefined && !isNaN(v));
    const revenues = sectorCompanies.map(c => c.financials?.revenue).filter(v => v && !isNaN(v));
    const roes = sectorCompanies.map(c => c.financials?.return_on_equity).filter(v => v && !isNaN(v));

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    
    return {
      avgMarketCap: avg(mktCaps),
      avgPE: avg(peRatios),
      avgMargin: avg(margins),
      avgYTD: avg(ytdReturns),
      avg1Y: avg(oneYearReturns),
      avgRevenue: avg(revenues),
      avgROE: avg(roes),
      totalRevenue: revenues.reduce((a, b) => a + b, 0),
      totalMarketCap: mktCaps.reduce((a, b) => a + b, 0),
    };
  }, [sectorCompanies]);

  // Top gainers and losers for selected period
  const sortedByReturn = useMemo(() => {
    return [...sectorCompanies]
      .map(c => ({ ...c, selectedReturn: getCompanyReturn(c, selectedPeriod) }))
      .filter(c => c.selectedReturn !== null && c.selectedReturn !== undefined && !isNaN(c.selectedReturn))
      .sort((a, b) => b.selectedReturn - a.selectedReturn);
  }, [sectorCompanies, selectedPeriod]);

  const topGainers = sortedByReturn.slice(0, 10);
  const topLosers = sortedByReturn.slice(-10).reverse();

  // Market cap distribution
  const mcData = sectorCompanies
    .map(c => ({ name: c.name, symbol: c.symbol, marketCap: c.market_cap / 1e9 }))
    .sort((a, b) => b.marketCap - a.marketCap);

  // P/E vs Return scatter
  const scatterData = sectorCompanies
    .filter(c => c.financials?.pe_ratio && getCompanyReturn(c, selectedPeriod) !== undefined && getCompanyReturn(c, selectedPeriod) !== null)
    .map(c => ({
      name: c.symbol,
      pe: c.financials.pe_ratio,
      return: getCompanyReturn(c, selectedPeriod) * 100,
      marketCap: c.market_cap / 1e9,
      subIndustry: c.sub_industry,
    }));

  // Sub-industry breakdown
  const subIndustryData = sectorCompanies.reduce((acc, c) => {
    if (!acc[c.sub_industry]) {
      acc[c.sub_industry] = { count: 0, marketCap: 0, companies: [] };
    }
    acc[c.sub_industry].count += 1;
    acc[c.sub_industry].marketCap += c.market_cap / 1e9;
    acc[c.sub_industry].companies.push(c);
    return acc;
  }, {});

  // Best performing sub-industries
  const subIndustryPerformance = Object.entries(subIndustryData)
    .map(([name, info]) => {
      const returns = info.companies
        .map(c => getCompanyReturn(c, selectedPeriod))
        .filter(v => v !== null && v !== undefined && !isNaN(v));
      const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      return { name, avgReturn, count: info.count, marketCap: info.marketCap };
    })
    .sort((a, b) => b.avgReturn - a.avgReturn);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sector Analysis</h1>
        <p className="text-gray-500 mt-1">Deep dive into sector performance and trends</p>
      </div>

      {/* Sector Selector */}
      <div className="flex flex-wrap gap-2">
        {sectors.map(sector => (
          <button
            key={sector}
            onClick={() => setSelectedSector(sector)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentSector === sector
                ? 'bg-blue-600 text-white'
                : 'bg-white border hover:bg-gray-50 text-gray-700'
            }`}
          >
            {sector}
            <span className="ml-1 opacity-70">({data.sector_summary[sector].company_count})</span>
          </button>
        ))}
      </div>

      {/* Sector Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold mb-4">{currentSector}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatBox icon={BarChart3} label="Companies" value={sectorInfo.company_count} />
          <StatBox icon={DollarSign} label="Total Market Cap" value={formatB(sectorMetrics.totalMarketCap)} />
          <StatBox icon={Activity} label="Avg P/E" value={sectorMetrics.avgPE ? sectorMetrics.avgPE.toFixed(1) : 'N/A'} />
          <StatBox icon={Target} label="Avg Margin" value={formatPct(sectorMetrics.avgMargin)} />
          <StatBox icon={TrendingUp} label="Avg YTD" value={formatPct(sectorMetrics.avgYTD)} color={getReturnColor(sectorMetrics.avgYTD)} />
          <StatBox icon={TrendingUp} label="Avg 1Y" value={formatPct(sectorMetrics.avg1Y)} color={getReturnColor(sectorMetrics.avg1Y)} />
          <StatBox icon={DollarSign} label="Total Revenue" value={formatB(sectorMetrics.totalRevenue)} />
          <StatBox icon={Activity} label="Avg ROE" value={formatPct(sectorMetrics.avgROE)} />
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Performance Period:</span>
          <div className="flex gap-2">
            {RETURN_PERIODS.map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Movers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Top 10 Gainers ({RETURN_PERIODS.find(p => p.key === selectedPeriod)?.shortLabel})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Rank</th>
                  <th className="text-left py-2 px-3 font-semibold">Symbol</th>
                  <th className="text-left py-2 px-3 font-semibold">Name</th>
                  <th className="text-right py-2 px-3 font-semibold">Return</th>
                  <th className="text-right py-2 px-3 font-semibold">Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map((c, idx) => (
                  <tr key={c.symbol} className="border-b hover:bg-green-50">
                    <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <Link to={`/company/${c.symbol}`} className="font-bold text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3 text-right font-bold text-green-600">
                      +{formatPct(c.selectedReturn)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">{formatB(c.market_cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Top 10 Losers ({RETURN_PERIODS.find(p => p.key === selectedPeriod)?.shortLabel})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Rank</th>
                  <th className="text-left py-2 px-3 font-semibold">Symbol</th>
                  <th className="text-left py-2 px-3 font-semibold">Name</th>
                  <th className="text-right py-2 px-3 font-semibold">Return</th>
                  <th className="text-right py-2 px-3 font-semibold">Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map((c, idx) => (
                  <tr key={c.symbol} className="border-b hover:bg-red-50">
                    <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <Link to={`/company/${c.symbol}`} className="font-bold text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">
                      {formatPct(c.selectedReturn)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600">{formatB(c.market_cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Cap Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Market Cap Distribution (Top 20)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={mcData.slice(0, 20)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(0)}B`} />
              <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 10}} />
              <Tooltip formatter={(v) => [`$${v.toFixed(1)}B`, 'Market Cap']} />
              <Bar dataKey="marketCap" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* P/E vs Return Scatter */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">P/E vs {RETURN_PERIODS.find(p => p.key === selectedPeriod)?.label} Return</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="pe" name="P/E" unit="x" />
              <YAxis type="number" dataKey="return" name="Return" unit="%" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => {
                if (name === 'return') return [`${value.toFixed(1)}%`, 'Return'];
                return [value.toFixed(1), 'P/E'];
              }} />
              <Scatter data={scatterData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-Industry Performance */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Sub-Industry Performance ({RETURN_PERIODS.find(p => p.key === selectedPeriod)?.label})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Sub-Industry</th>
                <th className="text-center py-3 px-4 font-semibold">Companies</th>
                <th className="text-right py-3 px-4 font-semibold">Market Cap</th>
                <th className="text-right py-3 px-4 font-semibold">Avg Return</th>
                <th className="text-right py-3 px-4 font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody>
              {subIndustryPerformance.map(({ name, avgReturn, count, marketCap }) => (
                <tr key={name} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{name}</td>
                  <td className="py-3 px-4 text-center">{count}</td>
                  <td className="py-3 px-4 text-right">${marketCap.toFixed(1)}B</td>
                  <td className={`py-3 px-4 text-right font-bold ${getReturnColor(avgReturn)}`}>
                    {formatPct(avgReturn)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${avgReturn >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(Math.abs(avgReturn) * 100 * 5, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">All Companies in {currentSector}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Rank</th>
                <th className="text-left py-3 px-4 font-semibold">Symbol</th>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Sub-Industry</th>
                <th className="text-right py-3 px-4 font-semibold">Market Cap</th>
                <th className="text-right py-3 px-4 font-semibold">P/E</th>
                <th className="text-right py-3 px-4 font-semibold">1W</th>
                <th className="text-right py-3 px-4 font-semibold">1M</th>
                <th className="text-right py-3 px-4 font-semibold">YTD</th>
                <th className="text-right py-3 px-4 font-semibold">1Y</th>
              </tr>
            </thead>
            <tbody>
              {sectorCompanies
                .sort((a, b) => a.rank - b.rank)
                .map(c => (
                  <tr key={c.symbol} className="border-b hover:bg-blue-50 transition-colors">
                    <td className="py-3 px-4 text-gray-500">{c.rank}</td>
                    <td className="py-3 px-4">
                      <Link to={`/company/${c.symbol}`} className="font-bold text-blue-600 hover:underline">{c.symbol}</Link>
                    </td>
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4 text-gray-500">{c.sub_industry}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatB(c.market_cap)}</td>
                    <td className="py-3 px-4 text-right">{c.financials?.pe_ratio ? c.financials.pe_ratio.toFixed(1) : 'N/A'}</td>
                    <td className={`py-3 px-4 text-right font-medium ${getReturnColor(getCompanyReturn(c, '1_week'))}`}>
                      {formatPct(getCompanyReturn(c, '1_week'))}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${getReturnColor(getCompanyReturn(c, '1_month'))}`}>
                      {formatPct(getCompanyReturn(c, '1_month'))}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${getReturnColor(getCompanyReturn(c, 'ytd'))}`}>
                      {formatPct(getCompanyReturn(c, 'ytd'))}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${getReturnColor(getCompanyReturn(c, '1_year'))}`}>
                      {formatPct(getCompanyReturn(c, '1_year'))}
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

function StatBox({ icon: Icon, label, value, color = 'text-gray-900' }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <Icon className="w-5 h-5 mx-auto mb-1 text-gray-400" />
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
