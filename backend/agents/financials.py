"""
Real financial statement extractor + sector-aware valuation.
Source of truth: Yahoo Finance via yfinance (income statement, balance sheet, .info).
NO AI estimation of numbers — every figure is pulled live.
"""
import yfinance as yf
import asyncio
from datetime import datetime


# ── Sector-appropriate valuation multiples (EV/EBITDA, EV/Revenue) ──
# Mid-points reflect typical M&A ranges by industry.
SECTOR_MULTIPLES = {
    "steel":          {"ev_ebitda": (5, 8, 10),  "ev_rev": (0.5, 0.9, 1.5),  "label": "Steel & Metals"},
    "basic materials":{"ev_ebitda": (5, 8, 10),  "ev_rev": (0.5, 0.9, 1.5),  "label": "Basic Materials"},
    "metals":         {"ev_ebitda": (5, 8, 10),  "ev_rev": (0.5, 0.9, 1.5),  "label": "Metals"},
    "manufacturing":  {"ev_ebitda": (6, 9, 12),  "ev_rev": (0.8, 1.3, 2.0),  "label": "Manufacturing"},
    "industrials":    {"ev_ebitda": (7, 10, 13), "ev_rev": (1.0, 1.6, 2.5),  "label": "Industrials"},
    "software":       {"ev_ebitda": (20, 30, 40),"ev_rev": (5, 9, 14),       "label": "Software / SaaS"},
    "technology":     {"ev_ebitda": (15, 25, 35),"ev_rev": (4, 7, 12),       "label": "Technology"},
    "saas":           {"ev_ebitda": (20, 30, 40),"ev_rev": (6, 10, 14),      "label": "SaaS"},
    "healthcare":     {"ev_ebitda": (12, 16, 22),"ev_rev": (3, 5, 8),        "label": "Healthcare"},
    "pharmaceutical": {"ev_ebitda": (12, 17, 23),"ev_rev": (3, 5, 9),        "label": "Pharmaceuticals"},
    "consumer":       {"ev_ebitda": (10, 14, 18),"ev_rev": (1.5, 2.5, 4),    "label": "Consumer"},
    "retail":         {"ev_ebitda": (7, 10, 14), "ev_rev": (0.6, 1.0, 1.8),  "label": "Retail"},
    "energy":         {"ev_ebitda": (4, 6, 9),   "ev_rev": (0.7, 1.2, 2.0),  "label": "Energy"},
    "financial":      {"ev_ebitda": (8, 11, 14), "ev_rev": (2, 3, 5),        "label": "Financial Services"},
    "logistics":      {"ev_ebitda": (7, 10, 13), "ev_rev": (1.0, 1.6, 2.5),  "label": "Logistics"},
    "default":        {"ev_ebitda": (7, 10, 13), "ev_rev": (1.2, 2.0, 3.0),  "label": "Diversified"},
}


def _resolve_multiples(sector: str, industry: str) -> dict:
    blob = f"{sector} {industry}".lower()
    for key, mult in SECTOR_MULTIPLES.items():
        if key in blob:
            return mult
    return SECTOR_MULTIPLES["default"]


def _conv(val, is_inr):
    """Convert raw value to Cr (INR) or M (other). Returns native float."""
    if val is None or val != val:  # NaN check
        return None
    return float(round(val / 1e7, 1)) if is_inr else float(round(val / 1e6, 1))


def _safe_row(df, row, col_idx):
    try:
        if row in df.index:
            v = df.loc[row].iloc[col_idx]
            return v if v == v else None  # NaN -> None
    except Exception:
        pass
    return None


