<div align="center">

<img src="docs/assets/banner.png" alt="Dealigent — agentic M&A due diligence" width="100%" />

<h3>A junior deal team that never sleeps.</h3>

<p>
Dealigent runs <b>12 AI agents</b> across the six classic due-diligence pillars <b>in parallel</b>,
grounds every financial figure in <b>live Yahoo Finance data</b> (never an LLM guess),
QA-reviews its own work with a <b>critic agent</b>, and hands you an investment-committee verdict,
first-pass, in minutes instead of weeks.
</p>

<p>
<a href="https://github.com/R341CUL/dealigent/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/R341CUL/dealigent/actions/workflows/ci.yml/badge.svg"></a>
<img alt="Python" src="https://img.shields.io/badge/python-3.12%2B-3776AB?logo=python&logoColor=white">
<img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white">
<img alt="Tests" src="https://img.shields.io/badge/tests-81%20passing-22c55e">
<img alt="LLMs" src="https://img.shields.io/badge/LLM-Groq%20·%20Cerebras%20·%20Gemini-0b2545">
<a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-f59e0b"></a>
<a href="https://github.com/R341CUL/dealigent/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/R341CUL/dealigent?style=social"></a>
</p>

<p>
<a href="#-quick-start"><b>Quick start</b></a> ·
<a href="#-see-it-in-action"><b>Demo</b></a> ·
<a href="#%EF%B8%8F-architecture"><b>Architecture</b></a> ·
<a href="#-python-cli"><b>CLI</b></a> ·
<a href="docs/ARCHITECTURE.md"><b>Deep dive</b></a> ·
<a href="#-team"><b>Team</b></a>
</p>

</div>

---

## 🎬 See it in action

<div align="center">
<img src="docs/media/walkthrough.gif" alt="Dealigent walkthrough: wizard → live agents → pillars → red flags → financials → synthesis → report" width="92%" />
<br/><sub>Personio GmbH × Workday: six agents stream in parallel, then synthesis, then a one-click IC report. <a href="docs/media/walkthrough.mp4">MP4 version</a>.</sub>
</div>

## 💡 Why Dealigent

First-pass M&A diligence takes **4–8 weeks**, a team of analysts and a data-room budget. Most of that
time goes on gathering and structuring information, not judgement. Dealigent automates the gathering and
keeps the judgement auditable:

| | Traditional first pass | **Dealigent** |
|---|---|---|
| Time to a view | 4–8 weeks | **~2 minutes** |
| Pillar coverage | Sequential, siloed workstreams | **6 pillars in parallel**, then cross-checked by a critic |
| Financial figures | Copied by hand from filings | **Pulled live from Yahoo Finance**, with source and timestamp |
| Valuation | Easy to anchor on the asking price | **Sector-aware multiples** that flag over- and under-payment |
| Trust | "The analyst said so" | **Every finding cites evidence and carries a confidence level**, plus an honest data-quality score |
| Cost | Expensive | **~free**: open-weight models on free tiers + public data |

> [!IMPORTANT]
> **Python does the maths, LLMs do the judgement.** Market data, valuation, verdict rules, confidence
> grounding and the data-quality score are deterministic, unit-tested Python. The agents interpret those
> numbers; they never invent them.

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

**🧠 Multi-agent pipeline**
- 4 research agents (profile, Yahoo Finance, market, news) seed a per-company RAG corpus
- 6 DD agents (Commercial, Financial, Operational, Legal, Technology, Management) run concurrently and stream token by token over SSE
- A **critic / QA agent** reviews evidence quality and cross-pillar consistency before synthesis
- An on-demand **deep-dive agent** for every pillar
- A **synthesis agent** writes a partner-level IC recommendation

</td>
<td width="50%" valign="top">

**📊 Deterministic finance engine**
- Live multi-year P&L, balance sheet and ratios via `yfinance`
- Sector-aware EV/EBITDA and EV/Revenue ranges across 15 sectors
- **Equity-value path for banks and insurers**, where EV is meaningless
- Synergy, control-premium and fair-offer build-up
- Overpay / bargain flags vs. the entered deal value
- Live public peer benchmarking

