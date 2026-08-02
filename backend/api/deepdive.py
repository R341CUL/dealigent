"""
Deep dive endpoint — streams rich pillar intelligence via SSE.
Pulls existing pillar result + deal context, calls the multi-provider LLM
layer for rich structured data; injects real Yahoo data for fin/mgmt pillars.
"""
import asyncio
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.models import Deal, PillarResult
from agents.deepdive.prompts import build_deepdive_prompt

router = APIRouter(prefix='/api/deepdive', tags=['deepdive'])

PILLARS = ['commercial', 'financial', 'operational', 'legal', 'technology', 'management']


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


@router.get('/{deal_id}/{pillar_id}/stream')
async def stream_deepdive(deal_id: str, pillar_id: str, db: AsyncSession = Depends(get_db)):
    if pillar_id not in PILLARS:
        raise HTTPException(400, f'Unknown pillar: {pillar_id}')

    # Load deal
    deal_res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, 'Deal not found')

    # Load existing pillar result
    pr_res = await db.execute(
        select(PillarResult).where(PillarResult.deal_id == deal_id, PillarResult.pillar == pillar_id)
    )
    pr = pr_res.scalar_one_or_none()

    deal_dict = {
        'targetCompany': deal.target,
        'acquirer':      deal.acquirer,
        'sector':        deal.sector,
        'currency':      deal.currency,
        **(deal.deal_meta or {}),
    }
    pillar_result = {
        'score':       pr.score    if pr else 70,
        'summary':     pr.summary  if pr else '',
        'findings':    pr.findings if pr else [],
        'red_flags':   pr.red_flags if pr else [],
        'key_metrics': {},
    }
    if pr and pr.raw_output:
        try:
            raw = json.loads(pr.raw_output)
            pillar_result['key_metrics'] = raw.get('key_metrics', {})
        except Exception:
            pass

    # ── Inject REAL Yahoo Finance data for financial & management pillars ──
    real_fin = None
    real_officers = None
    real_valuation = None
    if pillar_id in ('financial', 'management'):
        try:
            from agents.financials import fetch_real_financials, compute_valuation
            meta = deal.deal_meta or {}
            real_fin = await fetch_real_financials(
                ticker=meta.get('ticker', ''), company=deal.target, country=meta.get('location', '')
            )
            if real_fin.get('found'):
                real_officers = real_fin.get('officers', [])
                import re as _re
                dv = None
                if deal.deal_value:
                    m = _re.search(r'[\d,.]+', deal.deal_value)
                    if m: dv = float(m.group().replace(',', ''))
                real_valuation = compute_valuation(real_fin, dv)
        except Exception:
            pass

    prompt = build_deepdive_prompt(pillar_id, deal_dict, pillar_result)
    if not prompt:
        raise HTTPException(400, 'No prompt template for pillar')

    # Append real data context to the prompt so the LLM grounds on facts
    if real_fin and real_fin.get('found'):
        if pillar_id == 'financial':
            pl = real_fin.get('pl_years', [])
            pl_str = " | ".join([f"{y['label']}: rev={y['revenue']} ebitda={y['ebitda']} net={y['net_income']}" for y in pl])
            prompt += f"""

CRITICAL — USE THESE REAL YAHOO FINANCE FIGURES ({real_fin['currency']} {real_fin['unit']}), DO NOT INVENT:
P&L by fiscal year: {pl_str}
Enterprise Value: {real_fin.get('enterprise_value')} | EV/EBITDA: {real_fin.get('ev_ebitda')}x | EV/Revenue: {real_fin.get('ev_revenue')}x
Market Cap: {real_fin.get('market_cap')} | Net margin: {real_fin.get('net_margin')}% | D/E: {real_fin.get('debt_to_equity')} | Rev growth: {real_fin.get('revenue_growth')}%
For pl_summary, map the real fiscal years above. For comps and qualitative notes you may reason, but all {real_fin['currency']} figures MUST match the real data."""
        elif pillar_id == 'management' and real_officers:
            off_str = "; ".join([f"{o['name']} ({o['title']}{', age '+str(o['age']) if o.get('age') else ''})" for o in real_officers])
            prompt += f"""

CRITICAL — USE THESE REAL EXECUTIVES FROM YAHOO FINANCE, DO NOT INVENT NAMES:
{off_str}
Build the executives array from these real people. Map their real titles."""

    queue: asyncio.Queue = asyncio.Queue()

    def _apply_real_financial(data: dict) -> dict:
        """Inject REAL Yahoo numbers — runs whether or not the LLM succeeded."""
        if not (real_fin and real_fin.get('found')):
            return data
        pl = real_fin.get('pl_years', [])
        if pl:
            last5 = pl[-5:]
            pl_summary = {'unit': real_fin['unit'], 'currency': real_fin['currency']}
            slot_keys = ['revenue_fy_2', 'revenue_fy_1', 'revenue_fy0', 'revenue_fy1e', 'revenue_fy2e']
            for idx, y in enumerate(last5):
                if idx < len(slot_keys):
                    pl_summary[slot_keys[idx]] = {'value': y['revenue'], 'label': y['label']}
            pl_summary['gross_margin_pct']  = real_fin.get('gross_margin')
            pl_summary['ebitda_margin_pct'] = round(real_fin['latest_ebitda'] / real_fin['latest_revenue'] * 100, 1) if real_fin.get('latest_ebitda') and real_fin.get('latest_revenue') else None
            pl_summary['net_margin_pct']    = real_fin.get('net_margin')
            data['pl_summary'] = pl_summary
            data['pl_years_real'] = pl
        if real_valuation and real_valuation.get('available'):
            v = real_valuation
            data['valuation_range'] = {
                'low':  {'ev': v['ev_from_ebitda']['low'],  'multiple': f"{v['ev_ebitda_range'][0]}x EV/EBITDA (bear)"},
                'base': {'ev': v['standalone_ev'],          'multiple': f"{v.get('actual_ev_ebitda') or v['ev_ebitda_range'][1]}x EV/EBITDA (actual)"},
                'high': {'ev': v['ev_from_ebitda']['high'], 'multiple': f"{v['ev_ebitda_range'][2]}x EV/EBITDA (bull)"},
            }
            data['acquisition_bridge'] = {
                'standalone_ev': v['standalone_ev'], 'revenue_synergies': v['revenue_synergies'],
                'cost_synergies': v['cost_synergies'], 'control_premium': v['control_premium'],
                'fair_offer': v['fair_offer'], 'deal_value_entered': v['deal_value_entered'],
                'unit': v['unit'], 'currency': v['currency'],
            }
            data['overpay_flag'] = v.get('overpay_flag')
            data['sector_label'] = v.get('sector_label')
        data['_real_source'] = real_fin.get('source_url')
        return data

    def _apply_real_management(data: dict) -> dict:
        if not real_officers:
            return data
        merged = []
        llm_execs = {e.get('title', '').lower(): e for e in data.get('executives', [])}
        for o in real_officers[:6]:
            match = next((e for k, e in llm_execs.items() if k and (k in o['title'].lower() or o['title'].lower() in k)), {})
            merged.append({
                'name': o['name'], 'title': o['title'],
                'tenure_years': match.get('tenure_years', 0),
                'background': match.get('background', 'Senior executive'),
                'assessment': match.get('assessment', 'Adequate'),
                'key_risk': match.get('key_risk', ''), 'pay': o.get('pay'),
            })
        data['executives'] = merged
        data['_real_source'] = real_fin.get('source_url')
        return data

    def _apply_real(data: dict) -> dict:
        if pillar_id == 'financial':  return _apply_real_financial(data)
        if pillar_id == 'management': return _apply_real_management(data)
        return data

    async def _generate_deepdive():
        from agents.llm import complete as llm_complete
        llm_ok = False
        data = {}
        try:
            text, _provider = await asyncio.wait_for(
                llm_complete(
                    messages=[
                        {'role': 'system', 'content': 'You are an M&A due diligence expert. Return ONLY valid JSON.'},
                        {'role': 'user',   'content': prompt},
                    ],
                    prefer='bulk', temperature=0.25, max_tokens=2048,
                ),
                timeout=120.0,
            )
            data = _extract_json(text)
            llm_ok = True
        except Exception as e:
            # All providers failed (e.g. rate limit) — still serve real Yahoo data for fin/mgmt
            data = {'_llm_error': str(e)[:160]}

        data = _apply_real(data)

        # If LLM failed AND there's no real data to show, surface the error
        has_real = bool(data.get('pl_years_real') or data.get('executives'))
        if not llm_ok and not has_real:
            await queue.put({'type': 'deepdive_error', 'pillar': pillar_id, 'message': data.get('_llm_error', 'generation failed')})
        else:
            if not llm_ok:
                data['_partial'] = True  # real numbers present, qualitative analysis unavailable
            await queue.put({'type': 'deepdive_complete', 'pillar': pillar_id, 'data': data})
        await queue.put({'type': 'done'})

    async def generate():
        await queue.put({'type': 'deepdive_start', 'pillar': pillar_id})
        task = asyncio.create_task(_generate_deepdive())
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    yield "event: error\ndata: {\"message\": \"timeout\"}\n\n"
                    break
                yield f"event: {item['type']}\ndata: {json.dumps(item)}\n\n"
                if item['type'] == 'done':
                    break
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        generate(),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
