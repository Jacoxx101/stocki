import streamlit as st
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime

# Page config
st.set_page_config(
    page_title="S&P 500 Explorer - Ranks 100-500",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #666;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
    .company-card {
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        padding: 1.5rem;
        margin: 0.5rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .sector-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-right: 0.5rem;
    }
    .positive { color: #2ecc71; }
    .negative { color: #e74c3c; }
    .neutral { color: #95a5a6; }
</style>
""", unsafe_allow_html=True)

# Load data
@st.cache_data
def load_data():
    with open('sp500_ranked_100_500_FINAL.json', 'r') as f:
        data = json.load(f)
    return data

data = load_data()
companies = data['companies']
sector_summary = data['sector_summary']

# Create DataFrame for easier manipulation
df = pd.DataFrame([{
    'Rank': c['rank'],
    'Symbol': c['symbol'],
    'Name': c['name'],
    'Sector': c['sector'],
    'Sub-Industry': c['sub_industry'],
    'Market Cap ($B)': c['market_cap'] / 1e9,
    'Revenue ($B)': c['financials'].get('revenue', 0) / 1e9 if c['financials'].get('revenue') else 0,
    'P/E': c['financials'].get('pe_ratio'),
    'Profit Margin': c['financials'].get('profit_margin'),
    'ROE': c['financials'].get('return_on_equity'),
    'Revenue Growth': c['growth_data'].get('revenue_growth'),
    'Employees': c['company_details'].get('full_time_employees'),
    '1Y Return': c['historical_data'].get('one_year_return'),
    'YTD Return': c['historical_data'].get('ytd_return'),
    'Beta': c['financials'].get('beta'),
    'Dividend Yield': c['dividend_data'].get('dividend_yield'),
    'Price Target': c['growth_data'].get('target_mean_price'),
    'Current Price': c['stock_data'].get('current_price'),
    'Headquarters': c['headquarters'],
    'Founded': c['founded'],
} for c in companies])

# Sidebar
st.sidebar.markdown("## 📊 Navigation")
page = st.sidebar.radio("Go to", [
    "🏠 Dashboard",
    "🔍 Company Explorer", 
    "📋 Company Detail",
    "🏭 Sector Analysis",
    "⚖️ Comparison Tool"
])

st.sidebar.markdown("---")
st.sidebar.markdown(f"**Companies:** {len(companies)}")
st.sidebar.markdown(f"**Sectors:** {len(sector_summary)}")
st.sidebar.markdown(f"**Data Updated:** {data['metadata']['extraction_date'][:10]}")

# Helper functions
def format_number(num, suffix=''):
    if num is None:
        return 'N/A'
    if abs(num) >= 1e12:
        return f"${num/1e12:.2f}T{suffix}"
    elif abs(num) >= 1e9:
        return f"${num/1e9:.1f}B{suffix}"
    elif abs(num) >= 1e6:
        return f"${num/1e6:.1f}M{suffix}"
    else:
        return f"${num:,.0f}{suffix}"

def format_pct(val):
    if val is None:
        return 'N/A'
    return f"{val:.1%}"

def get_color_class(val):
    if val is None:
        return 'neutral'
    return 'positive' if val >= 0 else 'negative'

# ========== DASHBOARD ==========
if page == "🏠 Dashboard":
    st.markdown('<div class="main-header">S&P 500 Explorer</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Comprehensive data for companies ranked 100-500 by market cap</div>', unsafe_allow_html=True)
    
    # Top metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Companies", len(companies))
    with col2:
        total_mc = sum(c['market_cap'] for c in companies)
        st.metric("Total Market Cap", format_number(total_mc))
    with col3:
        avg_pe = df['P/E'].mean()
        st.metric("Avg P/E", f"{avg_pe:.1f}" if pd.notna(avg_pe) else "N/A")
    with col4:
        avg_ytd = df['YTD Return'].mean()
        st.metric("Avg YTD Return", format_pct(avg_ytd))
    with col5:
        avg_1y = df['1Y Return'].mean()
        st.metric("Avg 1Y Return", format_pct(avg_1y))
    
    st.markdown("---")
    
    # Sector distribution
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 Sector Distribution")
        sector_counts = df['Sector'].value_counts().reset_index()
        sector_counts.columns = ['Sector', 'Count']
        fig = px.pie(sector_counts, values='Count', names='Sector', 
                     hole=0.4, color_discrete_sequence=px.colors.qualitative.Set3)
        fig.update_traces(textposition='inside', textinfo='percent+label')
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("💰 Sector Market Cap")
        sector_mc = df.groupby('Sector')['Market Cap ($B)'].sum().reset_index()
        sector_mc = sector_mc.sort_values('Market Cap ($B)', ascending=True)
        fig = px.bar(sector_mc, x='Market Cap ($B)', y='Sector', orientation='h',
                     color='Market Cap ($B)', color_continuous_scale='Blues')
        fig.update_layout(height=400, yaxis_title="", xaxis_title="Market Cap ($B)")
        st.plotly_chart(fig, use_container_width=True)
    
    # Market cap distribution
    st.subheader("📈 Market Cap Distribution")
    fig = px.histogram(df, x='Market Cap ($B)', nbins=50, 
                       color='Sector', marginal="box",
                       title="Distribution of Market Caps")
    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)
    
    # Top performers
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🚀 Top 10 YTD Performers")
        top_ytd = df.nlargest(10, 'YTD Return')[['Rank', 'Symbol', 'Name', 'YTD Return', 'Sector']]
        top_ytd['YTD Return'] = top_ytd['YTD Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
        st.dataframe(top_ytd, use_container_width=True, hide_index=True)
    
    with col2:
        st.subheader("📉 Bottom 10 YTD Performers")
        bottom_ytd = df.nsmallest(10, 'YTD Return')[['Rank', 'Symbol', 'Name', 'YTD Return', 'Sector']]
        bottom_ytd['YTD Return'] = bottom_ytd['YTD Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
        st.dataframe(bottom_ytd, use_container_width=True, hide_index=True)
    
    # Largest companies
    st.subheader("🏢 Top 15 Largest Companies (Ranks 100-114)")
    top15 = df.head(15)[['Rank', 'Symbol', 'Name', 'Market Cap ($B)', 'Sector', 'P/E', 'YTD Return']]
    top15['P/E'] = top15['P/E'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else "N/A")
    top15['YTD Return'] = top15['YTD Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    st.dataframe(top15, use_container_width=True, hide_index=True)

# ========== COMPANY EXPLORER ==========
elif page == "🔍 Company Explorer":
    st.markdown('<div class="main-header">Company Explorer</div>', unsafe_allow_html=True)
    
    # Filters
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        search = st.text_input("🔍 Search", placeholder="Name or ticker...")
    with col2:
        sector_filter = st.multiselect("🏭 Sector", options=sorted(df['Sector'].unique()))
    with col3:
        min_mc = st.number_input("Min Market Cap ($B)", value=0.0, step=1.0)
    with col4:
        max_mc = st.number_input("Max Market Cap ($B)", value=1000.0, step=1.0)
    
    # Apply filters
    filtered = df.copy()
    if search:
        mask = filtered['Name'].str.contains(search, case=False, na=False) | \
               filtered['Symbol'].str.contains(search, case=False, na=False)
        filtered = filtered[mask]
    if sector_filter:
        filtered = filtered[filtered['Sector'].isin(sector_filter)]
    filtered = filtered[(filtered['Market Cap ($B)'] >= min_mc) & (filtered['Market Cap ($B)'] <= max_mc)]
    
    st.markdown(f"**Showing {len(filtered)} companies**")
    
    # Display as table
    display_cols = ['Rank', 'Symbol', 'Name', 'Sector', 'Market Cap ($B)', 'P/E', 
                    'Profit Margin', 'YTD Return', '1Y Return', 'Employees']
    display_df = filtered[display_cols].copy()
    
    # Format columns
    display_df['P/E'] = display_df['P/E'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else "N/A")
    display_df['Profit Margin'] = display_df['Profit Margin'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    display_df['YTD Return'] = display_df['YTD Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    display_df['1Y Return'] = display_df['1Y Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    display_df['Employees'] = display_df['Employees'].apply(lambda x: f"{x:,.0f}" if pd.notna(x) else "N/A")
    
    st.dataframe(display_df, use_container_width=True, hide_index=True)
    
    # Quick stats
    if len(filtered) > 0:
        st.markdown("---")
        st.subheader("📊 Filtered Statistics")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Avg Market Cap", f"${filtered['Market Cap ($B)'].mean():.1f}B")
        with col2:
            st.metric("Avg P/E", f"{filtered['P/E'].mean():.1f}")
        with col3:
            st.metric("Avg YTD Return", format_pct(filtered['YTD Return'].mean()))
        with col4:
            st.metric("Avg Revenue", f"${filtered['Revenue ($B)'].mean():.1f}B")

# ========== COMPANY DETAIL ==========
elif page == "📋 Company Detail":
    st.markdown('<div class="main-header">Company Detail</div>', unsafe_allow_html=True)
    
    # Company selector
    company_options = [f"{c['rank']}. {c['symbol']} - {c['name']}" for c in companies]
    selected = st.selectbox("Select a company", company_options)
    selected_symbol = selected.split(' - ')[0].split('. ')[1]
    
    company = next(c for c in companies if c['symbol'] == selected_symbol)
    
    # Header
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        st.markdown(f"## {company['name']} ({company['symbol']})")
        st.markdown(f"**Rank #{company['rank']}** | {company['sector']} | {company['sub_industry']}")
        st.markdown(f"📍 {company['headquarters']} | 🏛️ Founded {company['founded']}")
    with col2:
        st.metric("Market Cap", format_number(company['market_cap']))
    with col3:
        price = company['stock_data'].get('current_price')
        if price:
            st.metric("Stock Price", f"${price:.2f}")
    
    st.markdown("---")
    
    # Profile
    st.subheader("📝 Company Profile")
    st.write(company['profile']['description'])
    
    if company['profile'].get('website'):
        st.markdown(f"🌐 [Website]({company['profile']['website']})")
    
    # Key metrics
    st.subheader("📊 Key Metrics")
    col1, col2, col3, col4, col5, col6 = st.columns(6)
    
    with col1:
        rev = company['financials'].get('revenue')
        st.metric("Revenue", format_number(rev) if rev else "N/A")
    with col2:
        ebitda = company['financials'].get('ebitda')
        st.metric("EBITDA", format_number(ebitda) if ebitda else "N/A")
    with col3:
        pe = company['financials'].get('pe_ratio')
        st.metric("P/E Ratio", f"{pe:.1f}" if pe else "N/A")
    with col4:
        pm = company['financials'].get('profit_margin')
        st.metric("Profit Margin", format_pct(pm))
    with col5:
        roe = company['financials'].get('return_on_equity')
        st.metric("ROE", format_pct(roe))
    with col6:
        beta = company['financials'].get('beta')
        st.metric("Beta", f"{beta:.2f}" if beta else "N/A")
    
    # Historical performance
    st.subheader("📈 Historical Performance")
    hist = company.get('historical_data', {})
    if hist and 'one_year_return' in hist:
        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            ret = hist.get('one_year_return')
            st.metric("1Y Return", format_pct(ret))
        with col2:
            ytd = hist.get('ytd_return')
            st.metric("YTD Return", format_pct(ytd))
        with col3:
            vol = hist.get('volatility')
            st.metric("Volatility", f"{vol:.1%}" if vol else "N/A")
        with col4:
            sharpe = hist.get('sharpe_ratio')
            st.metric("Sharpe Ratio", f"{sharpe:.2f}" if sharpe else "N/A")
        with col5:
            avg_vol = hist.get('average_volume')
            st.metric("Avg Volume", f"{avg_vol:,.0f}" if avg_vol else "N/A")
    
    # Growth & Analysts
    st.subheader("📊 Growth & Analyst Data")
    growth = company.get('growth_data', {})
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        rg = growth.get('revenue_growth')
        st.metric("Revenue Growth", format_pct(rg))
    with col2:
        eg = growth.get('earnings_growth')
        st.metric("Earnings Growth", format_pct(eg))
    with col3:
        tp = growth.get('target_mean_price')
        st.metric("Price Target", f"${tp:.2f}" if tp else "N/A")
    with col4:
        rec = growth.get('recommendation_key')
        st.metric("Analyst Rating", rec if rec else "N/A")
    
    # Sector Rankings
    st.subheader("🏆 Sector Rankings")
    sr = company.get('sector_rankings', {})
    cols = st.columns(4)
    metrics = [
        ('Market Cap', 'market_cap_percentile'),
        ('Profit Margin', 'profit_margin_percentile'),
        ('Revenue Growth', 'revenue_growth_percentile'),
        ('YTD Return', 'ytd_return_percentile'),
        ('ROE', 'roe_percentile'),
        ('1Y Return', 'one_year_return_percentile'),
    ]
    for i, (label, key) in enumerate(metrics):
        with cols[i % 4]:
            val = sr.get(key)
            if val is not None:
                st.metric(f"{label} Percentile", f"{val:.0f}%")
            else:
                st.metric(f"{label} Percentile", "N/A")
    
    # Competitors
    st.subheader("⚔️ Competitors (Same Sub-Industry)")
    competitors = company.get('competitors', [])
    if competitors:
        comp_df = pd.DataFrame(competitors)
        st.dataframe(comp_df[['symbol', 'name', 'link']], use_container_width=True, hide_index=True)
    else:
        st.info("No direct competitors in S&P 500 for this sub-industry")
    
    # Related Companies
    st.subheader("🔗 Related Companies (Same Sector)")
    related = company.get('related_companies', [])
    if related:
        rel_df = pd.DataFrame(related)
        st.dataframe(rel_df[['symbol', 'name', 'link']], use_container_width=True, hide_index=True)
    
    # Recent News
    st.subheader("📰 Recent News")
    news = company.get('recent_news', [])
    if news and len(news) > 0 and news[0].get('title'):
        for article in news[:5]:
            with st.expander(f"{article.get('title', 'Untitled')[:100]}..."):
                st.write(article.get('summary', 'No summary'))
                st.markdown(f"**Publisher:** {article.get('publisher', 'Unknown')}")
                if article.get('link'):
                    st.markdown(f"[Read more]({article['link']})")
                if article.get('published'):
                    st.markdown(f"**Published:** {article['published']}")
    else:
        st.info("No recent news available")
    
    # Quarterly Financials
    st.subheader("📊 Quarterly Financials")
    qf = company.get('quarterly_financials', {})
    
    if 'income_statement' in qf and isinstance(qf['income_statement'], dict):
        quarters = list(qf['income_statement'].keys())[:4]
        if quarters and qf['income_statement'][quarters[0]] != {'error': 'No data'}:
            # Create comparison table
            inc_data = {}
            for q in quarters:
                qdata = qf['income_statement'][q]
                if isinstance(qdata, dict):
                    inc_data[q] = {
                        'Revenue': f"${qdata.get('total_revenue', 0)/1e9:.2f}B" if qdata.get('total_revenue') else 'N/A',
                        'Net Income': f"${qdata.get('net_income', 0)/1e9:.2f}B" if qdata.get('net_income') else 'N/A',
                        'EPS': f"${qdata.get('eps', 0):.2f}" if qdata.get('eps') else 'N/A',
                    }
            if inc_data:
                inc_df = pd.DataFrame(inc_data).T
                st.table(inc_df)

# ========== SECTOR ANALYSIS ==========
elif page == "🏭 Sector Analysis":
    st.markdown('<div class="main-header">Sector Analysis</div>', unsafe_allow_html=True)
    
    selected_sector = st.selectbox("Select a sector", sorted(df['Sector'].unique()))
    
    sector_df = df[df['Sector'] == selected_sector]
    sector_data = sector_summary.get(selected_sector, {})
    
    st.markdown(f"## {selected_sector}")
    st.markdown(f"**{len(sector_df)} companies** | Total Market Cap: ${sector_data.get('total_market_cap', 0)/1e9:.1f}B")
    
    # Sector averages
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Avg P/E", f"{sector_data.get('avg_pe_ratio', 0):.1f}" if sector_data.get('avg_pe_ratio') else "N/A")
    with col2:
        st.metric("Avg Profit Margin", format_pct(sector_data.get('avg_profit_margin')))
    with col3:
        st.metric("Avg ROE", format_pct(sector_data.get('avg_roe')))
    with col4:
        st.metric("Avg YTD Return", format_pct(sector_data.get('avg_ytd_return')))
    with col5:
        st.metric("Avg Beta", f"{sector_data.get('avg_beta', 0):.2f}" if sector_data.get('avg_beta') else "N/A")
    
    # Companies in sector
    st.subheader(f"📋 Companies in {selected_sector}")
    display = sector_df[['Rank', 'Symbol', 'Name', 'Market Cap ($B)', 'P/E', 'YTD Return', '1Y Return']].copy()
    display['P/E'] = display['P/E'].apply(lambda x: f"{x:.1f}" if pd.notna(x) else "N/A")
    display['YTD Return'] = display['YTD Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    display['1Y Return'] = display['1Y Return'].apply(lambda x: f"{x:.1%}" if pd.notna(x) else "N/A")
    st.dataframe(display, use_container_width=True, hide_index=True)
    
    # Sector charts
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("💰 Market Cap Distribution")
        fig = px.bar(sector_df.sort_values('Market Cap ($B)', ascending=True), 
                     x='Market Cap ($B)', y='Name', orientation='h',
                     color='Market Cap ($B)', color_continuous_scale='Blues')
        fig.update_layout(height=500, yaxis_title="", xaxis_title="Market Cap ($B)")
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("📈 P/E vs YTD Return")
        fig = px.scatter(sector_df, x='P/E', y='YTD Return', 
                         size='Market Cap ($B)', hover_data=['Symbol', 'Name'],
                         color='Sub-Industry')
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
    
    # Sub-industry breakdown
    st.subheader("🏭 Sub-Industry Breakdown")
    sub_df = sector_df.groupby('Sub-Industry').agg({
        'Symbol': 'count',
        'Market Cap ($B)': 'sum'
    }).reset_index()
    sub_df.columns = ['Sub-Industry', 'Companies', 'Total Market Cap ($B)']
    sub_df = sub_df.sort_values('Total Market Cap ($B)', ascending=False)
    st.dataframe(sub_df, use_container_width=True, hide_index=True)

# ========== COMPARISON TOOL ==========
elif page == "⚖️ Comparison Tool":
    st.markdown('<div class="main-header">Comparison Tool</div>', unsafe_allow_html=True)
    
    selected_symbols = st.multiselect(
        "Select companies to compare (2-5)",
        options=[c['symbol'] for c in companies],
        format_func=lambda x: f"{x} - {next(c['name'] for c in companies if c['symbol'] == x)}",
        max_selections=5
    )
    
    if len(selected_symbols) >= 2:
        compare_df = df[df['Symbol'].isin(selected_symbols)].copy()
        
        # Comparison table
        st.subheader("📊 Side-by-Side Comparison")
        
        metrics = ['Market Cap ($B)', 'Revenue ($B)', 'P/E', 'Profit Margin', 
                   'ROE', 'Revenue Growth', 'YTD Return', '1Y Return', 
                   'Beta', 'Dividend Yield', 'Employees', 'Price Target']
        
        compare_table = compare_df[['Symbol', 'Name'] + metrics].set_index('Symbol').T
        compare_table.columns = [f"{sym}" for sym in compare_table.columns]
        
        # Format
        for col in compare_table.columns:
            for idx in compare_table.index:
                val = compare_table.loc[idx, col]
                if pd.isna(val):
                    compare_table.loc[idx, col] = "N/A"
                elif idx in ['Profit Margin', 'ROE', 'Revenue Growth', 'YTD Return', '1Y Return', 'Dividend Yield']:
                    compare_table.loc[idx, col] = f"{val:.1%}"
                elif idx in ['Market Cap ($B)', 'Revenue ($B)', 'Price Target']:
                    compare_table.loc[idx, col] = f"${val:.1f}B" if val > 1 else f"${val:.2f}"
                elif idx == 'Employees':
                    compare_table.loc[idx, col] = f"{val:,.0f}"
                elif idx == 'P/E':
                    compare_table.loc[idx, col] = f"{val:.1f}"
                elif idx == 'Beta':
                    compare_table.loc[idx, col] = f"{val:.2f}"
        
        st.table(compare_table)
        
        # Radar chart
        st.subheader("📈 Performance Radar")
        
        # Normalize metrics for radar chart
        radar_metrics = ['Profit Margin', 'Revenue Growth', 'YTD Return', 'ROE']
        radar_df = compare_df[['Symbol'] + radar_metrics].copy()
        
        for metric in radar_metrics:
            max_val = radar_df[metric].max()
            min_val = radar_df[metric].min()
            if max_val != min_val:
                radar_df[metric] = (radar_df[metric] - min_val) / (max_val - min_val)
            else:
                radar_df[metric] = 0.5
        
        fig = go.Figure()
        for _, row in radar_df.iterrows():
            fig.add_trace(go.Scatterpolar(
                r=[row[m] for m in radar_metrics] + [row[radar_metrics[0]]],
                theta=radar_metrics + [radar_metrics[0]],
                fill='toself',
                name=row['Symbol']
            ))
        
        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
            showlegend=True,
            height=500
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Bar chart comparison
        st.subheader("📊 Metric Comparison")
        metric_to_chart = st.selectbox("Select metric", ['Market Cap ($B)', 'Revenue ($B)', 'P/E', 'YTD Return', '1Y Return'])
        
        fig = px.bar(compare_df, x='Symbol', y=metric_to_chart, 
                     color='Symbol', text_auto='.1f')
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Please select at least 2 companies to compare")