import json
import numpy as np
from datetime import datetime

# Load comprehensive data
with open('/Users/jacob/Stock-analysis/sp500_comprehensive_part1.json', 'r') as f:
    companies = json.load(f)

print(f"Adding sector-specific metrics for {len(companies)} companies...")

# Build sector groupings
sector_companies = {}
for c in companies:
    sector = c['sector']
    if sector not in sector_companies:
        sector_companies[sector] = []
    sector_companies[sector].append(c)

# Calculate sector averages and medians
sector_metrics = {}
for sector, comps in sector_companies.items():
    metrics = {
        'count': len(comps),
        'avg_market_cap': np.mean([c['market_cap'] for c in comps]),
        'median_market_cap': np.median([c['market_cap'] for c in comps]),
        'total_market_cap': sum([c['market_cap'] for c in comps]),
    }
    
    # Financial averages
    revenues = [c['financials'].get('revenue') for c in comps if c['financials'].get('revenue')]
    if revenues:
        metrics['avg_revenue'] = np.mean(revenues)
        metrics['median_revenue'] = np.median(revenues)
    
    pe_ratios = [c['financials'].get('pe_ratio') for c in comps if c['financials'].get('pe_ratio') and c['financials'].get('pe_ratio') > 0]
    if pe_ratios:
        metrics['avg_pe_ratio'] = np.mean(pe_ratios)
        metrics['median_pe_ratio'] = np.median(pe_ratios)
    
    profit_margins = [c['financials'].get('profit_margin') for c in comps if c['financials'].get('profit_margin') is not None]
    if profit_margins:
        metrics['avg_profit_margin'] = np.mean(profit_margins)
        metrics['median_profit_margin'] = np.median(profit_margins)
    
    op_margins = [c['financials'].get('operating_margin') for c in comps if c['financials'].get('operating_margin') is not None]
    if op_margins:
        metrics['avg_operating_margin'] = np.mean(op_margins)
        metrics['median_operating_margin'] = np.median(op_margins)
    
    roes = [c['financials'].get('return_on_equity') for c in comps if c['financials'].get('return_on_equity') is not None]
    if roes:
        metrics['avg_roe'] = np.mean(roes)
        metrics['median_roe'] = np.median(roes)
    
    rev_growths = [c['growth_data'].get('revenue_growth') for c in comps if c['growth_data'].get('revenue_growth') is not None]
    if rev_growths:
        metrics['avg_revenue_growth'] = np.mean(rev_growths)
        metrics['median_revenue_growth'] = np.median(rev_growths)
    
    employees = [c['company_details'].get('full_time_employees') for c in comps if c['company_details'].get('full_time_employees')]
    if employees:
        metrics['avg_employees'] = np.mean(employees)
        metrics['median_employees'] = np.median(employees)
    
    # Price performance
    ytd_returns = [c['historical_data'].get('ytd_return') for c in comps if c['historical_data'].get('ytd_return') is not None]
    if ytd_returns:
        metrics['avg_ytd_return'] = np.mean(ytd_returns)
        metrics['median_ytd_return'] = np.median(ytd_returns)
    
    one_yr_returns = [c['historical_data'].get('one_year_return') for c in comps if c['historical_data'].get('one_year_return') is not None]
    if one_yr_returns:
        metrics['avg_one_year_return'] = np.mean(one_yr_returns)
        metrics['median_one_year_return'] = np.median(one_yr_returns)
    
    betas = [c['financials'].get('beta') for c in comps if c['financials'].get('beta') is not None]
    if betas:
        metrics['avg_beta'] = np.mean(betas)
        metrics['median_beta'] = np.median(betas)
    
    # Dividend metrics
    div_yields = [c['dividend_data'].get('dividend_yield') for c in comps if c['dividend_data'].get('dividend_yield') is not None]
    if div_yields:
        metrics['avg_dividend_yield'] = np.mean(div_yields)
        metrics['median_dividend_yield'] = np.median(div_yields)
        metrics['dividend_paying_companies'] = len(div_yields)
    
    sector_metrics[sector] = metrics

print(f"Calculated metrics for {len(sector_metrics)} sectors")

