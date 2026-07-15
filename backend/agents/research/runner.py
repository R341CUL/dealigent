"""
Research orchestrator — runs all 4 research agents and streams SSE events.
Sequence: profile (Groq) → financials (yfinance) → market + news (parallel)
All results seed ChromaDB for DD agents.
"""
import asyncio
import json
from groq import AsyncGroq
from agents.research.profile_agent   import run_profile_agent
from agents.research.yfinance_agent  import run_yfinance_agent
from agents.research.market_agent    import run_market_agent
from agents.research.news_agent      import run_news_agent
from agents.rag import get_chroma
from core.config import settings


def _seed_research_to_chroma(company_name: str, profile: dict, financials: dict, market: dict, news_data: dict):
    """Seed all research findings into ChromaDB for DD agents to use."""
    col = get_chroma()
    deal_id = company_name.lower().replace(" ", "_")[:20]

    docs = []

    # Profile doc
    docs.append({
        "id": f"{deal_id}_profile",
        "pillar": "all",
        "text": f"""COMPANY PROFILE — {profile.get('company_name', company_name)}
Sector: {profile.get('sector')} | Sub-sector: {profile.get('sub_sector')}
HQ: {profile.get('hq')} | Founded: {profile.get('founded')} | Employees: {profile.get('employees_estimate')}
Description: {profile.get('description')}
Deal Rationale: {profile.get('deal_rationale')}""",
    })

    # Financials doc
    if financials.get("found"):
        unit = financials.get("revenue_unit", "M")
        curr = financials.get("currency", "USD")
        docs.append({
            "id": f"{deal_id}_financials",
            "pillar": "financial",
            "text": f"""FINANCIAL DATA (Yahoo Finance Live) — {company_name}
Ticker: {financials.get('ticker')} | Exchange: {financials.get('exchange')}
Revenue: {financials.get('revenue')} {unit} {curr} | EBITDA: {financials.get('ebitda')} {unit}
Net Income: {financials.get('net_income')} {unit} | Market Cap: {financials.get('market_cap')} {unit}
Gross Margin: {financials.get('gross_margin')}% | Operating Margin: {financials.get('operating_margin')}% | Net Margin: {financials.get('net_margin')}%
P/E Ratio: {financials.get('pe_ratio')} | EV/Revenue: {financials.get('ev_revenue')}x | EV/EBITDA: {financials.get('ev_ebitda')}x
Debt/Equity: {financials.get('debt_to_equity')} | Current Ratio: {financials.get('current_ratio')}
Revenue Growth: {financials.get('revenue_growth')}% | Earnings Growth: {financials.get('earnings_growth')}%
Stock: {financials.get('stock_price')} | 52W High: {financials.get('week52_high')} | 52W Low: {financials.get('week52_low')}
Industry: {financials.get('industry')} | ROE: {financials.get('roe')}%""",
        })

    # Market doc
    if market:
        competitors = " | ".join([c.get("name", "") for c in market.get("key_competitors", [])[:5]])
        docs.append({
            "id": f"{deal_id}_market",
            "pillar": "commercial",
            "text": f"""MARKET INTELLIGENCE — {company_name}
Market Size: {market.get('market_size')} | Growth: {market.get('market_growth')}
Market Position: {market.get('market_position')}
Key Competitors: {competitors}
Competitive Advantages: {' | '.join(market.get('competitive_advantages', []))}
Market Risks: {' | '.join(market.get('market_risks', []))}
Industry Trends: {' | '.join(market.get('industry_trends', []))}
Regulatory Environment: {market.get('regulatory_environment')}
Outlook: {market.get('market_outlook')}""",
        })

        docs.append({
            "id": f"{deal_id}_competitors",
            "pillar": "commercial",
            "text": "COMPETITIVE LANDSCAPE — " + company_name + "\n" +
                "\n".join([f"- {c['name']}: {c.get('description', '')}" for c in market.get("key_competitors", [])]),
        })

    # News doc
    if news_data:
        news_headlines = "\n".join([
            f"- {n.get('date', '')} {n.get('title', '')} ({n.get('publisher', '')})"
            for n in news_data.get("news_items", [])[:6]
        ])
        docs.append({
            "id": f"{deal_id}_news",
            "pillar": "commercial",
            "text": f"""NEWS & SENTIMENT — {company_name}
Sentiment: {news_data.get('overall_sentiment')} (score: {news_data.get('sentiment_score')})
Key Themes: {' | '.join(news_data.get('key_themes', []))}
Positive Signals: {' | '.join(news_data.get('positive_signals', []))}
Red Flags from News: {' | '.join(news_data.get('red_flags_from_news', []))}
Analyst Narrative: {news_data.get('analyst_narrative')}
Recent Headlines:
{news_headlines}""",
        })

    # Remove existing docs for this deal and re-seed
    try:
        existing = col.get(where={"pillar": "all"})
        ids_to_delete = [id_ for id_ in (existing.get("ids") or []) if id_.startswith(deal_id)]
        if ids_to_delete:
            col.delete(ids=ids_to_delete)
    except Exception:
        pass

    for doc in docs:
        try:
            col.upsert(
                ids=[doc["id"]],
                documents=[doc["text"]],
                metadatas=[{"pillar": doc["pillar"], "company": company_name}],
            )
        except Exception:
            pass


