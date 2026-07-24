"""
Synthesis endpoint — the partner-level deal recommendation.
Ingests ALL pillar results + real financials + red flags and produces a
structured executive synthesis. Runs on Gemini (1M context) with Groq fallback.
"""
import json
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.models import Deal, PillarResult

router = APIRouter(prefix="/api/synthesis", tags=["synthesis"])

PILLAR_LABELS = {
    "commercial": "Commercial", "financial": "Financial", "operational": "Operational",
    "legal": "Legal", "technology": "Technology", "management": "Management",
}


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text).strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(m.group() if m else text)


def _compute_data_quality(pillar_rows, financials_found: bool) -> dict:
    """
    Deterministic (non-LLM) assessment of how well-grounded this synthesis is.
    Drives the honesty banner: public-data-only runs surface a clear caveat
    instead of over-claiming certainty.
    """
    total = len(pillar_rows) or 1
    corpus_pillars = 0
    conf = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    n_findings = 0
    for pr in pillar_rows:
        try:
            raw = json.loads(pr.raw_output or "{}")
        except Exception:
            raw = {}
        if (raw.get("grounding") or {}).get("has_corpus"):
            corpus_pillars += 1
        for f in list(pr.findings or []) + list(pr.red_flags or []):
            c = str(f.get("confidence", "MEDIUM")).upper()
            conf[c if c in conf else "MEDIUM"] += 1
            n_findings += 1

    conf_ratio   = (conf["HIGH"] + 0.5 * conf["MEDIUM"]) / n_findings if n_findings else 0.4
    corpus_ratio = corpus_pillars / total
    score = round(100 * (0.35 * (1 if financials_found else 0) + 0.35 * conf_ratio + 0.30 * corpus_ratio))
    level = "High" if score >= 70 else "Medium" if score >= 45 else "Low"

    caveats = []
    if corpus_pillars < total:
        caveats.append(
            f"{total - corpus_pillars} of {total} pillars rely on model knowledge and public context, "
            f"not proprietary data-room documents."
        )
    if not financials_found:
        caveats.append("No live market financials matched — financial views are directional, not statement-grounded.")
    caveats.append("Public-data assessment. A full DD requires the private data room (contracts, cap table, management accounts).")

    return {
        "level": level,
        "score": score,
        "caveats": caveats,
        "signals": {
            "Financials": "Live Yahoo Finance statements" if financials_found else "No live market match (public data only)",
            "Proprietary documents": f"{corpus_pillars}/{total} pillars",
            "High-confidence findings": f"{conf['HIGH']}/{n_findings}" if n_findings else "0/0",
        },
    }


SYNTHESIS_PROMPT = """You are the lead M&A partner presenting the final due-diligence synthesis to an investment committee. You have the complete pillar analysis below for the acquisition of {target} by {acquirer} ({deal_type}, deal value {deal_value}).

REAL FINANCIALS (Yahoo Finance):
{financials}

PILLAR RESULTS:
{pillars}

ALL RED FLAGS:
{red_flags}

OVERALL SCORE: {overall_score}/100 · CURRENT VERDICT: {verdict}

Produce a rigorous, institutional-grade synthesis. Respond with ONLY valid JSON:
{{
  "executive_summary": "3-4 sentence partner-level summary of the deal and its merits",
  "investment_thesis": "2-3 sentences on the strategic rationale and value creation logic",
  "recommendation": "PROCEED|CONDITIONAL|ABORT",
  "recommendation_rationale": "2-3 sentences justifying the recommendation given score and risks",
  "key_strengths": [
    {{"title": "", "detail": "one sentence", "pillar": "commercial|financial|..."}}
  ],
  "key_risks": [
    {{"title": "", "detail": "one sentence", "severity": "critical|high|medium", "pillar": ""}}
  ],
  "deal_conditions": [
    "Specific condition precedent that must be satisfied before/at close"
  ],
  "value_creation_levers": [
    {{"lever": "", "impact": "High|Medium|Low", "timeframe": "0-100 days|Year 1|Year 2-3"}}
  ],
  "hundred_day_priorities": [
    "Concrete priority action for the first 100 days post-close"
  ],
  "valuation_view": "1-2 sentences on whether the deal value is justified by fundamentals",
  "confidence_level": "High|Medium|Low"
}}

Rules: 3-4 key_strengths, 3-4 key_risks, 3-4 deal_conditions, 3 value_creation_levers, 4 hundred_day_priorities. Be specific to THIS company and sector — reference real figures. Concise."""


