"""Deterministic valuation engine — every number here is arithmetic, never an LLM guess."""
import math

import pytest

from agents.financials import (
    SECTOR_MULTIPLES,
    _conv,
    _get_sector_peers,
    _is_financial,
    _resolve_multiples,
    compute_valuation,
)


class TestUnitConversion:
    def test_millions_for_non_inr(self):
        assert _conv(1_234_000_000, is_inr=False) == 1234.0

    def test_crore_for_inr(self):
        # 1 crore = 10^7
        assert _conv(52_000_000_000, is_inr=True) == 5200.0

    @pytest.mark.parametrize("value", [None, math.nan])
    def test_missing_values_become_none(self, value):
        assert _conv(value, is_inr=False) is None


class TestSectorResolution:
    def test_software_beats_generic_technology(self):
        assert _resolve_multiples("Technology", "Software - Application")["label"] == "Software / SaaS"

    def test_steel_is_matched_from_industry(self):
        assert _resolve_multiples("Basic Materials", "Steel")["label"] == "Steel & Metals"

    def test_unknown_sector_falls_back_to_default(self):
        assert _resolve_multiples("Space Tourism", "") is SECTOR_MULTIPLES["default"]

    def test_every_range_is_ordered_low_mid_high(self):
        for key, mult in SECTOR_MULTIPLES.items():
            for name in ("ev_ebitda", "ev_rev"):
                lo, mid, hi = mult[name]
                assert lo <= mid <= hi, f"{key}.{name} is not monotonic"

    @pytest.mark.parametrize("sector,industry", [
        ("Financial Services", "Banks - Diversified"),
        ("Financial Services", "Insurance - Life"),
        ("", "Asset Management"),
    ])
    def test_financial_institutions_detected(self, sector, industry):
        assert _is_financial(sector, industry)

    def test_industrials_are_not_financial(self):
        assert not _is_financial("Industrials", "Steel")

    def test_peer_universe_is_wider_than_the_three_shown(self):
        # the target itself may be in the list, so keep spares for fetch_sector_peers to fall back on
        assert len(_get_sector_peers("Enterprise SaaS")) > 3
        assert _get_sector_peers("Underwater Basket Weaving") == []

    def test_fetch_sector_peers_excludes_target_and_caps_at_three(self, monkeypatch):
        import asyncio

        from agents import financials

        monkeypatch.setattr(financials, "_fetch_peer_summary", lambda tk: {"ticker": tk})
        peers = asyncio.run(financials.fetch_sector_peers("Steel", exclude_ticker="SAIL.NS"))
        assert [p["ticker"] for p in peers] == ["JSWSTEEL.NS", "TATASTEEL.NS", "NUE"]


class TestEnterpriseValuation:
    def test_not_found_is_unavailable(self):
        assert compute_valuation({"found": False}) == {"available": False}

    def test_ev_ranges_use_sector_multiples(self, saas_financials):
        v = compute_valuation(saas_financials)
        lo, mid, hi = SECTOR_MULTIPLES["software"]["ev_ebitda"]
        assert v["valuation_mode"] == "enterprise"
        assert v["ev_from_ebitda"] == {"low": 250 * lo, "base": 250 * mid, "high": 250 * hi}

    def test_fair_offer_is_ev_plus_premium_plus_synergies(self, saas_financials):
        v = compute_valuation(saas_financials)
        ev = 9000.0
        assert v["standalone_ev"] == ev
        assert v["control_premium"] == pytest.approx(ev * 0.25)
        assert v["revenue_synergies"] == pytest.approx(ev * 0.06)
        assert v["cost_synergies"] == pytest.approx(ev * 0.05)
        assert v["fair_offer"] == pytest.approx(ev * 1.36)

    def test_missing_ev_falls_back_to_multiple_based_ev(self, saas_financials):
        saas_financials["enterprise_value"] = None
        v = compute_valuation(saas_financials)
        assert v["standalone_ev"] == v["ev_from_ebitda"]["base"]

    def test_overpayment_is_flagged_high(self, saas_financials):
        v = compute_valuation(saas_financials, deal_value_entered=20_000)
        assert v["overpay_flag"]["severity"] == "high"

    def test_bargain_is_flagged_medium(self, saas_financials):
        v = compute_valuation(saas_financials, deal_value_entered=5_000)
        assert v["overpay_flag"]["severity"] == "medium"

    def test_fair_price_raises_no_flag(self, saas_financials):
        v = compute_valuation(saas_financials, deal_value_entered=12_000)
        assert v["overpay_flag"] is None


class TestEquityValuation:
    def test_banks_use_equity_value_not_ev(self, bank_financials):
        v = compute_valuation(bank_financials)
        assert v["valuation_mode"] == "equity"
        assert v["standalone_ev"] == 20000.0
        assert v["fair_offer"] == pytest.approx(25000.0)
        assert v["revenue_synergies"] is None and v["cost_synergies"] is None

    def test_negative_ev_forces_equity_path_even_outside_financials(self, saas_financials):
        saas_financials["enterprise_value"] = -100.0
        assert compute_valuation(saas_financials)["valuation_mode"] == "equity"
