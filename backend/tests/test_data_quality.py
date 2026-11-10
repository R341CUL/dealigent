"""Deterministic honesty layer: deal-value parsing, data-room chunking and the synthesis quality score."""
import json
from types import SimpleNamespace

import pytest

from agents.rag import _chunk_text
from api.financials import _parse_deal_value
from api.synthesis import _compute_data_quality


class TestDealValueParsing:
    @pytest.mark.parametrize("raw,expected", [
        ("€1.8B", 1800.0),
        ("$2.5 Billion", 2500.0),
        ("₹1,200Cr", 1200.0),
        ("€1800M", 1800.0),
        ("", None),
        ("undisclosed", None),
    ])
    def test_parse(self, raw, expected):
        assert _parse_deal_value(raw) == expected


class TestChunking:
    def test_empty_text(self):
        assert _chunk_text("") == [] and _chunk_text(None) == []

    def test_short_text_is_one_chunk(self):
        assert _chunk_text("Revenue grew 49% to €142M.") == ["Revenue grew 49% to €142M."]

    def test_chunks_respect_size_and_overlap(self):
        text = " ".join(f"Sentence number {i} about the target company." for i in range(400))
        chunks = _chunk_text(text, size=500, overlap=100)
        assert len(chunks) > 1
        assert all(len(c) <= 500 for c in chunks)
        # consecutive chunks share context so retrieval never splits a fact cleanly in half
        assert chunks[1][:40] in chunks[0]

    def test_whitespace_is_collapsed(self):
        assert _chunk_text("a\n\n   b\t c") == ["a b c"]


def _row(has_corpus: bool, confidences: list[str]):
    return SimpleNamespace(
        raw_output=json.dumps({"grounding": {"has_corpus": has_corpus}}),
        findings=[{"confidence": c} for c in confidences],
        red_flags=[],
    )


class TestSynthesisDataQuality:
    def test_fully_grounded_run_is_high(self):
        rows = [_row(True, ["HIGH", "HIGH"]) for _ in range(6)]
        q = _compute_data_quality(rows, financials_found=True)
        assert q["level"] == "High" and q["score"] == 100
        assert q["signals"]["Proprietary documents"] == "6/6 pillars"

    def test_public_only_run_is_flagged(self):
        rows = [_row(False, ["LOW", "MEDIUM"]) for _ in range(6)]
        q = _compute_data_quality(rows, financials_found=False)
        assert q["level"] == "Low"
        assert any("No live market financials" in c for c in q["caveats"])
        assert any("6 of 6 pillars" in c for c in q["caveats"])

    def test_public_data_caveat_always_present(self):
        q = _compute_data_quality([_row(True, ["HIGH"])], financials_found=True)
        assert any("private data room" in c for c in q["caveats"])
