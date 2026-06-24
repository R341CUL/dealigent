"""
Yahoo Finance agent — improved ticker detection + confidence levels + source tracking.
"""
import yfinance as yf
import asyncio
from datetime import datetime
from typing import Optional


def _crore(val): return round(val / 1e7, 1) if val else None
def _million(val): return round(val / 1e6, 1) if val else None


def _search_ticker(company_name: str) -> list[tuple[str, str]]:
    """Use yfinance.Search to find best tickers for a company."""
    try:
        results = yf.Search(company_name, max_results=5).quotes
        return [(q.get('symbol', ''), q.get('exchange', '')) for q in results if q.get('symbol')]
    except Exception:
        return []


def _build_ticker_candidates(profile: dict, company_name: str, country: str) -> list[tuple[str, str, str]]:
    """Return ordered list of (ticker, exchange, source) to try."""
    candidates = []
    c = country.lower()

    # 1. Profile agent suggestions (highest priority)
    if profile.get('ticker_nse'):
        t = profile['ticker_nse']
        candidates.append((f"{t}.NS", 'NSE', 'profile_agent'))
        candidates.append((f"{t}.BO", 'BSE', 'profile_agent'))
    if profile.get('ticker_bse'):
        t = profile['ticker_bse']
        candidates.append((f"{t}.BO", 'BSE', 'profile_agent'))
        candidates.append((f"{t}.NS", 'NSE', 'profile_agent'))
    if profile.get('ticker_global'):
        candidates.append((profile['ticker_global'], 'Global', 'profile_agent'))

    # 2. yfinance.Search results
    search_hits = _search_ticker(company_name)
    for sym, exch in search_hits:
        candidates.append((sym, exch, 'yfinance_search'))

    # 3. Common name-based patterns for India
    if c in ['india', 'in']:
        import re
        clean = re.sub(r'[^A-Z0-9]', '', company_name.upper().split()[0])[:12]
        candidates.append((f"{clean}.NS", 'NSE', 'name_pattern'))
        candidates.append((f"{clean}.BO", 'BSE', 'name_pattern'))

    return candidates


