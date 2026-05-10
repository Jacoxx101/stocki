import { useParams, Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { ArrowLeft, Globe, Users, TrendingUp, TrendingDown, Building2, Newspaper, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function formatB(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e9).toFixed(1)}B`;
}

function formatM(val) {
  if (!val) return 'N/A';
  return `$${(val / 1e6).toFixed(1)}M`;
}

function formatPct(val) {
  if (val === null || val === undefined) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

export default function CompanyDetail() {
  const { symbol } = useParams();
  const data = useData();

  if (!data) return null;

  const company = data.companies.find(c => c.symbol === symbol);
  if (!company) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900">Company not found</h1>
        <Link to="/companies" className="text-blue-600 hover:underline mt-4 inline-block">Back to companies</Link>
      </div>
    );
  }

  const f = company.financials || {};
  const s = company.stock_data || {};
  const h = company.historical_data || {};
  const g = company.growth_data || {};
  const d = company.company_details || {};
  const sr = company.sector_rankings || {};

  // Radar chart data
  const radarData = [
    { subject: 'Market Cap', A: sr.market_cap_percentile || 0, fullMark: 100 },
    { subject: 'Profit Margin', A: sr.profit_margin_percentile || 0, fullMark: 100 },
    { subject: 'Revenue Growth', A: sr.revenue_growth_percentile || 0, fullMark: 100 },
    { subject: 'YTD Return', A: sr.ytd_return_percentile || 0, fullMark: 100 },
    { subject: 'ROE', A: sr.roe_percentile || 0, fullMark: 100 },
    { subject: '1Y Return', A: sr.one_year_return_percentile || 0, fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/companies" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">{company.symbol}</span>
          </div>
          <p className="text-gray-500 mt-1">
            Rank #{company.rank} | {company.sector} | {company.sub_industry}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatB(company.market_cap)}</div>
          <div className="text-sm text-gray-500">Market Cap</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Stock Price" value={s.current_price ? `$${s.current_price.toFixed(2)}` : 'N/A'} />
        <StatCard label="P/E Ratio" value={f.pe_ratio ? f.pe_ratio.toFixed(1) : 'N/A'} />
        <StatCard label="Revenue" value={formatB(f.revenue)} />
        <StatCard label="Profit Margin" value={formatPct(f.profit_margin)} />
        <StatCard label="1Y Return" value={formatPct(h.one_year_return)} />
        <StatCard label="YTD Return" value={formatPct(h.ytd_return)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Company Profile
            </h2>
            <p className="text-gray-700 leading-relaxed">{company.profile?.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">Headquarters</span>
                <div className="font-medium">{company.headquarters}</div>
              </div>
              <div>
                <span className="text-gray-500">Founded</span>
                <div className="font-medium">{company.founded}</div>
              </div>
              <div>
                <span className="text-gray-500">Employees</span>
                <div className="font-medium">{d.full_time_employees?.toLocaleString() || 'N/A'}</div>
              </div>
              <div>
                <span className="text-gray-500">Website</span>
                <div className="font-medium">
                  {company.profile?.website ? (
                    <a href={company.profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Visit
                    </a>
                  ) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Key Financials
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinCard label="Revenue" value={formatB(f.revenue)} />
              <FinCard label="Gross Profit" value={formatB(f.gross_profit)} />
              <FinCard label="EBITDA" value={formatB(f.ebitda)} />
              <FinCard label="Net Income" value={formatB(f.net_income)} />
              <FinCard label="Operating Margin" value={formatPct(f.operating_margin)} />
              <FinCard label="Profit Margin" value={formatPct(f.profit_margin)} />
              <FinCard label="ROE" value={formatPct(f.return_on_equity)} />
              <FinCard label="ROA" value={formatPct(f.return_on_assets)} />
              <FinCard label="P/E" value={f.pe_ratio ? f.pe_ratio.toFixed(1) : 'N/A'} />
              <FinCard label="Forward P/E" value={f.forward_pe ? f.forward_pe.toFixed(1) : 'N/A'} />
              <FinCard label="P/B" value={f.price_to_book ? f.price_to_book.toFixed(1) : 'N/A'} />
              <FinCard label="Beta" value={f.beta ? f.beta.toFixed(2) : 'N/A'} />
            </div>
          </div>

          {/* Historical */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Historical Performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FinCard label="1Y Return" value={formatPct(h.one_year_return)} />
              <FinCard label="YTD Return" value={formatPct(h.ytd_return)} />
              <FinCard label="Volatility" value={h.volatility ? `${(h.volatility * 100).toFixed(1)}%` : 'N/A'} />
              <FinCard label="Sharpe Ratio" value={h.sharpe_ratio ? h.sharpe_ratio.toFixed(2) : 'N/A'} />
              <FinCard label="Best Month" value={formatPct(h.best_month)} />
            </div>
          </div>

          {/* Growth & Analysts */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Growth & Analyst Data</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinCard label="Revenue Growth" value={formatPct(g.revenue_growth)} />
              <FinCard label="Earnings Growth" value={formatPct(g.earnings_growth)} />
              <FinCard label="Price Target" value={g.target_mean_price ? `$${g.target_mean_price.toFixed(2)}` : 'N/A'} />
              <FinCard label="Analyst Rating" value={g.recommendation_key || 'N/A'} />
            </div>
          </div>

          {/* News */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              Recent News
            </h2>
            <div className="space-y-3">
              {company.recent_news?.filter(n => n.title).slice(0, 5).map((article, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm">{article.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span>{article.publisher}</span>
                    {article.published && <span>• {new Date(article.published).toLocaleDateString()}</span>}
                  </div>
                  {article.link && (
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Read more →</a>
                  )}
                </div>
              )) || <div className="text-gray-500">No recent news</div>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sector Rankings Radar */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Sector Percentiles</h2>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name={company.symbol} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Tooltip formatter={(v) => [`${v.toFixed(0)}th percentile`, '']} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="text-center text-sm text-gray-500 mt-2">
              Size Tier: <span className="font-semibold text-gray-700">{company.sector_size_tier}</span>
            </div>
          </div>

          {/* Valuation vs Sector */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3">Valuation vs Sector</h2>
            {company.valuation_vs_sector?.pe_verdict ? (
              <div className="space-y-2">
                <div className={`text-lg font-bold ${company.valuation_vs_sector.pe_vs_sector_avg_pct < -20 ? 'text-green-600' : company.valuation_vs_sector.pe_vs_sector_avg_pct > 20 ? 'text-red-600' : 'text-gray-700'}`}>
                  {company.valuation_vs_sector.pe_verdict}
                </div>
                <div className="text-sm text-gray-500">
                  P/E is {company.valuation_vs_sector.pe_vs_sector_avg_pct > 0 ? '+' : ''}{company.valuation_vs_sector.pe_vs_sector_avg_pct.toFixed(1)}% vs sector avg
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No comparison data</div>
            )}
          </div>

          {/* Competitors */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3">Competitors</h2>
            <div className="space-y-2">
              {company.competitors?.length > 0 ? company.competitors.slice(0, 8).map(comp => (
                <Link key={comp.symbol} to={`/company/${comp.symbol}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-medium text-blue-600">{comp.symbol}</span>
                  <span className="text-sm text-gray-500 truncate ml-2">{comp.name}</span>
                </Link>
              )) : (
                <div className="text-gray-500 text-sm">No direct competitors in S&P 500</div>
              )}
            </div>
          </div>

          {/* Related */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3">Related Companies</h2>
            <div className="space-y-2">
              {company.related_companies?.slice(0, 8).map(rel => (
                <Link key={rel.symbol} to={`/company/${rel.symbol}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-medium text-blue-600">{rel.symbol}</span>
                  <span className="text-sm text-gray-500 truncate ml-2">{rel.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Key Officers */}
          {d.company_officers?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Key Officers
              </h2>
              <div className="space-y-3">
                {d.company_officers.slice(0, 5).map((officer, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{officer.name}</div>
                    <div className="text-gray-500 text-xs">{officer.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  const isPositive = value && value.includes('%') && !value.includes('-') && value !== 'N/A';
  const isNegative = value && value.includes('%') && value.includes('-');
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function FinCard({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}
