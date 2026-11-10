"""Shared pytest fixtures. Tests import backend modules directly (backend/ is the root)."""
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


@pytest.fixture
def saas_financials() -> dict:
    """A realistic Yahoo-shaped payload for a profitable software company (USD, millions)."""
    return {
        "found": True,
        "sector": "Technology",
        "industry": "Software - Application",
        "latest_revenue": 1000.0,
        "latest_ebitda": 250.0,
        "enterprise_value": 9000.0,
        "market_cap": 9500.0,
        "ev_ebitda": 36.0,
        "ev_revenue": 9.0,
        "unit": "M",
        "currency": "USD",
    }


@pytest.fixture
def bank_financials() -> dict:
    """A bank: EV is meaningless (deposits count as debt), so equity value drives the range."""
    return {
        "found": True,
        "sector": "Financial Services",
        "industry": "Banks - Regional",
        "latest_revenue": 12000.0,
        "latest_ebitda": None,
        "enterprise_value": -45000.0,
        "market_cap": 20000.0,
        "unit": "M",
        "currency": "EUR",
    }
