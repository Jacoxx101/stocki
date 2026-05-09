import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Search, Filter, Flame, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

function formatReturn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const pct = (val * 100).toFixed(1);
  return val >= 0 ? `+${pct}%` : `${pct}%`;
}

function getReturnColor(val) {
  if (val === null || val === undefined) return 'text-gray-400';
  return val >= 0 ? 'text-emerald-600' : 'text-red-600';
}

const SECTOR_CATEGORIES = [
  { name: 'Semiconductors', tags: ['NVDA', 'AMD', 'AVGO', 'QCOM', 'INTC', 'MU'] },
  { name: 'Software & Cloud', tags: ['MSFT', 'GOOGL', 'AMZN', 'ORCL', 'CRM', 'NOW'] },
  { name: 'Cybersecurity', tags: ['CRWD', 'PANW', 'ZS', 'FTNT', 'NET'] },
  { name: 'AI & Machine Learning', tags: ['NVDA', 'PLTR', 'MSFT', 'GOOGL', 'AMZN'] },
  { name: 'Biotech & Pharma', tags: ['LLY', 'JNJ', 'PFE', 'MRNA', 'REGN'] },
  { name: 'Energy & Utilities', tags: ['XOM', 'CVX', 'NEE', 'COP', 'SLB'] },
  { name: 'Defense & Aerospace', tags: ['LMT', 'NOC', 'RTX', 'GD', 'BA'] },
  { name: 'Financials', tags: ['JPM', 'BAC', 'WFC', 'GS', 'MS'] },
  { name: 'Consumer Tech', tags: ['AAPL', 'META', 'AMZN', 'NFLX', 'DIS'] },
  { name: 'Healthcare', tags: ['UNH', 'LLY', 'JNJ', 'PFE', 'ABBV'] },
  { name: 'Industrials', tags: ['GE', 'HON', 'CAT', 'UPS', 'RTX'] },
  { name: 'Materials', tags: ['NEM', 'FCX', 'LIN', 'SHW', 'APD'] },
  { name: 'Real Estate', tags: ['AMT', 'CCI', 'PLD', 'EQIX', 'SPG'] },
  { name: 'Communication', tags: ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA'] },
  { name: 'Fintech', tags: ['V', 'MA', 'PYPL', 'SQ', 'COIN'] },
  { name: 'EV & Battery', tags: ['TSLA', 'LI', 'NIO', 'ALB', 'FSLR'] },
  { name: 'Quantum Computing', tags: ['IBM', 'GOOGL', 'MSFT', 'IONQ', 'RGTI'] },
  { name: 'Robotics', tags: ['ISRG', 'ROK', 'TER', 'CGNX', 'AUBO'] },
  { name: 'Nuclear & Uranium', tags: ['CCJ', 'URA', 'NNE', 'OKLO', 'SMR'] },
  { name: 'Space', tags: ['SPCE', 'RKLB', 'ASTS', 'PL', 'MYNA'] },
];

export default function MarketSectors() {
  const data = useData();
  const [sortBy, setSortBy] = useState('ytd');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, bullish, bearish

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 bg-neutral-50">
        <div className="text-gray-400 font-mono text-sm">Loading sector data...</div>
      </div>
    );
  }

  const companies = data.companies || [];

  // Calculate sector performance
  const sectorCards = useMemo(() => {
    return SECTOR_CATEGORIES.map((sector, idx) => {
      const sectorCompanies = companies.filter(c => sector.tags.includes(c.symbol));
      
      const ytdReturns = sectorCompanies
        .map(c => c.historical_data?.ytd_return)
        .filter(v => v !== undefined && !isNaN(v));
      const avgYTD = ytdReturns.length ? ytdReturns.reduce((a, b) => a + b, 0) / ytdReturns.length : null;

      const oneMonthReturns = sectorCompanies
        .map(c => c.returns?.['1_month'])
        .filter(v => v !== undefined && !isNaN(v));
      const avg1M = oneMonthReturns.length ? oneMonthReturns.reduce((a, b) => a + b, 0) / oneMonthReturns.length : null;

      const stockCount = sectorCompanies.length;

      return {
        ...sector,
        rank: idx + 1,
        ytd: avgYTD,
        oneMonth: avg1M,
        stockCount,
        isHot: avg1M > 0.15, // +15% in 1 month = hot
      };
    }).sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'ytd':
          av = a.ytd ?? -999;
          bv = b.ytd ?? -999;
          break;
        case '1m':
          av = a.oneMonth ?? -999;
          bv = b.oneMonth ?? -999;
          break;
        case 'name':
          av = a.name;
          bv = b.name;
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        default:
          av = a.ytd ?? -999;
          bv = b.ytd ?? -999;
      }
      return sortAsc ? av - bv : bv - av;
    });
  }, [companies, sortBy, sortAsc]);

  const filteredCards = useMemo(() => {
    let cards = sectorCards;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(term));
    }

    if (filterMode === 'bullish') {
      cards = cards.filter(c => (c.ytd || 0) > 0);
    } else if (filterMode === 'bearish') {
      cards = cards.filter(c => (c.ytd || 0) < 0);
    }

    return cards;
  }, [sectorCards, searchTerm, filterMode]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Market Sectors · YTD Performance
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {SECTOR_CATEGORIES.length} sectors · sorted by {sortBy === 'ytd' ? 'YTD return' : sortBy === '1m' ? '1 month' : 'name'} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">valuesnapshot.io</div>
              <div className="text-xs text-gray-400">Know What You Own</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sectors..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('bullish')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'bullish' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Bullish
            </button>
            <button
              onClick={() => setFilterMode('bearish')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'bearish' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Bearish
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSortBy('ytd'); setSortAsc(false); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'ytd' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => { setSortBy('1m'); setSortAsc(false); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                sortBy === '1m' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              1M
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCards.map((sector, idx) => {
            const isPositive = (sector.ytd || 0) >= 0;
            
            return (
              <div
                key={sector.name}
                className={`group relative rounded-xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                  isPositive 
                    ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200' 
                    : 'bg-red-50/40 border-red-100 hover:border-red-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    {sector.isHot && (
                      <span className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">
                        <Flame className="w-3 h-3" />
                        HOT
                      </span>
                    )}
                  </div>
                </div>

                {/* Sector Name */}
                <h3 className="text-base font-semibold text-gray-900 mb-3 leading-tight">
                  {sector.name}
                </h3>

                {/* YTD Return */}
                <div className={`text-3xl font-bold tabular-nums tracking-tight mb-4 ${getReturnColor(sector.ytd)}`}>
                  {formatReturn(sector.ytd)}
                </div>

                {/* Bottom Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span>{sector.stockCount} stocks</span>
                  <span className={`font-mono font-medium ${getReturnColor(sector.oneMonth)}`}>
                    1M: {formatReturn(sector.oneMonth)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
        <div>@valuesnapshot · {filteredCards.length} sectors</div>
        <div className="font-mono">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
  );
}
