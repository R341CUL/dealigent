"""
Dealigent from the terminal — the same agents and valuation engine as the web app, no UI required.

    python cli.py providers
    python cli.py valuate TATASTEEL.NS --deal-value 250000 --chart football_field.png
    python cli.py diligence "Tata Steel" --acquirer "JSW Steel" --country India --deal-value "₹2,50,000Cr"

`valuate` needs no API keys: it is pure Python over live Yahoo Finance data.
`diligence` runs research → 6 parallel DD agents → critic → verdict, and writes a Markdown IC memo.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console(record=True)

PILLAR_LABELS = {
    "commercial": "A. Commercial", "financial": "B. Financial", "operational": "C. Operational",
    "legal": "D. Legal", "technology": "E. Technology", "management": "F. Management",
}
VERDICT_STYLE = {"PROCEED": "bold green", "CONDITIONAL": "bold yellow", "ABORT": "bold red"}


def _fmt(v, unit: str = "", cur: str = "") -> str:
    if v is None:
        return "—"
    if isinstance(v, (int, float)):
        return f"{cur} {v:,.1f}{unit}".strip()
    return str(v)


# ── providers ───────────────────────────────────────────────────────────────
def cmd_providers(_args) -> int:
    from agents import llm

    table = Table(title="LLM providers", title_justify="left")
    table.add_column("Provider")
    table.add_column("Model")
    table.add_column("Configured")
    for name, model in [("groq", llm.GROQ_MODEL), ("cerebras", llm.CEREBRAS_MODEL), ("gemini", llm.GEMINI_MODEL)]:
        table.add_row(name, model, "[green]yes[/]" if llm.has(name) else "[dim]no[/]")
    console.print(table)
    console.print(f"bulk route      → {' → '.join(llm._order('bulk')) or '[red]none[/]'}")
    console.print(f"synthesis route → {' → '.join(llm._order('synthesis')) or '[red]none[/]'}")
    return 0


# ── valuate ─────────────────────────────────────────────────────────────────
async def _valuate(ticker: str, deal_value: float | None):
    from agents.financials import compute_valuation, fetch_real_financials, fetch_sector_peers

    fin = await fetch_real_financials(ticker=ticker)
    if not fin.get("found"):
        return fin, {"available": False}, []
    val = compute_valuation(fin, deal_value)
    peers = await fetch_sector_peers(fin.get("sector", "") + " " + fin.get("industry", ""), exclude_ticker=ticker)
    return fin, val, peers


def _football_field(fin: dict, val: dict, peers: list[dict], path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import FuncFormatter

    unit, cur = val["unit"], val["currency"]
    bars = []
    for label, rng in [("EV / EBITDA", val["ev_from_ebitda"]), ("EV / Revenue", val["ev_from_revenue"])]:
        if rng.get("low") and rng.get("high"):
            bars.append((f"{label}\n{val['sector_label']} multiples", rng["low"], rng["high"]))
    peer_multiples = [p["ev_ebitda"] for p in peers if p.get("ev_ebitda") and p["ev_ebitda"] > 0]
    ebitda = fin.get("latest_ebitda")
    if peer_multiples and ebitda and val["valuation_mode"] == "enterprise":
        bars.append((f"Peer EV / EBITDA\n{len(peer_multiples)} live comparables",
                     min(peer_multiples) * ebitda, max(peer_multiples) * ebitda))
    if not bars:
        raise SystemExit("Not enough data for a football-field chart.")

    navy, cyan, amber, red = "#0b2545", "#13c4e3", "#f59e0b", "#dc2626"
    marks = [("Standalone EV", val.get("standalone_ev"), navy), ("Fair offer", val.get("fair_offer"), amber),
             ("Deal value", val.get("deal_value_entered"), red)]
    marks = [m for m in marks if m[1]]

    xs = [v for _, lo, hi in bars for v in (lo, hi)] + [m[1] for m in marks]
    pad = 0.12 * (max(xs) - min(xs))

    fig, ax = plt.subplots(figsize=(10, 1.6 + 0.9 * len(bars)), dpi=200)
    for i, (_label, lo, hi) in enumerate(bars):
        ax.barh(i, hi - lo, left=lo, height=0.42, color=cyan, edgecolor=navy, linewidth=1)
        ax.text(lo, i, f"{lo:,.0f}  ", va="center", ha="right", fontsize=8.5, color=navy)
        ax.text(hi, i, f"  {hi:,.0f}", va="center", ha="left", fontsize=8.5, color=navy)
    for name, x, color in marks:
        ax.axvline(x, color=color, linestyle="--", linewidth=1.4, label=f"{name}: {cur} {x:,.0f}{unit}")

    ax.set_xlim(max(0, min(xs) - pad), max(xs) + pad)
    ax.set_ylim(-0.6, len(bars) - 0.4)
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: f"{x:,.0f}"))
    ax.set_yticks(range(len(bars)), [b[0] for b in bars], fontsize=9)
    ax.set_xlabel(f"{cur} ({unit})", fontsize=9)
    ax.tick_params(axis="x", labelsize=8)
    ax.set_title(f"{fin.get('company_name') or fin['ticker']} · valuation football field (live Yahoo Finance)",
                 loc="left", fontsize=11, color=navy, fontweight="bold")
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.28), ncol=3, frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    console.print(f"[green]chart →[/] {path}")


def cmd_valuate(args) -> int:
    with console.status(f"Pulling live statements for {args.ticker} from Yahoo Finance…"):
        fin, val, peers = asyncio.run(_valuate(args.ticker, args.deal_value))
    if not fin.get("found"):
        console.print(f"[red]{fin.get('error', 'No data')}[/]")
        return 1
    if args.json:
        print(json.dumps({"financials": fin, "valuation": val, "peers": peers}, indent=2, default=str))
        return 0

    unit, cur = fin["unit"], fin["currency"]
    console.print(Panel.fit(
        f"[bold]{fin['company_name']}[/]  [dim]{fin['ticker']} · {fin['sector']} / {fin['industry']}[/]\n"
        f"Price {cur} {fin['stock_price']:,} · Market cap {_fmt(fin['market_cap'], unit, cur)} · "
        f"EV {_fmt(fin['enterprise_value'], unit, cur)}",
        title="Target", border_style="cyan"))

    pl = Table(title="Income statement (live)", title_justify="left")
    for col in ("FY", "Revenue", "EBITDA", "Net income"):
        pl.add_column(col, justify="right")
    for y in fin["pl_years"]:
        pl.add_row(y["label"], _fmt(y["revenue"]), _fmt(y["ebitda"]), _fmt(y["net_income"]))
    console.print(pl)

    vt = Table(title=f"Valuation · {val['basis']}", title_justify="left")
    vt.add_column("Component")
    vt.add_column(f"{cur} ({unit})", justify="right")
    for label, key in [("Standalone value", "standalone_ev"), ("Control premium (25%)", "control_premium"),
                       ("Revenue synergies", "revenue_synergies"), ("Cost synergies", "cost_synergies"),
                       ("Fair offer", "fair_offer")]:
        vt.add_row(label, _fmt(val.get(key)))
    console.print(vt)

    if peers:
        pt = Table(title="Sector peers (live)", title_justify="left")
        for col in ("Peer", "EV/EBITDA", "EV/Revenue", "Gross margin", "Op. margin"):
            pt.add_column(col, justify="right")
        for p in peers:
            pt.add_row(f"{p['name']} [dim]{p['ticker']}[/]", _fmt(p["ev_ebitda"], "x"), _fmt(p["ev_revenue"], "x"),
                       _fmt(p["gross_margin"], "%"), _fmt(p["operating_margin"], "%"))
        console.print(pt)

    if val.get("overpay_flag"):
        f = val["overpay_flag"]
        console.print(Panel(f["detail"], title=f"{f['severity'].upper()} · {f['title']}", border_style="red"))
    if args.chart:
        _football_field(fin, val, peers, Path(args.chart))
    if args.svg:
        console.save_svg(args.svg, title=f"dealigent valuate {args.ticker}")
    return 0


# ── diligence ───────────────────────────────────────────────────────────────
async def _drain(queue: asyncio.Queue, on_event) -> None:
    while True:
        ev = await queue.get()
        on_event(ev)
        if ev.get("type") == "done":
            return


async def _diligence(args) -> dict:
    from agents.research.runner import run_research
    from agents.runner import PILLAR_ORDER, run_dd_graph

    deal = {
        "targetCompany": args.target, "acquirer": args.acquirer, "dealValue": args.deal_value,
        "dealType": args.deal_type, "sector": args.sector, "currency": args.currency, "location": args.country,
    }
    out: dict = {"deal": deal, "pillars": {}}

    if not args.skip_research:
        q: asyncio.Queue = asyncio.Queue()

        def on_research(ev):
            if ev["type"] == "stage_complete":
                console.print(f"  [green]✓[/] research · {ev['stage']}")
            elif ev["type"] == "research_complete":
                r = ev["data"]
                out["research"] = r
                deal.update({k: v for k, v in {
                    "sector": deal["sector"] or r.get("sector"), "currency": r.get("currency") or deal["currency"],
                    "revenue": r.get("revenue"), "revenueUnit": r.get("revenue_unit"),
                    "employees": r.get("employees"), "founded": r.get("founded"),
                    "location": r.get("hq") or deal["location"], "description": r.get("description"),
                }.items() if v})

        console.rule("[bold cyan]Research agents")
        await asyncio.gather(run_research(args.target, args.country, args.acquirer, q), _drain(q, on_research))

    q = asyncio.Queue()
    pillars = args.pillars or PILLAR_ORDER

    def on_dd(ev):
        t = ev["type"]
        if t == "agent_start":
            console.print(f"  [cyan]→[/] {PILLAR_LABELS[ev['pillar']]} agent started")
        elif t == "agent_complete":
            out["pillars"][ev["pillar"]] = ev
            console.print(f"  [green]✓[/] {PILLAR_LABELS[ev['pillar']]:<16} {ev['score']:>5}/100 · "
                          f"{len(ev['red_flags'])} red flags · {ev['grounding']['basis']}")
        elif t == "critic_complete":
            out["critic"] = ev["review"]
            console.print(f"  [green]✓[/] critic QA · quality {ev['review'].get('overall_quality', '—')}")
        elif t == "synthesis_complete":
            out.update(overall=ev["overall_score"], verdict=ev["verdict"], red_flags=ev["red_flags_all"])

    console.rule("[bold cyan]Due-diligence agents")
    await asyncio.gather(run_dd_graph(deal, pillars, q), _drain(q, on_dd))
    return out


def _memo(res: dict) -> str:
    d = res["deal"]
    lines = [
        f"# IC Memo — {d['targetCompany']}",
        "",
        f"*Generated by Dealigent on {datetime.now():%d %b %Y %H:%M}. First-pass, public-data screen — not investment advice.*",
        "",
        "| | |", "|---|---|",
        f"| Acquirer | {d['acquirer']} |", f"| Deal type | {d['dealType']} |",
        f"| Deal value | {d['dealValue'] or '—'} |", f"| Sector | {d.get('sector') or '—'} |",
        f"| **Overall score** | **{res.get('overall', '—')}/100** |", f"| **Verdict** | **{res.get('verdict', '—')}** |",
        "", "## Pillar scores", "", "| Pillar | Score | Grounding | Summary |", "|---|---:|---|---|",
    ]
    for p, r in res["pillars"].items():
        summary = (r.get("summary") or "").replace("|", "/").replace("\n", " ")
        lines.append(f"| {PILLAR_LABELS[p]} | {r['score']} | {r['grounding']['basis']} | {summary} |")
    lines += ["", "## Red flags", ""]
    for f in sorted(res.get("red_flags", []), key=lambda f: ["critical", "high", "medium", "low"].index(
            str(f.get("severity", "low")).lower()) if str(f.get("severity", "low")).lower() in
            ["critical", "high", "medium", "low"] else 4):
        lines.append(f"- **{str(f.get('severity', '')).upper()}** · {PILLAR_LABELS.get(f.get('pillar'), '')} — "
                     f"{f.get('title', '')}: {f.get('detail', '')} *(evidence: {f.get('evidence', '—')}, "
                     f"confidence: {f.get('confidence', '—')})*")
    critic = res.get("critic") or {}
    if critic:
        lines += ["", "## Critic / QA review", "", f"**Quality:** {critic.get('overall_quality', '—')} · "
                  f"**Consistency:** {critic.get('consistency', '—')}", "", critic.get("reviewer_verdict", "")]
    return "\n".join(lines) + "\n"


def cmd_diligence(args) -> int:
    from agents import llm

    if not llm._order("bulk"):
        console.print("[red]No LLM provider configured.[/] Add GROQ_API_KEY, CEREBRAS_API_KEY or GEMINI_API_KEY to backend/.env")
        return 1
    res = asyncio.run(_diligence(args))

    verdict = res.get("verdict", "—")
    console.print(Panel.fit(f"[{VERDICT_STYLE.get(verdict, 'bold')}]{verdict}[/]  ·  {res.get('overall', '—')}/100  ·  "
                            f"{len(res.get('red_flags', []))} red flags", title=res["deal"]["targetCompany"],
                            border_style="cyan"))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", args.target.lower()).strip("-")
    memo = out_dir / f"{slug}-ic-memo.md"
    memo.write_text(_memo(res), encoding="utf-8")
    (out_dir / f"{slug}-raw.json").write_text(json.dumps(res, indent=2, default=str), encoding="utf-8")
    console.print(f"[green]memo →[/] {memo}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="dealigent", description="Agentic M&A due diligence from the terminal.")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("providers", help="show configured LLM providers and routing").set_defaults(func=cmd_providers)

    v = sub.add_parser("valuate", help="live Yahoo Finance statements + sector-aware valuation (no API keys)")
    v.add_argument("ticker", help="Yahoo ticker, e.g. TATASTEEL.NS, CBK.DE, WDAY")
    v.add_argument("--deal-value", type=float, help="proposed deal value in the company's reporting unit (M or Cr)")
    v.add_argument("--chart", help="write a valuation football-field PNG to this path")
    v.add_argument("--json", action="store_true", help="print raw JSON instead of tables")
    v.add_argument("--svg", help="save the terminal output as an SVG screenshot")
    v.set_defaults(func=cmd_valuate)

    d = sub.add_parser("diligence", help="run research + 6 DD agents + critic and write an IC memo")
    d.add_argument("target")
    d.add_argument("--acquirer", required=True)
    d.add_argument("--country", default="")
    d.add_argument("--sector", default="")
    d.add_argument("--currency", default="USD")
    d.add_argument("--deal-value", default="")
    d.add_argument("--deal-type", default="Strategic Acquisition")
    d.add_argument("--pillars", nargs="+", choices=list(PILLAR_LABELS), help="subset of pillars to run")
    d.add_argument("--skip-research", action="store_true", help="skip the research agents and go straight to DD")
    d.add_argument("--out", default="reports", help="output directory for the memo")
    d.set_defaults(func=cmd_diligence)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
