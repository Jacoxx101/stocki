import { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';

function formatB(val) {
  if (!val) return '—';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatReturn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const pct = (val * 100).toFixed(1);
  return `${pct}%`;
}

function getReturnColor(val) {
  if (val === null || val === undefined) return 'text-gray-400';
  return val >= 0 ? 'text-emerald-600' : 'text-red-600';
}

function getReturnBg(val) {
  if (val === null || val === undefined) return '';
  return val >= 0 ? 'bg-emerald-50' : 'bg-red-50';
}

const SOFTWARE_CLOUD_SYMBOLS = [
  'FTNT', 'DDOG', 'CRWD', 'PANW', 'NET', 'ORCL', 'MSFT', 'PLTR', 'SNOW', 'CRM', 'NOW', 'TEAM',
  'ADBE', 'INTU', 'WDAY', 'SNPS', 'CDNS', 'ANSS', 'TYL', 'PAYC', 'DDOG', 'ZS', 'OKTA', 'SPLK'
];

export default function SectorBrief() {
  const data = useData();
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 bg-neutral-50">
        <div className="text-gray-400 font-mono text-sm">Loading sector data...</div>
      </div>
    );
  }

  const companies = data.companies || [];

  // Get software/cloud companies
  const sectorCompanies = useMemo(() => {
    return companies.filter(c => 
      SOFTWARE_CLOUD_SYMBOLS.includes(c.symbol) ||
      c.sector === 'Information Technology' && 
      (c.sub_industry?.toLowerCase().includes('software') || 
       c.sub_industry?.toLowerCase().includes('cloud') ||
       c.sub_industry?.toLowerCase().includes('cyber') ||
       c.sub_industry?.toLowerCase().includes('data'))
    );
  }, [companies]);

  // Calculate sector YTD
  const sectorYTD = useMemo(() => {
    const ytdReturns = sectorCompanies
      .map(c => c.historical_data?.ytd_return)
      .filter(v => v !== undefined && !isNaN(v));
    return ytdReturns.length ? ytdReturns.reduce((a, b) => a + b, 0) / ytdReturns.length : null;
  }, [sectorCompanies]);

  // Sort and filter
  const filteredCompanies = useMemo(() => {
    let rows = [...sectorCompanies];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(c => 
        c.symbol.toLowerCase().includes(term) || 
        c.name.toLowerCase().includes(term)
      );
    }

    rows.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'symbol':
          av = a.symbol;
          bv = b.symbol;
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'name':
          av = a.name;
          bv = b.name;
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'price':
          av = a.current_price || 0;
          bv = b.current_price || 0;
          break;
        case 'market_cap':
          av = a.market_cap || 0;
          bv = b.market_cap || 0;
          break;
        case '1m':
          av = a.returns?.['1_month'] ?? -999;
          bv = b.returns?.['1_month'] ?? -999;
          break;
        case 'ytd':
          av = a.historical_data?.ytd_return ?? a.returns?.ytd ?? -999;
          bv = b.historical_data?.ytd_return ?? b.returns?.ytd ?? -999;
          break;
        case '1y':
          av = a.historical_data?.one_year_return ?? -999;
          bv = b.historical_data?.one_year_return ?? -999;
          break;
        default:
          av = a.market_cap || 0;
          bv = b.market_cap || 0;
      }
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return sortAsc ? av - bv : bv - av;
    });

    return rows;
  }, [sectorCompanies, sortBy, sortAsc, searchTerm]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortAsc ? <ArrowUp className="w-3 h-3 text-gray-600" /> : <ArrowDown className="w-3 h-3 text-gray-600" />;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
                SECTOR BRIEF
              </div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Software & Cloud
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {sectorCompanies.length} companies · sorted by {sortBy.replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold tabular-nums tracking-tight ${getReturnColor(sectorYTD)}`}>
                {sectorYTD ? formatReturn(sectorYTD) : '—'}
              </div>
              <div className="text-sm text-gray-400 mt-1 font-medium">
                YTD SECTOR
              </div>
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
              placeholder="Search tickers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {filteredCompanies.length} stocks
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th 
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('symbol')}
                  >
                    <div className="flex items-center gap-1">Ticker <SortIcon column="symbol" /></div>
                  </th>
                  <th 
                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">Company <SortIcon column="name" /></div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">Price <SortIcon column="price" /></div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('market_cap')}
                  >
                    <div className="flex items-center justify-end gap-1">Market Cap <SortIcon column="market_cap" /></div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('1m')}
                  >
                    <div className="flex items-center justify-end gap-1">1M % <SortIcon column="1m" /></div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('ytd')}
                  >
                    <div className="flex items-center justify-end gap-1">YTD % <SortIcon column="ytd" /></div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('1y')}
                  >
                    <div className="flex items-center justify-end gap-1">1Y % <SortIcon column="1y" /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company, idx) => {
                  const price = company.current_price;
                  const mcap = company.market_cap;
                  const ret1m = company.returns?.['1_month'];
                  const retytd = company.historical_data?.ytd_return ?? company.returns?.ytd;
                  const ret1y = company.historical_data?.one_year_return;

                  return (
                    <tr 
                      key={company.symbol} 
                      className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-3 px-4">
                        <Link to={`/company/${company.symbol}`} className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                          {company.symbol}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">{company.name}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm font-mono font-medium text-gray-900">
                          {price ? `$${price.toFixed(2)}` : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm font-mono text-gray-600">
                          {formatB(mcap)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-mono font-semibold ${getReturnColor(ret1m)}`}>
                          {formatReturn(ret1m)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-mono font-semibold ${getReturnColor(retytd)}`}>
                          {formatReturn(retytd)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-mono font-semibold ${getReturnColor(ret1y)}`}>
                          {formatReturn(ret1y)}
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

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
        <div>@valuesnapshot · {filteredCompanies.length} stocks</div>
        <div className="font-mono">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
  );
}
