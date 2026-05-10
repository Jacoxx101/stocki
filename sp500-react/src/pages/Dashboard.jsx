import { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Globe, Shield, Briefcase } from 'lucide-react';

const ASSET_CLASSES = [
  // US Equities
  { ticker: 'SPY', name: 'S&P 500', category: 'US Equity', price: 733.45, priceFmt: 'usd',
    r1d: 0.0028, r1w: -0.0041, r1m: -0.0113, r3m: 0.0382, r1y: 0.1867, r5y: 0.6214,
    ma50: 'below', ma200: 'above' },
  { ticker: 'QQQ', name: 'Nasdaq 100', category: 'US Equity', price: 702.88, priceFmt: 'usd',
    r1d: 0.0035, r1w: -0.0062, r1m: -0.0145, r3m: 0.0417, r1y: 0.2033, r5y: 0.7845,
    ma50: 'below', ma200: 'above' },

  // Asia-Pacific
  { ticker: 'NIFTY', name: 'Nifty 50', category: 'Asia-Pacific', price: 28452, priceFmt: 'index',
    r1d: 0.0062, r1w: 0.0241, r1m: 0.0513, r3m: 0.0938, r1y: 0.2247, r5y: 0.6231,
    ma50: 'above', ma200: 'above' },
  { ticker: 'BANKNIFTY', name: 'Bank Nifty', category: 'Asia-Pacific', price: 62310, priceFmt: 'index',
    r1d: 0.0078, r1w: 0.0312, r1m: 0.0684, r3m: 0.1215, r1y: 0.2812, r5y: 0.7193,
    ma50: 'above', ma200: 'above' },
  { ticker: 'SGX', name: 'Singapore STI', category: 'Asia-Pacific', price: 4118, priceFmt: 'index',
    r1d: 0.0018, r1w: 0.0105, r1m: 0.0227, r3m: 0.0475, r1y: 0.1423, r5y: 0.2287,
    ma50: 'above', ma200: 'above' },
  { ticker: 'NIKKEI', name: 'Nikkei 225', category: 'Asia-Pacific', price: 41230, priceFmt: 'index',
    r1d: 0.0045, r1w: 0.0152, r1m: 0.0331, r3m: 0.0614, r1y: 0.1798, r5y: 0.3482,
    ma50: 'above', ma200: 'above' },
  { ticker: 'KOSPI', name: 'KOSPI', category: 'Asia-Pacific', price: 3145, priceFmt: 'index',
    r1d: -0.0023, r1w: -0.0067, r1m: 0.0089, r3m: 0.0243, r1y: 0.0941, r5y: 0.1316,
    ma50: 'below', ma200: 'above' },
  { ticker: 'SET', name: 'Thailand SET', category: 'Asia-Pacific', price: 1578, priceFmt: 'index',
    r1d: -0.0012, r1w: -0.0045, r1m: -0.0128, r3m: 0.0157, r1y: 0.0528, r5y: 0.0843,
    ma50: 'below', ma200: 'below' },

  // Frontier / Commodity-heavy
  { ticker: 'RSX', name: 'Russia MOEX', category: 'Frontier', price: 14.25, priceFmt: 'usd',
    r1d: -0.0085, r1w: -0.0256, r1m: -0.0723, r3m: -0.1265, r1y: -0.1842, r5y: -0.5137,
    ma50: 'below', ma200: 'below' },

  // Commodities
  { ticker: 'GLD', name: 'Gold', category: 'Commodities', price: 268.42, priceFmt: 'usd',
    r1d: 0.0048, r1w: 0.0186, r1m: 0.0523, r3m: 0.1187, r1y: 0.3125, r5y: 0.6973,
    ma50: 'above', ma200: 'above' },
  { ticker: 'SLV', name: 'Silver', category: 'Commodities', price: 32.84, priceFmt: 'usd',
    r1d: 0.0061, r1w: 0.0213, r1m: 0.0478, r3m: 0.1342, r1y: 0.2871, r5y: 0.5495,
    ma50: 'above', ma200: 'above' },
  { ticker: 'IRON', name: 'Iron Ore', category: 'Commodities', price: 108.25, priceFmt: 'usd',
    r1d: -0.0034, r1w: -0.0118, r1m: -0.0285, r3m: 0.0062, r1y: -0.1527, r5y: 0.0894,
    ma50: 'below', ma200: 'below' },
  { ticker: 'COPPER', name: 'Copper', category: 'Commodities', price: 5.47, priceFmt: 'usd',
    r1d: 0.0014, r1w: -0.0082, r1m: -0.0153, r3m: 0.0287, r1y: 0.1156, r5y: 0.3628,
    ma50: 'below', ma200: 'above' },

  // Crypto
  { ticker: 'BTC', name: 'Bitcoin', category: 'Crypto', price: 108460, priceFmt: 'crypto',
    r1d: -0.0058, r1w: 0.0321, r1m: 0.0873, r3m: 0.1746, r1y: 0.5341, r5y: 7.2314,
    ma50: 'above', ma200: 'above' },
  { ticker: 'ETH', name: 'Ethereum', category: 'Crypto', price: 5872, priceFmt: 'crypto',
    r1d: -0.0072, r1w: 0.0264, r1m: 0.0718, r3m: 0.1435, r1y: 0.4482, r5y: 3.8561,
    ma50: 'above', ma200: 'above' },
];

