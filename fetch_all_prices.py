import json
import requests
from bs4 import BeautifulSoup
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time

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

print("=== S&P 500 Full Data Fetch with Real-Time Prices ===")
print()

# Fetch S&P 500 list from Wikipedia
url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
headers = {'User-Agent': 'Mozilla/5.0 (compatible; DataExtractor/1.0)'}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')
table = soup.find('table', {'id': 'constituents'})
rows = table.find_all('tr')[1:]

companies_list = []
for row in rows:
    cols = row.find_all(['td', 'th'])
    if len(cols) >= 8:
        companies_list.append({
            'symbol': cols[0].text.strip(),
            'name': cols[1].text.strip(),
            'sector': cols[2].text.strip(),
            'sub_industry': cols[3].text.strip(),
            'headquarters': cols[4].text.strip(),
        })

print(f"Found {len(companies_list)} S&P 500 companies")

# Sub-sector taxonomy based on GICS sub-industries
SUB_SECTORS = {
    'Semiconductors': {
        'Foundry': ['Taiwan Semiconductor', 'Samsung Semiconductor'],
        'Fabless/Design': ['NVIDIA', 'AMD', 'Qualcomm', 'Broadcom', 'Marvell Technology', 'Avago', 'MediaTek'],
        'Semiconductor Equipment': ['Applied Materials', 'Lam Research', 'KLA Corporation', 'Tokyo Electron', 'ASML', '北方华创', 'SCREEN'],
        'Memory': ['Samsung Electronics', 'SK Hynix', 'Micron Technology', 'Western Digital', 'Seagate Technology'],
        'OSAT': ['Amkor Technology', 'ASE Technology'],
    },
    'Defense': {
        'Aerospace Defense': ['Boeing', 'Lockheed Martin', 'Raytheon', 'Northrop Grumman', 'General Dynamics', 'L3Harris'],
        'Defense Equipment': ['BAE Systems', 'Thales', 'Leonardo', 'Saab', 'Rheinmetall', 'HDT Global'],
        'Electronics/Systems': ['CACI', 'Leidos', 'Booz Allen', 'ManTech', 'Mercury Systems'],
    },
    'Banking': {
        'Large Banks': ['JPMorgan', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs', 'Morgan Stanley'],
        'Regional Banks': ['PNC Financial', 'US Bancorp', 'Truist Financial', 'Fifth Third', 'KeyCorp', 'M&T Bank'],
        'International Banks': ['HSBC', 'Barclays', 'Deutsche Bank', 'UBS', 'Credit Suisse', 'BNP Paribas'],
        'Investment Banks': ['Evercore', 'Lazard', 'Moelis', 'PJT Partners', 'Greenhill'],
    },
    'FMCG': {
        'Food & Beverages': ['Coca-Cola', 'PepsiCo', 'Nestle', 'Danone', 'Unilever', 'Kraft Heinz', 'Mondelez', 'General Mills', 'Kellogg'],
        'Personal Care': ['Procter & Gamble', 'Unilever', 'Colgate-Palmolive', 'Kimberly-Clark', 'Church & Dwight', 'Clorox'],
        'Household Products': ['Scotch-Brite', 'Duracell', 'Rubbermaid', 'First Alert'],
        'Tobacco': ['Altria', 'Philip Morris', 'British American Tobacco', 'Imperial Brands'],
    },
    'Energy': {
        'Oil & Gas Majors': ['ExxonMobil', 'Chevron', 'Shell', 'BP', 'TotalEnergies', 'ConocoPhillips'],
        'Renewable Energy': ['NextEra Energy', 'Orsted', 'Enphase', 'SolarEdge', 'First Solar'],
        'Oilfield Services': ['Schlumberger', 'Halliburton', 'Baker Hughes', 'TechnipFMC', 'NOV'],
    },
    'Pharma': {
        'Big Pharma': ['Johnson & Johnson', 'Pfizer', 'Merck', 'AbbVie', 'Bristol Myers Squibb', 'Eli Lilly', 'Amgen'],
        'Biotech': ['Biogen', 'Gilead Sciences', 'Regeneron', 'Vertex Pharmaceuticals', 'Alnylam', 'Moderna'],
        'Life Sciences Tools': ['Thermo Fisher', 'Danaher', 'Agilent', 'PerkinElmer', 'QIAGEN'],
        'Contract Manufacturing': ['Catalent', 'Lonza', 'CEMO'],
    },
    'Technology': {
        'Software/AI': ['Microsoft', 'Oracle', 'SAP', 'Salesforce', 'ServiceNow', 'Snowflake', 'Datadog'],
        'Internet': ['Alphabet', 'Meta', 'Amazon', 'Netflix', 'eBay', 'Pinterest', 'Snap', 'X Corp'],
        'Hardware': ['Apple', 'Dell', 'HP', 'Lenovo', 'Cisco', 'Juniper Networks'],
        'Semiconductors': ['Intel', 'TSMC', 'Samsung', 'SK Hynix'],
    },
    'Infrastructure': {
        'Telecom': ['AT&T', 'Verizon', 'T-Mobile', 'Comcast', 'Charter Communications', 'Deutsche Telekom'],
        'Utilities': ['NextEra Energy', 'Duke Energy', 'Southern Company', 'Dominion Energy', 'American Electric Power'],
        'Rail/Transport': ['Union Pacific', 'CSX', 'Norfolk Southern', 'Canadian National', 'FedEx', 'UPS'],
    },
    'Metals & Mining': {
        'Steel': ['ArcelorMittal', 'Nucor', 'Steel Dynamics', 'United States Steel', 'POSCO'],
        'Mining': ['BHP', 'Rio Tinto', 'Vale', 'Anglo American', 'Freeport-McMoRan', 'Newmont', 'Agnico Eagle'],
        'Precious Metals': ['Newmont', 'Agnico Eagle', 'Franco-Nevada', 'Wheaton Precious Metals', 'Royal Gold'],
    },
}

# Fetch prices for all companies
print("\n=== Fetching real-time prices ===")
print("This will take 10-15 minutes...")

all_price_data = {}
symbols_batch1 = [c['symbol'] for c in companies_list[:250]]
symbols_batch2 = [c['symbol'] for c in companies_list[250:]]

print("\nBatch 1/2: First 250 companies...")
for i, symbol in enumerate(symbols_batch1):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="3mo")

        price_data = {
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'previous_close': info.get('previousClose') or info.get('regularMarketPreviousClose'),
            'open': info.get('open') or info.get('regularMarketOpen'),
            'day_high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
            'day_low': info.get('dayLow') or info.get('regularMarketDayLow'),
            'volume': info.get('volume') or info.get('regularMarketVolume'),
            'market_cap': info.get('marketCap'),
            'beta': info.get('beta'),
        }

        # Calculate period returns from historical data
        if hist is not None and len(hist) >= 1:
            current = float(hist['Close'].iloc[-1])

            # 1 week return (5 trading days)
            if len(hist) >= 5:
                week_ago = float(hist['Close'].iloc[-5])
                price_data['return_1w'] = (current - week_ago) / week_ago
            else:
                price_data['return_1w'] = None

            # 1 month return (21 trading days)
            if len(hist) >= 21:
                month_ago = float(hist['Close'].iloc[-21])
                price_data['return_1m'] = (current - month_ago) / month_ago
            else:
                price_data['return_1m'] = None

            # 3 month return (63 trading days)
            if len(hist) >= 63:
                three_month_ago = float(hist['Close'].iloc[-63])
                price_data['return_3m'] = (current - three_month_ago) / three_month_ago
            else:
                price_data['return_3m'] = None

            # YTD return
            current_year = datetime.now().year
            ytd_data = hist[hist.index.year == current_year]
            if len(ytd_data) >= 2:
                ytd_start = float(ytd_data['Close'].iloc[0])
                price_data['return_ytd'] = (current - ytd_start) / ytd_start
            else:
                price_data['return_ytd'] = None

            # 1 year return
            if len(hist) >= 252:
                year_ago = float(hist['Close'].iloc[-252])
                price_data['return_1y'] = (current - year_ago) / year_ago
            else:
                price_data['return_1y'] = None

        all_price_data[symbol] = price_data

        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/250 companies...")
            time.sleep(2)
    except Exception as e:
        print(f"  Error {symbol}: {e}")
        all_price_data[symbol] = {}

