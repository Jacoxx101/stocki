import json

with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_FINAL.json', 'r') as f:
    data = json.load(f)

companies = data['companies']

# Show rich samples
samples = [
    ('NEM', 'Materials'),
    ('CRWD', 'Information Technology'),
    ('O', 'Real Estate'),
]

for sym, sector in samples:
    c = next((x for x in companies if x['symbol'] == sym), None)
    if c:
        print('\n' + '='*60)
        print(f"{c['name']} ({sym}) - Rank {c['rank']} - {sector}")
        print('='*60)
        print(f"Market Cap: ${c['market_cap']/1e9:.1f}B")
        print(f"Sector: {c['sector']} | Sub-industry: {c['sub_industry']}")
        print(f"Headquarters: {c['headquarters']} | Founded: {c['founded']}")
        print()
        print('--- SECTOR RANKINGS ---')
        sr = c['sector_rankings']
        print(f"Market Cap: Rank #{sr['market_cap_rank']}/{c['sector_metrics']['sector_companies_count']} (Percentile: {sr['market_cap_percentile']:.0f}%)")
        print(f"Size Tier: {c['sector_size_tier']}")
        if sr.get('profit_margin_percentile'): print(f"Profit Margin Percentile: {sr['profit_margin_percentile']:.0f}%")
        if sr.get('revenue_growth_percentile'): print(f"Revenue Growth Percentile: {sr['revenue_growth_percentile']:.0f}%")
        if sr.get('ytd_return_percentile'): print(f"YTD Return Percentile: {sr['ytd_return_percentile']:.0f}%")
        print()
        print('--- VALUATION VS SECTOR ---')
        vs = c.get('valuation_vs_sector', {})
        for k, v in vs.items():
            if isinstance(v, float):
                print(f"{k}: {v:+.1f}%")
            else:
                print(f"{k}: {v}")
        print()
        print('--- PERFORMANCE VS SECTOR ---')
        ps = c.get('performance_vs_sector', {})
        for k, v in ps.items():
            if isinstance(v, float):
                print(f"{k}: {v:+.1f}%")
            else:
                print(f"{k}: {v}")
        print()
        print('--- HISTORICAL DATA ---')
        h = c['historical_data']
        print(f"Period: {h.get('period')} ({h.get('data_points')} data points)")
        if h.get('one_year_return') is not None: print(f"1Y Return: {h.get('one_year_return'):.1%}")
        if h.get('ytd_return') is not None: print(f"YTD Return: {h.get('ytd_return'):.1%}")
        if h.get('volatility') is not None: print(f"Volatility: {h.get('volatility'):.1f}%")
        if h.get('sharpe_ratio') is not None: print(f"Sharpe Ratio: {h.get('sharpe_ratio'):.2f}")
        if h.get('best_month') is not None: print(f"Best Month: {h.get('best_month'):.1%}")
        if h.get('worst_month') is not None: print(f"Worst Month: {h.get('worst_month'):.1%}")
        print()
        print('--- QUARTERLY FINANCIALS ---')
        q = c.get('quarterly_financials', {})
        if 'income_statement' in q:
            quarters = list(q['income_statement'].keys())[:2]
            print(f"Available quarters: {quarters}")
            for qtr in quarters[:1]:
                qdata = q['income_statement'][qtr]
                if isinstance(qdata, dict):
                    if qdata.get('total_revenue'): print(f"  Revenue: ${qdata['total_revenue']/1e9:.2f}B")
                    if qdata.get('net_income'): print(f"  Net Income: ${qdata['net_income']/1e9:.2f}B")
                    if qdata.get('eps'): print(f"  EPS: ${qdata['eps']:.2f}")
        print()
        print('--- NEWS ---')
        news = c.get('recent_news', [])
        print(f"Articles: {len(news)}")
        for n in news[:2]:
            print(f"  - {n.get('title', '')[:80]}...")
            print(f"    Publisher: {n.get('publisher', '')}")
        print()
