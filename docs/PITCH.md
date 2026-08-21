# Dealigent — Why This, Why Now
### Pitch Deck (14 slides) — content + speaker notes
> Paste each slide into Canva / Google Slides / PowerPoint. Speaker notes go in the notes pane.
> Design: dark navy (#003d79→#001f26) + electric teal (#00D4F0) accent, Space Grotesk headings, Inter body.

---

## SLIDE 1 — Title

**DEALIGENT**
*AI Due Diligence — a team of agents that screens an M&A target in minutes, not weeks.*

`[Your name] · MSc Strategic Management & Consulting (Finance)`

**Speaker note:** "I want to show you something I built that sits exactly where my degree, the market, and what AI can now do all intersect."

---

## SLIDE 2 — The Problem

# DD is the most expensive bottleneck in a deal

- A full six-pillar due-diligence engagement runs **6–8 weeks**, **8–12 consultants**
- Generates **€1–3M** in fees for a firm like BCG
- The bottleneck **isn't analytical capability** — it's the volume of research, synthesis and structuring that lands on junior analysts before a partner ever sees output
- ~**60%** of analyst time is gathering and structuring data, not judgement

**Speaker note:** "The scarce resource in DD isn't intelligence — it's analyst hours spent assembling the picture. That's the layer I went after."

---

## SLIDE 3 — Why Me

# I sit exactly where this problem lives

- MSc **Strategic Management & Consulting**, finance specialisation
- I understand the **consulting delivery model**, the **DD framework**, and the **financial analysis** behind every deal thesis
- Most AI tools in professional services today are **document summarisers or chatbots**
- None run an **autonomous, multi-agent workflow that mirrors the actual team structure** of a DD engagement

**Speaker note:** "I didn't build a tech demo looking for a problem. I built the tool I'd want as the analyst doing the work."

---

## SLIDE 4 — The Gap in Today's AI Tools

# Summarisers ≠ a deal team

| Today's AI tools | What DD actually needs |
|---|---|
| One model, one prompt | A **team** of specialists, in parallel |
| Summarise a document | **Score, structure, cross-reference** |
| Hallucinate numbers | **Grounded** in real financial data |
| Generic output | **Sector-aware** judgement |

**Speaker note:** "The leap isn't a better chatbot. It's replicating the *structure* of a deal team — specialists, in parallel, supervised, synthesised."

---

## SLIDE 5 — Dealigent: What It Is

# 13 AI agents that run a first-pass DD

- Deploys **specialised agents across the six DD pillars**, in parallel, **supervised by a critic agent**
- Grounds every financial figure in **live Yahoo Finance data** — never AI-guessed
- Scores each pillar 0–100, surfaces **red flags**, computes a **sector-aware valuation**
- Produces an **investment-committee recommendation** + exportable report
- Compresses weeks of structured analyst work into **~2 minutes**

**Speaker note:** "Same rigour a partner expects — sourced findings, scored pillars, cross-pillar reasoning, a verdict with conditions — at the speed of an API call."

---

## SLIDE 6 — The Six-Pillar Framework

# It operationalises the classic DD framework

```
        TARGET COMPANY
              │
  ┌─────┬─────┼─────┬─────┬─────┐
  ▼     ▼     ▼     ▼     ▼     ▼
Commerc Financ Operat Legal  Tech  Mgmt
  └─────┴─────┴──┬──┴─────┴─────┘
                 ▼
           SYNTHESIS
        PROCEED / CONDITIONAL / ABORT
```

- Each pillar = an autonomous agent with its own analytical lens
- Outputs roll up into a single, defensible verdict

**Speaker note:** "This is the framework every DD team already uses — I just made each pillar an agent."

---

## SLIDE 7 — How It Works (Architecture)

# Four layers, thirteen agents

**Layer 1 — Research (5 agents, ~10s):** Profile · Live Yahoo Finance · Market Intel · News & Sentiment · RAG Seeder
**Layer 2 — Due Diligence (6 agents, parallel, ~70s):** the six pillars — each *retrieves company-specific context (RAG) → reasons → emits structured, scored JSON → streams live*
**Layer 3 — Critic / QA (1 agent):** reviews all six pillars for **evidence quality and cross-pillar consistency** before anything reaches synthesis — flags contradictions a partner would catch
**Layer 4 — Synthesis (1 agent):** ingests all six pillars + real financials + every red flag → recommendation, conditions, 100-day plan

**Speaker note:** "True multi-agent — each agent is independent and specialised, not one big prompt. They run concurrently, a critic agent QAs their work like a senior reviewer, then synthesis produces the verdict. It even caught a real cross-pillar contradiction in testing — financial said strong cash conversion, operational flagged a debt/energy-cost burden."

---

## SLIDE 8 — The Trust Anchor: Real Data

# AI does the reasoning. Yahoo Finance does the numbers.

- Financials pulled **live from Yahoo Finance** — matches the website to the rupee
- Every figure tagged **HIGH / MEDIUM / LOW** confidence, with a source link
- **Company-scoped retrieval** — agents only see the *target's* data, zero cross-contamination
- Sector guardrails — a steel company is analysed as steel (SAP/MES/IEC-62443), not SaaS

**Speaker note:** "The #1 objection to AI in finance is 'can I trust the numbers?' My answer: the model never invents a balance sheet. It reasons on top of real, sourced data."

---

## SLIDE 9 — The "Wow": Valuation Discipline

# It caught an overpayment automatically

- Live example: a **₹1,200 Cr** offer for a steel target
- System pulled real EBITDA, applied **steel-sector multiples** (EV/EBITDA 5–10×, not SaaS 8–15×)
- Computed fair value **₹722 Cr** → flagged the offer as **1.7× over fair value**, severity **critical**

**Speaker note:** "This is judgement a rushed junior analyst misses — anchoring on the ask instead of the fundamentals. The system flags it every time, sector-correctly."

---

## SLIDE 10 — Who It Helps

# Immediate relevance, three audiences

- **Consulting firms** — the research layer (60% of analyst time) becomes near-instant; teams focus on judgement & client interaction → **redefines DD economics**
- **Private equity** — screen **more targets, faster** → an edge in deal flow
- **Boutiques & independent sponsors** — institutional-grade analysis without a full DD team → **democratises access**

**Speaker note:** "The same tool moves from a cost-saver for big firms to a capability-unlock for small ones."

---

## SLIDE 11 — Why Now

# The barrier to this just collapsed

- **AI architecture:** multi-agent orchestration + RAG grounding makes specialist, sourced reasoning possible — not true 18 months ago
- **Free inference:** built entirely on **free LLM APIs** (Cerebras, Groq, Gemini) with automatic failover — a full deal costs **cents**
- **Open financial data:** live statements via public APIs

**Speaker note:** "I built institutional-grade intelligence infrastructure as a student, for free. That's the shift the industry hasn't fully absorbed yet — the entry barrier is gone."

---

## SLIDE 12 — The Economics

# From €1–3M / 6 weeks → cents / 2 minutes

| | Traditional first-pass DD | Dealigent |
|---|---|---|
| Time | 6–8 weeks | ~2 minutes |
| Team | 8–12 analysts | 13 agents |
| Cost | €1–3M | ~free (cents/deal) |
| Coverage | Sequential pillars | 6 in parallel + synthesis |

**Speaker note:** "It doesn't replace the deal team — it removes the bottleneck so they spend their hours on what humans are uniquely good at."

---

## SLIDE 13 — Honest Limitations & Roadmap

# What it is — and isn't

- It's a **first-pass screen, not confirmatory diligence** — it tells you *where to look*
- Private companies (no ticker) → financials drop to clearly-tagged estimates
- Deep legal/contract specifics still need the data room
- **Roadmap:** critic/QA agent · data-room document ingestion · private-co coverage (OpenBB/filings) · 7th ESG pillar

**Speaker note:** "Being explicit about the limits is what makes the strengths credible. This is a screening accelerator, and an honest one."

---

## SLIDE 14 — Close

# A junior deal team that never sleeps

> "Dealigent does the first-pass M&A diligence of a junior deal team — in two minutes, grounded in real financial data, for the cost of an API call."

**It sits at the intersection of what I'm studying, what the market needs now, and what AI architecture just made possible.**

`Live demo →`

**Speaker note:** "I'd love to show it running live on any listed company you want to name."

---

### Appendix slides (optional, if technical questions come)
- **A1 — Multi-provider LLM resilience:** Cerebras → Groq → Gemini auto-fallback; never hard-fails
- **A2 — Live data flow:** SSE token streaming; asyncio parallel orchestration; ChromaDB RAG
- **A3 — Tech stack:** React/Vite/Recharts · FastAPI · ChromaDB · yfinance · SQLite