print("\nBatch 2/2: Second 250 companies...")
for i, symbol in enumerate(symbols_batch2):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="3mo")

        price_data = {
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'previous_close': info.get('previousClose') or info.get('regularMarketPreviousClose'),
            'open': info.get('open') or info.get('regularMarketOpen'),
            'day_high': info.get('dayHigh') or info.get('regularMarketDayHigh'),
            'day_low': info.get('dayLow') or info.get('regularMarketDayLow'),
            'volume': info.get('volume') or info.get('regularMarketVolume'),
            'market_cap': info.get('marketCap'),
            'beta': info.get('beta'),
        }

        if hist is not None and len(hist) >= 1:
            current = float(hist['Close'].iloc[-1])
            if len(hist) >= 5:
                week_ago = float(hist['Close'].iloc[-5])
                price_data['return_1w'] = (current - week_ago) / week_ago
            else:
                price_data['return_1w'] = None

            if len(hist) >= 21:
                month_ago = float(hist['Close'].iloc[-21])
                price_data['return_1m'] = (current - month_ago) / month_ago
            else:
                price_data['return_1m'] = None

            if len(hist) >= 63:
                three_month_ago = float(hist['Close'].iloc[-63])
                price_data['return_3m'] = (current - three_month_ago) / three_month_ago
            else:
                price_data['return_3m'] = None

            current_year = datetime.now().year
            ytd_data = hist[hist.index.year == current_year]
            if len(ytd_data) >= 2:
                ytd_start = float(ytd_data['Close'].iloc[0])
                price_data['return_ytd'] = (current - ytd_start) / ytd_start
            else:
                price_data['return_ytd'] = None

            if len(hist) >= 252:
                year_ago = float(hist['Close'].iloc[-252])
                price_data['return_1y'] = (current - year_ago) / year_ago
            else:
                price_data['return_1y'] = None

        all_price_data[symbol] = price_data

        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/250 companies...")
            time.sleep(2)
    except Exception as e:
        print(f"  Error {symbol}: {e}")
        all_price_data[symbol] = {}