# Add sector metrics and rankings to each company
for company in companies:
    sector = company['sector']
    sector_avg = sector_metrics.get(sector, {})
    
    # Add sector context
    company['sector_metrics'] = {
        'sector_name': sector,
        'sector_companies_count': sector_avg.get('count', 0),
        'sector_total_market_cap': sector_avg.get('total_market_cap', 0),
        'sector_avg_market_cap': sector_avg.get('avg_market_cap', 0),
        'sector_avg_pe': sector_avg.get('avg_pe_ratio'),
        'sector_avg_profit_margin': sector_avg.get('avg_profit_margin'),
        'sector_avg_operating_margin': sector_avg.get('avg_operating_margin'),
        'sector_avg_roe': sector_avg.get('avg_roe'),
        'sector_avg_revenue_growth': sector_avg.get('avg_revenue_growth'),
        'sector_avg_ytd_return': sector_avg.get('avg_ytd_return'),
        'sector_avg_one_year_return': sector_avg.get('avg_one_year_return'),
        'sector_avg_beta': sector_avg.get('avg_beta'),
        'sector_avg_dividend_yield': sector_avg.get('avg_dividend_yield'),
    }
    
    # Calculate percentile rankings within sector
    sector_comps = sector_companies.get(sector, [])
    
    def get_percentile(value, values_list):
        if value is None or not values_list:
            return None
        values_list = [v for v in values_list if v is not None]
        if not values_list:
            return None
        sorted_vals = sorted(values_list)
        try:
            idx = sorted_vals.index(value)
            return (idx / len(sorted_vals)) * 100
        except ValueError:
            return None
    
    # Rank by market cap
    all_caps = [c['market_cap'] for c in sector_comps]
    company['sector_rankings'] = {
        'market_cap_rank': sorted(all_caps, reverse=True).index(company['market_cap']) + 1 if company['market_cap'] in all_caps else None,
        'market_cap_percentile': get_percentile(company['market_cap'], all_caps),
        'market_cap_sector_percentage': (company['market_cap'] / sector_avg['total_market_cap'] * 100) if sector_avg.get('total_market_cap', 0) > 0 else 0,
    }
    
    # Revenue percentile
    all_revenues = [c['financials'].get('revenue') for c in sector_comps if c['financials'].get('revenue')]
    company['sector_rankings']['revenue_percentile'] = get_percentile(company['financials'].get('revenue'), all_revenues)
    
    # P/E percentile (lower is often better)
    all_pe = [c['financials'].get('pe_ratio') for c in sector_comps if c['financials'].get('pe_ratio') and c['financials'].get('pe_ratio') > 0]
    pe = company['financials'].get('pe_ratio')
    if pe and pe > 0:
        company['sector_rankings']['pe_percentile'] = get_percentile(pe, all_pe)
    
    # Profit margin percentile
    all_pm = [c['financials'].get('profit_margin') for c in sector_comps if c['financials'].get('profit_margin') is not None]
    company['sector_rankings']['profit_margin_percentile'] = get_percentile(company['financials'].get('profit_margin'), all_pm)
    
    # ROE percentile
    all_roe = [c['financials'].get('return_on_equity') for c in sector_comps if c['financials'].get('return_on_equity') is not None]
    company['sector_rankings']['roe_percentile'] = get_percentile(company['financials'].get('return_on_equity'), all_roe)
    
    # Revenue growth percentile
    all_rev_growth = [c['growth_data'].get('revenue_growth') for c in sector_comps if c['growth_data'].get('revenue_growth') is not None]
    company['sector_rankings']['revenue_growth_percentile'] = get_percentile(company['growth_data'].get('revenue_growth'), all_rev_growth)
    
    # YTD return percentile
    all_ytd = [c['historical_data'].get('ytd_return') for c in sector_comps if c['historical_data'].get('ytd_return') is not None]
    company['sector_rankings']['ytd_return_percentile'] = get_percentile(company['historical_data'].get('ytd_return'), all_ytd)
    
    # 1Y return percentile
    all_1y = [c['historical_data'].get('one_year_return') for c in sector_comps if c['historical_data'].get('one_year_return') is not None]
    company['sector_rankings']['one_year_return_percentile'] = get_percentile(company['historical_data'].get('one_year_return'), all_1y)
    
    # Size classification within sector
    if company['sector_rankings'].get('market_cap_percentile', 0) >= 80:
        company['sector_size_tier'] = 'Large (Top 20%)'
    elif company['sector_rankings'].get('market_cap_percentile', 0) >= 50:
        company['sector_size_tier'] = 'Mid (50-80%)'
    elif company['sector_rankings'].get('market_cap_percentile', 0) >= 20:
        company['sector_size_tier'] = 'Small-Mid (20-50%)'
    else:
        company['sector_size_tier'] = 'Small (Bottom 20%)'
    
    # Valuation vs sector
    company['valuation_vs_sector'] = {}
    if pe and sector_avg.get('avg_pe_ratio'):
        pe_vs_sector = ((pe / sector_avg['avg_pe_ratio']) - 1) * 100
        company['valuation_vs_sector']['pe_vs_sector_avg_pct'] = pe_vs_sector
        if pe_vs_sector < -20:
            company['valuation_vs_sector']['pe_verdict'] = 'Undervalued vs sector'
        elif pe_vs_sector > 20:
            company['valuation_vs_sector']['pe_verdict'] = 'Overvalued vs sector'
        else:
            company['valuation_vs_sector']['pe_verdict'] = 'Fairly valued vs sector'
    
    # Performance vs sector
    company['performance_vs_sector'] = {}
    ytd = company['historical_data'].get('ytd_return')
    if ytd is not None and sector_avg.get('avg_ytd_return') is not None:
        ytd_vs_sector = ((ytd / sector_avg['avg_ytd_return']) - 1) * 100 if sector_avg['avg_ytd_return'] != 0 else 0
        company['performance_vs_sector']['ytd_vs_sector_avg_pct'] = ytd_vs_sector
    
    one_yr = company['historical_data'].get('one_year_return')
    if one_yr is not None and sector_avg.get('avg_one_year_return') is not None:
        one_yr_vs_sector = ((one_yr / sector_avg['avg_one_year_return']) - 1) * 100 if sector_avg['avg_one_year_return'] != 0 else 0
        company['performance_vs_sector']['one_year_vs_sector_avg_pct'] = one_yr_vs_sector

