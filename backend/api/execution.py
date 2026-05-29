import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select
from core.database import get_db, engine
from core.models import Deal, PillarResult
from agents.runner import run_dd_graph, _compute_verdict as _compute_verdict_simple

router = APIRouter(prefix="/api/execute", tags=["execution"])

# Dedicated session factory for background writes (avoids sharing the request session)
_write_session = async_sessionmaker(engine, expire_on_commit=False)


async def _persist_pillar(deal_id: str, item: dict):
    try:
        import json as _json
        # Delete any prior result for this pillar (re-runs), then insert fresh
        async with _write_session() as session:
            existing = await session.execute(
                select(PillarResult).where(
                    PillarResult.deal_id == deal_id,
                    PillarResult.pillar == item["pillar"],
                )
            )
            for old in existing.scalars().all():
                await session.delete(old)
            pr = PillarResult(
                deal_id=deal_id,
                pillar=item["pillar"],
                score=item["score"],
                summary=item.get("summary", ""),
                findings=item.get("findings", []),
                red_flags=item.get("red_flags", []),
                raw_output=_json.dumps({
                    "key_metrics":   item.get("key_metrics", {}),
                    "grounding":     item.get("grounding", {}),
                    "swing_factors": item.get("swing_factors", []),
                }),
            )
            session.add(pr)
            await session.commit()
    except Exception:
        pass


async def _persist_verdict(deal_id: str, score: float, verdict: str):
    try:
        async with _write_session() as session:
            result = await session.execute(select(Deal).where(Deal.id == deal_id))
            deal = result.scalar_one_or_none()
            if deal:
                deal.status        = "complete"
                deal.overall_score = score
                deal.verdict       = verdict
                await session.commit()
    except Exception:
        pass


@router.post("/{deal_id}/run")
async def start_execution(deal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")
    deal.status = "running"
    await db.commit()
    return {"status": "started", "deal_id": deal_id}


@router.get("/{deal_id}/stream")
async def stream_execution(deal_id: str, force: bool = False, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")

    deal_dict = {
        "id":            deal.id,
        "targetCompany": deal.target,
        "acquirer":      deal.acquirer,
        "dealValue":     deal.deal_value,
        "sector":        deal.sector,
        "currency":      deal.currency,
        **(deal.deal_meta or {}),
    }
    enabled_pillars = (deal.deal_meta or {}).get(
        "enabledPillars",
        ["commercial", "financial", "operational", "legal", "technology", "management"]
    )

    # Load any existing cached pillar results from DB
    existing_res = await db.execute(select(PillarResult).where(PillarResult.deal_id == deal_id))
    cached_pillars = {pr.pillar: pr for pr in existing_res.scalars().all()}

    queue: asyncio.Queue = asyncio.Queue()

    async def generate():
        # If all enabled pillars already have cached results and force=False,
        # replay cached results without hitting the LLM again.
        if not force and cached_pillars and all(p in cached_pillars for p in enabled_pillars):
            import json as _json
            scores, red_flags_all = {}, []
            for p in enabled_pillars:
                pr = cached_pillars[p]
                _raw = _json.loads(pr.raw_output or "{}")
                item = {
                    "type": "agent_complete", "pillar": pr.pillar,
                    "score": pr.score, "summary": pr.summary,
                    "findings": pr.findings or [], "red_flags": pr.red_flags or [],
                    "key_metrics": _raw.get("key_metrics", {}),
                    "grounding": _raw.get("grounding", {}),
                    "swing_factors": _raw.get("swing_factors", []),
                }
                yield f"event: agent_start\ndata: {_json.dumps({'type':'agent_start','pillar':p})}\n\n"
                yield f"event: agent_complete\ndata: {_json.dumps(item)}\n\n"
                scores[p] = float(pr.score or 70)
                for f in (pr.red_flags or []):
                    red_flags_all.append({**f, "pillar": p})
            overall = round(sum(scores.values()) / len(scores), 1) if scores else 70.0
            verdict = deal.verdict or _compute_verdict_simple(overall, red_flags_all)
            synth = {"type": "synthesis_complete", "overall_score": overall, "verdict": verdict,
                     "pillar_scores": scores, "red_flags_all": red_flags_all}
            yield f"event: synthesis_complete\ndata: {_json.dumps(synth)}\n\n"
            yield f"event: done\ndata: {_json.dumps({'type':'done'})}\n\n"
            return

        # ── Reconcile currency to the REAL reporting currency (single source of truth) ──
        # Prevents the deal's default currency (e.g. EUR) from contradicting live Yahoo data (e.g. GBP)
        # across pillar pages, the financial model and the report.
        try:
            from agents.financials import fetch_real_financials
            _meta = deal.deal_meta or {}
            _rfin = await fetch_real_financials(
                ticker=_meta.get("ticker", ""), company=deal.target, country=_meta.get("location", "")
            )
            if _rfin.get("found") and _rfin.get("currency"):
                real_ccy  = _rfin["currency"]
                real_unit = _rfin.get("unit") or deal_dict.get("revenueUnit", "M")
                if deal_dict.get("currency") != real_ccy or deal_dict.get("revenueUnit") != real_unit:
                    deal_dict["currency"]    = real_ccy
                    deal_dict["revenueUnit"] = real_unit
                    async with _write_session() as _s:
                        _r = await _s.execute(select(Deal).where(Deal.id == deal_id))
                        _d = _r.scalar_one_or_none()
                        if _d:
                            _d.currency = real_ccy
                            _nm = dict(_d.deal_meta or {}); _nm["revenueUnit"] = real_unit
                            _d.deal_meta = _nm
                            await _s.commit()
        except Exception:
            pass

        task = asyncio.create_task(run_dd_graph(deal_dict, enabled_pillars, queue))
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=300.0)
                except asyncio.TimeoutError:
                    yield "event: error\ndata: {\"message\": \"execution timeout\"}\n\n"
                    break

                yield f"event: {item['type']}\ndata: {json.dumps(item)}\n\n"

                if item["type"] == "agent_complete":
                    asyncio.create_task(_persist_pillar(deal_id, item))

                if item["type"] == "synthesis_complete":
                    asyncio.create_task(
                        _persist_verdict(deal_id, item["overall_score"], item["verdict"])
                    )

                if item["type"] == "done":
                    break
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )


@router.get("/{deal_id}/results")
async def get_results(deal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PillarResult).where(PillarResult.deal_id == deal_id))
    return result.scalars().all()