</td>
</tr>
<tr>
<td valign="top">

**🛡️ Honesty by design**
- Every finding carries `evidence` and `confidence`; cited evidence can never be marked LOW
- Each pillar records its **grounding**: proprietary corpus vs. model knowledge
- Deterministic **data-quality score** with explicit caveats
- If every LLM provider is down, a no-fabrication fallback says so plainly

</td>
<td valign="top">

**⚙️ Engineering**
- Async FastAPI + SQLAlchemy + ChromaDB
- **Multi-LLM router** with automatic rate-limit fallback (Groq → Cerebras → Gemini)
- Data-room upload: PDF/TXT/MD are chunked into the RAG corpus
- **Python CLI** for headless runs, memos and valuation charts
- 81 pytest tests and GitHub Actions CI

</td>
</tr>
</table>

## 🖼️ Product tour

<table>
<tr>
<td width="50%"><img src="docs/screenshots/01_wizard.png" alt="Setup wizard"/><br/><b>1 · Setup wizard</b>: type a company name and the research agents auto-fill the deal.</td>
<td width="50%"><img src="docs/screenshots/personio_1_dashboard.png" alt="Live dashboard"/><br/><b>2 · Live dashboard</b>: six agents stream in parallel, then the score and verdict appear.</td>
</tr>
<tr>
<td><img src="docs/screenshots/personio_2_pillar.png" alt="Pillar deep-dive"/><br/><b>3 · Pillar deep-dive</b>: findings with evidence, confidence badges and swing factors.</td>
<td><img src="docs/screenshots/personio_3_redflags.png" alt="Red flags"/><br/><b>4 · Red-flag register</b>: risks aggregated across pillars and ranked by severity.</td>
</tr>
<tr>
<td><img src="docs/screenshots/tatasteel_4_financial.png" alt="Financial model"/><br/><b>5 · Financial model</b>: live Yahoo statements, sector valuation and peer comps.</td>
<td><img src="docs/screenshots/personio_5_synthesis.png" alt="Synthesis"/><br/><b>6 · Synthesis</b>: Proceed / Conditional / Abort with conditions precedent and value levers.</td>
</tr>
<tr>
<td><img src="docs/screenshots/personio_6_report.png" alt="IC report"/><br/><b>7 · IC report</b>: cover, scorecard, financials and cited risks, exported in one click.</td>
<td><img src="docs/screenshots/00_login.png" alt="Login"/><br/><b>0 · Sign-in</b>: the demo account is shown on screen.</td>
</tr>
</table>

<details>
<summary><b>More: the same engine across sectors and verdicts</b> (Tata Steel · Commerzbank · Tate &amp; Lyle)</summary>
<br/>

| Tata Steel (Steel & Metals) | Commerzbank (Banking) | Tate & Lyle (Food ingredients) |
|---|---|---|
| ![Tata Steel dashboard](docs/screenshots/tatasteel_1_dashboard.png) | ![Commerzbank dashboard](docs/screenshots/commerzbank_1_dashboard.png) | ![Tate & Lyle dashboard](docs/screenshots/tatelyle_1_dashboard.png) |
| ![Tata Steel synthesis](docs/screenshots/tatasteel_5_synthesis.png) | ![Commerzbank financials](docs/screenshots/commerzbank_4_financial.png) | ![Tate & Lyle red flags](docs/screenshots/tatelyle_3_redflags.png) |

Commerzbank shows the **equity-value path**: for a bank, deposits count as debt, so EV/EBITDA is
meaningless and Dealigent values on market cap plus a control premium.

</details>

## 🏗️ Architecture

<img src="docs/assets/architecture.png" alt="Dealigent architecture: research layer → parallel DD agents → decision layer" width="100%" />

