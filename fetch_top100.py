import json
import requests
from bs4 import BeautifulSoup
import yfinance as yf
import time
import math
import numpy as np
from datetime import datetime

def clean_value(v):
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
    return v

def clean_object(obj):
    if isinstance(obj, dict):
        return {k: clean_object(val) for k, val in obj.items()}
    elif isinstance(obj, list):
        return [clean_object(item) for item in obj]
    else:
        return clean_value(obj)

# Fetch S&P 500 from Wikipedia
url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
headers = {'User-Agent': 'Mozilla/5.0 (compatible; DataExtractor/1.0)'}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')
table = soup.find('table', {'id': 'constituents'})
rows = table.find_all('tr')[1:]

print(f"Found {len(rows)} S&P 500 companies")

# Extract company data
companies_list = []
for row in rows:
    cols = row.find_all(['td', 'th'])
    if len(cols) >= 8:
        symbol = cols[0].text.strip()
        security = cols[1].text.strip()
        sector = cols[2].text.strip()
        sub_industry = cols[3].text.strip()
        headquarters = cols[4].text.strip()
        companies_list.append({
            'symbol': symbol,
            'name': security,
            'sector': sector,
            'sub_industry': sub_industry,
            'headquarters': headquarters,
        })

# Load existing data (ranks 100-500)
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'r') as f:
    existing_data = json.load(f)

existing_by_symbol = {c['symbol']: c for c in existing_data['companies']}
print(f"Existing data: {len(existing_by_symbol)} companies")

# We need to get ranks 1-99 and 501-503 (about 103 more companies)
# First let's get all market caps to determine rankings
print("Fetching market caps for all S&P 500 companies...")
market_caps = {}

for i, company in enumerate(companies_list):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        market_caps[symbol] = info.get('marketCap', 0)
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(companies_list)}...")
            time.sleep(2)
    except Exception as e:
        market_caps[symbol] = 0
    time.sleep(0.2)

# Sort by market cap
sorted_symbols = sorted(market_caps.keys(), key=lambda x: market_caps.get(x, 0), reverse=True)

# Create rank mapping
rank_map = {}
for rank, sym in enumerate(sorted_symbols, 1):
    rank_map[sym] = rank

print(f"\nTop 10 by market cap:")
for i, sym in enumerate(sorted_symbols[:10], 1):
    print(f"  {i}. {sym}: ${market_caps[sym]/1e12:.2f}T")

# Find missing symbols (ranks 1-99 and 501-503 that aren't in existing data)
existing_symbols = set(existing_by_symbol.keys())
missing_symbols = set()

for sym, rank in rank_map.items():
    if rank <= 99 or rank >= 501:
        if sym not in existing_symbols:
            missing_symbols.add(sym)

print(f"\nMissing {len(missing_symbols)} companies")

# Fetch data for missing companies
missing_companies_data = []

