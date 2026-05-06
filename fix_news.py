import json
import yfinance as yf
import time

# Load final data
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'r') as f:
    data = json.load(f)

companies = data['companies']
print(f"Fixing news data for {len(companies)} companies...")

fixed_count = 0
for i, company in enumerate(companies):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news
        if news:
            processed_news = []
            for article in news[:10]:
                # New format: article has 'id' and 'content'
                content = article.get('content', article)  # Fallback for old format
                processed_news.append({
                    'title': content.get('title', '') if isinstance(content, dict) else article.get('title', ''),
                    'publisher': content.get('provider', {}).get('displayName', '') if isinstance(content, dict) and isinstance(content.get('provider'), dict) else article.get('publisher', ''),
                    'link': content.get('canonicalUrl', {}).get('url', '') if isinstance(content, dict) and isinstance(content.get('canonicalUrl'), dict) else article.get('link', ''),
                    'published': content.get('pubDate', '') if isinstance(content, dict) else article.get('published', ''),
                    'summary': content.get('summary', '') if isinstance(content, dict) else article.get('summary', ''),
                    'type': content.get('contentType', '') if isinstance(content, dict) else article.get('type', ''),
                })
            company['recent_news'] = processed_news
            fixed_count += 1
        else:
            company['recent_news'] = []
        
        if (i + 1) % 50 == 0:
            print(f"Fixed {i+1}/{len(companies)}...")
            time.sleep(2)
        else:
            time.sleep(0.3)
    except Exception as e:
        print(f"Error fixing {symbol}: {e}")
        company['recent_news'] = []

print(f"\nFixed news for {fixed_count} companies")

# Save updated file
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Saved updated final file")

# Verify
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'r') as f:
    verify = json.load(f)

c = verify['companies'][0]
print(f"\nSample news for {c['symbol']}:")
for n in c['recent_news'][:2]:
    print(f"  - {n['title'][:70]}...")
    print(f"    Publisher: {n['publisher']}")