print(f"\nFetched prices for {len(all_price_data)} companies")

# Now sort by market cap and assign ranks
sorted_symbols = sorted(all_price_data.keys(), key=lambda x: all_price_data.get(x, {}).get('market_cap', 0) or 0, reverse=True)

# Assign ranks
rank_map = {}
for rank, sym in enumerate(sorted_symbols, 1):
    if rank <= 503:
        rank_map[sym] = rank

# Build complete company list with all data
print("\n=== Building complete dataset ===")
all_companies = []

for i, company in enumerate(companies_list):
    symbol = company['symbol']
    rank = rank_map.get(symbol, i + 1)

    price_data = all_price_data.get(symbol, {})

    company_data = {
        'rank': rank,
        'symbol': symbol,
        'name': company['name'],
        'sector': company['sector'],
        'sub_industry': company['sub_industry'],
        'market_cap': price_data.get('market_cap', 0),
        'headquarters': company['headquarters'],
        'current_price': price_data.get('current_price'),
        'price_change_1d': None,
        'returns': {
            '1_week': price_data.get('return_1w'),
            '1_month': price_data.get('return_1m'),
            '3_month': price_data.get('return_3m'),
            'ytd': price_data.get('return_ytd'),
            '1_year': price_data.get('return_1y'),
        },
        'stock_data': {
            'previous_close': price_data.get('previous_close'),
            'open': price_data.get('open'),
            'day_high': price_data.get('day_high'),
            'day_low': price_data.get('day_low'),
            'volume': price_data.get('volume'),
            'beta': price_data.get('beta'),
        },
        'profile': {
            'description': f"{company['name']} operates in the {company['sub_industry']} industry within the {company['sector']} sector.",
            'industry': company['sub_industry'],
            'sector': company['sector'],
        },
        'links': {
            'self': f"/company/{symbol}",
            'sector_companies': f"/sector/{company['sector'].lower().replace(' ', '-')}",
        },
        'last_updated': datetime.now().isoformat(),
    }

    all_companies.append(company_data)

