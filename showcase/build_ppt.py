"""Build the Dealigent showcase deck from captured screenshots."""
import os

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "..", "docs", "screenshots")
FIT   = os.path.join(HERE, "_fit")
OUT   = os.path.join(HERE, "Dealigent_Project_Deck.pptx")
os.makedirs(FIT, exist_ok=True)

# Brand palette
INK    = RGBColor(0x00, 0x1F, 0x26)
NAVY   = RGBColor(0x00, 0x3D, 0x79)
TEAL   = RGBColor(0x00, 0x65, 0x78)
CYAN   = RGBColor(0x00, 0xD4, 0xF0)
BG     = RGBColor(0xF6, 0xFA, 0xFC)
SLATE  = RGBColor(0x47, 0x55, 0x69)
MUTE   = RGBColor(0x94, 0xA3, 0xB8)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
GREEN  = RGBColor(0x22, 0xC5, 0x5E)
AMBER  = RGBColor(0xF5, 0x9E, 0x0B)
FONT   = "Space Grotesk"
BODY   = "Inter"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]


def bg(slide, color=BG):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color


def rect(slide, x, y, w, h, color, line=None):
    from pptx.enum.shapes import MSO_SHAPE
    sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    sp.fill.solid(); sp.fill.fore_color.rgb = color
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line; sp.line.width = Pt(1)
    sp.shadow.inherit = False
    return sp


