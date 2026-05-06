import json
import yfinance as yf
import time
from datetime import datetime

# Load S&P 500 list
with open('/Users/jacob/Stock-analysis/sp500_list.json', 'r') as f:
    companies = json.load(f)

print(f"Loaded {len(companies)} companies")

# Fetch market cap and info for each company
# We'll do this in batches to avoid overwhelming the API
market_caps = {}
infos = {}
errors = []

batch_size = 50
total = len(companies)

for i, company in enumerate(companies):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        market_cap = info.get('marketCap', 0)
        market_caps[symbol] = market_cap
        infos[symbol] = info
        
        if (i + 1) % batch_size == 0:
            print(f"Processed {i+1}/{total} companies...")
            time.sleep(2)  # Be nice to the API
    except Exception as e:
        errors.append((symbol, str(e)))
        market_caps[symbol] = 0
        print(f"Error fetching {symbol}: {e}")

print(f"\nDone! Errors: {len(errors)}")
print(f"Successful market cap fetches: {len([v for v in market_caps.values() if v > 0])}")

# Save intermediate results
with open('/Users/jacob/Stock-analysis/market_caps.json', 'w') as f:
    json.dump(market_caps, f, indent=2)

with open('/Users/jacob/Stock-analysis/company_infos.json', 'w') as f:
    # Filter out non-serializable objects
    serializable_infos = {}
    for sym, info in infos.items():
        serializable_infos[sym] = {k: v for k, v in info.items() if isinstance(v, (str, int, float, bool, list, dict, type(None)))}
    json.dump(serializable_infos, f, indent=2)

print("Saved intermediate data")
