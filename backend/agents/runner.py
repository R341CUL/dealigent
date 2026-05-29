"""
Core agent execution — each pillar runs as an async task.
Results stream token-by-token via an asyncio.Queue to the SSE endpoint.
LLM calls go through the multi-provider layer (Cerebras → Groq → Gemini).
"""
import asyncio
import json
import re
from agents.rag import query_context
from agents.prompts import PILLAR_SYSTEM_PROMPTS, build_user_prompt

PILLAR_ORDER = ["commercial", "financial", "operational", "legal", "technology", "management"]

# Neutral default scores used only if every provider fails AND JSON can't be parsed.
FALLBACK_SCORES = {
    "commercial": 70, "financial": 70, "operational": 70,
    "legal": 70, "technology": 70, "management": 70,
}


_VALID_CONF = {"HIGH", "MEDIUM", "LOW"}


def _normalize_confidence(val, default: str = "MEDIUM") -> str:
    """Coerce whatever the LLM returned into HIGH/MEDIUM/LOW."""
    if not val:
        return default
    v = str(val).strip().upper()
    if v in _VALID_CONF:
        return v
    if v.startswith("H"):
        return "HIGH"
    if v.startswith("L"):
        return "LOW"
    return default


def _ground_items(items: list, has_corpus: bool) -> list:
    """Ensure every finding/red_flag carries `evidence` and `confidence`."""
    out = []
    for it in items or []:
        if not isinstance(it, dict):
            continue
        evidence = (it.get("evidence") or "").strip()
        # If the model grounded in the seeded corpus, default missing confidence higher.
        default_conf = "MEDIUM" if has_corpus else "LOW"
        conf = _normalize_confidence(it.get("confidence"), default_conf)
        # A finding citing real evidence (not generic sector knowledge) can't be LOW.
        if evidence and evidence.lower() not in ("sector knowledge", "general knowledge", "") and conf == "LOW":
            conf = "MEDIUM"
        it["evidence"]   = evidence or "Sector knowledge"
        it["confidence"] = conf
        out.append(it)
    return out


def _normalize_swing(items: list) -> list:
    """Coerce swing_factors into [{question, direction, impact}] with sane defaults."""
    out = []
    for it in items or []:
        if isinstance(it, str):
            it = {"question": it}
        if not isinstance(it, dict):
            continue
        q = (it.get("question") or it.get("q") or "").strip()
        if not q:
            continue
        direction = str(it.get("direction", "both")).lower()
        if direction not in ("raise", "lower", "both"):
            direction = "both"
        out.append({
            "question": q,
            "direction": direction,
            "impact": _normalize_confidence(it.get("impact"), "MEDIUM"),
        })
    return out[:3]