```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI
    participant API as FastAPI
    participant R as Research agents
    participant Y as Yahoo Finance
    participant C as ChromaDB
    participant DD as 6 DD agents
    participant Q as Critic agent
    participant S as Synthesis

    UI->>API: POST /api/research/stream {company, acquirer}
    API->>R: profile → financials → market ∥ news
    R->>Y: live statements, ratios, peers
    R->>C: seed per-company corpus
    API-->>UI: SSE: stage_start / stage_complete
    UI->>API: GET /api/execute/{deal}/stream
    par max 2 concurrent (provider rate limits)
        API->>DD: pillar prompt + RAG context
        DD-->>UI: SSE: agent_chunk (tokens)
    end
    DD->>API: JSON → guardrails (evidence, confidence, swing factors)
    API->>Q: review all pillars
    Q-->>UI: SSE: critic_complete
    API-->>UI: SSE: synthesis_complete {score, verdict}
    UI->>API: GET /api/synthesis/{deal}
    API->>S: pillars + real financials + data-quality score
    S-->>UI: IC recommendation
```

### Python vs. LLM responsibilities

| Deterministic Python (tested) | LLM agents |
|---|---|
| Live market data and unit conversion (₹ Cr / M) | Pillar analysis and qualitative judgement |
| Sector-aware valuation, synergies, fair offer, overpay flag | Red-flag identification and framing |
| Verdict rules (`PROCEED` / `CONDITIONAL` / `ABORT`) | Swing-factor questions |
| Evidence and confidence normalisation, grounding labels | Critic / QA review |
| Data-quality score and caveats | IC synthesis and memo prose |
| Provider routing, retries, rate-limit fallback | |

Full write-up, including module map, SSE event schema and design decisions: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## 🚀 Quick start

