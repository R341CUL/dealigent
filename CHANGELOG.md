# Changelog

## 1.1.0 · 2026-11-11
- **Python CLI** (`backend/cli.py`): `providers`, `valuate` (live valuation + football-field chart, no API key) and `diligence` (headless full run → Markdown IC memo)
- **Test suite**: 81 pytest tests covering valuation, guardrails, verdict rules, chunking, data quality and LLM routing; GitHub Actions CI
- Python Playwright capture script replaces the Node scripts; new setup-wizard screenshot
- Fixed sector peer tickers (`JSWSTEEL.NS`, `HUBS`, `XYZ`; removed delisted `X`) and peers being capped before the target was excluded
- Local dev no longer routes API calls to the hosted backend; `DEALIGENT_API` selects the dev proxy target
- New README, architecture docs and generated artwork

## 1.0.0 · 2026-09-01
- 12-agent due-diligence platform: research layer, 6 parallel pillar agents, critic, deep dives, synthesis
- Live Yahoo Finance financials, sector-aware valuation, peer benchmarking
- Data-room document ingestion into a per-company RAG corpus
- Render + Vercel deployment