async def run_research(company: str, country: str, acquirer: str, queue: asyncio.Queue):
    """Full research pipeline streaming progress to queue."""
    groq_client = AsyncGroq(api_key=settings.groq_api_key)

    # ── Stage 1: Company Profile (Groq, fast ~2s) ──
    await queue.put({"type": "stage_start", "stage": "profile", "label": "Company Profile", "icon": "Building2"})
    try:
        profile = await asyncio.wait_for(
            run_profile_agent(company, country, acquirer, groq_client),
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        profile = {"company_name": company, "sector": "Manufacturing", "hq": country,
                   "currency": "INR", "revenue_unit": "Cr", "description": "", "deal_rationale": ""}
    await queue.put({"type": "stage_complete", "stage": "profile", "data": profile})

    # ── Stage 2: Yahoo Finance Data (real-time) ──
    await queue.put({"type": "stage_start", "stage": "financials", "label": "Yahoo Finance (Live)", "icon": "TrendingUp"})
    try:
        financials = await asyncio.wait_for(run_yfinance_agent(profile, company, country), timeout=30.0)
    except asyncio.TimeoutError:
        financials = {"found": False, "error": "Timeout"}
    await queue.put({"type": "stage_complete", "stage": "financials", "data": financials})

    # ── Stage 3: Market Intelligence + News (parallel) ──
    await queue.put({"type": "stage_start", "stage": "market", "label": "Market Intelligence", "icon": "BarChart2"})
    await queue.put({"type": "stage_start", "stage": "news", "label": "News & Sentiment", "icon": "Newspaper"})

    sector  = financials.get("sector") or profile.get("sector", "")
    ticker  = financials.get("ticker", "")
    yf_news = financials.get("news", [])

    market_task = asyncio.create_task(
        asyncio.wait_for(run_market_agent(company, sector, country, financials, groq_client), timeout=60.0)
    )
    news_task = asyncio.create_task(
        asyncio.wait_for(run_news_agent(company, ticker, yf_news, groq_client), timeout=60.0)
    )

    market, news_data = await asyncio.gather(market_task, news_task, return_exceptions=True)
    if isinstance(market, Exception): market = {}
    if isinstance(news_data, Exception): news_data = {}

    await queue.put({"type": "stage_complete", "stage": "market",  "data": market})
    await queue.put({"type": "stage_complete", "stage": "news",    "data": news_data})

    # ── Stage 4: Seed ChromaDB ──
    await queue.put({"type": "stage_start", "stage": "seeding", "label": "Seeding AI Context", "icon": "Database"})
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, _seed_research_to_chroma, company, profile, financials, market, news_data
        )
    except Exception:
        pass
    await queue.put({"type": "stage_complete", "stage": "seeding", "data": {}})

    # ── Final summary ──
    summary = {
        "company_name":  profile.get("company_name", company),
        "sector":        financials.get("sector") or profile.get("sector", ""),
        "industry":      financials.get("industry") or profile.get("sub_sector", ""),
        "hq":            profile.get("hq", ""),
        "founded":       profile.get("founded"),
        "employees":     financials.get("employees") or profile.get("employees_estimate"),
        "revenue":       financials.get("revenue"),
        "revenue_unit":  financials.get("revenue_unit") or profile.get("revenue_unit", "M"),
        "currency":      financials.get("currency") or profile.get("currency", "USD"),
        "market_cap":    financials.get("market_cap"),
        "ticker":        financials.get("ticker", ""),
        "description":   financials.get("description") or profile.get("description", ""),
        "deal_rationale":profile.get("deal_rationale", ""),
        "sentiment":     news_data.get("overall_sentiment", "neutral") if isinstance(news_data, dict) else "neutral",
        "market_size":   market.get("market_size", "") if isinstance(market, dict) else "",
        "competitors":   [c["name"] for c in (market.get("key_competitors", []) if isinstance(market, dict) else [])[:4]],

        # Confidence + provenance for Financial Model page
        "confidence":     financials.get("confidence", "LOW"),
        "confidence_note":financials.get("confidence_note", ""),
        "ticker_source":  financials.get("ticker_source", ""),
        "exchange":       financials.get("exchange", ""),
        "source_url":     financials.get("source_url", ""),
        "data_timestamp": financials.get("data_timestamp", ""),
        "data_sources":   financials.get("data_sources", []),
        "ebitda":         financials.get("ebitda"),
        "net_income":     financials.get("net_income"),
        "gross_margin":   financials.get("gross_margin"),
        "ebitda_margin":  financials.get("operating_margin"),
        "net_margin":     financials.get("net_margin"),
        "debt_to_equity": financials.get("debt_to_equity"),
        "revenue_growth": financials.get("revenue_growth"),
        "pe_ratio":       financials.get("pe_ratio"),
        "ev_revenue":     financials.get("ev_revenue"),
        "stock_price":    financials.get("stock_price"),
        "yf_found":       financials.get("found", False),
    }

    await queue.put({"type": "research_complete", "data": summary})
    await queue.put({"type": "done"})
