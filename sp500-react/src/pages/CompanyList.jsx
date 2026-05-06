import { useState } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatPct(val) {
  if (val === null || val === undefined) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

export default function CompanyList() {
  const data = useData();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [sortBy, setSortBy] = useState('rank');
  const [sortAsc, setSortAsc] = useState(true);

  if (!data) return null;

  let filtered = data.companies.filter(c => {
    const matchSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.symbol.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === 'All' || c.sector === sectorFilter;
    return matchSearch && matchSector;
  });

  filtered.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'rank': valA = a.rank; valB = b.rank; break;
      case 'marketCap': valA = a.market_cap; valB = b.market_cap; break;
      case 'pe': valA = a.financials?.pe_ratio || 0; valB = b.financials?.pe_ratio || 0; break;
      case 'ytd': valA = a.historical_data?.ytd_return || 0; valB = b.historical_data?.ytd_return || 0; break;
      case 'revenue': valA = a.financials?.revenue || 0; valB = b.financials?.revenue || 0; break;
      default: valA = a.rank; valB = b.rank;
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const sectors = ['All', ...new Set(data.companies.map(c => c.sector))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Company Explorer</h1>
        <p className="text-gray-500 mt-1">Browse and filter all {data.companies.length} companies</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or ticker..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="rank">Sort by Rank</option>
              <option value="marketCap">Sort by Market Cap</option>
              <option value="pe">Sort by P/E</option>
              <option value="ytd">Sort by YTD Return</option>
              <option value="revenue">Sort by Revenue</option>
            </select>
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            {sortAsc ? 'Ascending ↑' : 'Descending ↓'}
          </button>
        </div>
        <div className="text-sm text-gray-500">
          Showing <span className="font-semibold">{filtered.length}</span> companies
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Sector</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Market Cap</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">P/E</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Margin</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">YTD</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">1Y</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Employees</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.symbol} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="py-3 px-4 text-gray-500">{c.rank}</td>
                  <td className="py-3 px-4">
                    <Link to={`/company/${c.symbol}`} className="font-bold text-blue-600 hover:underline">{c.symbol}</Link>
                  </td>
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{c.sector}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{formatB(c.market_cap)}</td>
                  <td className="py-3 px-4 text-right">{c.financials?.pe_ratio ? c.financials.pe_ratio.toFixed(1) : 'N/A'}</td>
                  <td className="py-3 px-4 text-right">{formatPct(c.financials?.profit_margin)}</td>
                  <td className={`py-3 px-4 text-right font-medium ${c.historical_data?.ytd_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPct(c.historical_data?.ytd_return)}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${c.historical_data?.one_year_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPct(c.historical_data?.one_year_return)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {c.company_details?.full_time_employees ? c.company_details.full_time_employees.toLocaleString() : 'N/A'}
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