import requests
from bs4 import BeautifulSoup
import json

# Fetch S&P 500 constituents from Wikipedia
url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
headers = {'User-Agent': 'Mozilla/5.0 (compatible; DataExtractor/1.0)'}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')

# Find the constituents table
table = soup.find('table', {'id': 'constituents'})

# Extract data
companies = []
rows = table.find_all('tr')[1:]  # Skip header
for row in rows:
    cols = row.find_all(['td', 'th'])
    if len(cols) >= 8:
        symbol = cols[0].text.strip()
        security = cols[1].text.strip()
        sector = cols[2].text.strip()
        sub_industry = cols[3].text.strip()
        headquarters = cols[4].text.strip()
        date_added = cols[5].text.strip()
        cik = cols[6].text.strip()
        founded = cols[7].text.strip()
        
        companies.append({
            'symbol': symbol,
            'name': security,
            'sector': sector,
            'sub_industry': sub_industry,
            'headquarters': headquarters,
            'date_added': date_added,
            'cik': cik,
            'founded': founded
        })

print(f"Extracted {len(companies)} companies")
if companies:
    print(f"First: {companies[0]['symbol']} - {companies[0]['name']}")
    print(f"Last: {companies[-1]['symbol']} - {companies[-1]['name']}")

with open('/Users/jacob/Stock-analysis/sp500_list.json', 'w') as f:
    json.dump(companies, f, indent=2)

print("Saved to sp500_list.json")
