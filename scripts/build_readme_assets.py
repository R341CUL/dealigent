"""
Render the README artwork (banner, architecture diagram, social preview, CLI screenshot) from HTML.

    backend/venv/bin/python scripts/build_readme_assets.py

Everything is drawn in HTML/CSS in Dealigent's own palette and rasterised with Playwright at 2x,
so the artwork stays editable as code instead of living in a design tool.
"""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

ASSETS = Path(__file__).resolve().parents[1] / "docs" / "assets"

BASE_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', 'SF Pro Display', -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
.mono { font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace; }
:root { --navy: #0b2545; --deep: #061a33; --cyan: #13c4e3; --teal: #0ea5b7; --amber: #f59e0b;
        --green: #22c55e; --red: #ef4444; --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; }
"""

BANNER = """
<div class="banner">
  <div class="grid"></div>
  <div class="left">
    <div class="logo"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#061a33" stroke-width="2.4"
      stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
    <h1>Dealigent</h1>
    <p class="tag">Agentic M&amp;A due diligence</p>
    <p class="sub">12 AI agents · 6 DD pillars in parallel · live Yahoo Finance · IC-ready verdict in minutes</p>
    <div class="chips">
      <span>Python 3.12</span><span>FastAPI</span><span>ChromaDB RAG</span><span>Multi-LLM fallback</span><span>React</span>
    </div>
  </div>
  <div class="right">
    <div class="card verdict">
      <div class="ring"><b>74</b><i>/100</i></div>
      <div><small class="mono">DEAL VERDICT</small><h2>Conditional</h2><p>6 pillars · 11 risks flagged</p></div>
    </div>
    <div class="card pillars">
      <div class="row"><span>A · Commercial</span><div class="bar"><em style="width:81%;background:var(--green)"></em></div><b>81</b></div>
      <div class="row"><span>B · Financial</span><div class="bar"><em style="width:65%"></em></div><b>65</b></div>
      <div class="row"><span>C · Operational</span><div class="bar"><em style="width:78%"></em></div><b>78</b></div>
      <div class="row"><span>D · Legal</span><div class="bar"><em style="width:78%"></em></div><b>78</b></div>
      <div class="row"><span>E · Technology</span><div class="bar"><em style="width:70%"></em></div><b>70</b></div>
      <div class="row"><span>F · Management</span><div class="bar"><em style="width:72%"></em></div><b>72</b></div>
    </div>
  </div>
</div>
<style>
.banner { width: 1280px; height: 400px; position: relative; overflow: hidden; display: flex; align-items: center;
  padding: 0 64px; gap: 48px; color: white;
  background: radial-gradient(1200px 500px at 85% 20%, rgba(19,196,227,.28), transparent 60%),
              linear-gradient(120deg, #041427 0%, #0b2545 55%, #08324a 100%); }
.grid { position: absolute; inset: 0; opacity: .18;
  background-image: radial-gradient(rgba(255,255,255,.55) 1px, transparent 1px); background-size: 22px 22px;
  mask-image: linear-gradient(90deg, black, transparent 70%); }
.left { position: relative; flex: 1.15; }
.logo { width: 72px; height: 72px; border-radius: 18px; display: grid; place-items: center;
  background: linear-gradient(140deg, #5eead4, var(--cyan)); box-shadow: 0 10px 40px rgba(19,196,227,.45); margin-bottom: 22px; }
h1 { font-size: 64px; letter-spacing: -2px; font-weight: 800; line-height: 1; }
.tag { font-size: 26px; color: var(--cyan); font-weight: 600; margin-top: 10px; }
.sub { font-size: 16px; color: #cbd5e1; margin-top: 14px; }
.chips { display: flex; gap: 8px; margin-top: 22px; flex-wrap: wrap; }
.chips span { font-size: 12.5px; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.06); color: #e2e8f0; }
.right { position: relative; flex: 1; display: flex; flex-direction: column; gap: 14px; }
.card { background: rgba(255,255,255,.96); color: var(--ink); border-radius: 18px; padding: 18px 22px;
  box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.verdict { display: flex; align-items: center; gap: 20px; background: #fdf3e1; }
.ring { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; align-content: center;
  background: conic-gradient(var(--amber) 0 74%, #e7e5e4 74% 100%); position: relative; }
.ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: #fdf3e1; }
.ring b, .ring i { position: relative; } .ring b { font-size: 28px; color: var(--amber); line-height: 1; }
.ring i { font-size: 11px; color: var(--muted); font-style: normal; }
.verdict small { color: var(--amber); font-size: 11px; letter-spacing: 2px; font-weight: 700; }
.verdict h2 { color: var(--amber); font-size: 30px; line-height: 1.1; } .verdict p { color: var(--muted); font-size: 13px; }
.pillars { display: grid; gap: 7px; }
.row { display: grid; grid-template-columns: 120px 1fr 26px; align-items: center; gap: 10px; font-size: 12.5px; }
.row b { text-align: right; color: var(--navy); }
.bar { height: 7px; background: #eef2f7; border-radius: 9px; overflow: hidden; }
.bar em { display: block; height: 100%; background: var(--amber); border-radius: 9px; }
</style>
"""

ARCH = """
<div class="arch">
  <header><h1>How Dealigent works</h1><p>One request fans out to 12 specialised agents. Python owns every number; LLMs own judgement.</p></header>
  <div class="lanes">
    <section class="lane">
      <h3><span>1</span> Research layer</h3>
      <div class="node"><b>Profile agent</b><em>sector, HQ, ticker, rationale</em></div>
      <div class="node fin"><b>Yahoo Finance agent</b><em>live P&amp;L, balance sheet, ratios</em></div>
      <div class="node"><b>Market agent</b><em>TAM, competitors, trends</em></div>
      <div class="node"><b>News agent</b><em>headlines → sentiment</em></div>
      <div class="node store"><b>ChromaDB corpus</b><em>research + data-room docs, per-company</em></div>
    </section>
    <div class="arrow">→</div>
    <section class="lane wide">
      <h3><span>2</span> Parallel due-diligence agents <small>RAG-grounded · streamed over SSE</small></h3>
      <div class="pillars">
        <div class="p"><i>A</i>Commercial</div><div class="p fin"><i>B</i>Financial</div><div class="p"><i>C</i>Operational</div>
        <div class="p"><i>D</i>Legal</div><div class="p"><i>E</i>Technology</div><div class="p"><i>F</i>Management</div>
      </div>
      <div class="guard"><b>Guardrails (Python)</b> JSON extraction · evidence + confidence on every finding ·
        "cited evidence can't be LOW" · swing factors · no-fabrication fallback</div>
      <div class="node critic"><b>Critic / QA agent</b><em>evidence quality + cross-pillar consistency review</em></div>
      <div class="node"><b>On-demand deep-dive agents</b><em>one per pillar, real Yahoo data injected for B &amp; F</em></div>
    </section>
    <div class="arrow">→</div>
    <section class="lane">
      <h3><span>3</span> Decision layer</h3>
      <div class="node fin"><b>Valuation engine</b><em>sector multiples · equity path for banks · synergies · overpay flag</em></div>
      <div class="node"><b>Verdict rules</b><em>≥80 &amp; no critical → PROCEED · &lt;55 or ≥2 critical → ABORT</em></div>
      <div class="node"><b>Synthesis agent</b><em>partner-level IC recommendation</em></div>
      <div class="node"><b>Data-quality score</b><em>deterministic honesty banner</em></div>
      <div class="node out"><b>IC report · CLI memo</b><em>PDF export · Markdown · JSON</em></div>
    </section>
  </div>
  <footer>
    <div class="llm"><b>LLM router</b> bulk: Groq → Cerebras → Gemini &nbsp;·&nbsp; synthesis: Cerebras → Gemini → Groq &nbsp;·&nbsp; automatic rate-limit fallback</div>
    <div class="legend"><span class="k fin"></span>finance track (deterministic) <span class="k"></span>agent <span class="k critic"></span>supervisory</div>
  </footer>
</div>
<style>
.arch { width: 1400px; padding: 40px 44px; background: #f8fafc; color: var(--ink); }
header h1 { font-size: 30px; letter-spacing: -.5px; color: var(--navy); } header p { color: var(--muted); margin-top: 6px; font-size: 15px; }
.lanes { display: flex; align-items: stretch; gap: 14px; margin-top: 28px; }
.lane { flex: 1; background: white; border: 1px solid var(--line); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.lane.wide { flex: 1.45; }
.lane h3 { font-size: 15px; color: var(--navy); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.lane h3 small { font-weight: 500; color: var(--muted); font-size: 11.5px; margin-left: auto; }
.lane h3 span { width: 24px; height: 24px; border-radius: 7px; background: var(--navy); color: white; display: grid; place-items: center; font-size: 12px; }
.node { border: 1px solid var(--line); border-left: 4px solid var(--cyan); border-radius: 10px; padding: 9px 12px; background: #fbfdff; }
.node b { display: block; font-size: 13.5px; } .node em { font-style: normal; color: var(--muted); font-size: 12px; }
.node.fin, .p.fin { border-left-color: var(--amber); background: #fffbf2; }
.node.store { border-left-color: #8b5cf6; background: #f8f6ff; }
.node.critic { border-left-color: var(--red); background: #fff7f7; }
.node.out { border-left-color: var(--green); background: #f4fdf7; }
.pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.p { border: 1px solid var(--line); border-left: 4px solid var(--cyan); border-radius: 10px; padding: 12px; font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 9px; }
.p i { font-style: normal; width: 24px; height: 24px; border-radius: 7px; background: #e0f7fb; color: var(--teal); display: grid; place-items: center; font-size: 12px; }
.p.fin i { background: #fef3c7; color: #b45309; }
.guard { font-size: 12px; color: #334155; background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 10px; padding: 10px 12px; line-height: 1.5; }
.guard b { color: var(--navy); margin-right: 4px; }
.arrow { align-self: center; font-size: 30px; color: var(--teal); font-weight: 700; }
footer { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; font-size: 13px; color: #334155; }
.llm { background: var(--navy); color: #e2e8f0; padding: 10px 16px; border-radius: 10px; } .llm b { color: var(--cyan); margin-right: 6px; }
.legend { display: flex; align-items: center; gap: 8px; color: var(--muted); }
.k { width: 14px; height: 14px; border-radius: 4px; border-left: 4px solid var(--cyan); background: #fbfdff; border: 1px solid var(--line); border-left-width: 4px; margin-left: 10px; }
.k.fin { border-left-color: var(--amber); } .k.critic { border-left-color: var(--red); }
</style>
"""


def social_from_banner() -> str:
    # GitHub's social preview is 1280x640: same art, taller canvas.
    return BANNER.replace("height: 400px", "height: 640px").replace("h1 { font-size: 64px", "h1 { font-size: 76px")


def render(page, html: str, selector: str, out: Path) -> None:
    page.set_content(f"<style>{BASE_CSS}</style>{html}")
    page.wait_for_timeout(300)
    page.locator(selector).screenshot(path=str(out))
    print(f"  {out.relative_to(ASSETS.parents[1])}")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=2)
        render(page, BANNER, ".banner", ASSETS / "banner.png")
        render(page, ARCH, ".arch", ASSETS / "architecture.png")
        render(page, social_from_banner(), ".banner", ASSETS / "social-preview.png")

        svg = ASSETS / "cli_valuate.svg"
        if svg.exists():  # produced by: python backend/cli.py valuate TATASTEEL.NS --svg docs/assets/cli_valuate.svg
            page.set_content(f"<body style='margin:0;background:#0b1220'>{svg.read_text()}</body>")
            page.locator("svg").screenshot(path=str(ASSETS / "cli_valuate.png"))
            print("  docs/assets/cli_valuate.png")
        browser.close()


if __name__ == "__main__":
    main()