def text(slide, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, space=6):
    """runs: list of paragraphs; each paragraph is list of (txt, size, color, bold, font)."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Pt(0); tf.margin_top = tf.margin_bottom = Pt(0)
    for i, para in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align; p.space_after = Pt(space); p.space_before = Pt(0)
        for (t, sz, col, bold, fnt) in para:
            r = p.add_run(); r.text = t
            r.font.size = Pt(sz); r.font.color.rgb = col; r.font.bold = bold; r.font.name = fnt
    return tb


def bullets(slide, x, y, w, h, items, size=17, color=SLATE, gap=10, marker_color=TEAL):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = Pt(0)
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        if isinstance(it, tuple):
            head, sub = it
            r = p.add_run(); r.text = "▸ "; r.font.size = Pt(size); r.font.color.rgb = marker_color; r.font.bold = True; r.font.name = FONT
            r = p.add_run(); r.text = head + "  "; r.font.size = Pt(size); r.font.color.rgb = INK; r.font.bold = True; r.font.name = FONT
            r = p.add_run(); r.text = sub; r.font.size = Pt(size - 2); r.font.color.rgb = color; r.font.name = BODY
        else:
            r = p.add_run(); r.text = "▸ "; r.font.size = Pt(size); r.font.color.rgb = marker_color; r.font.bold = True; r.font.name = FONT
            r = p.add_run(); r.text = it; r.font.size = Pt(size); r.font.color.rgb = color; r.font.name = BODY
    return tb


def fit_crop(name, box_w_in, box_h_in, dpi=150):
    """Resize to fill box width, crop height top-anchored to box aspect. Returns fitted path + (w,h) in."""
    src = os.path.join(SHOTS, name)
    if not os.path.exists(src):
        return None, None
    img = Image.open(src).convert("RGB")
    iw, ih = img.size
    target_ratio = box_w_in / box_h_in
    cur_ratio = iw / ih
    if cur_ratio < target_ratio:
        # too tall -> crop bottom
        new_h = int(iw / target_ratio)
        img = img.crop((0, 0, iw, min(new_h, ih)))
    else:
        # too wide -> crop sides centered
        new_w = int(ih * target_ratio)
        left = (iw - new_w) // 2
        img = img.crop((left, 0, left + new_w, ih))
    dst = os.path.join(FIT, name)
    img.save(dst, quality=92)
    return dst, (box_w_in, box_h_in)


def header(slide, kicker, title):
    rect(slide, 0, 0, SW, Inches(1.15), NAVY)
    rect(slide, 0, Inches(1.15), SW, Inches(0.06), CYAN)
    text(slide, Inches(0.6), Inches(0.16), Inches(12), Inches(0.9),
         [[(kicker, 11, CYAN, True, FONT)],
          [(title, 26, WHITE, True, FONT)]], space=2)


def shot_slide(kicker, title, img_name, caption):
    s = prs.slides.add_slide(BLANK); bg(s)
    header(s, kicker, title)
    box_w, box_h = 12.13, 5.0
    dst, _ = fit_crop(img_name, box_w, box_h)
    x = Inches((13.333 - box_w) / 2); y = Inches(1.45)
    if dst:
        # subtle frame
        rect(s, x - Emu(9525), y - Emu(9525), Inches(box_w) + Emu(19050), Inches(box_h) + Emu(19050), RGBColor(0xE2,0xE8,0xF0))
        s.shapes.add_picture(dst, x, y, Inches(box_w), Inches(box_h))
    text(s, Inches(0.6), Inches(6.62), Inches(12.1), Inches(0.7),
         [[(caption, 13, SLATE, False, BODY)]], align=PP_ALIGN.CENTER)
    return s


# ── Slide 1: Title ──
s = prs.slides.add_slide(BLANK)
s.background.fill.solid(); s.background.fill.fore_color.rgb = INK
rect(s, 0, 0, SW, Inches(0.14), CYAN)
rect(s, Inches(0.9), Inches(2.15), Inches(0.16), Inches(2.6), CYAN)
text(s, Inches(1.25), Inches(1.5), Inches(11), Inches(0.5),
     [[("AI  ·  MULTI-AGENT  ·  DUE DILIGENCE", 13, CYAN, True, FONT)]])
text(s, Inches(1.25), Inches(2.1), Inches(11.2), Inches(2.6),
     [[("Dealigent", 60, WHITE, True, FONT)],
      [("Agentic M&A Due Diligence Platform", 30, RGBColor(0xCB,0xD5,0xE1), False, FONT)]], space=8)
text(s, Inches(1.25), Inches(4.75), Inches(11), Inches(1.2),
     [[("A multi-agent system that runs a full first-pass diligence review — "
        "commercial, financial, operational, legal, technology, management — in minutes.", 16, MUTE, False, BODY)]])
text(s, Inches(1.25), Inches(6.35), Inches(11), Inches(0.6),
     [[("Anish Chatterjee  ·  Deal Lead   |   ", 14, WHITE, True, FONT),
       ("BETA", 14, CYAN, True, FONT)]])

# ── Slide 2: Problem ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "THE PROBLEM", "Due diligence is high-value work done by hand, every deal")
bullets(s, Inches(0.7), Inches(1.6), Inches(11.9), Inches(5),
    [
      ("Repetitive.", "Every transaction demands the same structured review across the same six pillars."),
      ("Slow & costly.", "Weeks of analyst-hours are spent assembling the picture before anyone reaches a judgment."),
      ("Fragmented.", "Financials, market data, news, and the data room live in different places and formats."),
      ("Hard to trust AI with.", "A tool that hallucinates a revenue figure or a red flag is a liability, not a help."),
    ], size=19, gap=16)

# ── Slide 3: What it does ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "WHAT IT DOES", "Point it at a target — get an IC-ready first-pass read")
bullets(s, Inches(0.7), Inches(1.6), Inches(11.9), Inches(5),
    [
      "Scored analysis across all 6 diligence pillars, each with evidence behind every finding",
      "A prioritized red-flag register with severity and confidence",
      "Live financial statements + a sector-aware valuation view (over/under-payment signal)",
      "A partner-level synthesis: Proceed / Conditional / Abort, with conditions precedent & a 100-day plan",
      "Optional data-room upload — agents cite your documents directly",
      "One-click, exportable investment-committee report",
    ], size=18, gap=13)

# ── Slide 4: Login screenshot ──
shot_slide("THE PRODUCT", "A focused workspace for the deal team",
           "00_login.png", "Login → Setup Wizard → Live DD Dashboard → Pillars → Red Flags → Financials → Synthesis → Report")

# ── Slide 5: How it works ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "HOW IT WORKS", "A multi-agent pipeline — not a chatbot")
stages = [
    ("1 · RESEARCH", "5 agents gather profile, live financials, market/TAM & news — then seed a vector store (RAG)", TEAL),
    ("2 · DILIGENCE", "6 agents run in parallel, one per pillar, each scoring its domain & citing evidence", NAVY),
    ("3 · CRITIC / QA", "a supervisory agent reviews every pillar for cross-pillar contradictions", AMBER),
    ("4 · SYNTHESIS", "a partner agent weighs it all into a recommendation, conditions & 100-day plan", GREEN),
]
y = 1.75
for h, d, c in stages:
    rect(s, Inches(0.7), Inches(y), Inches(0.16), Inches(1.05), c)
    text(s, Inches(1.0), Inches(y), Inches(11.4), Inches(1.05),
         [[(h + "   ", 17, c, True, FONT), (d, 15, SLATE, False, BODY)]], anchor=MSO_ANCHOR.MIDDLE)
    y += 1.22
text(s, Inches(1.0), Inches(6.75), Inches(11.6), Inches(0.5),
     [[("Orchestrated with LangGraph · multi-model fallback (Groq → Gemini) keeps runs alive through rate limits", 13, MUTE, False, BODY)]])

# ── Slide 6: Agent roster ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "THE AGENTS", "19 agent roles across four layers")
cards = [
    ("Research  ×5", ["Company profile", "Live Yahoo Finance", "Market / TAM", "News + sentiment", "RAG seeder"], TEAL),
    ("Diligence  ×6", ["Commercial", "Financial", "Operational", "Legal", "Technology", "Management"], NAVY),
    ("Oversight  ×2", ["Critic / QA reviewer", "Partner synthesis"], AMBER),
    ("On-demand  ×6", ["Per-pillar deep-dive", "drill into any domain", "for detailed analysis"], GREEN),
]
cw, gap = 2.95, 0.15
x = 0.7
for title, items, c in cards:
    rect(s, Inches(x), Inches(1.7), Inches(cw), Inches(4.7), WHITE)
    rect(s, Inches(x), Inches(1.7), Inches(cw), Inches(0.12), c)
    text(s, Inches(x + 0.2), Inches(1.95), Inches(cw - 0.4), Inches(0.6),
         [[(title, 17, c, True, FONT)]])
    bullets(s, Inches(x + 0.2), Inches(2.7), Inches(cw - 0.35), Inches(3.5),
            items, size=13, gap=8, marker_color=c)
    x += cw + gap

# ── Slide 7: Credibility ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "WHY IT'S CREDIBLE", "Built for trust, not just demos")
bullets(s, Inches(0.7), Inches(1.6), Inches(11.9), Inches(5),
    [
      ("Financials are never AI-estimated.", "Pulled live from market data & benchmarked to sector multiples."),
      ("Every finding carries its evidence + confidence.", "HIGH / MEDIUM / LOW, with the source snippet — no black box."),
      ("Data-room grounding.", "Upload documents and agents cite them; a Data Confidence score rates the whole read."),
      ("“What would change my mind.”", "Each pillar surfaces the decisive open questions that would move its score."),
    ], size=18, gap=16)

# ── Company showcase slides ──
shot_slide("LIVE DASHBOARD · PERSONIO (SaaS)", "The command center — scores, radar & risks at a glance",
           "personio_1_dashboard.png", "Six agents complete in parallel; overall score, verdict and red-flag count update live.")
shot_slide("PILLAR DETAIL · PERSONIO", "Evidence, confidence & “what would change my mind”",
           "personio_2_pillar.png", "Every finding cites its source with a confidence badge; each pillar lists the questions that would move the score.")
shot_slide("RED FLAGS · PERSONIO", "A filterable risk register with severity & confidence",
           "personio_3_redflags.png", "Risks aggregated across all pillars, sortable by severity, each traceable to its evidence.")
shot_slide("FINANCIALS · PERSONIO", "Numbers from the market — never from the model",
           "personio_4_financial.png", "Live statements and a sector-aware valuation view flag over- or under-payment vs. fundamentals.")
shot_slide("SYNTHESIS · PERSONIO", "Partner-level recommendation + a Data Confidence banner",
           "personio_5_synthesis.png", "Proceed / Conditional / Abort with rationale, conditions precedent, value levers — and an honest data-quality score.")
shot_slide("EXPORT · PERSONIO", "A one-click investment-committee report",
           "personio_6_report.png", "Cover, data confidence, pillar scorecard, financials, strengths & risks, and a red-flag register with citations.")

# ── Cross-sector gallery ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "ACROSS SECTORS & VERDICTS", "Same pipeline — steel, banking, software")
for i, (nm, cap) in enumerate([("tatasteel_1_dashboard.png", "Tata Steel — Steel & Metals"),
                                ("commerzbank_1_dashboard.png", "Commerzbank — Banking & Finance")]):
    dst, _ = fit_crop(nm, 5.9, 4.2)
    x = Inches(0.55 + i * 6.15); y = Inches(1.7)
    if dst:
        rect(s, x - Emu(9525), y - Emu(9525), Inches(5.9) + Emu(19050), Inches(4.2) + Emu(19050), RGBColor(0xE2,0xE8,0xF0))
        s.shapes.add_picture(dst, x, y, Inches(5.9), Inches(4.2))
    text(s, x, Inches(6.05), Inches(5.9), Inches(0.5), [[(cap, 14, TEAL, True, FONT)]], align=PP_ALIGN.CENTER)

# ── Tech stack ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "UNDER THE HOOD", "Tech stack")
bullets(s, Inches(0.7), Inches(1.7), Inches(6), Inches(5),
    [("Frontend", "React · Vite · Tailwind · Recharts · Framer Motion · Zustand"),
     ("Backend", "FastAPI · async SQLite"),
     ("Orchestration", "LangGraph multi-agent graph")], size=18, gap=16)
bullets(s, Inches(6.9), Inches(1.7), Inches(6), Inches(5),
    [("Retrieval", "ChromaDB vector store (RAG) + pypdf ingestion"),
     ("LLMs", "Groq & Gemini with automatic fallback"),
     ("Market data", "yfinance (live Yahoo Finance)")], size=18, gap=16)

# ── Limitations / roadmap ──
s = prs.slides.add_slide(BLANK); bg(s)
header(s, "HONEST STATUS", "Beta — a screening tool, not a decision")
bullets(s, Inches(0.7), Inches(1.6), Inches(11.9), Inches(5),
    [
      "Reads text, not scanned image PDFs yet (OCR is on the roadmap)",
      "A human verifies every red flag before it reaches a committee",
      "Single-user local build — auth, multi-tenant & audit trail are next",
      "The point: hand the analyst a Day-1 draft so they spend their hours on judgment, not assembly",
    ], size=18, gap=15)

# ── Closing ──
s = prs.slides.add_slide(BLANK)
s.background.fill.solid(); s.background.fill.fore_color.rgb = INK
rect(s, 0, 0, SW, Inches(0.14), CYAN)
text(s, Inches(1.25), Inches(2.7), Inches(11), Inches(2),
     [[("Dealigent", 46, WHITE, True, FONT)],
      [("AI that makes the analyst sharper — not redundant.", 22, CYAN, False, FONT)]], space=10)
text(s, Inches(1.25), Inches(5.2), Inches(11), Inches(0.6),
     [[("Anish Chatterjee  ·  Built with React, FastAPI, LangGraph & a lot of nights", 15, MUTE, False, BODY)]])

prs.save(OUT)
print("Saved:", OUT)
print("Slides:", len(prs.slides._sldIdLst))
