"""
Groq-powered company profile + ticker detection agent.
Fast first response that seeds the wizard form.
"""
import json
from groq import AsyncGroq
from core.config import settings

PROFILE_PROMPT = """You are an M&A research analyst. Given a company name and country, return a structured company profile.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.

JSON format:
{{
  "company_name": "full legal name",
  "ticker_nse": "NSE ticker or null",
  "ticker_bse": "BSE code or null",
  "ticker_global": "exchange:TICKER for non-Indian (e.g. NYSE:AAPL) or null",
  "sector": "one of: Enterprise SaaS|FinTech|HealthTech|E-Commerce|Manufacturing|Steel & Metals|Pharmaceuticals|Energy|Banking & Finance|Logistics|Retail|Real Estate|Telecommunications|Other",
  "sub_sector": "specific sub-sector e.g. Flat Rolled Steel Products",
  "hq": "City, State/Country",
  "founded": year_as_integer,
  "employees_estimate": integer_or_null,
  "description": "3-4 sentence company description covering business model, products/services, market position, and strategic context for the acquisition",
  "deal_rationale": "2-3 sentence explanation of why this acquisition makes strategic sense",
  "currency": "INR|USD|EUR|GBP|SGD|AED|JPY|BRL|AUD|CHF",
  "revenue_unit": "Cr|M|B"
}}

Company: {company}
Country: {country}
Acquirer (for deal rationale): {acquirer}
"""


async def run_profile_agent(company: str, country: str, acquirer: str, groq_client: AsyncGroq) -> dict:
    prompt = PROFILE_PROMPT.format(company=company, country=country, acquirer=acquirer)
    try:
        resp = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=600,
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        return {
            "company_name": company,
            "ticker_nse": None, "ticker_bse": None, "ticker_global": None,
            "sector": "Manufacturing", "sub_sector": "Industrial",
            "hq": country, "founded": None, "employees_estimate": None,
            "description": f"{company} is a company based in {country}.",
            "deal_rationale": f"Strategic acquisition of {company} by {acquirer}.",
            "currency": "INR" if country.lower() in ["india", "in"] else "USD",
            "revenue_unit": "Cr" if country.lower() in ["india", "in"] else "M",
        }
