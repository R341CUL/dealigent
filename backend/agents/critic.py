"""
Critic / QA agent — the supervisory layer.

Runs AFTER the 6 parallel DD agents and BEFORE synthesis. It reviews every
pillar's output for evidence quality and cross-pillar consistency, the way a
senior reviewer QAs a junior team's work before it reaches the partner.

Uses the high-quality reasoning model (prefer="synthesis" → Cerebras gpt-oss-120b)
with automatic fallback. Never blocks the pipeline — on failure it returns a
neutral pass so synthesis still proceeds.
"""
import json
import re
import asyncio

PILLAR_LABELS = {
    "commercial": "Commercial", "financial": "Financial", "operational": "Operational",
    "legal": "Legal", "technology": "Technology", "management": "Management",
}


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text).strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(m.group() if m else text)


def _build_prompt(deal: dict, pillar_results: list[dict]) -> str:
    company = deal.get("targetCompany", deal.get("target", "the target"))
    sector  = deal.get("sector", "Unknown")
    blocks = []
    for r in pillar_results:
        label = PILLAR_LABELS.get(r.get("pillar"), r.get("pillar"))
        findings = " | ".join([f.get("title", "") for f in (r.get("findings") or [])])
        flags = " | ".join([f"{f.get('severity')}: {f.get('title')}" for f in (r.get("red_flags") or [])])
        blocks.append(f"### {label} (score {r.get('score')})\nSummary: {r.get('summary','')}\nFindings: {findings}\nRed flags: {flags}")
    pillars_text = "\n\n".join(blocks)

    return f"""You are the QA reviewer on an M&A due-diligence team. Before this work reaches the partner, review the six pillar analyses below for {company} ({sector} sector).

{pillars_text}

Assess: (1) is each pillar's evidence specific and sector-appropriate (not generic boilerplate)?
(2) are the scores internally consistent with the findings?
(3) are there contradictions ACROSS pillars (e.g. financial says strong cash, operational says burn)?
(4) is anything missing that a partner would expect?

Respond with ONLY valid JSON:
{{
  "overall_quality": "High|Medium|Low",
  "consistency": "Consistent|Minor issues|Material issues",
  "pillar_reviews": [
    {{"pillar": "commercial|financial|operational|legal|technology|management", "quality": "High|Medium|Low", "note": "one specific sentence"}}
  ],
  "cross_pillar_flags": ["specific contradiction or gap, if any"],
  "reviewer_verdict": "1-2 sentences: is this analysis ready for the investment committee?"
}}
Include a pillar_review for every pillar provided. cross_pillar_flags may be empty. Be concise and specific to {company}."""


async def run_critic(deal: dict, pillar_results: list[dict]) -> dict:
    """Review all pillar outputs. Returns a structured QA review (never raises)."""
    valid = [r for r in pillar_results if isinstance(r, dict) and r.get("pillar")]
    if not valid:
        return {"overall_quality": "Low", "consistency": "Material issues",
                "pillar_reviews": [], "cross_pillar_flags": ["No pillar output to review"],
                "reviewer_verdict": "Insufficient analysis to review."}

    prompt = _build_prompt(deal, valid)
    try:
        from agents.llm import complete as llm_complete
        text, provider = await asyncio.wait_for(
            llm_complete(
                messages=[
                    {"role": "system", "content": "You are a rigorous M&A QA reviewer. Return ONLY valid JSON."},
                    {"role": "user",   "content": prompt},
                ],
                prefer="synthesis", temperature=0.2, max_tokens=1200,
            ),
            timeout=90.0,
        )
        review = _extract_json(text)
        review["_provider"] = provider
        return review
    except Exception as e:
        # Never block the pipeline — neutral pass-through
        return {
            "overall_quality": "Medium",
            "consistency": "Not reviewed",
            "pillar_reviews": [{"pillar": r["pillar"], "quality": "Medium", "note": "Auto-passed (reviewer unavailable)."} for r in valid],
            "cross_pillar_flags": [],
            "reviewer_verdict": "Automated QA review unavailable; pillars passed through to synthesis.",
            "_error": str(e)[:120],
        }