# Sort by market cap descending
all_companies.sort(key=lambda x: x.get('market_cap', 0) or 0, reverse=True)

# Re-assign ranks after sorting
for i, company in enumerate(all_companies):
    company['rank'] = i + 1

# Take top 500
top_500 = [c for c in all_companies if c['rank'] <= 500]

# Build sector summary with all metrics
sector_summary = {}
for sector in set(c['sector'] for c in top_500):
    sector_companies = [c for c in top_500 if c['sector'] == sector]
    returns_1w = [c['returns']['1_week'] for c in sector_companies if c['returns']['1_week'] is not None]
    returns_1m = [c['returns']['1_month'] for c in sector_companies if c['returns']['1_month'] is not None]
    returns_3m = [c['returns']['3_month'] for c in sector_companies if c['returns']['3_month'] is not None]
    returns_ytd = [c['returns']['ytd'] for c in sector_companies if c['returns']['ytd'] is not None]
    returns_1y = [c['returns']['1_year'] for c in sector_companies if c['returns']['1_year'] is not None]

    sector_summary[sector] = {
        'company_count': len(sector_companies),
        'total_market_cap': sum(c.get('market_cap', 0) or 0 for c in sector_companies),
        'avg_market_cap': np.mean([c.get('market_cap', 0) or 0 for c in sector_companies]) if sector_companies else 0,
        'avg_return_1w': np.nanmean(returns_1w) if returns_1w else None,
        'avg_return_1m': np.nanmean(returns_1m) if returns_1m else None,
        'avg_return_3m': np.nanmean(returns_3m) if returns_3m else None,
        'avg_return_ytd': np.nanmean(returns_ytd) if returns_ytd else None,
        'avg_return_1y': np.nanmean(returns_1y) if returns_1y else None,
        'positive_1w': sum(1 for r in returns_1w if r > 0) if returns_1w else 0,
        'positive_1m': sum(1 for r in returns_1m if r > 0) if returns_1m else 0,
        'positive_3m': sum(1 for r in returns_3m if r > 0) if returns_3m else 0,
    }

# Build sub-industry summary
sub_industry_summary = {}
for sub in set(c['sub_industry'] for c in top_500):
    sub_companies = [c for c in top_500 if c['sub_industry'] == sub]
    returns_1m = [c['returns']['1_month'] for c in sub_companies if c['returns']['1_month'] is not None]
    returns_3m = [c['returns']['3_month'] for c in sub_companies if c['returns']['3_month'] is not None]

    sub_industry_summary[sub] = {
        'sector': sub_companies[0]['sector'] if sub_companies else '',
        'company_count': len(sub_companies),
        'total_market_cap': sum(c.get('market_cap', 0) or 0 for c in sub_companies),
        'avg_return_1m': np.nanmean(returns_1m) if returns_1m else None,
        'avg_return_3m': np.nanmean(returns_3m) if returns_3m else None,
    }

# Create final dataset
final_data = {
    'metadata': {
        'extraction_date': datetime.now().isoformat(),
        'total_companies': len(top_500),
        'rank_range': '1-500',
        'index': 'S&P 500',
        'price_updated': datetime.now().isoformat(),
    },
    'sector_summary': clean_object(sector_summary),
    'sub_industry_summary': clean_object(sub_industry_summary),
    'companies': clean_object(top_500),
}

# Save
output_file = '/Users/jacob/Stock-analysis/sp500_complete.json'
with open(output_file, 'w') as f:
    json.dump(final_data, f, indent=2)

print(f"\n✅ Saved {len(top_500)} companies to {output_file}")
print(f"File size: {len(json.dumps(final_data)) / 1024 / 1024:.1f} MB")

# Show sample
sample = top_500[0]
print(f"\n=== Sample: {sample['name']} ({sample['symbol']}) ===")
print(f"Rank: {sample['rank']}")
print(f"Price: ${sample['current_price']}")
print(f"Returns: 1W={sample['returns']['1_week']:.1%} | 1M={sample['returns']['1_month']:.1%} | 3M={sample['returns']['3_month']:.1%}")