**Prerequisites:** Python 3.12+, Node 20+, and at least one free LLM key
([Groq](https://console.groq.com) · [Cerebras](https://cloud.cerebras.ai) · [Gemini](https://aistudio.google.com/apikey)).

```bash
git clone https://github.com/R341CUL/dealigent.git && cd dealigent

# 1 · backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # add at least one LLM key
uvicorn main:app --port 8000

# 2 · frontend (new terminal)
cd frontend && npm install && npm run dev    # → http://localhost:5173
```

Sign in with the demo credentials shown on the login screen, then **Setup Wizard → type a company → Launch**.

> [!TIP]
> Port 8000 taken? Run the API on another port and point the dev proxy at it:
> `uvicorn main:app --port 8001` and `DEALIGENT_API=http://localhost:8001 npm run dev`.

## 🐍 Python CLI

The full engine also runs headless from `backend/`.

```bash
python cli.py providers                                   # which LLMs are configured + routing order
python cli.py valuate TATASTEEL.NS --deal-value 300000 \
       --chart football_field.png                         # live valuation, no API key needed
python cli.py diligence "Tata Steel" --acquirer "JSW Steel" \
       --country India --currency INR --deal-value "₹3,00,000Cr"   # research → 6 agents → critic → memo
```

<table>
<tr>
<td width="55%"><img src="docs/assets/cli_valuate.png" alt="dealigent valuate output"/></td>
<td width="45%"><img src="docs/assets/football_field_tatasteel.png" alt="Valuation football field"/><br/><sub><code>valuate --chart</code>: football field built from sector multiples, live peer EV/EBITDA, standalone EV, fair offer and the proposed price.</sub></td>
</tr>
</table>

`diligence` writes a Markdown IC memo and the raw JSON to `reports/`: scores, grounding per pillar,
red flags sorted by severity with evidence and confidence, and the critic's review.

## 🧪 Tests

```bash
cd backend && pip install -r requirements-dev.txt
pytest            # 81 tests: valuation, guardrails, verdict rules, chunking, data quality, LLM routing
ruff check .
```

The tests pin the parts that must never drift: the valuation arithmetic, the bank equity path,
the verdict thresholds, the "cited evidence can't be LOW" rule, and the guarantee that fallbacks never
fabricate company-specific numbers.

## 📁 Project structure

```text
dealigent/
├── backend/                       # Python · FastAPI
│   ├── agents/
│   │   ├── research/              # profile · yfinance · market · news agents + orchestrator
│   │   ├── deepdive/              # per-pillar deep-dive prompts
│   │   ├── financials.py          # live statements + sector-aware valuation engine
│   │   ├── runner.py              # parallel DD graph, guardrails, verdict rules
│   │   ├── critic.py              # supervisory QA agent
│   │   ├── rag.py                 # ChromaDB corpus, chunking, per-company retrieval
│   │   ├── llm.py                 # Groq / Cerebras / Gemini router with fallback
│   │   └── prompts.py             # pillar system prompts
│   ├── api/                       # deals · research · execution (SSE) · deepdive · financials · synthesis · documents
│   ├── core/                      # settings, async DB, models
│   ├── tests/                     # pytest suite
│   ├── cli.py                     # headless CLI
│   └── main.py
├── frontend/                      # React 19 · Vite · Tailwind · Recharts · Zustand
├── docs/                          # architecture, screenshots, media, demo guide
├── showcase/                      # Playwright capture script + deck builder (python-pptx)
├── scripts/build_readme_assets.py # renders the README artwork
└── render.yaml                    # one-click Render blueprint for the API
```

## 🔌 API

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/api/research/stream` | Research agents, streamed over SSE |
| `POST` | `/api/deals/` | Create a deal |
| `GET` | `/api/execute/{deal_id}/stream` | Run the 6 DD agents + critic, streamed over SSE |
| `GET` | `/api/deepdive/{deal_id}/{pillar}/stream` | Pillar deep dive, streamed over SSE |
| `GET` | `/api/financials/{deal_id}` | Live statements, valuation and peers |
| `GET` | `/api/synthesis/{deal_id}` | IC synthesis and data-quality score |
| `POST` | `/api/documents/{deal_id}/upload` | Add a data-room document to the RAG corpus |
| `GET` | `/health` | Liveness |

Interactive docs are served at `http://localhost:8000/docs`.

## ☁️ Deploy

- **API → Render:** `render.yaml` is a ready blueprint (New → Blueprint → this repo), then set your LLM keys and `CORS_ORIGINS`.
- **UI → Vercel:** import `frontend/` and set `VITE_API_URL` to your Render URL.

## 🗺️ Roadmap

- [ ] SEC EDGAR / Companies House filings as a second, citable data source
- [ ] DCF and accretion/dilution modules in the finance engine
- [ ] Formula-driven Excel model export
- [ ] Multi-round critic loop (targeted re-runs of weak pillars)
- [ ] Docker Compose one-liner

## 👥 Team

<table>
<tr>
<td align="center" width="50%">
<a href="https://github.com/R341CUL"><img src="https://github.com/R341CUL.png" width="96" alt="Anish Chatterjee"/><br/><b>Anish Chatterjee</b></a><br/>
<sub>Product &amp; strategy lead</sub><br/>
<sub>Agent architecture · six-pillar DD framework · research orchestration · critic and synthesis logic · verdict rules · CLI</sub>
</td>
<td align="center" width="50%">
<a href="https://github.com/ANNYM25"><img src="https://github.com/ANNYM25.png" width="96" alt="Anny Mondal"/><br/><b>Anny Mondal</b></a><br/>
<sub>Finance lead</sub><br/>
<sub>Yahoo Finance data agent · valuation engine · peer benchmarking · financial model UI · deployment</sub>
</td>
</tr>
</table>

## ⭐ Support the project

If Dealigent saved you a week of first-pass diligence, or you just like seeing agents do real finance
work, **please give it a star**. It helps other people find it.

[![Star History Chart](https://api.star-history.com/svg?repos=R341CUL/dealigent&type=Date)](https://star-history.com/#R341CUL/dealigent&Date)

## ⚖️ Disclaimer

Dealigent produces a **first-pass, public-data screen**. It is not investment, legal or tax advice. A real
diligence needs the private data room: contracts, cap table and management accounts. The bundled Personio
corpus is an illustrative demo dataset, and every deal shown is hypothetical.

<div align="center"><sub>MIT © 2026 Anish Chatterjee &amp; Anny Mondal</sub></div>
