"""
Real financials endpoint — serves live Yahoo Finance statements + sector-aware valuation.
The Financial Model page calls this on mount so numbers are ALWAYS from Yahoo, never AI.
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.models import Deal
from agents.financials import fetch_real_financials, compute_valuation, fetch_sector_peers

router = APIRouter(prefix="/api/financials", tags=["financials"])


def _parse_deal_value(deal_value: str) -> float | None:
    """Extract numeric deal value from a string like '₹1200Cr' or '€1.8B'."""
    if not deal_value:
        return None
    m = re.search(r"[\d,.]+", deal_value)
    if not m:
        return None
    num = float(m.group().replace(",", ""))
    # Normalise B -> the deal's unit handled separately; keep raw number
    if "B" in deal_value and "Cr" not in deal_value:
        num = num * 1000  # 1B = 1000M
    return num


@router.get("/{deal_id}")
async def get_financials(deal_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")

    meta = deal.deal_meta or {}
    ticker  = meta.get("ticker", "")
    company = deal.target
    country = meta.get("location", "") or ""

    fin = await fetch_real_financials(ticker=ticker, company=company, country=country)

    deal_value_num = _parse_deal_value(deal.deal_value)
    valuation = compute_valuation(fin, deal_value_entered=deal_value_num) if fin.get("found") else {"available": False}

    # Always fetch sector peers for benchmarking (even when target has no live data)
    sector = deal.sector or (fin.get("sector") if fin.get("found") else "") or ""
    found_ticker = fin.get("ticker", "") if fin.get("found") else ""
    peers = await fetch_sector_peers(sector, exclude_ticker=found_ticker)

    return {"financials": fin, "valuation": valuation, "sector_peers": peers}
