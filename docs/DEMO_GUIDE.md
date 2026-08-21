# Dealigent — Pitch & Framework Guide

> Everything you need to explain Dealigent end-to-end to a BCG partner.
> Sections 1–4 = the story. Sections 5–9 = the engineering depth. Section 10 = live demo script. Section 11 = Q&A prep.

---

## 1. The 30-Second Elevator Pitch

> "M&A due diligence today takes 4–8 weeks, an army of analysts, and costs millions. Dealigent compresses the first-pass diligence into **minutes** using a team of **13 AI agents** that work in parallel across the six classic DD pillars — Commercial, Financial, Operational, Legal, Technology and Management. It pulls **real financial statements live from Yahoo Finance** (not AI guesses), scores each pillar, flags risks, computes a sector-aware valuation, and produces a partner-grade investment-committee recommendation and exportable report. Think of it as a junior deal team that never sleeps and costs nothing to run."

---

## 2. The Problem (frame it the way a partner thinks)

| Pain point | Today | With Dealigent |
|---|---|---|
| **Speed** | 4–8 weeks for first-pass DD | ~2 minutes |
| **Cost** | Analyst teams, data-room fees | ~free (open models + public data) |
| **Coverage** | Pillars done sequentially, siloed | 6 pillars **in parallel**, cross-synthesised |
| **Consistency** | Varies by analyst | Same rigorous framework every time |
| **Data integrity** | Manual, error-prone | Live Yahoo Finance, confidence-tagged |
| **Valuation discipline** | Easy to anchor on the ask | Sector multiples flag over/under-payment |

**The wedge:** This doesn't replace a deal team — it gives them a **rigorous first-pass screen** so humans spend their time on judgement, not data gathering.

---

## 3. Solution Overview — The Six-Pillar Framework

Dealigent operationalises the classic M&A diligence framework. Each pillar is an autonomous agent:

```
                    ┌─────────────────────────────┐
                    │      TARGET COMPANY          │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────┬──────────┬────┴─────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │   A    │ │   B    │ │   C    │ │   D    │ │   E    │ │   F    │
   │Commerc.│ │Financ. │ │Operat. │ │ Legal  │ │ Tech   │ │ Mgmt   │
   └────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
        └─────────┴──────────┴────┬─────┴──────────┴──────────┘
                                  ▼
                       ┌──────────────────────┐
                       │   SYNTHESIS AGENT     │  → PROCEED / CONDITIONAL / ABORT
                       └──────────────────────┘
```

---

## 4. The Agent Roster — 13 Agents in 4 Layers

### Layer 1 — Research Agents (run in the Setup Wizard, ~10s)

| # | Agent | Engine | Job | Output |
|---|---|---|---|---|
| 1 | **Profile Agent** | Groq LLM | Identify the company, resolve its stock ticker, classify sector | Company profile + NSE/BSE/global ticker |
| 2 | **Yahoo Finance Agent** | `yfinance` (live) | Pull real financial statements | Revenue, EBITDA, margins, EV, ratios, 5 fiscal years |
| 3 | **Market Intelligence Agent** | Apify + Groq | Market size, competitors, trends | TAM/SAM/SOM, competitor list, regulatory env |
| 4 | **News & Sentiment Agent** | yfinance news + Groq | Recent material news + sentiment | Sentiment score, key themes, material events |
| 5 | **RAG Seeder** | ChromaDB | Embed all research into the vector DB, tagged by company | Searchable knowledge base for the DD agents |

### Layer 2 — Due Diligence Agents (run on the Live Dashboard, parallel, ~70s)

| # | Agent | Analyses |
|---|---|---|
| 6 | **Commercial** | Market position, TAM, competitive moat, customer concentration, growth drivers |
| 7 | **Financial** | Revenue quality, EBITDA bridge, cash flow, debt, **deal multiples** (grounded in real Yahoo data) |
| 8 | **Operational** | Unit economics, scalability, supply chain, capacity, integration complexity |
| 9 | **Legal** | IP ownership, regulatory compliance, litigation, change-of-control |
| 10 | **Technology** | Tech stack maturity, security posture, technical debt, engineering quality |
| 11 | **Management** | Leadership quality (real executives from Yahoo), key-person risk, culture fit |