def _fetch(ticker_str: str) -> dict | None:
    try:
        t = yf.Ticker(ticker_str)
        info = t.info
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not price:
            return None

        currency = info.get("currency", "USD")
        # yfinance reports LSE quote currency as GBp (pence) while the financial
        # statements are in GBP (pounds) — normalise the label to avoid mixed/odd currency.
        if currency in ("GBp", "GBX"):
            currency = "GBP"
        is_inr   = currency == "INR"
        unit     = "Cr" if is_inr else "M"
        conv     = lambda v: _conv(v, is_inr)

        # ── Income statement (real, multi-year) ──
        inc = t.income_stmt
        pl_years = []
        if inc is not None and not inc.empty:
            for i, col in enumerate(inc.columns):
                fy = col.year if hasattr(col, "year") else int(str(col)[:4])
                rev = _safe_row(inc, "Total Revenue", i)
                if rev is None:
                    continue
                pl_years.append({
                    "fy":           fy,
                    "label":        f"FY{fy}",
                    "revenue":      conv(rev),
                    "gross_profit": conv(_safe_row(inc, "Gross Profit", i)),
                    "ebitda":       conv(_safe_row(inc, "EBITDA", i)),
                    "ebit":         conv(_safe_row(inc, "EBIT", i) or _safe_row(inc, "Operating Income", i)),
                    "net_income":   conv(_safe_row(inc, "Net Income", i)),
                    "eps":          (lambda e: float(round(e, 2)) if e is not None else None)(_safe_row(inc, "Basic EPS", i)),
                })
        pl_years = sorted(pl_years, key=lambda x: x["fy"])  # ascending

        # ── Balance sheet ──
        bs = t.balance_sheet
        total_debt = _safe_row(bs, "Total Debt", 0)
        equity     = _safe_row(bs, "Stockholders Equity", 0) or _safe_row(bs, "Common Stock Equity", 0)

        # ── Valuation inputs (real) ──
        mktcap = info.get("marketCap")
        ev     = info.get("enterpriseValue")
        ev_ebitda = info.get("enterpriseToEbitda")
        ev_rev    = info.get("enterpriseToRevenue")
        pe        = info.get("trailingPE")
        pb        = info.get("priceToBook")
        de_raw    = info.get("debtToEquity")  # reported as PERCENT by yfinance
        de        = round(de_raw / 100, 2) if de_raw else (round(total_debt/equity, 2) if total_debt and equity else None)
        rev_growth= info.get("revenueGrowth")
        gm        = info.get("grossMargins")
        om        = info.get("operatingMargins")
        npm       = info.get("profitMargins")
        roe       = info.get("returnOnEquity")
        cur_ratio = info.get("currentRatio")

        # latest TTM figures from pl
        latest = pl_years[-1] if pl_years else {}

        return {
            "found":       True,
            "confidence":  "HIGH",
            "source":      "Yahoo Finance (live)",
            "source_url":  f"https://finance.yahoo.com/quote/{ticker_str}/financials",
            "ticker":      ticker_str,
            "exchange":    info.get("exchange", ""),
            "currency":    currency,
            "unit":        unit,
            "data_timestamp": datetime.utcnow().isoformat() + "Z",

            "company_name": info.get("longName") or info.get("shortName", ""),
            "sector":       info.get("sector", ""),
            "industry":     info.get("industry", ""),
            "employees":    info.get("fullTimeEmployees"),
            "website":      info.get("website", ""),
            "description":  info.get("longBusinessSummary", ""),

            # Real multi-year P&L
            "pl_years":     pl_years,

            # Real valuation inputs
            "market_cap":     conv(mktcap),
            "enterprise_value": conv(ev),
            "stock_price":    round(price, 2),
            "shares_out":     info.get("sharesOutstanding"),
            "total_debt":     conv(total_debt),
            "total_cash":     conv(info.get("totalCash")),
            "equity":         conv(equity),

            # Real ratios
            "ev_ebitda":      round(ev_ebitda, 2) if ev_ebitda else None,
            "ev_revenue":     round(ev_rev, 2) if ev_rev else None,
            "pe_ratio":       round(pe, 2) if pe else None,
            "pb_ratio":       round(pb, 2) if pb else None,
            "debt_to_equity": de,
            "current_ratio":  round(cur_ratio, 2) if cur_ratio else None,
            "revenue_growth": round(rev_growth * 100, 1) if rev_growth else None,
            "gross_margin":   round(gm * 100, 1) if gm else None,
            "operating_margin": round(om * 100, 1) if om else None,
            "net_margin":     round(npm * 100, 1) if npm else None,
            "roe":            round(roe * 100, 1) if roe else None,

            "latest_revenue": latest.get("revenue"),
            "latest_ebitda":  latest.get("ebitda"),
            "latest_net_income": latest.get("net_income"),

            # Real executives from Yahoo
            "officers": [
                {
                    "name":  o.get("name", ""),
                    "title": o.get("title", ""),
                    "age":   o.get("age"),
                    "pay":   _conv(o.get("totalPay"), is_inr) if o.get("totalPay") else None,
                }
                for o in (info.get("companyOfficers", []) or [])[:8]
            ],
        }
    except Exception:
        return None


def _build_ticker_list(profile_or_ticker, company, country) -> list[str]:
    candidates = []
    if isinstance(profile_or_ticker, str) and profile_or_ticker:
        candidates.append(profile_or_ticker)
    # yfinance search
    try:
        for q in yf.Search(company, max_results=5).quotes:
            if q.get("symbol"):
                candidates.append(q["symbol"])
    except Exception:
        pass
    # India name pattern
    if country and country.lower() in ["india", "in"]:
        import re
        clean = re.sub(r"[^A-Z0-9]", "", (company or "").upper().split()[0])[:12] if company else ""
        if clean:
            candidates += [f"{clean}.NS", f"{clean}.BO"]
    # dedupe preserve order
    seen, out = set(), []
    for c in candidates:
        if c and c not in seen:
            seen.add(c); out.append(c)
    return out