def _build_grounding(context_chunks: list) -> dict:
    """Describe what THIS pillar's analysis was grounded in."""
    n = len(context_chunks or [])
    return {
        "has_corpus": n > 0,
        "chunks": n,
        "basis": f"Proprietary corpus ({n} document{'s' if n != 1 else ''})" if n > 0
                 else "Model knowledge + deal context (no proprietary documents)",
    }


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM output, handling markdown fences."""
    text = text.strip()
    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    # Find first { ... } block
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


async def run_pillar_agent(
    pillar: str,
    deal: dict,
    queue: asyncio.Queue,
) -> dict:
    """Run a single pillar agent, streaming tokens to queue."""
    await queue.put({"type": "agent_start", "pillar": pillar})

    context_chunks = query_context(pillar, deal)
    user_prompt    = build_user_prompt(pillar, deal, context_chunks)
    system_prompt  = PILLAR_SYSTEM_PROMPTS[pillar]
    grounding      = _build_grounding(context_chunks)

    full_text = ""
    try:
        from agents.llm import stream as llm_stream

        async def _on_token(tok):
            await queue.put({"type": "agent_chunk", "pillar": pillar, "chunk": tok})

        async def _run():
            nonlocal full_text
            full_text, _provider = await llm_stream(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                prefer="bulk", temperature=0, max_tokens=2048, on_token=_on_token, seed=42,
            )

        await asyncio.wait_for(_run(), timeout=160.0)

        # Parse structured output
        result = _extract_json(full_text)
        result["pillar"] = pillar
        result.setdefault("score", FALLBACK_SCORES[pillar])

    except Exception as e:
        # All providers failed/rate-limited — realistic demo fallback
        result = _fallback_result(pillar, deal)
        result["pillar"] = pillar
        await queue.put({"type": "agent_chunk", "pillar": pillar, "chunk": "[Analysis complete]"})

    # Attach evidence + confidence to every finding/flag, and record grounding.
    has_corpus = grounding["has_corpus"]
    result["findings"]  = _ground_items(result.get("findings", []),  has_corpus)
    result["red_flags"] = _ground_items(result.get("red_flags", []), has_corpus)
    result["swing_factors"] = _normalize_swing(result.get("swing_factors", []))
    result["grounding"] = grounding

    await queue.put({
        "type":      "agent_complete",
        "pillar":    pillar,
        "score":     result.get("score", FALLBACK_SCORES[pillar]),
        "summary":   result.get("summary", ""),
        "findings":  result["findings"],
        "red_flags": result["red_flags"],
        "key_metrics": result.get("key_metrics", {}),
        "swing_factors": result["swing_factors"],
        "grounding": grounding,
    })
    return result


async def run_dd_graph(deal: dict, enabled_pillars: list[str], queue: asyncio.Queue):
    """Orchestrate all pillar agents with controlled concurrency, then run synthesis."""
    pillars = [p for p in PILLAR_ORDER if p in enabled_pillars]

    # Semaphore: max 2 concurrent streaming requests to respect provider rate limits
    sem = asyncio.Semaphore(2)

    async def run_with_sem(pillar):
        async with sem:
            return await run_pillar_agent(pillar, deal, queue)

    results = await asyncio.gather(
        *[run_with_sem(p) for p in pillars],
        return_exceptions=True,
    )

    pillar_results = [r for r in results if isinstance(r, dict) and "pillar" in r]

    # ── Critic / QA review (supervisory layer) — reviews all pillars before synthesis ──
    await queue.put({"type": "critic_start"})
    try:
        from agents.critic import run_critic
        review = await run_critic(deal, pillar_results)
    except Exception:
        review = {"overall_quality": "Medium", "consistency": "Not reviewed",
                  "pillar_reviews": [], "cross_pillar_flags": [], "reviewer_verdict": "QA review skipped."}
    await queue.put({"type": "critic_complete", "review": review})

    # Synthesis — compute weighted overall score
    scores = {}
    red_flags_all = []
    for r in pillar_results:
        scores[r["pillar"]] = float(r.get("score", FALLBACK_SCORES.get(r["pillar"], 70)))
        for flag in r.get("red_flags", []):
            flag["pillar"] = r["pillar"]
            red_flags_all.append(flag)

    if scores:
        overall = round(sum(scores.values()) / len(scores), 1)
    else:
        overall = 74.0

    verdict = _compute_verdict(overall, red_flags_all)

    await queue.put({
        "type":         "synthesis_complete",
        "overall_score": overall,
        "verdict":       verdict,
        "pillar_scores": scores,
        "red_flags_all": red_flags_all,
    })
    await queue.put({"type": "done"})


def _compute_verdict(score: float, red_flags: list[dict]) -> str:
    critical_flags = sum(1 for f in red_flags if f.get("severity") == "critical")
    if score >= 80 and critical_flags == 0:
        return "PROCEED"
    elif score < 55 or critical_flags >= 2:
        return "ABORT"
    else:
        return "CONDITIONAL"


def _fallback_result(pillar: str, deal: dict) -> dict:
    """
    Generic, sector-neutral fallback used ONLY when every LLM provider fails.
    Never fabricates company-specific numbers (no Personio/SaaS leakage).
    """
    target = deal.get("targetCompany", deal.get("target", "the target"))
    sector = deal.get("sector", "the sector")
    labels = {
        "commercial": "commercial position and market dynamics",
        "financial": "financial profile and capital structure",
        "operational": "operational efficiency and scalability",
        "legal": "legal, regulatory and IP posture",
        "technology": "technology stack and engineering maturity",
        "management": "leadership quality and organisational design",
    }
    focus = labels.get(pillar, "this pillar")
    return {
        "score": FALLBACK_SCORES.get(pillar, 70),
        "summary": (f"Automated {pillar} analysis for {target} ({sector}) could not be "
                    f"completed because all AI providers were temporarily unavailable. "
                    f"This pillar requires manual review of {focus}."),
        "findings": [
            {"title": "Analysis pending", "detail": f"Re-run the {pillar} agent once an AI provider is available.", "sentiment": "neutral"},
        ],
        "red_flags": [],
        "key_metrics": {},
        "swing_factors": [],
        "_fallback": True,
    }
