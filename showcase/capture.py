"""
Dealigent showcase capture — screenshots every screen of the app at 2x for already-analysed deals.

Analysed deals are injected straight into the app's persisted Zustand store (localStorage), so
re-shooting never re-runs the LLM agents. Both servers must be running:

    cd backend && ./venv/bin/uvicorn main:app --port 8000
    cd frontend && npm run dev
    backend/venv/bin/python showcase/capture.py                 # every deal
    backend/venv/bin/python showcase/capture.py personio --video  # one deal + walkthrough video
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import httpx
from playwright.sync_api import Page, sync_playwright

API = os.environ.get("DEALIGENT_API", "http://localhost:8000")
APP = os.environ.get("DEALIGENT_APP", "http://localhost:5173")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "screenshots"
VIDEO = ROOT / "docs" / "media"
VIEWPORT = {"width": 1440, "height": 900}

# deal-id prefix in the local DB → file slug + the pillar to feature on the deep-dive page
DEALS = {
    "personio":    {"prefix": "664c8f6a", "pillar": "financial"},
    "tatasteel":   {"prefix": "581686cc", "pillar": "financial"},
    "commerzbank": {"prefix": "acb989f2", "pillar": "legal"},
    "tatelyle":    {"prefix": "fa2ce9a5", "pillar": "legal"},
}

# (route, filename suffix, text to wait for, extra settle time in ms)
SCREENS = [
    ("/dashboard",      "1_dashboard", "Overall",         2200),
    ("/pillar/{pillar}", "2_pillar",   "Findings",        2200),
    ("/redflags",       "3_redflags",  "Red Flags",       2200),
    ("/financial",      "4_financial", None,              4000),
    ("/synthesis",      "5_synthesis", "Recommendation",  3500),
    ("/report",         "6_report",    "Due Diligence",   4500),
]


def find_deal(prefix: str) -> dict | None:
    deals = httpx.get(f"{API}/api/deals/", timeout=10).json()
    return next((d for d in deals if d["id"].startswith(prefix)), None)


def build_store(row: dict) -> str:
    """Rebuild the exact persisted store shape the frontend expects for a completed deal."""
    results = httpx.get(f"{API}/api/execute/{row['id']}/results", timeout=10).json()
    pillar_results, agent_status, red_flags = {}, {}, []
    for r in results:
        try:
            raw = json.loads(r.get("raw_output") or "{}")
        except json.JSONDecodeError:
            raw = {}
        pillar_results[r["pillar"]] = {
            "score": r["score"], "summary": r["summary"],
            "findings": r.get("findings") or [], "red_flags": r.get("red_flags") or [],
            "key_metrics": raw.get("key_metrics", {}), "grounding": raw.get("grounding", {}),
            "swing_factors": raw.get("swing_factors", []),
        }
        agent_status[r["pillar"]] = "complete"
        red_flags += [{**f, "pillar": r["pillar"]} for f in r.get("red_flags") or []]

    scores = [p["score"] or 0 for p in pillar_results.values()]
    state = {
        "isAuthenticated": True,
        "user": {"name": "Anish Chatterjee", "email": "anish@dealigent.ai", "role": "Deal Lead"},
        "activeDeal": {
            "id": row["id"], "targetCompany": row["target"], "acquirer": row["acquirer"],
            "dealType": row["deal_type"], "dealValue": row["deal_value"], "sector": row["sector"],
            "currency": row["currency"], **(row.get("deal_meta") or {}),
        },
        "executionPhase": "complete",
        "overallScore": row.get("overall_score") or round(sum(scores) / max(len(scores), 1)),
        "verdict": row.get("verdict") or "CONDITIONAL",
        "agentStatus": agent_status, "pillarResults": pillar_results, "redFlags": red_flags,
        "wizardDraft": None, "pillarDeepDive": {},
    }
    return json.dumps({"state": state, "version": 0})


def shoot(page: Page, route: str, path: Path, wait_for: str | None, delay: int, full: bool = True) -> None:
    page.goto(APP + route, wait_until="domcontentloaded")
    if wait_for:
        try:
            page.get_by_text(wait_for).first.wait_for(timeout=45_000)
        except Exception:
            pass
    page.wait_for_timeout(delay)
    page.screenshot(path=str(path), full_page=full)
    print(f"  shot {path.name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("deals", nargs="*", help=f"which deals to shoot: {', '.join(DEALS)} (default: all)")
    ap.add_argument("--video", action="store_true", help="also record a walkthrough video of the first deal")
    ap.add_argument("--out", type=Path, default=OUT, help="screenshot directory (default: docs/screenshots)")
    args = ap.parse_args()
    if unknown := set(args.deals) - set(DEALS):
        ap.error(f"unknown deal(s): {', '.join(sorted(unknown))}")
    out = args.out
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # Login: a clean, unauthenticated context.
        ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=2)
        shoot(ctx.new_page(), "/login", out / "00_login.png", None, 1800, full=False)
        ctx.close()

        # Setup wizard: signed in, no deal yet.
        ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=2)
        signed_in = json.dumps({"state": {"isAuthenticated": True, "user": {
            "name": "Anish Chatterjee", "email": "anish@dealigent.ai", "role": "Deal Lead"}}, "version": 0})
        ctx.add_init_script(f"window.localStorage.setItem('dealigent-store', {json.dumps(signed_in)})")
        shoot(ctx.new_page(), "/wizard", out / "01_wizard.png", None, 2000)
        ctx.close()

        for i, slug in enumerate(args.deals or DEALS):
            cfg = DEALS[slug]
            row = find_deal(cfg["prefix"])
            if not row:
                print(f"!! no deal with id prefix {cfg['prefix']} — run it once in the app first")
                continue
            print(f"\n=== {slug} ({row['target']}) ===")
            opts = {"viewport": VIEWPORT, "device_scale_factor": 2}
            if args.video and i == 0:
                VIDEO.mkdir(parents=True, exist_ok=True)
                opts["record_video_dir"] = str(VIDEO)
                opts["record_video_size"] = VIEWPORT
            ctx = browser.new_context(**opts)
            ctx.add_init_script(f"window.localStorage.setItem('dealigent-store', {json.dumps(build_store(row))})")
            page = ctx.new_page()
            for route, suffix, wait_for, delay in SCREENS:
                shoot(page, route.format(pillar=cfg["pillar"]), out / f"{slug}_{suffix}.png", wait_for, delay)
            ctx.close()  # flushes the video

        browser.close()
    print("\nCAPTURE COMPLETE")


if __name__ == "__main__":
    main()
