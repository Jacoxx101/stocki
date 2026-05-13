import json
import yfinance as yf
import numpy as np
import time
from datetime import datetime

def clean(v):
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    return v

print("=== Updating all prices and values ===")

with open('sp500_complete.json') as f:
    data = json.load(f)

companies = data['companies']
print(f"Loaded {len(companies)} companies")

# Also collect all external symbols from fetch_external.py
all_symbols = [c['symbol'] for c in companies]

updated = 0
errors = 0

for i, company in enumerate(companies):
    symbol = company['symbol']
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        if not info or info.get('symbol') is None:
            errors += 1
            if (i + 1) % 50 == 0:
                print(f"  Progress: {i+1}/{len(companies)}...")
            continue

        # --- STOCK DATA (price fields) ---
        stock = company.setdefault('stock_data', {})

        new_price = info.get('currentPrice') or info.get('regularMarketPrice')
        if new_price is not None:
            stock['current_price'] = clean(new_price)

        prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
        if prev_close is not None:
            stock['previous_close'] = clean(prev_close)

        open_p = info.get('open') or info.get('regularMarketOpen')
        if open_p is not None:
            stock['open'] = clean(open_p)

        day_high = info.get('dayHigh') or info.get('regularMarketDayHigh')
        if day_high is not None:
            stock['day_high'] = clean(day_high)

        day_low = info.get('dayLow') or info.get('regularMarketDayLow')
        if day_low is not None:
            stock['day_low'] = clean(day_low)

        volume = info.get('volume') or info.get('regularMarketVolume')
        if volume is not None:
            stock['volume'] = clean(volume)

        avg_vol = info.get('averageVolume')
        if avg_vol is not None:
            stock['average_volume'] = clean(avg_vol)

        avg_vol_10 = info.get('averageVolume10days')
        if avg_vol_10 is not None:
            stock['average_volume_10days'] = clean(avg_vol_10)

        mcap = info.get('marketCap')
        if mcap is not None:
            stock['market_cap'] = clean(mcap)
            company['market_cap'] = clean(mcap)

        beta = info.get('beta')
        if beta is not None:
            stock['beta'] = clean(beta)

        ftwh = info.get('fiftyTwoWeekHigh')
        if ftwh is not None:
            stock['fifty_two_week_high'] = clean(ftwh)

        ftwl = info.get('fiftyTwoWeekLow')
        if ftwl is not None:
            stock['fifty_two_week_low'] = clean(ftwl)

        fda = info.get('fiftyDayAverage')
        if fda is not None:
            stock['fifty_day_average'] = clean(fda)

        thda = info.get('twoHundredDayAverage')
        if thda is not None:
            stock['two_hundred_day_average'] = clean(thda)

        shares = info.get('sharesOutstanding')
        if shares is not None:
            stock['shares_outstanding'] = clean(shares)

        float_s = info.get('floatShares')
        if float_s is not None:
            stock['float_shares'] = clean(float_s)

        insiders = info.get('heldPercentInsiders')
        if insiders is not None:
            stock['held_by_insiders'] = clean(insiders)

        institutions = info.get('heldPercentInstitutions')
        if institutions is not None:
            stock['held_by_institutions'] = clean(institutions)

        short_ratio = info.get('shortRatio')
        if short_ratio is not None:
            stock['short_ratio'] = clean(short_ratio)

        short_pct = info.get('shortPercentOfFloat')
        if short_pct is not None:
            stock['short_percent_of_float'] = clean(short_pct)

        # --- CURRENT PRICE (top-level) ---
        if new_price is not None:
            company['current_price'] = clean(new_price)

        # --- RETURN CALCULATIONS ---
        hist = ticker.history(period="6mo")
        returns = company.setdefault('returns', {})

        if hist is not None and len(hist) >= 1:
            current_close = float(hist['Close'].iloc[-1])

            if len(hist) >= 5:
                w_ago = float(hist['Close'].iloc[-5])
                returns['1_week'] = clean((current_close - w_ago) / w_ago)

            if len(hist) >= 21:
                m_ago = float(hist['Close'].iloc[-21])
                returns['1_month'] = clean((current_close - m_ago) / m_ago)

            if len(hist) >= 63:
                t_ago = float(hist['Close'].iloc[-63])
                returns['3_month'] = clean((current_close - t_ago) / t_ago)

            cy = datetime.now().year
            ytd_data = hist[hist.index.year == cy]
            if len(ytd_data) >= 2:
                ytd_start = float(ytd_data['Close'].iloc[0])
                returns['ytd'] = clean((current_close - ytd_start) / ytd_start)

        # 1-year return using 1y history
        hist_1y = ticker.history(period="1y")
        if hist_1y is not None and len(hist_1y) >= 252:
            current_1y = float(hist_1y['Close'].iloc[-1])
            year_ago = float(hist_1y['Close'].iloc[-252])
            returns['1_year'] = clean((current_1y - year_ago) / year_ago)

            # Also update YTD from 1y data if not already set
            if returns.get('ytd') is None:
                cy = datetime.now().year
                ytd_data_1y = hist_1y[hist_1y.index.year == cy]
                if len(ytd_data_1y) >= 2:
                    ytd_start = float(ytd_data_1y['Close'].iloc[0])
                    returns['ytd'] = clean((current_1y - ytd_start) / ytd_start)

        # --- GROWTH DATA ---
        growth = company.setdefault('growth_data', {})
        rev_growth = info.get('revenueGrowth')
        if rev_growth is not None:
            growth['revenue_growth'] = clean(rev_growth)
        earn_growth = info.get('earningsGrowth')
        if earn_growth is not None:
            growth['earnings_growth'] = clean(earn_growth)
        earn_q_growth = info.get('earningsQuarterlyGrowth')
        if earn_q_growth is not None:
            growth['earnings_quarterly_growth'] = clean(earn_q_growth)
        target_high = info.get('targetHighPrice')
        if target_high is not None:
            growth['target_high_price'] = clean(target_high)
        target_low = info.get('targetLowPrice')
        if target_low is not None:
            growth['target_low_price'] = clean(target_low)
        target_mean = info.get('targetMeanPrice')
        if target_mean is not None:
            growth['target_mean_price'] = clean(target_mean)
        target_median = info.get('targetMedianPrice')
        if target_median is not None:
            growth['target_median_price'] = clean(target_median)
        rec_key = info.get('recommendationKey')
        if rec_key is not None:
            growth['recommendation_key'] = rec_key
        num_analysts = info.get('numberOfAnalystOpinions')
        if num_analysts is not None:
            growth['number_of_analyst_opinions'] = clean(num_analysts)

        # --- FINANCIALS ---
        fin = company.setdefault('financials', {})
        revenue = info.get('totalRevenue')
        if revenue is not None:
            fin['revenue'] = clean(revenue)
        gross = info.get('grossProfits')
        if gross is not None:
            fin['gross_profit'] = clean(gross)
        op_margin = info.get('operatingMargins')
        if op_margin is not None:
            fin['operating_margin'] = clean(op_margin)
        p_margin = info.get('profitMargins')
        if p_margin is not None:
            fin['profit_margin'] = clean(p_margin)
        ebitda = info.get('ebitda')
        if ebitda is not None:
            fin['ebitda'] = clean(ebitda)
        net_inc = info.get('netIncomeToCommon')
        if net_inc is not None:
            fin['net_income'] = clean(net_inc)
        eps = info.get('trailingEps')
        if eps is not None:
            fin['eps'] = clean(eps)
        pe = info.get('trailingPE')
        if pe is not None:
            fin['pe_ratio'] = clean(pe)
        fpe = info.get('forwardPE')
        if fpe is not None:
            fin['forward_pe'] = clean(fpe)
        peg = info.get('pegRatio')
        if peg is not None:
            fin['peg_ratio'] = clean(peg)
        pb = info.get('priceToBook')
        if pb is not None:
            fin['price_to_book'] = clean(pb)
        ps = info.get('priceToSalesTrailing12Months')
        if ps is not None:
            fin['price_to_sales'] = clean(ps)
        ev = info.get('enterpriseValue')
        if ev is not None:
            fin['enterprise_value'] = clean(ev)
        de = info.get('debtToEquity')
        if de is not None:
            fin['debt_to_equity'] = clean(de)
        roe = info.get('returnOnEquity')
        if roe is not None:
            fin['return_on_equity'] = clean(roe)
        roa = info.get('returnOnAssets')
        if roa is not None:
            fin['return_on_assets'] = clean(roa)
        curr_ratio = info.get('currentRatio')
        if curr_ratio is not None:
            fin['current_ratio'] = clean(curr_ratio)
        quick_ratio = info.get('quickRatio')
        if quick_ratio is not None:
            fin['quick_ratio'] = clean(quick_ratio)

        # --- DIVIDEND DATA ---
        div = company.setdefault('dividend_data', {})
        div_rate = info.get('dividendRate')
        if div_rate is not None:
            div['dividend_rate'] = clean(div_rate)
        div_yield = info.get('dividendYield')
        if div_yield is not None:
            div['dividend_yield'] = clean(div_yield)
        ex_div = info.get('exDividendDate')
        if ex_div is not None:
            div['ex_dividend_date'] = clean(ex_div)
        payout = info.get('payoutRatio')
        if payout is not None:
            div['payout_ratio'] = clean(payout)

        company['last_updated'] = datetime.now().isoformat()
        updated += 1

        if (i + 1) % 50 == 0 or (i + 1) == len(companies):
            print(f"  Progress: {i+1}/{len(companies)}... (updated {updated}, errors {errors})")

    except Exception as e:
        errors += 1
        print(f"  Error {symbol}: {e}")

print(f"\nDone. Updated: {updated}, Errors: {errors}")

# Re-sort by market cap
data['companies'].sort(key=lambda c: c.get('market_cap', 0) or 0, reverse=True)
for i, c in enumerate(data['companies']):
    c['rank'] = i + 1

# Update metadata
data['metadata']['price_updated'] = datetime.now().isoformat()
data['metadata']['last_updated'] = datetime.now().isoformat()

# Save
with open('sp500_complete.json', 'w') as f:
    json.dump(data, f, indent=2)

# Copy to React public folder
with open('sp500-react/public/data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Saved sp500_complete.json and sp500-react/public/data.json")

# Print sample
sample = data['companies'][0]
print(f"\nSample: {sample['name']} ({sample['symbol']})")
print(f"Price: ${sample.get('current_price')}, Rank: {sample['rank']}")
r = sample.get('returns', {})
print(f"Returns: 1W={r.get('1_week')}, 1M={r.get('1_month')}, 3M={r.get('3_month')}, YTD={r.get('ytd')}, 1Y={r.get('1_year')}")