# ── Known public sector peers for benchmarking when target is private ──
SECTOR_PEERS = {
    "steel":          ["SAIL.NS", "JSW.NS", "TATASTEEL.NS", "X", "NUE"],
    "basic materials":["LIN", "APD", "ECL", "SHW"],
    "metals":         ["TATASTEEL.NS", "SAIL.NS", "AA", "FCX", "NUE"],
    "manufacturing":  ["MMM", "HON", "GE", "EMR", "ROK"],
    "industrials":    ["HON", "GE", "MMM", "UNP", "UPS"],
    "software":       ["MSFT", "CRM", "ADBE", "NOW", "WDAY"],
    "technology":     ["AAPL", "MSFT", "GOOGL", "META", "NVDA"],
    "saas":           ["CRM", "NOW", "WDAY", "ADBE", "HubSpot"],
    "healthcare":     ["JNJ", "UNH", "PFE", "ABBV", "MRK"],
    "pharmaceutical": ["PFE", "ABBV", "MRK", "LLY", "BMY"],
    "consumer":       ["PG", "KO", "PEP", "MDLZ", "CL"],
    "retail":         ["WMT", "TGT", "AMZN", "COST", "HD"],
    "energy":         ["XOM", "CVX", "COP", "SLB", "EOG"],
    "financial":      ["JPM", "BAC", "GS", "MS", "WFC"],
    "logistics":      ["UPS", "FDX", "CHRW", "EXPD", "XPO"],
    "hr technology":  ["WDAY", "ADP", "PAYC", "PCTY", "UKG"],
    "fintech":        ["SQ", "PYPL", "V", "MA", "ADYEY"],
}


def _get_sector_peers(sector: str) -> list[str]:
    blob = sector.lower()
    for key, tickers in SECTOR_PEERS.items():
        if key in blob:
            return tickers[:3]
    return []


def _fetch_peer_summary(ticker_str: str) -> dict | None:
    """Fetch minimal peer metrics for benchmarking."""
    try:
        t = yf.Ticker(ticker_str)
        info = t.info
        name = info.get("shortName") or info.get("longName", ticker_str)
        ev_ebitda = info.get("enterpriseToEbitda")
        ev_rev = info.get("enterpriseToRevenue")
        pe = info.get("trailingPE")
        gm = info.get("grossMargins")
        om = info.get("operatingMargins")
        mktcap = info.get("marketCap")
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        if not price:
            return None
        currency = info.get("currency", "USD")
        if currency in ("GBp", "GBX"):
            currency = "GBP"
        is_inr = currency == "INR"
        conv = lambda v: _conv(v, is_inr)
        return {
            "ticker": ticker_str,
            "name": name,
            "market_cap": conv(mktcap),
            "ev_ebitda": round(ev_ebitda, 1) if ev_ebitda else None,
            "ev_revenue": round(ev_rev, 2) if ev_rev else None,
            "pe_ratio": round(pe, 1) if pe else None,
            "gross_margin": round(gm * 100, 1) if gm else None,
            "operating_margin": round(om * 100, 1) if om else None,
            "currency": currency,
        }
    except Exception:
        return None


async def fetch_sector_peers(sector: str, exclude_ticker: str = "") -> list[dict]:
    """Return up to 3 public sector peers with real market data for benchmarking."""
    tickers = _get_sector_peers(sector)
    if not tickers:
        return []
    loop = asyncio.get_event_loop()
    peers = []
    for tk in tickers:
        if tk == exclude_ticker:
            continue
        p = await loop.run_in_executor(None, _fetch_peer_summary, tk)
        if p:
            peers.append(p)
        if len(peers) >= 3:
            break
    return peers


async def fetch_real_financials(ticker: str = "", company: str = "", country: str = "") -> dict:
    """Try tickers in order, return first with real data."""
    loop = asyncio.get_event_loop()
    for tk in _build_ticker_list(ticker, company, country):
        result = await loop.run_in_executor(None, _fetch, tk)
        if result and result.get("found"):
            return result
    return {"found": False, "confidence": "LOW", "source": "No live source matched",
            "error": f"No Yahoo Finance data for '{company or ticker}'", "pl_years": []}


def _is_financial(sector: str, industry: str) -> bool:
    blob = f"{sector} {industry}".lower()
    return any(k in blob for k in ["bank", "financial", "insurance", "capital markets", "asset management", "diversified financ"])


