from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from core.models import Deal, PillarResult
import uuid

router = APIRouter(prefix="/api/deals", tags=["deals"])

class DealCreate(BaseModel):
    target: str
    acquirer: str
    deal_type: str = "Strategic Acquisition"
    deal_value: str = ""
    sector: str = ""
    currency: str = "EUR"
    deal_meta: dict = {}

@router.post("/")
async def create_deal(payload: DealCreate, db: AsyncSession = Depends(get_db)):
    deal = Deal(
        id=str(uuid.uuid4()),
        target=payload.target,
        acquirer=payload.acquirer,
        deal_type=payload.deal_type,
        deal_value=payload.deal_value,
        sector=payload.sector,
        currency=payload.currency,
        deal_meta=payload.deal_meta,
        status="setup",
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.get("/")
async def list_deals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deal).order_by(Deal.created_at.desc()))
    return result.scalars().all()

@router.get("/{deal_id}")
async def get_deal(deal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")
    return deal

@router.get("/{deal_id}/results")
async def get_results(deal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PillarResult).where(PillarResult.deal_id == deal_id))
    return result.scalars().all()
