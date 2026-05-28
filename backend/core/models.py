from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Text
from sqlalchemy.sql import func
from core.database import Base

class Deal(Base):
    __tablename__ = "deals"

    id            = Column(String, primary_key=True)
    target        = Column(String, nullable=False)
    acquirer      = Column(String, nullable=False)
    deal_type     = Column(String)
    deal_value    = Column(String)
    sector        = Column(String)
    currency      = Column(String, default="EUR")
    status        = Column(String, default="setup")  # setup|running|complete|error
    verdict       = Column(String)
    overall_score = Column(Float)
    deal_meta     = Column(JSON, default={})
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

class PillarResult(Base):
    __tablename__ = "pillar_results"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    deal_id    = Column(String, nullable=False)
    pillar     = Column(String, nullable=False)
    score      = Column(Float)
    summary    = Column(Text)
    findings   = Column(JSON, default=[])
    red_flags  = Column(JSON, default=[])
    raw_output = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
