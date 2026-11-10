"""Multi-provider routing: whichever provider has a key answers, in a task-specific order."""
import pytest
from fastapi.testclient import TestClient

from agents import llm


@pytest.fixture
def keys(monkeypatch):
    def _set(**present):
        for name in ("cerebras", "groq", "gemini"):
            monkeypatch.setattr(llm.settings, f"{name}_api_key", "k" if present.get(name) else "")
    return _set


def test_bulk_order_with_all_providers(keys):
    keys(cerebras=True, groq=True, gemini=True)
    assert llm._order("bulk") == ["groq", "cerebras", "gemini"]


def test_synthesis_prefers_long_context(keys):
    keys(cerebras=True, groq=True, gemini=True)
    assert llm._order("synthesis") == ["cerebras", "gemini", "groq"]


def test_missing_providers_are_skipped(keys):
    keys(groq=True)
    assert llm._order("bulk") == ["groq"]
    assert llm._order("synthesis") == ["groq"]


def test_no_keys_means_no_providers(keys):
    keys()
    assert llm._order("bulk") == []


@pytest.mark.parametrize("msg", ["Error 429", "Rate limit reached", "quota exceeded", "RESOURCE_EXHAUSTED"])
def test_rate_limits_detected(msg):
    assert llm._is_rate_limit(Exception(msg))


def test_ordinary_errors_are_not_rate_limits():
    assert not llm._is_rate_limit(Exception("connection reset"))


def test_retry_delay_parsed_and_capped():
    assert llm._retry_delay(Exception("'retryDelay': '7s'")) == 9.0
    assert llm._retry_delay(Exception("'retryDelay': '120s'")) == 35.0
    assert llm._retry_delay(Exception("boom"), default=1.5) == 1.5


def test_system_messages_are_merged():
    system, rest = llm._split_system([
        {"role": "system", "content": "You are a DD analyst."},
        {"role": "user", "content": "Assess Acme."},
        {"role": "system", "content": "Reply in JSON."},
    ])
    assert system == "You are a DD analyst.\nReply in JSON."
    assert rest == [{"role": "user", "content": "Assess Acme."}]


def test_health_endpoint():
    from main import app

    # No context manager → lifespan (DB init, corpus seeding) is not triggered.
    resp = TestClient(app).get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "dealigent-api"}
