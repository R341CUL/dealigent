"""
Multi-provider LLM layer with automatic fallback.

Provider order (all run Llama 3.3 70B except Gemini):
  1. Cerebras  — 1M tokens/day free, fastest, PRIMARY for everything
  2. Groq      — fast, daily cap, first fallback
  3. Gemini    — 1M context, per-minute throttle on free tier, last fallback

prefer="bulk"      → Cerebras → Groq → Gemini   (research, 6 DD agents, deep-dives)
prefer="synthesis" → Cerebras → Gemini → Groq   (synthesis/report; Gemini's 1M ctx 2nd)

Every provider is optional. Whichever has a key + quota answers. If only Groq has
a key, everything runs on Groq (original behaviour). Adding a Cerebras key makes it
primary automatically — no other code changes.
"""
import asyncio
from core.config import settings

CEREBRAS_MODEL = "gpt-oss-120b"              # OpenAI open 120B on Cerebras (reasoning model)
GROQ_MODEL     = "openai/gpt-oss-120b"       # Groq model id (llama-3.3-70b-versatile decommissioned 2025)
GEMINI_MODEL   = "gemini-3.1-flash-lite"     # 2.0/2.5-flash retired for new users; 3.1-flash-lite is current GA fallback

_groq = _gemini = _cerebras = None


def _groq_client():
    global _groq
    if _groq is None and settings.groq_api_key:
        from groq import AsyncGroq
        _groq = AsyncGroq(api_key=settings.groq_api_key)
    return _groq


def _cerebras_client():
    global _cerebras
    if _cerebras is None and settings.cerebras_api_key:
        from cerebras.cloud.sdk import AsyncCerebras
        _cerebras = AsyncCerebras(api_key=settings.cerebras_api_key)
    return _cerebras


def _gemini_client():
    global _gemini
    if _gemini is None and settings.gemini_api_key:
        from google import genai
        _gemini = genai.Client(api_key=settings.gemini_api_key)
    return _gemini


def has(provider: str) -> bool:
    return bool({
        "cerebras": settings.cerebras_api_key,
        "groq":     settings.groq_api_key,
        "gemini":   settings.gemini_api_key,
    }.get(provider))


def gemini_available() -> bool:  # back-compat
    return has("gemini")


def _is_rate_limit(exc: Exception) -> bool:
    s = str(exc).lower()
    return "429" in s or "rate limit" in s or "quota" in s or "resource_exhausted" in s


def _retry_delay(exc: Exception, default: float = 0.0) -> float:
    import re
    m = re.search(r"retryDelay['\"]?:?\s*['\"]?(\d+)s", str(exc))
    return min(float(m.group(1)) + 2, 35.0) if m else default


def _order(prefer: str) -> list[str]:
    if prefer == "synthesis":
        # quality + 1M/day budget: Cerebras gpt-oss-120b leads; Gemini 1M ctx; Groq last
        chain = ["cerebras", "gemini", "groq"]
    else:  # bulk: fast parallel streaming — Groq leads; Cerebras absorbs overflow when Groq caps
        chain = ["groq", "cerebras", "gemini"]
    return [p for p in chain if has(p)]


def _split_system(messages):
    system, rest = "", []
    for m in messages:
        (system := system + m["content"] + "\n") if m["role"] == "system" else rest.append(m)
    return system.strip(), rest


# ── per-provider non-streaming ──
async def _c_complete(messages, temperature, max_tokens, seed):
    r = await _cerebras_client().chat.completions.create(
        model=CEREBRAS_MODEL, messages=messages, temperature=temperature,
        max_tokens=max(max_tokens, 2500) + 1500, reasoning_effort="low",
        seed=seed,
    )
    return r.choices[0].message.content or ""

async def _g_complete(messages, temperature, max_tokens, seed):
    r = await _groq_client().chat.completions.create(
        model=GROQ_MODEL, messages=messages, temperature=temperature,
        max_tokens=max_tokens, seed=seed,
    )
    return r.choices[0].message.content or ""

async def _gem_complete(messages, temperature, max_tokens, seed):
    from google.genai import types
    system, rest = _split_system(messages)
    contents = "\n\n".join(m["content"] for m in rest)
    cfg = types.GenerateContentConfig(
        temperature=temperature, max_output_tokens=max_tokens,
        system_instruction=system or None, seed=seed,
    )
    for attempt in range(2):
        try:
            r = await _gemini_client().aio.models.generate_content(model=GEMINI_MODEL, contents=contents, config=cfg)
            return r.text or ""
        except Exception as e:
            if attempt == 0 and _is_rate_limit(e):
                await asyncio.sleep(_retry_delay(e, 12.0)); continue
            raise

_COMPLETE = {"cerebras": _c_complete, "groq": _g_complete, "gemini": _gem_complete}


# ── per-provider streaming ──
async def _c_stream(messages, temperature, max_tokens, on_token, seed):
    stream = await _cerebras_client().chat.completions.create(
        model=CEREBRAS_MODEL, messages=messages, temperature=temperature,
        max_tokens=max(max_tokens, 2500) + 1500, reasoning_effort="low", stream=True,
        seed=seed,
    )
    full = ""
    async for chunk in stream:
        tok = (chunk.choices[0].delta.content or "") if chunk.choices else ""
        if tok:
            full += tok
            if on_token: await on_token(tok)
    return full

async def _g_stream(messages, temperature, max_tokens, on_token, seed):
    stream = await _groq_client().chat.completions.create(
        model=GROQ_MODEL, messages=messages, temperature=temperature,
        max_tokens=max_tokens, stream=True, seed=seed,
    )
    full = ""
    async for chunk in stream:
        tok = chunk.choices[0].delta.content or ""
        if tok:
            full += tok
            if on_token: await on_token(tok)
    return full

async def _gem_stream(messages, temperature, max_tokens, on_token, seed):
    from google.genai import types
    system, rest = _split_system(messages)
    contents = "\n\n".join(m["content"] for m in rest)
    cfg = types.GenerateContentConfig(
        temperature=temperature, max_output_tokens=max_tokens,
        system_instruction=system or None, seed=seed,
    )
    full = ""
    stream = await _gemini_client().aio.models.generate_content_stream(model=GEMINI_MODEL, contents=contents, config=cfg)
    async for chunk in stream:
        tok = chunk.text or ""
        if tok:
            full += tok
            if on_token: await on_token(tok)
    return full

_STREAM = {"cerebras": _c_stream, "groq": _g_stream, "gemini": _gem_stream}


# ── public API ──
async def complete(messages, prefer="bulk", temperature=0, max_tokens=1500, seed=42):
    order = _order(prefer)
    if not order:
        raise RuntimeError("No LLM provider configured (set CEREBRAS_API_KEY / GROQ_API_KEY / GEMINI_API_KEY)")
    last = None
    for prov in order:
        try:
            return await _COMPLETE[prov](messages, temperature, max_tokens, seed), prov
        except Exception as e:
            last = e
            continue
    raise last


async def stream(messages, prefer="bulk", temperature=0, max_tokens=1500, on_token=None, seed=42):
    order = _order(prefer)
    if not order:
        raise RuntimeError("No LLM provider configured")
    last = None
    for prov in order:
        try:
            return await _STREAM[prov](messages, temperature, max_tokens, on_token, seed), prov
        except Exception as e:
            last = e
            continue
    raise last
