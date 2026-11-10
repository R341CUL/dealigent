"""Post-processing guardrails that sit between raw LLM output and anything a user sees."""
import json

import pytest

from agents.runner import (
    FALLBACK_SCORES,
    PILLAR_ORDER,
    _build_grounding,
    _compute_verdict,
    _extract_json,
    _fallback_result,
    _ground_items,
    _normalize_confidence,
    _normalize_swing,
)


class TestVerdict:
    @pytest.mark.parametrize("score,flags,expected", [
        (85, [], "PROCEED"),
        (80, [], "PROCEED"),
        (85, [{"severity": "critical"}], "CONDITIONAL"),
        (70, [], "CONDITIONAL"),
        (54.9, [], "ABORT"),
        (90, [{"severity": "critical"}, {"severity": "critical"}], "ABORT"),
        (75, [{"severity": "high"}] * 5, "CONDITIONAL"),
    ])
    def test_verdict_rules(self, score, flags, expected):
        assert _compute_verdict(score, flags) == expected


class TestJsonExtraction:
    def test_plain_json(self):
        assert _extract_json('{"score": 81}') == {"score": 81}

    def test_markdown_fenced_json(self):
        assert _extract_json('```json\n{"score": 72, "summary": "ok"}\n```')["score"] == 72

    def test_json_wrapped_in_prose(self):
        text = 'Here is my analysis:\n{"score": 64, "findings": []}\nHope this helps.'
        assert _extract_json(text)["score"] == 64

    def test_garbage_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _extract_json("no json here")


class TestConfidence:
    @pytest.mark.parametrize("raw,expected", [
        ("HIGH", "HIGH"), ("high", "HIGH"), ("Hi", "HIGH"),
        ("low", "LOW"), ("medium", "MEDIUM"), ("unsure", "MEDIUM"),
        (None, "MEDIUM"), ("", "MEDIUM"),
    ])
    def test_normalisation(self, raw, expected):
        assert _normalize_confidence(raw) == expected


class TestGrounding:
    def test_cited_evidence_cannot_be_low_confidence(self):
        items = _ground_items([{"title": "x", "evidence": "Q3 board pack p.12", "confidence": "low"}], has_corpus=False)
        assert items[0]["confidence"] == "MEDIUM"

    def test_missing_evidence_is_labelled_sector_knowledge(self):
        items = _ground_items([{"title": "x"}], has_corpus=False)
        assert items[0]["evidence"] == "Sector knowledge"
        assert items[0]["confidence"] == "LOW"

    def test_corpus_raises_default_confidence(self):
        assert _ground_items([{"title": "x"}], has_corpus=True)[0]["confidence"] == "MEDIUM"

    def test_non_dict_items_are_dropped(self):
        assert _ground_items(["stray string", None, {"title": "ok"}], has_corpus=False) == [
            {"title": "ok", "evidence": "Sector knowledge", "confidence": "LOW"}
        ]

    def test_grounding_basis(self):
        assert _build_grounding([])["has_corpus"] is False
        g = _build_grounding(["a", "b"])
        assert g == {"has_corpus": True, "chunks": 2, "basis": "Proprietary corpus (2 documents)"}


class TestSwingFactors:
    def test_strings_are_promoted_and_capped_at_three(self):
        out = _normalize_swing(["a?", "b?", "c?", "d?"])
        assert [s["question"] for s in out] == ["a?", "b?", "c?"]
        assert all(s["direction"] == "both" and s["impact"] == "MEDIUM" for s in out)

    def test_invalid_direction_defaults_to_both(self):
        assert _normalize_swing([{"question": "q", "direction": "sideways"}])[0]["direction"] == "both"

    def test_empty_questions_are_skipped(self):
        assert _normalize_swing([{"question": "  "}, {"q": "kept"}]) == [
            {"question": "kept", "direction": "both", "impact": "MEDIUM"}
        ]


class TestFallback:
    @pytest.mark.parametrize("pillar", PILLAR_ORDER)
    def test_fallback_never_fabricates(self, pillar):
        out = _fallback_result(pillar, {"targetCompany": "Acme AG", "sector": "Logistics"})
        assert out["_fallback"] is True
        assert out["score"] == FALLBACK_SCORES[pillar]
        assert out["red_flags"] == [] and out["key_metrics"] == {}
        assert "Acme AG" in out["summary"]
        assert "Personio" not in json.dumps(out)
