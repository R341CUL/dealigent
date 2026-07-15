"""
Market intelligence agent using Apify RAG web browser.
Scrapes market size, competitive landscape, industry trends.
Falls back to Groq-generated analysis if Apify unavailable.
"""
import asyncio
import json
from groq import AsyncGroq
from core.config import settings

try:
    from apify_client import ApifyClient
    APIFY_AVAILABLE = True
except ImportError:
    APIFY_AVAILABLE = False


async def _scrape_with_apify(query: str, max_results: int = 3) -> list[str]:
    """Use Apify RAG browser to fetch market intelligence."""
    if not APIFY_AVAILABLE or not settings.apify_api_key:
        return []
    loop = asyncio.get_event_loop()
    def _run():
        try:
            client = ApifyClient(settings.apify_api_key)
            run = client.actor("apify/rag-web-browser").call(run_input={
                "query": query,
                "maxResults": max_results,
                "outputFormats": ["markdown"],
            })
            items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
            return [item.get("markdown", item.get("text", "")) for item in items if item.get("markdown") or item.get("text")]
        except Exception:
            return []
    return await loop.run_in_executor(None, _run)


async def _groq_market_analysis(company: str, sector: str, country: str, financials: dict, groq_client: AsyncGroq) -> dict:
    """Groq fallback for market analysis when Apify unavailable."""
    fin_context = ""
    if financials.get("found"):
        fin_context = f"""
Real financial data:
- Revenue: {financials.get('revenue')} {financials.get('revenue_unit')} {financials.get('currency')}
- Market Cap: {financials.get('market_cap')} {financials.get('revenue_unit')} {financials.get('currency')}
- Revenue Growth: {financials.get('revenue_growth')}%
- Industry: {financials.get('industry')}
- Sector: {financials.get('sector')}
"""

    prompt = f"""You are a market intelligence analyst. Provide a comprehensive market analysis for {company} ({sector}) in {country}.
{fin_context}

Respond ONLY with valid JSON:
{{
  "market_size": "estimated market size with source/year",
  "market_growth": "CAGR % and period",
  "market_position": "company's estimated market share and rank",
  "key_competitors": [
    {{"name": "competitor name", "description": "brief description and relative position"}}
  ],
  "competitive_advantages": ["advantage 1", "advantage 2", "advantage 3"],
  "market_risks": ["risk 1", "risk 2", "risk 3"],
  "industry_trends": ["trend 1", "trend 2", "trend 3"],
  "regulatory_environment": "key regulatory factors for this sector/country",
  "market_outlook": "2-3 sentence market outlook for the next 3-5 years"
}}
Keep all descriptions concise (max 20 words each). Return ONLY JSON."""

    try:
        resp = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=800,
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        result["source"] = "Groq AI Analysis"
        return result
    except Exception:
        return {"source": "Groq AI Analysis", "market_size": "Data unavailable", "key_competitors": [], "industry_trends": []}


async def run_market_agent(company: str, sector: str, country: str, financials: dict, groq_client: AsyncGroq) -> dict:
    """Fetch market intelligence — Apify if available, else Groq."""
    scraped_chunks = []

    if APIFY_AVAILABLE and settings.apify_api_key:
        queries = [
            f"{company} {sector} market size competitors analysis {country} 2024",
            f"{company} industry trends competitive landscape {country}",
        ]
        tasks = [_scrape_with_apify(q, 2) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                scraped_chunks.extend(r)

    if scraped_chunks:
        # Synthesise scraped content with Groq
        combined = "\n\n---\n\n".join(scraped_chunks[:4])[:3000]
        prompt = f"""Based on this market research about {company} ({sector}, {country}), extract structured intelligence.

RESEARCH:
{combined}

Respond ONLY with valid JSON:
{{
  "market_size": "...", "market_growth": "...", "market_position": "...",
  "key_competitors": [{{"name": "...", "description": "..."}}],
  "competitive_advantages": ["..."],
  "market_risks": ["..."],
  "industry_trends": ["..."],
  "regulatory_environment": "...",
  "market_outlook": "..."
}}"""
        try:
            resp = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2, max_tokens=800,
            )
            text = resp.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            result["source"] = "Apify Web Intelligence + Groq Synthesis"
            return result
        except Exception:
            pass

    return await _groq_market_analysis(company, sector, country, financials, groq_client)