# Add overall sector summary to the output
sector_summary = {}
for sector, metrics in sector_metrics.items():
    sector_summary[sector] = {
        'company_count': metrics.get('count', 0),
        'total_market_cap': metrics.get('total_market_cap', 0),
        'avg_market_cap': metrics.get('avg_market_cap', 0),
        'median_market_cap': metrics.get('median_market_cap', 0),
        'avg_revenue': metrics.get('avg_revenue'),
        'median_revenue': metrics.get('median_revenue'),
        'avg_pe_ratio': metrics.get('avg_pe_ratio'),
        'median_pe_ratio': metrics.get('median_pe_ratio'),
        'avg_profit_margin': metrics.get('avg_profit_margin'),
        'median_profit_margin': metrics.get('median_profit_margin'),
        'avg_operating_margin': metrics.get('avg_operating_margin'),
        'avg_roe': metrics.get('avg_roe'),
        'avg_revenue_growth': metrics.get('avg_revenue_growth'),
        'avg_ytd_return': metrics.get('avg_ytd_return'),
        'avg_one_year_return': metrics.get('avg_one_year_return'),
        'avg_beta': metrics.get('avg_beta'),
        'avg_dividend_yield': metrics.get('avg_dividend_yield'),
        'dividend_paying_companies': metrics.get('dividend_paying_companies', 0),
        'avg_employees': metrics.get('avg_employees'),
        'median_employees': metrics.get('median_employees'),
    }

# Create final output structure
final_output = {
    'metadata': {
        'extraction_date': datetime.now().isoformat(),
        'total_companies': len(companies),
        'rank_range': '100-500',
        'index': 'S&P 500',
        'data_points': [
            'company_profile',
            'financial_metrics',
            'stock_data',
            'dividend_data',
            'growth_data',
            'company_details',
            'historical_price_data',
            'quarterly_financials',
            'esg_data',
            'recent_news',
            'sector_metrics',
            'sector_rankings',
            'competitors',
            'related_companies'
        ]
    },
    'sector_summary': sector_summary,
    'companies': companies
}

# Save final comprehensive file
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'w') as f:
    json.dump(final_output, f, indent=2)

print(f"\n✅ FINAL FILE CREATED")
print(f"File: sp500_ranked_100_500_FINAL.json")
print(f"Companies: {len(companies)}")

# Show file size
import os
file_size = os.path.getsize('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json')
print(f"Size: {file_size / (1024*1024):.1f} MB")

# Show sample
sample = companies[0]
print(f"\n=== SAMPLE: {sample['name']} ({sample['symbol']}) ===")
print(f"Sector: {sample['sector']}")
print(f"Sector Rankings: Market Cap #{sample['sector_rankings']['market_cap_rank']}/{sample['sector_metrics']['sector_companies_count']}")
print(f"Sector Percentiles: MC={sample['sector_rankings']['market_cap_percentile']:.0f}%, PM={sample['sector_rankings'].get('profit_margin_percentile', 0):.0f}%")
print(f"Valuation vs Sector: {sample['valuation_vs_sector'].get('pe_verdict', 'N/A')}")
print(f"Performance vs Sector: YTD={sample['performance_vs_sector'].get('ytd_vs_sector_avg_pct', 0):+.1f}%")
print(f"Size Tier: {sample['sector_size_tier']}")
print(f"Historical: 1Y Return={sample['historical_data'].get('one_year_return'):.1%}, Vol={sample['historical_data'].get('volatility'):.1f}%")
print(f"Quarterly: {list(sample['quarterly_financials'].get('income_statement', {}).keys())[:2]}")
print(f"ESG: {list(sample.get('esg_data', {}).keys())[:3]}")
print(f"News: {len(sample.get('recent_news', []))} articles")

# Show sector summary
print(f"\n=== SECTOR SUMMARY ===")
for sector, data in sector_summary.items():
    print(f"{sector}: {data['company_count']} companies, Avg MC=${data['avg_market_cap']/1e9:.1f}B, Avg PE={data['avg_pe_ratio']:.1f if data['avg_pe_ratio'] else 'N/A'}")