def _fetch_ticker(ticker_str: str) -> Optional[dict]:
    try:
        t = yf.Ticker(ticker_str)
        info = t.info
        price = info.get('currentPrice') or info.get('regularMarketPrice')
        if not price:
            return None

        is_inr  = info.get('currency', 'USD') == 'INR'
        convert = _crore if is_inr else _million
        unit    = 'Cr' if is_inr else 'M'
        curr    = info.get('currency', 'USD')

        rev     = info.get('totalRevenue')
        ebitda  = info.get('ebitda')
        net_inc = info.get('netIncomeToCommon')
        gp      = info.get('grossProfits')
        mktcap  = info.get('marketCap')

        # News
        news = []
        try:
            for n in (t.news or [])[:6]:
                news.append({
                    'title':     n.get('title', ''),
                    'publisher': n.get('publisher', ''),
                    'date':      datetime.fromtimestamp(n.get('providerPublishTime', 0)).strftime('%Y-%m-%d') if n.get('providerPublishTime') else '',
                    'url':       n.get('link', ''),
                })
        except Exception:
            pass

        gm  = info.get('grossMargins')
        om  = info.get('operatingMargins')
        npm = info.get('profitMargins')
        roe = info.get('returnOnEquity')
        pe  = info.get('trailingPE') or info.get('forwardPE')
        ev_rev  = info.get('enterpriseToRevenue')
        ev_ebit = info.get('enterpriseToEbitda')
        de_raw  = info.get('debtToEquity')   # yfinance reports this as a percentage
        de      = de_raw / 100 if de_raw else None
        cr      = info.get('currentRatio')
        rev_g   = info.get('revenueGrowth')
        earn_g  = info.get('earningsGrowth')

        return {
            'source':           'Yahoo Finance (live)',
            'source_url':       f'https://finance.yahoo.com/quote/{ticker_str}',
            'confidence':       'HIGH',
            'confidence_note':  f'Live data from Yahoo Finance ticker {ticker_str}',
            'found':            True,
            'ticker':           ticker_str,
            'exchange':         info.get('exchange', ''),
            'currency':         curr,
            'revenue_unit':     unit,
            'data_timestamp':   datetime.utcnow().isoformat() + 'Z',

            # Company
            'company_name': info.get('longName') or info.get('shortName', ''),
            'sector':       info.get('sector', ''),
            'industry':     info.get('industry', ''),
            'employees':    info.get('fullTimeEmployees'),
            'website':      info.get('website', ''),
            'description':  info.get('longBusinessSummary', ''),
            'hq_city':      info.get('city', ''),
            'hq_country':   info.get('country', ''),

            # Financials with confidence
            'revenue':       convert(rev),
            'revenue_conf':  'HIGH' if rev else 'N/A',
            'ebitda':        convert(ebitda),
            'ebitda_conf':   'HIGH' if ebitda else 'N/A',
            'net_income':    convert(net_inc),
            'net_income_conf': 'HIGH' if net_inc else 'N/A',
            'gross_profit':  convert(gp),
            'market_cap':    convert(mktcap),
            'market_cap_conf': 'HIGH' if mktcap else 'N/A',

            # Margins
            'gross_margin':     round(gm * 100, 1)  if gm  else None,
            'operating_margin': round(om * 100, 1)  if om  else None,
            'net_margin':       round(npm * 100, 1) if npm else None,
            'roe':              round(roe * 100, 1) if roe else None,
            'pe_ratio':         round(pe, 1)         if pe  else None,
            'ev_revenue':       round(ev_rev, 2)    if ev_rev  else None,
            'ev_ebitda':        round(ev_ebit, 2)   if ev_ebit else None,
            'debt_to_equity':   round(de, 2)        if de  else None,
            'current_ratio':    round(cr, 2)        if cr  else None,
            'revenue_growth':   round(rev_g * 100, 1)  if rev_g  else None,
            'earnings_growth':  round(earn_g * 100, 1) if earn_g else None,

            # Price
            'stock_price': price,
            'week52_high': info.get('fiftyTwoWeekHigh'),
            'week52_low':  info.get('fiftyTwoWeekLow'),

            'news': news,

            # Data sources list for UI
            'data_sources': [
                {'field': 'Revenue',      'source': 'Yahoo Finance',   'url': f'https://finance.yahoo.com/quote/{ticker_str}/financials',   'confidence': 'HIGH' if rev    else 'N/A'},
                {'field': 'Market Cap',   'source': 'Yahoo Finance',   'url': f'https://finance.yahoo.com/quote/{ticker_str}',              'confidence': 'HIGH' if mktcap else 'N/A'},
                {'field': 'EBITDA',       'source': 'Yahoo Finance',   'url': f'https://finance.yahoo.com/quote/{ticker_str}/financials',   'confidence': 'HIGH' if ebitda else 'N/A'},
                {'field': 'Stock Price',  'source': 'Yahoo Finance',   'url': f'https://finance.yahoo.com/quote/{ticker_str}',              'confidence': 'HIGH'},
                {'field': 'Margins',      'source': 'Yahoo Finance',   'url': f'https://finance.yahoo.com/quote/{ticker_str}/financials',   'confidence': 'HIGH' if gm else 'MEDIUM'},
            ],
        }
    except Exception:
        return None


async def run_yfinance_agent(profile: dict, company_name: str = '', country: str = '') -> dict:
    """Fetch real financial data — tries multiple ticker formats in order."""
    cn = company_name or profile.get('company_name', '')
    ct = country     or profile.get('hq', '')

    candidates = _build_ticker_candidates(profile, cn, ct)

    loop = asyncio.get_event_loop()

    seen = set()
    for ticker_str, exchange, source in candidates:
        if ticker_str in seen:
            continue
        seen.add(ticker_str)

        result = await loop.run_in_executor(None, _fetch_ticker, ticker_str)
        if result:
            result['ticker_source'] = source
            return result

    return {
        'source':      'yfinance',
        'source_url':  'https://finance.yahoo.com',
        'confidence':  'LOW',
        'confidence_note': 'No valid ticker found — metrics estimated by AI agent',
        'found':       False,
        'error':       f'No live data found for "{cn}" after trying {len(seen)} ticker(s)',
        'tickers_tried': list(seen),
        'data_sources': [],
    }
