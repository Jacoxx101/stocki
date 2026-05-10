import { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Plus, X, Search, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

function formatB(val) {
  if (!val) return '—';
  const b = val / 1e9;
  return b >= 1000 ? `$${(b / 1000).toFixed(2)}T` : `$${b.toFixed(0)}B`;
}

function formatPrice(val) {
  if (!val && val !== 0) return '—';
  return `$${Number(val).toFixed(2)}`;
}

function formatReturn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const abs = Math.abs(val * 100);
  return `${val >= 0 ? '+' : '−'}${abs.toFixed(1)}%`;
}

function getColor(val) {
  if (val === null || val === undefined) return 'text-gray-400';
  return val >= 0 ? 'text-emerald-600' : 'text-red-600';
}

const Columns = [
  { key: 'symbol', label: 'Ticker', align: 'left' },
  { key: 'name', label: 'Company', align: 'left' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: '1d', label: '1D', align: 'right' },
  { key: '1w', label: '1W', align: 'right' },
  { key: 'market_cap', label: 'Market Cap', align: 'right' },
  { key: '1m', label: '1M', align: 'right' },
  { key: 'ytd', label: 'YTD', align: 'right' },
  { key: '1y', label: '1Y', align: 'right' },
];

const STORAGE_KEY = 'sp500_stacks_v4';

const DEFAULT_STACKS = [
  { id: 'stack-ai', name: 'AI Stack', symbols: ['NVDA', 'AMD', 'AVGO', 'MSFT', 'AMZN', 'GOOGL', 'ORCL', 'MU', 'PLTR', 'CRM', 'NOW'] },
  { id: 'stack-semi', name: 'Semiconductor', symbols: ['NVDA', 'AMD', 'QCOM', 'INTC', 'ADI', 'MU', 'AMAT', 'KLAC', 'LRCX', 'TXN', 'MPWR', 'ON'] },
  { id: 'stack-cloud', name: 'Cloud', symbols: ['AMZN', 'MSFT', 'GOOGL', 'ORCL', 'IBM', 'CRM', 'NOW', 'ADBE', 'MDB'] },
  { id: 'stack-cyber', name: 'Cybersecurity', symbols: ['CRWD', 'PANW', 'ZS', 'FTNT', 'NET', 'OKTA', 'DDOG', 'CHKP', 'GEN'] },
  { id: 'stack-ev', name: 'EV / Clean Energy', symbols: ['TSLA', 'FSLR', 'NEE', 'RUN', 'ALB', 'GE', 'ETN'] },
  { id: 'stack-fintech', name: 'Fintech', symbols: ['SQ', 'PYPL', 'SOFI', 'V', 'MA', 'COIN', 'HOOD', 'FIS', 'FISV', 'GPN'] },
  { id: 'stack-consumer', name: 'Consumer Tech', symbols: ['AAPL', 'META', 'GOOGL', 'AMZN', 'NFLX', 'SPOT', 'SNAP', 'DIS', 'RBLX', 'UBER', 'ABNB'] },
  { id: 'stack-industrial', name: 'Industrial', symbols: ['ROK', 'GE', 'EMR', 'DHR', 'HON', 'CAT', 'DE', 'PH', 'ETN'] },
  { id: 'stack-healthcare', name: 'Healthcare', symbols: ['LLY', 'NVO', 'MRNA', 'REGN', 'BIIB', 'AMGN', 'GILD', 'VRTX', 'ISRG', 'ABBV'] },
  { id: 'stack-energy', name: 'Energy', symbols: ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'FSLR', 'NEE', 'RUN', 'MPC', 'VLO', 'PSX'] },
  { id: 'stack-defence', name: 'Defence', symbols: ['LMT', 'RTX', 'NOC', 'GD', 'LHX', 'BA', 'HWM', 'AXON'] },
  { id: 'stack-retail', name: 'Retail', symbols: ['AMZN', 'WMT', 'COST', 'HD', 'LOW', 'TGT', 'TJX', 'ROST', 'ULTA', 'BBY'] },
];

