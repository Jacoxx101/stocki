import json
import yfinance as yf
import numpy as np
import time
from datetime import datetime, timedelta

def clean_value(v):
    if isinstance(v, float):
        if np.isnan(v) or np.isinf(v):
            return None
    return v

def clean_object(obj):
    if isinstance(obj, dict):
        return {k: clean_object(val) for k, val in obj.items()}
    elif isinstance(obj, list):
        return [clean_object(item) for item in obj]
    else:
        return clean_value(obj)

# All external symbols from hardcoded lists in the frontend that are NOT in S&P 500
EXTERNAL_SYMBOLS = [
    'ZS', 'NET', 'OKTA', 'CHKP', 'MDB', 'SQ', 'SOFI', 'SPOT', 'SNAP', 'RBLX',
    'NVO', 'RUN', 'LI', 'NIO', 'IONQ', 'RGTI', 'CGNX', 'AUBO',
    'CCJ', 'URA', 'NNE', 'OKLO', 'SMR', 'SPCE', 'RKLB', 'ASTS', 'PL', 'MYNA', 'SPLK',
]

print(f"Fetching data for {len(EXTERNAL_SYMBOLS)} external symbols...")

external_companies = []
errors = []

for i, symbol in enumerate(EXTERNAL_SYMBOLS):
    try:
        print(f"  [{i+1}/{len(EXTERNAL_SYMBOLS)}] {symbol}...")
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info or info.get('symbol') is None:
            errors.append((symbol, 'No info returned'))
            continue

        # Fetch price history (3 months for returns)
        hist = ticker.history(period="3mo")
        
        # Calculate returns from historical data
        returns = {}
        if hist is not None and len(hist) >= 1:
            current = float(hist['Close'].iloc[-1])
            if len(hist) >= 21:
                month_ago = float(hist['Close'].iloc[-21])
                returns['1_month'] = (current - month_ago) / month_ago
            if len(hist) >= 63:
                three_month_ago = float(hist['Close'].iloc[-63])
                returns['3_month'] = (current - three_month_ago) / three_month_ago
            current_year = datetime.now().year
            ytd_data = hist[hist.index.year == current_year]
            if len(ytd_data) >= 2:
                ytd_start = float(ytd_data['Close'].iloc[0])
                returns['ytd'] = (current - ytd_start) / ytd_start

        # 1 year history for annual return
        hist_1y = ticker.history(period="1y")
        ytd_return = None
        one_year_return = None
        if hist_1y is not None and len(hist_1y) >= 1:
            current_1y = float(hist_1y['Close'].iloc[-1])
            if len(hist_1y) >= 252:
                year_ago = float(hist_1y['Close'].iloc[-252])
                one_year_return = (current_1y - year_ago) / year_ago
            current_year_1y = datetime.now().year
            ytd_data_1y = hist_1y[hist_1y.index.year == current_year_1y]
            if len(ytd_data_1y) >= 2:
                ytd_start_1y = float(ytd_data_1y['Close'].iloc[0])
                ytd_return = (current_1y - ytd_start_1y) / ytd_start_1y

        # Build company data matching sp500_complete.json structure
        company = {
            'rank': 501 + i,  # rank beyond S&P 500
            'symbol': symbol,
            'name': info.get('shortName') or info.get('longName') or symbol,
            'sector': info.get('sector', ''),
            'sub_industry': info.get('industry', ''),
            'market_cap': info.get('marketCap'),
            'headquarters': f"{info.get('city', '')}, {info.get('state', '')}, {info.get('country', '')}".strip(', '),
            'founded': '',
            'profile': {
                'description': info.get('longBusinessSummary', ''),
                'industry': info.get('industry', ''),
                'sector': info.get('sector', ''),
                'employees': info.get('fullTimeEmployees'),
                'website': info.get('website', ''),
                'phone': info.get('phone', ''),
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
                'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
                'previous_close': info.get('previousClose') or info.get('regularMarketPreviousClose'),
                'open': info.get('open') or info.get('regularMarketOpen'),
                'day_high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
                'day_low': info.get('dayLow') or info.get('regularMarketDayLow'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'fifty_day_average': info.get('fiftyDayAverage'),
                'two_hundred_day_average': info.get('twoHundredDayAverage'),
                'volume': info.get('volume') or info.get('regularMarketVolume'),
                'average_volume': info.get('averageVolume'),
                'average_volume_10days': info.get('averageVolume10days'),
                'market_cap': info.get('marketCap'),
                'shares_outstanding': info.get('sharesOutstanding'),
                'float_shares': info.get('floatShares'),
                'held_by_insiders': info.get('heldPercentInsiders'),
                'held_by_institutions': info.get('heldPercentInstitutions'),
                'short_ratio': info.get('shortRatio'),
                'short_percent_of_float': info.get('shortPercentOfFloat'),
                'beta': info.get('beta'),
            },
            'dividend_data': {
                'dividend_rate': info.get('dividendRate'),
                'dividend_yield': info.get('dividendYield'),
                'ex_dividend_date': info.get('exDividendDate'),
                'payout_ratio': info.get('payoutRatio'),
                'five_year_avg_dividend_yield': info.get('fiveYearAvgDividendYield'),
            },
            'growth_data': {
                'revenue_growth': info.get('revenueGrowth'),
                'earnings_growth': info.get('earningsGrowth'),
                'earnings_quarterly_growth': info.get('earningsQuarterlyGrowth'),
                'revenue_per_share': info.get('revenuePerShare'),
                'target_high_price': info.get('targetHighPrice'),
                'target_low_price': info.get('targetLowPrice'),
                'target_mean_price': info.get('targetMeanPrice'),
                'target_median_price': info.get('targetMedianPrice'),
                'recommendation_key': info.get('recommendationKey'),
                'number_of_analyst_opinions': info.get('numberOfAnalystOpinions'),
            },
            'company_details': {
                'full_time_employees': info.get('fullTimeEmployees'),
                'company_officers': info.get('companyOfficers', [])[:5] if info.get('companyOfficers') else [],
            },
            'historical_data': {
                'period': '1 year',
                'data_points': len(hist_1y) if hist_1y is not None else 0,
                'ytd_return': ytd_return,
                'one_year_return': one_year_return,
            },
            'quarterly_financials': {},
            'esg_data': {},
            'recent_news': [],
            'sector_metrics': {},
            'sector_rankings': {},
            'competitors': [],
            'related_companies': [],
            'links': {
                'self': f'/company/{symbol}',
                'sector_companies': f'/sector/{info.get("sector", "").lower().replace(" ", "-")}',
            },
            'last_updated': datetime.now().isoformat(),
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'returns': {
                '1_week': None,
                '1_month': returns.get('1_month'),
                '3_month': returns.get('3_month'),
                'ytd': returns.get('ytd'),
                '1_year': one_year_return,
            },
            'sub_category': '',
        }
        
        external_companies.append(company)
        time.sleep(0.3)
        
    except Exception as e:
        errors.append((symbol, str(e)))
        print(f"    Error: {e}")
        time.sleep(0.5)

# Clean NaN values
external_companies = clean_object(external_companies)

print(f"\nFetched {len(external_companies)} external companies")
if errors:
    print(f"Errors: {len(errors)}")
    for sym, err in errors:
        print(f"  {sym}: {err}")

# Load existing data
with open('/Users/jacob/Stock-analysis/sp500_complete.json') as f:
    data = json.load(f)

existing_symbols = {c['symbol'] for c in data['companies']}

# Add only companies not already in the dataset
new_companies = [c for c in external_companies if c['symbol'] not in existing_symbols]

# Append to companies list
all_companies = data['companies'] + new_companies

# Re-sort by market cap
all_companies.sort(key=lambda c: c.get('market_cap', 0) or 0, reverse=True)

# Re-assign ranks
for i, c in enumerate(all_companies):
    c['rank'] = i + 1

# Update the data
data['companies'] = all_companies
data['metadata']['total_companies'] = len(all_companies)
data['metadata']['external_added'] = len(new_companies)

# Save
with open('/Users/jacob/Stock-analysis/sp500_complete.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"\nUpdated sp500_complete.json: {len(all_companies)} total companies ({len(new_companies)} new)")

# Copy to React public folder
with open('/Users/jacob/Stock-analysis/sp500-react/public/data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Copied to sp500-react/public/data.json")
print("Done.")
