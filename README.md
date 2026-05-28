# Dealigent — AI M&A Due Diligence Platform

Agentic due-diligence platform that runs **6 AI agents in parallel** across the
Commercial, Financial, Operational, Legal, Technology and Management pillars,
grounds financials in **live Yahoo Finance data**, and produces an
investment-committee synthesis and exportable report.

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 18 · Vite · Tailwind · Recharts · Framer Motion · Zustand · React Router |
| Backend | FastAPI · SQLite (async) · ChromaDB (RAG) |
| LLM | Multi-provider fallback — **Cerebras** (gpt-oss-120b) → **Groq** (Llama 3.3 70B) → **Gemini** (2.0 Flash) |
| Market data | yfinance (live Yahoo Finance) + optional Apify |

**12 agents total:** 5 research agents (profile, Yahoo Finance, market, news, RAG seeder),
6 parallel DD agents, 1 synthesis agent. Each DD pillar also has an on-demand deep-dive agent.

## Quick start

### Backend
```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env        # then add at least one LLM key (Cerebras recommended)
./venv/bin/uvicorn main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Login with the demo credentials shown on the login screen.

## Flow
Login → Setup Wizard (search a public company → live research auto-fills the form)
→ Live Dashboard (launch the 6 agents, watch them stream) → Pillar deep-dives
→ Red Flags · Financial Model (real Yahoo statements + sector valuation)
→ Synthesis → Report Export (one-click PDF).

## Notes
- **Financials are always from Yahoo Finance** (via `yfinance`), never AI-estimated.
  Sector-aware valuation flags over/under-payment vs. fundamentals.
- LLM keys are optional individually; the app uses whichever providers are configured
  and falls back automatically on rate limits.
- A real demo run uses ~3% of Cerebras's free daily token budget.