def compute_valuation(fin: dict, deal_value_entered: float | None = None) -> dict:
    """
    Sector-aware valuation from REAL data. No fabrication.
    Banks/financials are valued on EQUITY value (market cap × P/B-style premium),
    NOT EV/EBITDA — for a bank, Enterprise Value is meaningless/negative because
    deposits are counted as debt. Industrials/tech use EV-based multiples.
    """
    if not fin.get("found"):
        return {"available": False}

    sector, industry = fin.get("sector", ""), fin.get("industry", "")
    mult = _resolve_multiples(sector, industry)
    ebitda  = fin.get("latest_ebitda")
    revenue = fin.get("latest_revenue")
    actual_ev = fin.get("enterprise_value")
    market_cap = fin.get("market_cap")
    unit = fin.get("unit", "M")
    cur  = fin.get("currency", "USD")
    is_fin = _is_financial(sector, industry)

    lo_m, mid_m, hi_m = mult["ev_ebitda"]
    lo_r, mid_r, hi_r = mult["ev_rev"]

    # ── Financial-sector path: equity value, not EV ──
    if is_fin or (actual_ev is not None and actual_ev < 0):
        base = float(market_cap) if market_cap and market_cap > 0 else None
        ev_from_ebitda = {"low": None, "base": None, "high": None}
        ev_from_rev    = {"low": None, "base": None, "high": None}
        if base:
            # Equity value range from P/B sentiment: discount / current / control
            ev_from_ebitda = {"low": float(round(base * 0.85, 1)), "base": base, "high": float(round(base * 1.25, 1))}
        standalone_ev = base
        control_premium = float(round(base * 0.25, 1)) if base else None  # take-private control premium
        rev_syn = cost_syn = None  # synergy modelling N/A for a bank acquisition at this level
        fair_offer = float(round(base * 1.25, 1)) if base else None  # equity value + 25% control premium
        basis = "equity value (market cap) + 25% control premium — EV/EBITDA does not apply to financial institutions"
        valuation_mode = "equity"
    else:
        # ── Industrial/tech path: EV-based ──
        ev_from_ebitda = {k: float(round(ebitda * m, 1)) if ebitda else None for k, m in [("low", lo_m), ("base", mid_m), ("high", hi_m)]}
        ev_from_rev    = {k: float(round(revenue * m, 1)) if revenue else None for k, m in [("low", lo_r), ("base", mid_r), ("high", hi_r)]}
        standalone_ev = actual_ev if (actual_ev and actual_ev > 0) else (ev_from_ebitda.get("base") or ev_from_rev.get("base"))
        standalone_ev = float(standalone_ev) if standalone_ev else None
        control_premium = float(round(standalone_ev * 0.25, 1)) if standalone_ev else None
        rev_syn  = float(round(standalone_ev * 0.06, 1)) if standalone_ev else None
        cost_syn = float(round(standalone_ev * 0.05, 1)) if standalone_ev else None
        fair_offer = float(round(sum(x for x in [standalone_ev, control_premium, rev_syn, cost_syn] if x), 1)) if standalone_ev else None
        basis = f"standalone EV + synergies + 25% control premium, on {mult['label']} multiples"
        valuation_mode = "enterprise"

    # Deal value sanity check (only when we have a positive fair offer)
    overpay_flag = None
    base_label = "equity value" if valuation_mode == "equity" else "enterprise value"
    if deal_value_entered and fair_offer and fair_offer > 0:
        ratio = deal_value_entered / fair_offer
        if ratio > 1.5:
            overpay_flag = {
                "severity": "high",
                "title": "Deal value exceeds fundamental valuation",
                "detail": f"Entered deal value ({cur} {deal_value_entered}{unit}) is {ratio:.1f}x the fair offer ({cur} {fair_offer}{unit}), derived from {basis}. Verify rationale — likely overpayment.",
            }
        elif ratio < 0.6:
            overpay_flag = {
                "severity": "medium",
                "title": "Deal value below fair valuation",
                "detail": f"Entered deal value ({cur} {deal_value_entered}{unit}) is {ratio:.1f}x the fair offer ({cur} {fair_offer}{unit}, {base_label}-based). Potential value opportunity or distressed signal.",
            }

    return {
        "available":       True,
        "valuation_mode":  valuation_mode,          # "equity" (financials) or "enterprise"
        "basis":           basis,
        "sector_label":    mult["label"],
        "ev_ebitda_range": mult["ev_ebitda"],
        "ev_rev_range":    mult["ev_rev"],
        "actual_ev":       actual_ev,
        "actual_ev_ebitda": fin.get("ev_ebitda"),
        "actual_ev_rev":   fin.get("ev_revenue"),
        "ev_from_ebitda":  ev_from_ebitda,
        "ev_from_revenue": ev_from_rev,
        "standalone_ev":   standalone_ev,
        "control_premium": control_premium,
        "revenue_synergies": rev_syn,
        "cost_synergies":  cost_syn,
        "fair_offer":      fair_offer,
        "deal_value_entered": deal_value_entered,
        "overpay_flag":    overpay_flag,
        "unit":            unit,
        "currency":        cur,
    }
