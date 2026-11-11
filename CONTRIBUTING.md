# Contributing to Dealigent

Thanks for helping. Issues, ideas and pull requests are all welcome.

## Dev setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # one LLM key is enough
pytest && ruff check .
```

Frontend: `cd frontend && npm install && npm run dev`.

## Ground rules

1. **Numbers belong in Python.** If a figure is shown to a user, it must come from data plus
   deterministic code, never from an LLM. Add a test in `backend/tests/` for any new calculation.
2. **Every finding needs provenance.** New agent outputs must pass through the guardrails in
   `agents/runner.py` (evidence + confidence).
3. **No fabricated fallbacks.** When a provider or data source fails, say so plainly.
4. Keep PRs focused and describe *why*, not just *what*. Include a screenshot for UI changes.

## Good first issues

- Add a sector to `SECTOR_MULTIPLES` / `SECTOR_PEERS` (with a test)
- New data source behind the research layer (SEC EDGAR, Companies House)
- Export the IC memo to `.docx`