for i, sym in enumerate(sorted(missing_symbols, key=lambda x: rank_map[x]), 1):
    company_info = next((c for c in companies_list if c['symbol'] == sym), None)
    if not company_info:
        continue

    rank = rank_map[sym]
    print(f"[{i}/{len(missing_symbols)}] Fetching rank {rank}: {sym}...")

    try:
        ticker = yf.Ticker(sym)
        info = ticker.info

        company = {
            'rank': rank,
            'symbol': sym,
            'name': company_info['name'],
            'sector': company_info['sector'],
            'sub_industry': company_info['sub_industry'],
            'market_cap': market_caps.get(sym, 0),
            'headquarters': company_info['headquarters'],
            'founded': '',
            'profile': {
                'description': info.get('longBusinessSummary', f"{company_info['name']} operates in the {company_info['sub_industry']} industry."),
                'industry': info.get('industry', company_info['sub_industry']),
                'sector': company_info['sector'],
                'employees': info.get('fullTimeEmployees'),
                'website': info.get('website', ''),
                'phone': info.get('phone', '')
            },
            'financials': {
                'revenue': info.get('totalRevenue'),
                'gross_profit': info.get('grossProfits'),
                'operating_margin': info.get('operatingMargins'),
                'profit_margin': info.get('profitMargins'),
                'ebitda': info.get('ebitda'),
                'net_income': info.get('netIncomeToCommon'),
                'eps': info.get('trailingEps'),
                'pe_ratio': info.get('trailingPE'),
                'forward_pe': info.get('forwardPE'),
                'peg_ratio': info.get('pegRatio'),
                'price_to_book': info.get('priceToBook'),
                'price_to_sales': info.get('priceToSalesTrailing12Months'),
                'enterprise_value': info.get('enterpriseValue'),
                'debt_to_equity': info.get('debtToEquity'),
                'return_on_equity': info.get('returnOnEquity'),
                'return_on_assets': info.get('returnOnAssets'),
                'current_ratio': info.get('currentRatio'),
                'quick_ratio': info.get('quickRatio'),
                'beta': info.get('beta'),
            },
            'stock_data': {
                'current_price': info.get('currentPrice'),
                'previous_close': info.get('previousClose'),
                'open': info.get('open'),
                'day_high': info.get('dayHigh'),
                'day_low': info.get('dayLow'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'volume': info.get('volume'),
                'average_volume': info.get('averageVolume'),
            },
            'dividend_data': {
                'dividend_rate': info.get('dividendRate'),
                'dividend_yield': info.get('dividendYield'),
                'ex_dividend_date': info.get('exDividendDate'),
                'payout_ratio': info.get('payoutRatio'),
            },
            'growth_data': {
                'revenue_growth': info.get('revenueGrowth'),
                'earnings_growth': info.get('earningsGrowth'),
                'target_mean_price': info.get('targetMeanPrice'),
                'recommendation_key': info.get('recommendationKey'),
                'number_of_analyst_opinions': info.get('numberOfAnalystOpinions'),
            },
            'company_details': {
                'full_time_employees': info.get('fullTimeEmployees'),
                'company_officers': info.get('companyOfficers', [])[:5] if info.get('companyOfficers') else [],
            },
            'historical_data': {'error': 'Not fetched yet'},
            'quarterly_financials': {'error': 'Not fetched yet'},
            'esg_data': {'error': 'No ESG data available'},
            'recent_news': [],
            'sector_metrics': {},
            'sector_rankings': {},
            'competitors': [],
            'related_companies': [],
            'links': {
                'self': f"/company/{sym}",
                'sector_companies': f"/sector/{company_info['sector'].lower().replace(' ', '-')}",
            },
            'last_updated': datetime.now().isoformat(),
        }

        # Historical data
        try:
            hist = ticker.history(period="1y")
            if not hist.empty:
                company['historical_data'] = {
                    'period': '1 year',
                    'data_points': len(hist),
                    'ytd_return': None,
                    'one_year_return': None,
                    'volatility': None,
                    'sharpe_ratio': None,
                }
                if len(hist) > 1:
                    start_price = float(hist['Close'].iloc[0])
                    end_price = float(hist['Close'].iloc[-1])
                    company['historical_data']['one_year_return'] = (end_price - start_price) / start_price
                    current_year = datetime.now().year
                    ytd_data = hist[hist.index.year == current_year]
                    if not ytd_data.empty:
                        ytd_start = float(ytd_data['Close'].iloc[0])
                        company['historical_data']['ytd_return'] = (end_price - ytd_start) / ytd_start
                if len(hist) > 20:
                    daily_returns = hist['Close'].pct_change().dropna()
                    vol = float(daily_returns.std() * np.sqrt(252))
                    company['historical_data']['volatility'] = vol
                    if company['historical_data']['one_year_return'] is not None:
                        excess = company['historical_data']['one_year_return'] - 0.045
                        if vol > 0:
                            company['historical_data']['sharpe_ratio'] = excess / vol
        except Exception as e:
            pass

        # News
        try:
            news = ticker.news
            if news:
                company['recent_news'] = []
                for article in news[:5]:
                    content = article.get('content', article)
                    company['recent_news'].append({
                        'title': content.get('title', '') if isinstance(content, dict) else '',
                        'publisher': content.get('provider', {}).get('displayName', '') if isinstance(content, dict) else '',
                        'published': content.get('pubDate', '') if isinstance(content, dict) else '',
                    })
        except Exception as e:
            pass

        missing_companies_data.append(company)
        time.sleep(0.3)

    except Exception as e:
        print(f"  Error: {e}")

print(f"\nFetched {len(missing_companies_data)} missing companies")

# Now update ranks in existing data to be 1-401 (since we now have 1-503 total, we want 1-500)
# Map old ranks (100-500) to new ranks based on market cap order
all_companies = list(existing_by_symbol.values()) + missing_companies_data
all_companies.sort(key=lambda x: x.get('market_cap', 0), reverse=True)

# Assign new ranks 1-500
for new_rank, company in enumerate(all_companies, 1):
    if new_rank <= 500:
        company['rank'] = new_rank

print(f"Total companies with ranks: {len(all_companies)}")

# Clean all data
all_companies = clean_object(all_companies)

# Build sector summary
sector_summary = {}
for company in all_companies:
    sector = company['sector']
    if sector not in sector_summary:
        sector_summary[sector] = {
            'company_count': 0,
            'total_market_cap': 0,
            'avg_market_cap': 0,
            'avg_pe_ratio': None,
            'avg_profit_margin': None,
            'avg_roe': None,
            'avg_revenue_growth': None,
            'avg_ytd_return': None,
            'avg_one_year_return': None,
            'avg_beta': None,
            'avg_dividend_yield': None,
        }
    sector_summary[sector]['company_count'] += 1
    sector_summary[sector]['total_market_cap'] += company.get('market_cap', 0)

# Calculate sector averages
for sector, data in sector_summary.items():
    sector_companies = [c for c in all_companies if c['sector'] == sector]
    if sector_companies:
        mc_vals = [c.get('market_cap', 0) for c in sector_companies if c.get('market_cap')]
        data['avg_market_cap'] = np.mean(mc_vals) if mc_vals else 0

        pe_vals = [c.get('financials', {}).get('pe_ratio') for c in sector_companies if c.get('financials', {}).get('pe_ratio')]
        data['avg_pe_ratio'] = np.nanmean(pe_vals) if pe_vals else None

        pm_vals = [c.get('financials', {}).get('profit_margin') for c in sector_companies if c.get('financials', {}).get('profit_margin') is not None]
        data['avg_profit_margin'] = np.nanmean(pm_vals) if pm_vals else None

        ytd_vals = [c.get('historical_data', {}).get('ytd_return') for c in sector_companies if c.get('historical_data', {}).get('ytd_return') is not None]
        data['avg_ytd_return'] = np.nanmean(ytd_vals) if ytd_vals else None

# Create final dataset
final_data = {
    'metadata': {
        'extraction_date': datetime.now().isoformat(),
        'total_companies': len([c for c in all_companies if c['rank'] <= 500]),
        'rank_range': '1-500',
        'index': 'S&P 500',
        'data_points': existing_data['metadata']['data_points']
    },
    'sector_summary': sector_summary,
    'companies': [c for c in all_companies if c['rank'] <= 500]
}

# Save
output_file = '/Users/jacob/Stock-analysis/sp500_all_500.json'
with open(output_file, 'w') as f:
    json.dump(final_data, f, indent=2)

print(f"\nSaved {len(final_data['companies'])} companies to {output_file}")
print(f"Rank range: {min(c['rank'] for c in final_data['companies'])}-{max(c['rank'] for c in final_data['companies'])}")