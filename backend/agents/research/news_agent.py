"""
News & sentiment agent.
Primary: Yahoo Finance news from yfinance (already in financials).
Enrichment: Apify RAG browser for recent material news.
Synthesis: Groq sentiment analysis.
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


async def _fetch_news_apify(company: str, ticker: str) -> list[dict]:
    if not APIFY_AVAILABLE or not settings.apify_api_key:
        return []
    loop = asyncio.get_event_loop()
    def _run():
        try:
            client = ApifyClient(settings.apify_api_key)
            run = client.actor("apify/rag-web-browser").call(run_input={
                "query": f"{company} latest news 2024 2025 acquisition merger financial results",
                "maxResults": 4,
                "outputFormats": ["markdown"],
            })
            items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
            return [{"title": item.get("title", ""), "content": item.get("markdown", "")[:500], "url": item.get("url", "")} for item in items]
        except Exception:
            return []
    return await loop.run_in_executor(None, _run)


async def run_news_agent(
    company: str,
    ticker: str,
    yf_news: list[dict],
    groq_client: AsyncGroq,
) -> dict:
    """Aggregate news and produce sentiment analysis."""
    # Combine yfinance news + apify news
    all_news = list(yf_news or [])

    apify_news = await _fetch_news_apify(company, ticker)
    all_news.extend(apify_news[:4])

    news_text = "\n".join([
        f"- {n.get('date', '')} | {n.get('title', '')} ({n.get('publisher', '')})"
        for n in all_news[:8]
    ]) or f"Recent news about {company} not available from automated sources."

    prompt = f"""You are an M&A news analyst. Analyse these recent news items about {company} and produce a structured news intelligence report.

NEWS:
{news_text}

Respond ONLY with valid JSON:
{{
  "overall_sentiment": "positive|neutral|negative",
  "sentiment_score": <integer -100 to +100>,
  "key_themes": ["theme 1", "theme 2", "theme 3"],
  "material_events": [
    {{"event": "brief description", "impact": "positive|negative|neutral", "date": "YYYY-MM or recent"}}
  ],
  "red_flags_from_news": ["flag 1 if any"],
  "positive_signals": ["signal 1", "signal 2"],
  "analyst_narrative": "2-3 sentence narrative on what the news flow implies for the acquisition"
}}"""

    try:
        resp = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=600,
        )
        text = resp.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        result["news_items"] = all_news[:8]
        result["source"] = "Yahoo Finance News + Groq Sentiment"
        if apify_news:
            result["source"] = "Yahoo Finance + Apify News + Groq Sentiment"
        return result
    except Exception:
        return {
            "overall_sentiment": "neutral", "sentiment_score": 0,
            "key_themes": [], "material_events": [], "red_flags_from_news": [],
            "positive_signals": [], "analyst_narrative": "News analysis unavailable.",
            "news_items": all_news[:8], "source": "Yahoo Finance News",
        }
