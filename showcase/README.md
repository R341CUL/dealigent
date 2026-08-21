# Dealigent — Project Showcase Assets

Everything here is generated from the live app (localhost) for use as portfolio / LinkedIn material.

## What's here

- **`Dealigent_Project_Deck.pptx`** — 17-slide explainer deck (open in PowerPoint). Structure:
  1. Title
  2. The Problem
  3. What It Does
  4. The Product (login)
  5. How It Works — the multi-agent pipeline
  6. The Agents — 19 roles across 4 layers
  7. Why It's Credible — the 4 trust features
  8–13. Personio walkthrough (Dashboard → Pillar → Red Flags → Financials → Synthesis → Report)
  14. Across sectors & verdicts (Tata Steel + Commerzbank)
  15. Tech stack
  16. Honest status / roadmap
  17. Closing

- **`shots/`** — 19 high-res (2×) screenshots across three example companies:
  - **Personio** (Enterprise SaaS, *Conditional*) — best shows proprietary-corpus grounding
  - **Tata Steel** (Steel & Metals, *Proceed*) — live financials
  - **Commerzbank** (Banking & Finance, *Conditional*) — sector contrast

- **`video/Dealigent_walkthrough.mp4`** — screen recording of the Personio flow (LinkedIn-friendly).
- **`video/Dealigent_walkthrough.gif`** — same, as a GIF.

## Regenerating

Both servers must be running (backend :8000, frontend :5173).

```bash
# 1. capture screenshots + video
cd frontend
NODE_PATH=$(pwd)/node_modules node ../showcase/capture.js

# 2. rebuild the deck
../backend/venv/bin/python ../showcase/build_ppt.py
```

Screenshots are captured by injecting already-analyzed deals into the app's local
store (via `localStorage`), so no LLM re-runs are needed to re-shoot.
