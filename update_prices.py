import json
import urllib.request
from datetime import datetime

EXCHANGES = ['nasdaq', 'nyse', 'amex']
BASE_URL = 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main'

def fetch_exchange(exchange):
    url = f'{BASE_URL}/{exchange}/{exchange}_full_tickers.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def parse_price(price_str):
    """Parse '$294.80' -> 294.80"""
    try:
        return float(price_str.replace('$', '').replace(',', ''))
    except (ValueError, AttributeError):
        return None

def parse_market_cap(mcap_str):
    """Parse market cap string to float"""
    try:
        return float(mcap_str)
    except (ValueError, TypeError):
        return None

print("=== Daily Price Update via NASDAQ/NYSE/AMEX feeds ===")
print(f"  Time: {datetime.now().isoformat()}")

# Build price lookup from all exchanges
price_lookup = {}
total = 0
for exchange in EXCHANGES:
    try:
        tickers = fetch_exchange(exchange)
        for t in tickers:
            sym = t['symbol']
            price = parse_price(t.get('lastsale'))
            mcap = parse_market_cap(t.get('marketCap'))
            volume = t.get('volume')
            netchange = parse_price(t.get('netchange'))
            pctchange = t.get('pctchange')

            if price is not None:
                price_lookup[sym] = {
                    'price': price,
                    'market_cap': mcap,
                    'volume': volume,
                    'netchange': netchange,
                    'pctchange': pctchange,
                }
        print(f"  {exchange.upper()}: {len(tickers)} tickers -> {len([t for t in tickers if parse_price(t.get('lastsale')) is not None])} with prices")
        total += len(tickers)
    except Exception as e:
        print(f"  {exchange.upper()}: Error - {e}")

print(f"\n  Total price lookup: {len(price_lookup)} symbols\n")

# Load existing data
with open('sp500_complete.json') as f:
    data = json.load(f)

companies = data['companies']
print(f"  Loaded {len(companies)} companies")

updated = 0
missing = 0

for company in companies:
    symbol = company['symbol']
    lookup = price_lookup.get(symbol)

    if lookup is None:
        missing += 1
        continue

    price = lookup['price']
    mcap = lookup['market_cap']
    volume = lookup['volume']
    netchange = lookup['netchange']

    # Top-level price
    company['current_price'] = price

    # Market cap
    if mcap is not None and mcap > 0:
        company['market_cap'] = mcap

    # Stock data block
    stock = company.setdefault('stock_data', {})
    stock['current_price'] = price
    if mcap is not None and mcap > 0:
        stock['market_cap'] = mcap
    if volume is not None:
        try:
            stock['volume'] = int(volume)
        except (ValueError, TypeError):
            pass
    if netchange is not None:
        stock['net_change'] = netchange

    company['last_updated'] = datetime.now().isoformat()
    updated += 1

print(f"\n  Updated: {updated}, Missing from feeds: {missing}")

# Re-sort by market cap
data['companies'].sort(key=lambda c: c.get('market_cap', 0) or 0, reverse=True)
for i, c in enumerate(data['companies']):
    c['rank'] = i + 1

# Update metadata
data['metadata']['price_updated'] = datetime.now().isoformat()
data['metadata']['last_updated'] = datetime.now().isoformat()
data['metadata']['price_source'] = 'NASDAQ/NYSE/AMEX via US-Stock-Symbols'

# Save
with open('sp500_complete.json', 'w') as f:
    json.dump(data, f, indent=2)

with open('sp500-react/public/data.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"  Saved sp500_complete.json and sp500-react/public/data.json")

# Show sample
samples = data['companies'][:10]
print(f"\n  Sample top 10:")
for c in samples:
    print(f"  {c['symbol']:6s} ${c.get('current_price', 'N/A'):>10}  rank={c['rank']}")
