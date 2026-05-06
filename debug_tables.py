import requests
from bs4 import BeautifulSoup

url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
headers = {'User-Agent': 'Mozilla/5.0 (compatible; DataExtractor/1.0)'}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')

tables = soup.find_all('table', {'class': 'wikitable'})
print(f"Found {len(tables)} wikitable tables")

for i, table in enumerate(tables):
    print(f"\nTable {i}:")
    print(f"  ID: {table.get('id')}")
    print(f"  Class: {table.get('class')}")
    rows = table.find_all('tr')
    print(f"  Rows: {len(rows)}")
    if rows:
        header = rows[0].find_all(['th', 'td'])
        print(f"  Header cols: {len(header)}")
        print(f"  Header: {[h.text.strip() for h in header[:3]]}")
