import json
import yfinance as yf
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta

# Load enhanced data
with open('/Users/jacob/Stock-analysis/sp500_ranked_100_500_enhanced.json', 'r') as f:
    companies = json.load(f)

print(f"Adding comprehensive data for {len(companies)} companies...")
print(f"This may take 15-20 minutes due to API rate limits...")

enhanced_data = []
errors = []

for i, company in enumerate(companies):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        
        # 1. HISTORICAL PRICE DATA (1 year)
        try:
            hist = ticker.history(period="1y")
            if not hist.empty:
                # Calculate key metrics from historical data
                hist_metrics = {
                    'period': '1 year',
                    'data_points': len(hist),
                    'start_date': hist.index[0].strftime('%Y-%m-%d') if hasattr(hist.index[0], 'strftime') else str(hist.index[0]),
                    'end_date': hist.index[-1].strftime('%Y-%m-%d') if hasattr(hist.index[-1], 'strftime') else str(hist.index[-1]),
                    'highest_close': float(hist['Close'].max()),
                    'lowest_close': float(hist['Close'].min()),
                    'average_volume': float(hist['Volume'].mean()),
                    'ytd_return': None,
                    'one_year_return': None,
                    'volatility': None,
                    'sharpe_ratio': None,
                }
                
                # Calculate returns
                if len(hist) > 1:
                    start_price = float(hist['Close'].iloc[0])
                    end_price = float(hist['Close'].iloc[-1])
                    hist_metrics['one_year_return'] = (end_price - start_price) / start_price
                    
                    # YTD return (approximate - from Jan 1)
                    current_year = datetime.now().year
                    ytd_data = hist[hist.index.year == current_year]
                    if not ytd_data.empty:
                        ytd_start = float(ytd_data['Close'].iloc[0])
                        hist_metrics['ytd_return'] = (end_price - ytd_start) / ytd_start
                
                # Calculate volatility (annualized standard deviation of daily returns)
                if len(hist) > 20:
                    daily_returns = hist['Close'].pct_change().dropna()
                    hist_metrics['volatility'] = float(daily_returns.std() * np.sqrt(252))
                    
                    # Sharpe ratio (assuming risk-free rate ~4.5%)
                    if hist_metrics['one_year_return'] is not None:
                        excess_return = hist_metrics['one_year_return'] - 0.045
                        if hist_metrics['volatility'] > 0:
                            hist_metrics['sharpe_ratio'] = excess_return / hist_metrics['volatility']
                
                # Monthly performance summary
                monthly = hist['Close'].resample('ME').last()
                if len(monthly) > 1:
                    monthly_returns = monthly.pct_change().dropna()
                    hist_metrics['best_month'] = float(monthly_returns.max())
                    hist_metrics['worst_month'] = float(monthly_returns.min())
                    hist_metrics['avg_monthly_return'] = float(monthly_returns.mean())
                
                company['historical_data'] = hist_metrics
            else:
                company['historical_data'] = {'error': 'No historical data available'}
        except Exception as e:
            company['historical_data'] = {'error': str(e)}
        
        # 2. QUARTERLY FINANCIALS
        quarterly_financials = {}
        
        # Income Statement
        try:
            income_stmt = ticker.quarterly_income_stmt
            if income_stmt is not None and not income_stmt.empty:
                quarterly_financials['income_statement'] = {}
                for col in income_stmt.columns[:4]:  # Last 4 quarters
                    quarter_key = col.strftime('%Y-Q%q') if hasattr(col, 'strftime') else str(col)
                    quarterly_financials['income_statement'][quarter_key] = {
                        'total_revenue': income_stmt.loc['Total Revenue', col] if 'Total Revenue' in income_stmt.index else None,
                        'gross_profit': income_stmt.loc['Gross Profit', col] if 'Gross Profit' in income_stmt.index else None,
                        'operating_income': income_stmt.loc['Operating Income', col] if 'Operating Income' in income_stmt.index else None,
                        'net_income': income_stmt.loc['Net Income', col] if 'Net Income' in income_stmt.index else None,
                        'ebitda': income_stmt.loc['EBITDA', col] if 'EBITDA' in income_stmt.index else None,
                        'eps': income_stmt.loc['Basic EPS', col] if 'Basic EPS' in income_stmt.index else None,
                        'diluted_eps': income_stmt.loc['Diluted EPS', col] if 'Diluted EPS' in income_stmt.index else None,
                    }
            else:
                quarterly_financials['income_statement'] = {'error': 'No data'}
        except Exception as e:
            quarterly_financials['income_statement'] = {'error': str(e)}
        
        # Balance Sheet
        try:
            balance_sheet = ticker.quarterly_balance_sheet
            if balance_sheet is not None and not balance_sheet.empty:
                quarterly_financials['balance_sheet'] = {}
                for col in balance_sheet.columns[:4]:
                    quarter_key = col.strftime('%Y-Q%q') if hasattr(col, 'strftime') else str(col)
                    quarterly_financials['balance_sheet'][quarter_key] = {
                        'total_assets': balance_sheet.loc['Total Assets', col] if 'Total Assets' in balance_sheet.index else None,
                        'total_liabilities': balance_sheet.loc['Total Liabilities Net Minority Interest', col] if 'Total Liabilities Net Minority Interest' in balance_sheet.index else None,
                        'total_equity': balance_sheet.loc['Stockholders Equity', col] if 'Stockholders Equity' in balance_sheet.index else None,
                        'total_debt': balance_sheet.loc['Total Debt', col] if 'Total Debt' in balance_sheet.index else None,
                        'cash_and_equivalents': balance_sheet.loc['Cash And Cash Equivalents', col] if 'Cash And Cash Equivalents' in balance_sheet.index else None,
                        'working_capital': balance_sheet.loc['Working Capital', col] if 'Working Capital' in balance_sheet.index else None,
                        'inventory': balance_sheet.loc['Inventory', col] if 'Inventory' in balance_sheet.index else None,
                        'property_plant_equipment': balance_sheet.loc['Net PPE', col] if 'Net PPE' in balance_sheet.index else None,
                    }
            else:
                quarterly_financials['balance_sheet'] = {'error': 'No data'}
        except Exception as e:
            quarterly_financials['balance_sheet'] = {'error': str(e)}
        
        # Cash Flow
        try:
            cash_flow = ticker.quarterly_cash_flow
            if cash_flow is not None and not cash_flow.empty:
                quarterly_financials['cash_flow'] = {}
                for col in cash_flow.columns[:4]:
                    quarter_key = col.strftime('%Y-Q%q') if hasattr(col, 'strftime') else str(col)
                    quarterly_financials['cash_flow'][quarter_key] = {
                        'operating_cash_flow': cash_flow.loc['Operating Cash Flow', col] if 'Operating Cash Flow' in cash_flow.index else None,
                        'free_cash_flow': cash_flow.loc['Free Cash Flow', col] if 'Free Cash Flow' in cash_flow.index else None,
                        'capital_expenditure': cash_flow.loc['Capital Expenditure', col] if 'Capital Expenditure' in cash_flow.index else None,
                        'financing_cash_flow': cash_flow.loc['Financing Cash Flow', col] if 'Financing Cash Flow' in cash_flow.index else None,
                        'investing_cash_flow': cash_flow.loc['Investing Cash Flow', col] if 'Investing Cash Flow' in cash_flow.index else None,
                        'dividends_paid': cash_flow.loc['Cash Dividends Paid', col] if 'Cash Dividends Paid' in cash_flow.index else None,
                        'share_repurchase': cash_flow.loc['Repurchase Of Capital Stock', col] if 'Repurchase Of Capital Stock' in cash_flow.index else None,
                    }
            else:
                quarterly_financials['cash_flow'] = {'error': 'No data'}
        except Exception as e:
            quarterly_financials['cash_flow'] = {'error': str(e)}
        
        company['quarterly_financials'] = quarterly_financials
        
        # 3. ESG DATA
        try:
            esg = ticker.sustainability
            if esg is not None and not esg.empty:
                esg_data = {}
                for col in esg.columns:
                    for idx in esg.index:
                        val = esg.loc[idx, col]
                        if pd.notna(val):
                            esg_data[idx] = val
                company['esg_data'] = esg_data
            else:
                company['esg_data'] = {'error': 'No ESG data available'}
        except Exception as e:
            company['esg_data'] = {'error': str(e)}
        
        # 4. NEWS DATA
        try:
            news = ticker.news
            if news:
                processed_news = []
                for article in news[:10]:  # Top 10 recent articles
                    processed_news.append({
                        'title': article.get('title', ''),
                        'publisher': article.get('publisher', ''),
                        'link': article.get('link', ''),
                        'published': article.get('published', ''),
                        'summary': article.get('summary', ''),
                        'type': article.get('type', ''),
                    })
                company['recent_news'] = processed_news
            else:
                company['recent_news'] = []
        except Exception as e:
            company['recent_news'] = {'error': str(e)}
        
        enhanced_data.append(company)
        
        if (i + 1) % 25 == 0:
            print(f"Processed {i+1}/{len(companies)} companies...")
            time.sleep(2)  # Rate limiting
        else:
            time.sleep(0.5)
            
    except Exception as e:
        errors.append((symbol, str(e)))
        enhanced_data.append(company)
        print(f"Error processing {symbol}: {e}")

print(f"\nDone! Errors: {len(errors)}")

# Save intermediate enhanced data
with open('/Users/jacob/Stock-analysis/sp500_comprehensive_part1.json', 'w') as f:
    json.dump(enhanced_data, f, indent=2)

print(f"Saved comprehensive part 1 data")
print(f"Total companies: {len(enhanced_data)}")

# Show sample
sample = enhanced_data[0]
print(f"\n=== SAMPLE: {sample['name']} ({sample['symbol']}) ===")
print(f"Historical: 1Y Return={sample['historical_data'].get('one_year_return'):.1%}, Vol={sample['historical_data'].get('volatility'):.1%}")
print(f"Quarterly: {list(sample['quarterly_financials'].get('income_statement', {}).keys())[:2]}")
print(f"ESG keys: {list(sample.get('esg_data', {}).keys())[:5]}")
print(f"News articles: {len(sample.get('recent_news', []))}")