export default function StackPage() {
  const data = useData();
  const [stacks, setStacks] = useState([]);
  const [activeStackId, setActiveStackId] = useState(null);
  const [newStackName, setNewStackName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStacks(parsed);
          setActiveStackId(parsed[0].id);
          return;
        }
      }
    } catch { /* corrupt — use defaults */ }
    setStacks(DEFAULT_STACKS);
    setActiveStackId(DEFAULT_STACKS[0].id);
  }, []);

  useEffect(() => {
    if (stacks.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
    else localStorage.removeItem(STORAGE_KEY);
  }, [stacks]);

  const companies = data?.companies || [];
  const activeStack = stacks.find(s => s.id === activeStackId);

  const activeStackData = useMemo(() => {
    if (!activeStack) return [];
    return activeStack.symbols.map(symbol => {
      const c = companies.find(co => co.symbol === symbol);
      return { symbol, company: c, isInSp500: !!c };
    });
  }, [activeStack, companies]);

  const stackStats = useMemo(() => {
    if (!activeStackData.length) return null;
    const sp = activeStackData.filter(d => d.isInSp500).map(d => d.company);
    const mc = sp.reduce((s, c) => s + (c.market_cap || 0), 0);
    const ytd = sp.map(c => c.historical_data?.ytd_return ?? c.returns?.ytd).filter(v => v !== undefined && !isNaN(v));
    const pes = sp.map(c => c.financials?.pe_ratio).filter(v => v !== undefined && !isNaN(v) && v > 0);
    return {
      totalMC: mc,
      avgYTD: ytd.length ? ytd.reduce((a, b) => a + b, 0) / ytd.length : null,
      avgPE: pes.length ? pes.reduce((a, b) => a + b, 0) / pes.length : null,
      sp500Count: sp.length,
      totalSymbols: activeStackData.length,
    };
  }, [activeStackData]);

  const filteredData = useMemo(() => {
    let rows = [...activeStackData];
    if (search.trim()) {
      const t = search.toLowerCase().trim();
      rows = rows.filter(d => d.symbol.toLowerCase().includes(t) || (d.company?.name || '').toLowerCase().includes(t));
    }
    rows.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'symbol': return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        case 'name': return sortAsc
          ? (a.company?.name || a.symbol).localeCompare(b.company?.name || b.symbol)
          : (b.company?.name || b.symbol).localeCompare(a.company?.name || a.symbol);
        case 'price': av = a.company?.current_price ?? -1; bv = b.company?.current_price ?? -1; break;
        case '1d':
          av = a.company?.stock_data?.current_price && a.company?.stock_data?.previous_close
            ? (a.company.stock_data.current_price - a.company.stock_data.previous_close) / a.company.stock_data.previous_close : -999;
          bv = b.company?.stock_data?.current_price && b.company?.stock_data?.previous_close
            ? (b.company.stock_data.current_price - b.company.stock_data.previous_close) / b.company.stock_data.previous_close : -999;
          break;
        case '1w': av = a.company?.returns?.['1_week'] ?? -999; bv = b.company?.returns?.['1_week'] ?? -999; break;
        case 'market_cap': av = a.company?.market_cap ?? 0; bv = b.company?.market_cap ?? 0; break;
        case '1m': av = a.company?.returns?.['1_month'] ?? -999; bv = b.company?.returns?.['1_month'] ?? -999; break;
        case 'ytd': av = a.company?.historical_data?.ytd_return ?? a.company?.returns?.ytd ?? -999; bv = b.company?.historical_data?.ytd_return ?? b.company?.returns?.ytd ?? -999; break;
        case '1y': av = a.company?.historical_data?.one_year_return ?? -999; bv = b.company?.historical_data?.one_year_return ?? -999; break;
        default: av = a.company?.market_cap ?? 0; bv = b.company?.market_cap ?? 0; break;
      }
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return sortAsc ? av - bv : bv - av;
    });
    return rows;
  }, [activeStackData, sortBy, sortAsc, search]);

  const handleSort = (key) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />;
  };

  const createStack = () => {
    if (!newStackName.trim()) return;
    const s = { id: Date.now().toString(), name: newStackName.trim(), symbols: [] };
    setStacks(prev => [...prev, s]);
    setActiveStackId(s.id);
    setNewStackName('');
    setShowCreateForm(false);
  };

  const addSymbol = () => {
    if (!newSymbol.trim() || !activeStack) return;
    const sym = newSymbol.trim().toUpperCase();
    if (activeStack.symbols.includes(sym)) { setNewSymbol(''); return; }
    setStacks(prev => prev.map(s => s.id === activeStackId ? { ...s, symbols: [...s.symbols, sym] } : s));
    setNewSymbol('');
  };

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400 font-mono">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] -mx-4 -my-6 -mb-12">
      {/* ── Unified header block ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Top row: label, title, inline metrics, YTD */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-8 min-w-0">
              <div className="shrink-0">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-gray-400 uppercase font-mono">Stack</div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{activeStack?.name || 'Portfolios'}</h1>
                <div className="text-[11px] text-gray-400 font-medium mt-0.5">{stacks.length} stacks &middot; {activeStack?.symbols.length || 0} stocks</div>
              </div>
              {stackStats && (
                <div className="hidden sm:flex items-center gap-5">
                  <Metric label="Stocks" value={stackStats.totalSymbols} sub={`${stackStats.sp500Count} S&P`} />
                  <Metric label="Mkt Cap" value={formatB(stackStats.totalMC)} />
                  <Metric label="YTD" value={formatReturn(stackStats.avgYTD)} color={getColor(stackStats.avgYTD)} />
                  <Metric label="P/E" value={stackStats.avgPE ? stackStats.avgPE.toFixed(1) : '—'} />
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className={`text-4xl font-bold tabular-nums tracking-tight leading-none ${getColor(stackStats?.avgYTD)}`}>
                {stackStats ? formatReturn(stackStats.avgYTD) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">Stack YTD</div>
            </div>
          </div>

          {/* Mobile metric row */}
          {stackStats && (
            <div className="flex sm:hidden items-center gap-3 mt-2 pb-1">
              <Metric label="Stocks" value={stackStats.totalSymbols} sub={`${stackStats.sp500Count} S&P`} />
              <Metric label="Mkt Cap" value={formatB(stackStats.totalMC)} />
              <Metric label="YTD" value={formatReturn(stackStats.avgYTD)} color={getColor(stackStats.avgYTD)} />
              <Metric label="P/E" value={stackStats.avgPE ? stackStats.avgPE.toFixed(1) : '—'} />
            </div>
          )}
        </div>

        {/* Stack pills — wrap naturally */}
        <div className="max-w-7xl mx-auto px-6 pb-1 flex flex-wrap items-center gap-1.5">
          {stacks.map(stack => {
            const active = stack.id === activeStackId;
            return (
              <button
                key={stack.id}
                onClick={() => setActiveStackId(stack.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {stack.name}
                <span className={`text-[11px] ${active ? 'text-gray-400' : 'text-gray-400'}`}>{stack.symbols.length}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`flex items-center gap-1 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
              showCreateForm
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-white border border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {showCreateForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCreateForm ? 'Cancel' : 'New'}
          </button>
        </div>

        {/* Search + add toolbar */}
        <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#f4f5f6] border border-gray-200 rounded-md px-3 py-2 transition-colors focus-within:bg-white focus-within:border-gray-400">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input type="text" placeholder="Filter tickers..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-32 lg:w-44 text-gray-700 placeholder:text-gray-400" />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" /></button>}
          </div>
          <div className="flex items-center gap-1.5 bg-[#f4f5f6] border border-gray-200 rounded-md px-3 py-2 transition-colors focus-within:bg-white focus-within:border-gray-400">
            <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input type="text" placeholder="Add symbol..." value={newSymbol} onChange={e => setNewSymbol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              className="bg-transparent outline-none text-sm w-28 lg:w-36 text-gray-700 placeholder:text-gray-400 uppercase" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-auto">{filteredData.length} stocks</span>
        </div>

        {showCreateForm && (
          <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-2">
            <input type="text" placeholder="Stack name..." value={newStackName}
              onChange={e => setNewStackName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createStack()}
              className="border border-gray-200 rounded-md px-3 py-1.5 text-[13px] bg-[#f8f9fa] outline-none w-44 focus:border-gray-400 focus:bg-white"
              autoFocus />
            <button onClick={createStack} disabled={!newStackName.trim()}
              className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
              Create
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {activeStack && (
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {Columns.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className={`py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none transition-colors hover:bg-gray-50/70 ${
                          col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                          {col.label}<SortIcon column={col.key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredData.map(({ symbol, company, isInSp500 }, idx) => {
                    const price = company?.current_price;
                    const mcap = company?.market_cap;
                    const prevClose = company?.stock_data?.previous_close;
                    const ret1d = price && prevClose ? (price - prevClose) / prevClose : null;
                    const ret1w = company?.returns?.['1_week'];
                    const ret1m = company?.returns?.['1_month'];
                    const retytd = company?.historical_data?.ytd_return ?? company?.returns?.ytd;
                    const ret1y = company?.historical_data?.one_year_return;
                    const bg = idx % 2 === 1 ? 'bg-[#fcfcfd]' : 'bg-white';
                    const pctCls = 'inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold tabular-nums';
                    const isPos = v => v !== undefined && v !== null && v >= 0;
                    const isNeg = v => v !== undefined && v !== null && v < 0;

                    return (
                      <tr key={symbol} className={`transition-colors duration-75 hover:bg-[#f6f7f9] group ${bg}`}>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isInSp500 ? (
                            <Link to={`/company/${symbol}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">{symbol}</Link>
                          ) : (
                            <span className="text-sm font-bold text-gray-400">{symbol}</span>
                          )}
                          {!isInSp500 && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase">Ext</span>}
                        </td>
                        <td className="py-2.5 px-4"><span className="text-[13px] text-gray-600 font-medium">{company?.name || '—'}</span></td>
                        <td className="py-2.5 px-4 text-right"><span className="text-[13px] font-mono font-medium tabular-nums text-gray-800">{formatPrice(price)}</span></td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`${pctCls} ${isPos(ret1d) ? 'text-emerald-700 bg-emerald-50/70' : isNeg(ret1d) ? 'text-red-600 bg-red-50/70' : 'text-gray-400'}`}>{formatReturn(ret1d)}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`${pctCls} ${isPos(ret1w) ? 'text-emerald-700 bg-emerald-50/70' : isNeg(ret1w) ? 'text-red-600 bg-red-50/70' : 'text-gray-400'}`}>{formatReturn(ret1w)}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right"><span className="text-[13px] font-mono tabular-nums text-gray-600">{company ? formatB(mcap) : '—'}</span></td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`${pctCls} ${isPos(ret1m) ? 'text-emerald-700 bg-emerald-50/70' : isNeg(ret1m) ? 'text-red-600 bg-red-50/70' : 'text-gray-400'}`}>{formatReturn(ret1m)}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`${pctCls} ${isPos(retytd) ? 'text-emerald-700 bg-emerald-50/70' : isNeg(retytd) ? 'text-red-600 bg-red-50/70' : 'text-gray-400'}`}>{formatReturn(retytd)}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`${pctCls} ${isPos(ret1y) ? 'text-emerald-700 bg-emerald-50/70' : isNeg(ret1y) ? 'text-red-600 bg-red-50/70' : 'text-gray-400'}`}>{formatReturn(ret1y)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredData.length === 0 && (
              <div className="py-16 text-center">
                <div className="text-sm text-gray-400 font-mono">
                  {activeStack.symbols.length === 0 ? 'Add symbols to this stack' : 'No matching stocks'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-gray-400 font-mono">
        <span>@valuesnapshot &middot; {stacks.length} stacks &middot; {stacks.reduce((s, x) => s + x.symbols.length, 0)} pos</span>
        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="shrink-0">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className={`text-[15px] font-bold tabular-nums leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 leading-tight">{sub}</div>}
    </div>
  );
}
