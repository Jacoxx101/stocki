import { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Link } from 'react-router-dom';
import { Layers, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Save, X, Search } from 'lucide-react';

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatReturn(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const pct = (val * 100).toFixed(1);
  return val > 0 ? `+${pct}%` : `${pct}%`;
}

function getReturnColor(val) {
  if (val === null || val === undefined) return 'text-gray-500';
  return val >= 0 ? 'text-green-600' : 'text-red-600';
}

const STORAGE_KEY = 'stocki_stacks';

export default function StackPage() {
  const data = useData();
  const [stacks, setStacks] = useState([]);
  const [newStackName, setNewStackName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeStackId, setActiveStackId] = useState(null);
  const [newSymbol, setNewSymbol] = useState('');

  // Load stacks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStacks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load stacks', e);
    }
  }, []);

  // Save stacks to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
  }, [stacks]);

  const companies = data?.companies || [];

  const activeStack = stacks.find(s => s.id === activeStackId);

  const createStack = () => {
    if (!newStackName.trim()) return;
    const newStack = {
      id: Date.now().toString(),
      name: newStackName.trim(),
      symbols: [],
      createdAt: new Date().toISOString(),
    };
    setStacks([...stacks, newStack]);
    setActiveStackId(newStack.id);
    setNewStackName('');
    setShowCreateForm(false);
  };

  const deleteStack = (id) => {
    setStacks(stacks.filter(s => s.id !== id));
    if (activeStackId === id) setActiveStackId(null);
  };

  const addSymbol = () => {
    if (!newSymbol.trim() || !activeStack) return;
    const symbol = newSymbol.trim().toUpperCase();
    if (activeStack.symbols.includes(symbol)) {
      setNewSymbol('');
      return;
    }
    setStacks(stacks.map(s =>
      s.id === activeStackId
        ? { ...s, symbols: [...s.symbols, symbol] }
        : s
    ));
    setNewSymbol('');
  };

  const removeSymbol = (symbol) => {
    setStacks(stacks.map(s =>
      s.id === activeStackId
        ? { ...s, symbols: s.symbols.filter(sym => sym !== symbol) }
        : s
    ));
  };

  const getCompanyData = (symbol) => {
    return companies.find(c => c.symbol === symbol);
  };

  const activeStackData = useMemo(() => {
    if (!activeStack) return [];
    return activeStack.symbols.map(symbol => {
      const company = getCompanyData(symbol);
      return {
        symbol,
        company,
        isInSp500: !!company,
      };
    });
  }, [activeStack, companies]);

  const stackStats = useMemo(() => {
    if (!activeStackData.length) return null;
    const sp500Companies = activeStackData.filter(d => d.isInSp500).map(d => d.company);
    if (!sp500Companies.length) return null;

    const totalMC = sp500Companies.reduce((sum, c) => sum + (c.market_cap || 0), 0);
    const ytdReturns = sp500Companies.map(c => c.historical_data?.ytd_return).filter(v => v !== undefined && !isNaN(v));
    const avgYTD = ytdReturns.length ? ytdReturns.reduce((a, b) => a + b, 0) / ytdReturns.length : null;
    
    const oneMonthReturns = sp500Companies.map(c => c.returns?.['1_month']).filter(v => v !== undefined && !isNaN(v));
    const avg1M = oneMonthReturns.length ? oneMonthReturns.reduce((a, b) => a + b, 0) / oneMonthReturns.length : null;

    return {
      totalMC,
      avgYTD,
      avg1M,
      count: sp500Companies.length,
      totalSymbols: activeStackData.length,
    };
  }, [activeStackData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-7 h-7 text-blue-600" />
          Stacks
        </h1>
        <p className="text-gray-500 mt-1">Create and manage custom stock combinations</p>
      </div>

      {/* Create Stack Button */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Stack
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Stack name (e.g., Tech Giants, Dividend Kings)"
              value={newStackName}
              onChange={e => setNewStackName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createStack()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <button
              onClick={createStack}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stack List */}
      {stacks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stacks.map(stack => (
            <button
              key={stack.id}
              onClick={() => setActiveStackId(stack.id === activeStackId ? null : stack.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStackId === stack.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              {stack.name}
              <span className={`text-xs ${activeStackId === stack.id ? 'text-blue-200' : 'text-gray-400'}`}>
                ({stack.symbols.length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active Stack */}
      {activeStack && (
        <div className="space-y-6">
          {/* Stack Header */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{activeStack.name}</h2>
              <button
                onClick={() => deleteStack(activeStack.id)}
                className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Stack
              </button>
            </div>

            {/* Add Symbol */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Add stock symbol (e.g., AAPL, TSLA, NVDA, BTC-USD)"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSymbol()}
                  className="flex-1 outline-none text-sm"
                />
              </div>
              <button
                onClick={addSymbol}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Stats */}
            {stackStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Stocks</div>
                  <div className="text-lg font-bold">{stackStats.totalSymbols}</div>
                  <div className="text-xs text-gray-400">{stackStats.count} in S&P 500</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Total Market Cap</div>
                  <div className="text-lg font-bold">{formatB(stackStats.totalMC)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Avg YTD</div>
                  <div className={`text-lg font-bold ${getReturnColor(stackStats.avgYTD)}`}>
                    {formatReturn(stackStats.avgYTD)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Avg 1M</div>
                  <div className={`text-lg font-bold ${getReturnColor(stackStats.avg1M)}`}>
                    {formatReturn(stackStats.avg1M)}
                  </div>
                </div>
              </div>
            )}

            {/* Stock Table */}
            {activeStackData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Symbol</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Sector</th>
                      <th className="text-right py-3 px-4 font-semibold">Market Cap</th>
                      <th className="text-right py-3 px-4 font-semibold">1M Return</th>
                      <th className="text-right py-3 px-4 font-semibold">YTD Return</th>
                      <th className="text-center py-3 px-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStackData.map(({ symbol, company, isInSp500 }) => (
                      <tr key={symbol} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {isInSp500 ? (
                            <Link to={`/company/${symbol}`} className="font-bold text-blue-600 hover:underline">
                              {symbol}
                            </Link>
                          ) : (
                            <span className="font-bold text-gray-700">{symbol}</span>
                          )}
                          {!isInSp500 && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">External</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{company?.name || '—'}</td>
                        <td className="py-3 px-4 text-gray-500">{company?.sector || '—'}</td>
                        <td className="py-3 px-4 text-right font-medium">{company ? formatB(company.market_cap) : '—'}</td>
                        <td className={`py-3 px-4 text-right font-bold ${getReturnColor(company?.returns?.['1_month'])}`}>
                          {company ? formatReturn(company.returns?.['1_month']) : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${getReturnColor(company?.historical_data?.ytd_return)}`}>
                          {company ? formatReturn(company.historical_data?.ytd_return) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => removeSymbol(symbol)}
                            className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No stocks in this stack yet.</p>
                <p className="text-sm">Add symbols above to build your combination.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stacks.length === 0 && !showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stacks Yet</h3>
          <p className="text-gray-500 mb-6">Create your first stack to start tracking custom stock combinations.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First Stack
          </button>
        </div>
      )}
    </div>
  );
}
