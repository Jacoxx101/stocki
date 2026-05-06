import json

# Load all data
with open('/Users/jacob/Stock-analysis/sp500_list.json', 'r') as f:
    companies = json.load(f)

with open('/Users/jacob/Stock-analysis/market_caps.json', 'r') as f:
    market_caps = json.load(f)

with open('/Users/jacob/Stock-analysis/company_infos.json', 'r') as f:
    infos = json.load(f)

# Create lookup by symbol
company_by_symbol = {c['symbol']: c for c in companies}

# Sort by market cap descending
sorted_symbols = sorted(market_caps.keys(), key=lambda x: market_caps.get(x, 0), reverse=True)

print(f"Total companies with market cap: {len(sorted_symbols)}")
print(f"Top 10 by market cap:")
for i, sym in enumerate(sorted_symbols[:10]):
    cap = market_caps[sym]
    name = company_by_symbol.get(sym, {}).get('name', 'Unknown')
    print(f"  {i+1}. {sym} ({name}): ${cap/1e12:.2f}T" if cap > 1e12 else f"  {i+1}. {sym} ({name}): ${cap/1e9:.2f}B")

# Select ranks 100-500 (indices 99-499)
selected_symbols = sorted_symbols[99:500]
print(f"\nSelected {len(selected_symbols)} companies ranked 100-500")

# Build sub-industry to companies mapping for competitor analysis
sub_industry_map = {}
for sym in sorted_symbols:
    sub = company_by_symbol.get(sym, {}).get('sub_industry', 'Unknown')
    if sub not in sub_industry_map:
        sub_industry_map[sub] = []
    sub_industry_map[sub].append(sym)

# Build sector to companies mapping
sector_map = {}
for sym in sorted_symbols:
    sector = company_by_symbol.get(sym, {}).get('sector', 'Unknown')
    if sector not in sector_map:
        sector_map[sector] = []
    sector_map[sector].append(sym)

# Build final dataset
output = []
for rank_idx, sym in enumerate(selected_symbols):
    rank = rank_idx + 100  # Actual rank (100-500)
    company = company_by_symbol.get(sym, {})
    info = infos.get(sym, {})
    
    sector = company.get('sector', 'Unknown')
    sub_industry = company.get('sub_industry', 'Unknown')
    
    # Get competitors: other companies in same sub-industry
    competitors = []
    for comp_sym in sub_industry_map.get(sub_industry, []):
        if comp_sym != sym:
            comp_name = company_by_symbol.get(comp_sym, {}).get('name', comp_sym)
            competitors.append({
                'symbol': comp_sym,
                'name': comp_name,
                'link': f"/company/{comp_sym}"
            })
    
    # Get related companies: other companies in same sector (limit to 10)
    related = []
    for rel_sym in sector_map.get(sector, []):
        if rel_sym != sym and rel_sym not in [c['symbol'] for c in competitors]:
            rel_name = company_by_symbol.get(rel_sym, {}).get('name', rel_sym)
            related.append({
                'symbol': rel_sym,
                'name': rel_name,
                'link': f"/company/{rel_sym}"
            })
            if len(related) >= 10:
                break
    
    # Build profile
    description = info.get('longBusinessSummary', '')
    if not description:
        description = f"{company.get('name', sym)} operates in the {sub_industry} industry within the {sector} sector."
    
    # Get products/services if available
    products = []
    if info.get('industry'):
        products.append(info.get('industry'))
    if info.get('sector'):
        products.append(info.get('sector'))
    
    company_data = {
        'rank': rank,
        'symbol': sym,
        'name': company.get('name', info.get('longName', sym)),
        'sector': sector,
        'sub_industry': sub_industry,
        'market_cap': market_caps.get(sym, 0),
        'headquarters': company.get('headquarters', ''),
        'founded': company.get('founded', ''),
        'profile': {
            'description': description,
            'industry': info.get('industry', sub_industry),
            'sector': sector,
            'employees': info.get('fullTimeEmployees'),
            'website': info.get('website', ''),
            'phone': info.get('phone', '')
        },
        'competitors': competitors[:15],  # Limit competitors
        'related_companies': related,
        'links': {
            'self': f"/company/{sym}",
            'sector_companies': f"/sector/{sector.lower().replace(' ', '-')}",
            'sub_industry_companies': f"/sub-industry/{sub_industry.lower().replace(' ', '-').replace('&', 'and')}"
        }
    }
    
    output.append(company_data)

# Save final output
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nSaved {len(output)} companies to sp500_ranked_100_500.json")
print(f"\nSample output (first company):")
print(json.dumps(output[0], indent=2)[:1000] + "...")

# Print sector distribution
sector_counts = {}
for comp in output:
    s = comp['sector']
    sector_counts[s] = sector_counts.get(s, 0) + 1

print(f"\nSector distribution (ranks 100-500):")
for sector, count in sorted(sector_counts.items(), key=lambda x: -x[1]):
    print(f"  {sector}: {count}")