Each DD agent: **retrieves** company-specific context (RAG) → **reasons** (LLM) → emits **structured JSON** (score 0–100 + findings + red flags + key metrics) → **streams** token-by-token to the UI.

### Layer 3 — Critic / QA Agent (runs after all 6, before synthesis)

| # | Agent | Engine | Job |
|---|---|---|---|
| 12 | **Critic / QA Agent** | Cerebras gpt-oss-120b | Reviews all 6 pillar outputs for **evidence quality** and **cross-pillar consistency** — flags contradictions before they reach the partner. *(In testing it caught: "Financial cites improving cash conversion while Operational flags high energy-cost & debt burden — potential cash-flow inconsistency.")* |

### Layer 4 — Synthesis Agent (runs after the critic passes)

| # | Agent | Engine | Job |
|---|---|---|---|
| 13 | **Synthesis Agent** | Cerebras gpt-oss-120b | Ingest **all 6 pillars + real financials + every red flag**, produce the IC recommendation, thesis, strengths/risks, conditions precedent, 100-day plan |

**+ 6 on-demand Pillar Deep-Dive agents** — when you open a pillar page, a deep-dive agent generates the rich sections (Porter's 5 Forces, comps tables, IP registers, DORA metrics, exec profiles, etc.).

**+ 1 deterministic Financial Engine** (not an LLM) — pulls real Yahoo statements and computes sector-aware valuation. *This is the trust anchor: numbers are never hallucinated.*

---

## 5. End-to-End Workflow (the full data flow)

```
 USER                FRONTEND (React)          BACKEND (FastAPI)            EXTERNAL
  │                       │                          │                        │
  │ 1. Search company     │                          │                        │
  ├──────────────────────►│  POST /api/research      │                        │
  │                       ├─────────────────────────►│  Profile Agent ───────►│ Groq
  │                       │                          │  Yahoo Agent ─────────►│ Yahoo Finance
  │                       │   SSE: stage updates     │  Market+News Agents ──►│ Apify/Groq
  │                       │◄─────────────────────────┤  RAG Seeder ──────────►│ ChromaDB
  │ 2. Auto-filled form   │                          │                        │
  │                       │                          │                        │
  │ 3. Launch DD          │  POST /api/execute       │                        │
  ├──────────────────────►├─────────────────────────►│  ┌─ 6 DD agents ──────►│ Cerebras/Groq
  │                       │   SSE: live tokens +     │  │  (asyncio parallel, │ (+ ChromaDB RAG)
  │  watch agents stream  │◄──── scores ─────────────┤  └─ semaphore=2)       │
  │                       │                          │  Synthesis trigger     │
  │ 4. Open a pillar      │  GET /api/deepdive/...    │  Deep-dive agent ─────►│ Cerebras/Groq
  │                       │◄──── rich JSON ──────────┤  (+ real Yahoo inject) │
  │ 5. Financial Model    │  GET /api/financials/...  │  Financial Engine ────►│ Yahoo (live)
  │                       │◄──── real statements ────┤  + sector valuation    │
  │ 6. Synthesis          │  GET /api/synthesis/...   │  Synthesis Agent ─────►│ Cerebras gpt-oss
  │                       │◄──── recommendation ─────┤                        │
  │ 7. Export PDF         │  window.print()          │                        │
  │◄──────────────────────┤  (print-optimised)       │                        │
```

**Key flows to name-drop in the pitch:**
- **Server-Sent Events (SSE):** agents stream their thinking token-by-token — the "live" feel.
- **Parallel orchestration:** `asyncio.gather` runs all 6 DD agents at once, throttled by a semaphore to respect rate limits.
- **RAG grounding:** each agent retrieves *company-specific* context before reasoning (no cross-company contamination).

---

## 6. Multi-Agent Orchestration (the technical centrepiece)

```
run_dd_graph(deal, pillars)
   │
   ├── asyncio.Semaphore(2)          # max 2 concurrent LLM streams
   │
   ├── gather([                      # all pillars launched together
   │     run_pillar_agent("commercial") ─┐
   │     run_pillar_agent("financial")   │  each agent:
   │     run_pillar_agent("operational") │   1. query_context()  → ChromaDB RAG (company-scoped)
   │     run_pillar_agent("legal")       │   2. build_user_prompt() → sector-guardrailed
   │     run_pillar_agent("technology")  │   3. llm.stream()     → token stream to SSE queue
   │     run_pillar_agent("management") ─┘   4. _extract_json()  → {score, findings, red_flags}
   │   ])
   │
   └── synthesis: weighted score → verdict (PROCEED/CONDITIONAL/ABORT)
```

Each agent is **stateless and independent** — that's what makes it a true multi-agent system, not one big prompt. They can be added, removed, or re-run individually.

---

## 7. The Data-Integrity Framework (your strongest differentiator)

A partner's #1 objection to AI will be *"can I trust the numbers?"* Your answer:

```
                    ┌────────────────────────────────────┐
                    │   EVERY FINANCIAL FIGURE IS TAGGED   │
                    ├────────────────────────────────────┤
   HIGH  (green)  → │  Live from Yahoo Finance statements │
   MEDIUM (amber) → │  Web/news sourced                   │
   LOW   (grey)   → │  AI estimate (only if no ticker)    │
                    └────────────────────────────────────┘
```

- **Financials are NEVER AI-generated.** They come from `yfinance` — the same data as the Yahoo Finance website (we proved it matches to the rupee).
- **Sector-aware valuation:** a steel company is valued on steel multiples (EV/EBITDA 5–10x), not SaaS multiples. The system **flagged a ₹1,200 Cr offer as 1.7× the ₹722 Cr fair value** — automatic overpayment detection.
- **Provenance table:** every figure on the Financial page links back to its Yahoo source with a timestamp.
- **Company-scoped RAG:** agents only see the *target's* data — no leakage between companies.

> Pitch line: *"AI does the reasoning. Yahoo Finance does the numbers. We never let the model invent a balance sheet."*

---

## 8. Multi-Provider LLM Resilience (shows production maturity)

```
   prefer="bulk"  (6 DD agents)        prefer="synthesis" (IC report)
        │                                     │
        ▼                                     ▼
   ┌─────────┐   429?  ┌────────┐       ┌──────────┐  429?  ┌────────┐
   │  GROQ   │────────►│CEREBRAS│       │ CEREBRAS │───────►│ GEMINI │──► GROQ
   │ (fast)  │         │(1M/day)│       │(120B,    │        │(1M ctx)│
   └─────────┘         └────────┘       │ quality) │        └────────┘
   Llama 3.3 70B       gpt-oss-120b      gpt-oss-120b        Gemini 2.0
```

- Three free providers, **automatic fallback** on rate limits — the demo never hard-fails.
- Fast streaming model (Groq) for the parallel burst; heavyweight reasoning model (Cerebras gpt-oss-120b) for synthesis.
- 1M tokens/day free budget; a full demo run uses ~3%.

> Pitch line: *"It's provider-agnostic and self-healing — if one model is rate-limited, it transparently reroutes."*

---

## 9. Tech Stack (one slide)

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind, Recharts, Framer Motion, Zustand | Fast, glassmorphism UI, live charts |
| **Backend** | FastAPI (async), SSE streaming | Concurrent agents, real-time token streaming |
| **Orchestration** | asyncio + semaphore | True parallel multi-agent execution |
| **LLM** | Cerebras · Groq · Gemini (fallback layer) | Resilient, free, fast |
| **Memory / RAG** | ChromaDB + MiniLM embeddings | Company-scoped retrieval grounding |
| **Market data** | yfinance (Yahoo), Apify | Real, live financials & web intel |
| **Persistence** | SQLite (async) | Deal + pillar results store |

---

## 10. Live Demo Script (click-by-click, ~5 min)

> Run a company *other than Personio* live (e.g. a listed company the partner knows) — it proves it's real, not canned.

1. **Login** *(10s)* — "Glassmorphism UI, but the substance is underneath."
2. **Setup Wizard → type a company name → Research** *(15s)*
   - "Watch — five research agents fire: profile, **live Yahoo Finance**, market intel, news, and a RAG seeder. Real revenue, real market cap, real ticker — populated automatically."
3. **Launch Due Diligence** *(70s — narrate while it runs)*
   - "Six agents now run **in parallel**, streaming their reasoning live. Each scores its pillar 0–100, surfaces findings and red flags. This is the six-pillar M&A framework, automated."
   - Point at the sidebar dots turning green; the activity feed; the radar chart building.
4. **Open a pillar (e.g. Financial or Technology)** *(30s)*
   - "Click in — a deep-dive agent generates Porter's 5 Forces, comps tables, valuation range. Note the **sector-appropriate** detail."
5. **Financial Model** *(45s — the money shot)*
   - "Every number here is **live Yahoo Finance**, confidence-tagged HIGH. And critically — sector-aware valuation. It flagged this deal as **1.7× over fair value**. That's automatic overpayment detection a junior analyst would miss."
6. **Synthesis** *(30s)*
   - "The synthesis agent read all six pillars and the real financials and produced an IC recommendation: CONDITIONAL, with conditions precedent and a 100-day plan."
7. **Export Report** *(10s)* — "One click → a branded PDF for the committee."

---

## 11. Q&A Prep — Likely Partner Questions

**Q: "Can I trust AI-generated financials?"**
> The financials are NOT AI-generated. They're pulled live from Yahoo Finance via `yfinance` and tagged HIGH-confidence with a source link. The AI only does qualitative *reasoning* on top of real numbers. If no ticker matches (private co.), figures are clearly tagged LOW and flagged for manual review.

**Q: "How is this different from just asking ChatGPT?"**
> Three things: (1) it's a **multi-agent** system — six specialised agents in parallel, each with its own framework, not one prompt; (2) it's **grounded** — real Yahoo data + company-scoped RAG, so it can't hallucinate a balance sheet; (3) it's **structured** — every output is scored, traceable, and exportable.

**Q: "What stops it hallucinating, e.g. wrong tech stack for a steel company?"**
> Two guardrails: company-scoped RAG (agents only see the target's data) and explicit sector guardrails in every prompt. We caught and fixed exactly this — a steel company now correctly shows SAP/MES/IEC-62443, not SaaS microservices.

**Q: "Does it scale / what does it cost?"**
> It runs on free LLM tiers today (~3% of daily budget per deal) with automatic multi-provider failover. For production, swap in paid keys — same code. Marginal cost per deal is cents.

**Q: "What's the human's role?"**
> First-pass screening and structure. It tells the deal team *where to look* — which pillar is weak, which red flags to chase, whether the price is defensible. Humans still own judgement and confirmatory DD.

**Q: "Where could it go wrong / limitations?"**
> Private companies (no ticker) → financials drop to estimates. Deep legal/IP specifics need the data room. It's a **screen, not a substitute** for confirmatory diligence. Being honest about this builds credibility.

**Q: "What would v2 look like?"**
> Data-room document ingestion (upload the actual IM/contracts), private-company coverage via OpenBB/filings, a 7th ESG pillar, and confidence-weighted scoring.

---

## 12. The One-Liner to Close

> "Dealigent is a team of 13 AI agents that does the first-pass M&A diligence of a junior deal team — in two minutes, grounded in real financial data, for the cost of an API call."