@router.get("/{deal_id}")
async def get_synthesis(deal_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")

    pr_res = await db.execute(select(PillarResult).where(PillarResult.deal_id == deal_id))
    pillar_rows = pr_res.scalars().all()

    if not pillar_rows:
        raise HTTPException(400, "Run the DD agents before requesting synthesis")

    # Build pillar context
    pillars_text = []
    red_flags_all = []
    scores = []
    for pr in pillar_rows:
        label = PILLAR_LABELS.get(pr.pillar, pr.pillar)
        scores.append(pr.score or 0)
        findings = " | ".join([f.get("title", "") for f in (pr.findings or [])])
        pillars_text.append(f"### {label} (score {pr.score})\nSummary: {pr.summary}\nFindings: {findings}")
        for f in (pr.red_flags or []):
            red_flags_all.append({**f, "pillar": pr.pillar})

    overall = round(sum(scores) / len(scores), 1) if scores else (deal.overall_score or 0)

    # Real financials
    fin_text = "Not available"
    financials_found = False
    try:
        from agents.financials import fetch_real_financials, compute_valuation
        meta = deal.deal_meta or {}
        fin = await fetch_real_financials(ticker=meta.get("ticker", ""), company=deal.target, country=meta.get("location", ""))
        if fin.get("found"):
            financials_found = True
            pl = " | ".join([f"{y['label']}: rev {y['revenue']}" for y in fin.get("pl_years", [])])
            dv = None
            if deal.deal_value:
                m = re.search(r"[\d,.]+", deal.deal_value)
                if m: dv = float(m.group().replace(",", ""))
            val = compute_valuation(fin, dv)
            fin_text = (f"Currency {fin['currency']} {fin['unit']}. Revenue by FY: {pl}. "
                        f"EV {fin.get('enterprise_value')}, EV/EBITDA {fin.get('ev_ebitda')}x, EV/Rev {fin.get('ev_revenue')}x, "
                        f"net margin {fin.get('net_margin')}%, D/E {fin.get('debt_to_equity')}. "
                        f"Sector-fair offer ~{val.get('fair_offer')} ({val.get('sector_label')}); "
                        f"entered deal value {deal.deal_value}." +
                        (f" OVERPAYMENT SIGNAL: {val['overpay_flag']['detail']}" if val.get("overpay_flag") else ""))
    except Exception:
        pass

    prompt = SYNTHESIS_PROMPT.format(
        target=deal.target, acquirer=deal.acquirer, deal_type=deal.deal_type,
        deal_value=deal.deal_value, financials=fin_text,
        pillars="\n\n".join(pillars_text),
        red_flags=json.dumps(red_flags_all)[:1500],
        overall_score=overall, verdict=deal.verdict or "TBD",
    )

    from agents.llm import complete as llm_complete, gemini_available
    try:
        text, provider = await asyncio.wait_for(
            llm_complete(
                messages=[
                    {"role": "system", "content": "You are a senior M&A partner. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                prefer="synthesis", temperature=0, max_tokens=2048, seed=42,
            ),
            timeout=120.0,
        )
        data = _extract_json(text)
        data["_provider"] = provider
        data["_overall_score"] = overall
        data["_red_flags_count"] = len(red_flags_all)
        data["_data_quality"] = _compute_data_quality(pillar_rows, financials_found)
        return data
    except Exception as e:
        raise HTTPException(503, f"Synthesis generation failed (LLM unavailable): {str(e)[:160]}")