const TIMEFRAMES = [
  { key: 'r1d', label: '1D' },
  { key: 'r1w', label: '1W' },
  { key: 'r1m', label: '1M' },
  { key: 'r3m', label: '3M' },
  { key: 'r1y', label: '1Y' },
  { key: 'r5y', label: '5Y' },
];

function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;
}

function pctColor(v) {
  if (v === null || v === undefined) return 'text-gray-400';
  return v >= 0 ? 'text-emerald-600' : 'text-red-600';
}

function pctBg(v) {
  if (v === null || v === undefined) return '';
  return v >= 0 ? 'bg-emerald-50/80' : 'bg-red-50/80';
}

function heatColor(v, metric) {
  if (v === null || v === undefined) return '#e5e7eb';
  const abs = Math.abs(v);
  if (abs >= 0.05) return v >= 0 ? '#059669' : '#dc2626';
  if (abs >= 0.02) return v >= 0 ? '#34d399' : '#f87171';
  if (abs >= 0.005) return v >= 0 ? '#a7f3d0' : '#fecaca';
  return v >= 0 ? '#d1fae5' : '#fee2e2';
}

export default function Dashboard() {
  const data = useData();
  const [chartMetric, setChartMetric] = useState('r1m');

  const companies = data?.companies || [];
  const sectorSummary = data?.sector_summary || {};

  const categorySummary = useMemo(() => {
    const cats = {};
    ASSET_CLASSES.forEach(a => {
      if (!cats[a.category]) cats[a.category] = { sum: 0, count: 0 };
      cats[a.category].sum += a[chartMetric];
      cats[a.category].count++;
    });
    return Object.entries(cats).map(([k, v]) => ({ category: k, avg: v.sum / v.count }));
  }, [chartMetric]);

  const chartData = useMemo(() => {
    return ASSET_CLASSES.map(a => ({
      name: a.ticker,
      fullName: a.name,
      value: a[chartMetric] * 100,
      color: a[chartMetric] >= 0 ? '#059669' : '#dc2626',
    }));
  }, [chartMetric]);

  const sectorData = useMemo(() => {
    return Object.entries(sectorSummary).map(([name, info]) => ({
      name,
      mcap: info.total_market_cap ? info.total_market_cap / 1e9 : 0,
      count: info.company_count || 0,
      r1w: info.avg_return_1w,
      r1m: info.avg_return_1m,
      ytd: info.avg_return_ytd,
      pos1w: info.positive_1w,
      pos1m: info.positive_1m,
      total1w: info.company_count,
    })).sort((a, b) => b.mcap - a.mcap);
  }, [sectorSummary]);

  const avgByCategory = useMemo(() => {
    const c = {}, counts = {};
    ASSET_CLASSES.forEach(a => { c[a.category] = (c[a.category] || 0) + a[chartMetric]; counts[a.category] = (counts[a.category] || 0) + 1; });
    Object.keys(c).forEach(k => { c[k] /= counts[k]; });
    return c;
  }, [chartMetric]);

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400 font-mono">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] -mx-4 -my-6 -mb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-gray-400 uppercase font-mono">Macro Dashboard</div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">Asset Class Performance</h1>
              <p className="text-[12px] text-gray-400 mt-1 font-medium">Cross-asset returns · {ASSET_CLASSES.length} assets · 5 categories</p>
            </div>
            <div className="flex items-center gap-6">
              {['US Equity', 'Asia-Pacific', 'Commodities', 'Crypto', 'Frontier'].map(cat => {
                const v = avgByCategory[cat];
                return (
                  <div key={cat} className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{cat}</div>
                    <div className={`text-sm font-bold tabular-nums ${pctColor(v)}`}>{fmtPct(v)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance Matrix ── */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Cross-Asset Performance Matrix</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">Returns as of May 10, 2026</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Asset</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  {TIMEFRAMES.map(tf => (
                    <th key={tf.key} className="text-right py-2.5 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{tf.label}</th>
                  ))}
                  <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">50 MA</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">200 MA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ASSET_CLASSES.map((asset, idx) => {
                  const bg = idx % 2 === 1 ? 'bg-[#fcfcfd]' : 'bg-white';
                  return (
                    <tr key={asset.ticker} className={`transition-colors duration-75 hover:bg-[#f6f7f9] ${bg}`}>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{asset.ticker}</span>
                          <span className="text-xs text-gray-400">{asset.name}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{asset.category}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {asset.priceFmt === 'index' ? (
                          <span className="text-sm font-mono tabular-nums text-gray-700">{asset.price.toLocaleString()}</span>
                        ) : asset.priceFmt === 'crypto' ? (
                          <span className="text-sm font-mono tabular-nums text-gray-700">${asset.price.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm font-mono tabular-nums text-gray-700">${asset.price.toFixed(2)}</span>
                        )}
                      </td>
                      {TIMEFRAMES.map(tf => {
                        const v = asset[tf.key];
                        return (
                          <td key={tf.key} className="py-2.5 px-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold tabular-nums ${pctColor(v)} ${pctBg(v)}`}>
                              {fmtPct(v)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${asset.ma50 === 'above' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {asset.ma50 === 'above' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {asset.ma50}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${asset.ma200 === 'above' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {asset.ma200 === 'above' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {asset.ma200}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="max-w-7xl mx-auto px-4 pb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Performance Comparison</span>
            </div>
            <div className="flex items-center gap-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.key}
                  onClick={() => setChartMetric(tf.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    chartMetric === tf.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={36} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, _, props) => [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, props.payload.fullName]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sector Performance ── */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">S&P 500 Sector Performance</span>
            <span className="text-[11px] text-gray-400 font-mono ml-auto">{sectorData.length} sectors</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sector</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Market Cap</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stocks</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">1W</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">1M</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">YTD</th>
                  <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pos 1W</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sectorData.map((s, idx) => {
                  const bg = idx % 2 === 1 ? 'bg-[#fcfcfd]' : 'bg-white';
                  return (
                    <tr key={s.name} className={`transition-colors duration-75 hover:bg-[#f6f7f9] ${bg}`}>
                      <td className="py-2 px-4"><span className="text-sm font-bold text-gray-800">{s.name}</span></td>
                      <td className="py-2 px-3 text-right"><span className="text-xs font-mono tabular-nums text-gray-600">${s.mcap.toFixed(0)}B</span></td>
                      <td className="py-2 px-3 text-right"><span className="text-xs font-mono tabular-nums text-gray-500">{s.count}</span></td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${pctColor(s.r1w)} ${pctBg(s.r1w)}`}>{fmtPct(s.r1w)}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${pctColor(s.r1m)} ${pctBg(s.r1m)}`}>{fmtPct(s.r1m)}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${pctColor(s.ytd)} ${pctBg(s.ytd)}`}>{fmtPct(s.ytd)}</span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-xs font-mono tabular-nums text-gray-500">{s.pos1w}/{s.total1w}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
