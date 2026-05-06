import json
import yfinance as yf
import time
from datetime import datetime

# Load existing data
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500.json', 'r') as f:
    companies = json.load(f)

print(f"Enhancing data for {len(companies)} companies...")

enhanced_data = []
errors = []

for i, company in enumerate(companies):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Financial metrics
        financials = {
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
        }
        
        # Stock data
        stock_data = {
            'current_price': info.get('currentPrice'),
            'previous_close': info.get('previousClose'),
            'open': info.get('open'),
            'day_high': info.get('dayHigh'),
            'day_low': info.get('dayLow'),
            'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
            'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
            'fifty_day_average': info.get('fiftyDayAverage'),
            'two_hundred_day_average': info.get('twoHundredDayAverage'),
            'volume': info.get('volume'),
            'average_volume': info.get('averageVolume'),
            'average_volume_10days': info.get('averageVolume10days'),
            'market_cap': info.get('marketCap'),
            'shares_outstanding': info.get('sharesOutstanding'),
            'float_shares': info.get('floatShares'),
            'held_by_insiders': info.get('heldPercentInsiders'),
            'held_by_institutions': info.get('heldPercentInstitutions'),
            'short_ratio': info.get('shortRatio'),
            'short_percent_of_float': info.get('shortPercentOfFloat'),
        }
        
        # Dividend data
        dividend_data = {
            'dividend_rate': info.get('dividendRate'),
            'dividend_yield': info.get('dividendYield'),
            'ex_dividend_date': info.get('exDividendDate'),
            'payout_ratio': info.get('payoutRatio'),
            'five_year_avg_dividend_yield': info.get('fiveYearAvgDividendYield'),
        }
        
        # Growth & targets
        growth_data = {
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
        }
        
        # Company details
        company_details = {
            'country': info.get('country'),
            'state': info.get('state'),
            'city': info.get('city'),
            'zip': info.get('zip'),
            'address': info.get('address1'),
            'phone': info.get('phone'),
            'fax': info.get('fax'),
            'website': info.get('website'),
            'industry': info.get('industry'),
            'sector': info.get('sector'),
            'full_time_employees': info.get('fullTimeEmployees'),
            'company_officers': info.get('companyOfficers', [])[:5] if info.get('companyOfficers') else [],
            'ir_website': info.get('irWebsite'),
            'logo_url': info.get('logo_url'),
        }
        
        # Business description & risks
        business_info = {
            'long_business_summary': info.get('longBusinessSummary'),
            'business_summary': info.get('longBusinessSummary', '')[:500] if info.get('longBusinessSummary') else '',
        }
        
        # Combine all data
        enhanced_company = {
            **company,
            'financials': financials,
            'stock_data': stock_data,
            'dividend_data': dividend_data,
            'growth_data': growth_data,
            'company_details': company_details,
            'business_info': business_info,
            'last_updated': datetime.now().isoformat(),
        }
        
        enhanced_data.append(enhanced_company)
        
        if (i + 1) % 50 == 0:
            print(f"Enhanced {i+1}/{len(companies)} companies...")
            time.sleep(1)
            
    except Exception as e:
        errors.append((symbol, str(e)))
        enhanced_data.append(company)  # Keep original data
        print(f"Error enhancing {symbol}: {e}")

print(f"\nDone! Errors: {len(errors)}")

# Save enhanced data
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_enhanced.json', 'w') as f:
    json.dump(enhanced_data, f, indent=2)

print(f"Saved enhanced data to sp500_ranked_100_500_enhanced.json")

# Show sample
sample = enhanced_data[0]
print(f"\n=== SAMPLE: {sample['name']} ({sample['symbol']}) ===")
print(f"Financials: Revenue=${sample['financials'].get('revenue', 0)/1e9:.1f}B, P/E={sample['financials'].get('pe_ratio')}")
print(f"Stock: Price=${sample['stock_data'].get('current_price')}, 52W High=${sample['stock_data'].get('fifty_two_week_high')}")
print(f"Dividend: Yield={sample['dividend_data'].get('dividend_yield')}, Payout={sample['dividend_data'].get('payout_ratio')}")
print(f"Growth: Revenue Growth={sample['growth_data'].get('revenue_growth')}, Analyst Target=${sample['growth_data'].get('target_mean_price')}")
print(f"Employees: {sample['company_details'].get('full_time_employees')}")
