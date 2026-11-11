# Dealigent · showcase

Portfolio material generated from the live app.

| File | What it is |
|---|---|
| `Dealigent_Project_Deck.pptx` | 17-slide explainer deck: problem → pipeline → agents → trust features → Personio walkthrough → sectors → stack → roadmap |
| `capture.py` | Python Playwright script that screenshots every screen at 2x into `docs/screenshots/` (and optionally records `docs/media/`) |
| `build_ppt.py` | Rebuilds the deck from those screenshots with `python-pptx` |

## Regenerating

```bash
# servers running: API on :8000, UI on :5173
backend/venv/bin/python showcase/capture.py                    # all deals
backend/venv/bin/python showcase/capture.py personio --video   # one deal + walkthrough video
backend/venv/bin/python showcase/build_ppt.py
```

Already-analysed deals are injected into the app's persisted store through `localStorage`, so
reshooting never re-runs the LLM agents. Use `DEALIGENT_API` / `DEALIGENT_APP` to point at other ports.
