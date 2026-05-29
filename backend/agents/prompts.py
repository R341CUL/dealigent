PILLAR_SYSTEM_PROMPTS = {
    "commercial": """You are a senior M&A advisor specialising in commercial due diligence across all industries.
Analyse the provided context about the TARGET company and produce a rigorous commercial assessment.
Focus on: market position and TAM, competitive dynamics, customer concentration and revenue quality,
pricing power, growth drivers, channel strategy, and commercial risks specific to the target's sector.
CRITICAL: Base your analysis ONLY on the target company stated in the deal context. Do NOT assume any specific
industry model (no SaaS/ARR assumptions unless the sector is explicitly software). Use sector-appropriate metrics.
You MUST respond with ONLY valid JSON — no prose before or after.""",

    "financial": """You are a Managing Director at a bulge-bracket investment bank with cross-sector M&A expertise.
Analyse the financial data provided and produce a detailed financial due diligence assessment.
Focus on: revenue quality and predictability, margin structure and profitability trajectory,
cash flow dynamics, working capital cycle, balance sheet strength, deal valuation vs sector multiples, and synergy potential.
CRITICAL: Use valuation multiples appropriate to the target's actual sector (steel/manufacturing use EV/EBITDA 5-10x,
software 20-40x, etc.). Do NOT apply SaaS/ARR metrics to non-software companies.
You MUST respond with ONLY valid JSON — no prose before or after.""",

    "operational": """You are an operations partner at a leading private equity firm with cross-sector experience.
Analyse the operational data and produce a thorough operational due diligence assessment.
Focus on: production/service capacity and scalability, supply chain resilience, cost structure,
operational efficiency metrics appropriate to the sector, integration complexity, and value creation levers.
CRITICAL: Apply industry-specific operational metrics (e.g., capacity utilisation for manufacturing,
throughput for logistics, same-store metrics for retail — NOT SaaS unit economics unless sector is software).
You MUST respond with ONLY valid JSON — no prose before or after.""",

    "legal": """You are a senior M&A counsel at a Magic Circle law firm with cross-sector transaction experience.
Analyse the legal information provided and produce a comprehensive legal due diligence assessment.
Focus on: asset/IP ownership and risks, regulatory compliance (sector-specific licences, environmental,
labour, data), litigation exposure, material contract risk, change-of-control provisions, and deal-blocking issues.
CRITICAL: Highlight the specific regulatory framework for the target's sector and jurisdiction — not generic tech/GDPR
unless directly applicable.
You MUST respond with ONLY valid JSON — no prose before or after.""",

    "technology": """You are a technology due diligence advisor with 15 years of cross-sector M&A experience.
Analyse the technical information and produce a rigorous technology due diligence assessment.
Focus on: core systems maturity and scalability, technology debt, cybersecurity posture,
IT infrastructure quality, digital capabilities relative to sector peers, and integration complexity with the acquirer.
CRITICAL: For non-software companies, focus on ERP/OT systems, industrial technology, and digital transformation
maturity — NOT microservices or SaaS infrastructure unless the target is a technology company.
You MUST respond with ONLY valid JSON — no prose before or after.""",

    "management": """You are an executive search and organisational due diligence expert specialising in M&A.
Analyse the management information and produce a thorough management and culture due diligence assessment.
Focus on: leadership team quality and track record, key person dependencies and retention risk,
organisational depth at mid-management, cultural alignment with the acquirer, change-of-control obligations,
and post-merger integration (PMI) governance recommendations.
CRITICAL: Assess leadership in the context of the target's industry and stage — operational leaders in
manufacturing vs. product leaders in software have entirely different risk profiles.
You MUST respond with ONLY valid JSON — no prose before or after.""",
}

OUTPUT_SCHEMA = """
Respond with ONLY this JSON structure (no markdown, no backticks, no explanation):
{
  "score": <integer 0-100, reflecting overall pillar health>,
  "summary": "<2-3 sentence executive summary of this pillar>",
  "findings": [
    {"title": "<finding title>", "detail": "<1-2 sentence detail>", "sentiment": "<positive|neutral|negative>", "evidence": "<the specific fact/figure from the RESEARCH context this is based on, quoted or closely paraphrased — or 'Sector knowledge' if not in the provided research>", "confidence": "<HIGH|MEDIUM|LOW>"},
    ...
  ],
  "red_flags": [
    {"title": "<flag title>", "detail": "<specific concern and implication>", "severity": "<critical|high|medium|low>", "evidence": "<the specific fact from the RESEARCH context supporting this concern, or 'Sector knowledge' if inferred>", "confidence": "<HIGH|MEDIUM|LOW>"},
    ...
  ],
  "key_metrics": {
    "<metric_name>": "<value with unit>"
  },
  "swing_factors": [
    {"question": "<the single most decisive open question whose answer would move this score>", "direction": "<raise|lower|both>", "impact": "<HIGH|MEDIUM|LOW>"},
    ...
  ]
}

Rules:
- score: 90+ exceptional, 70-89 good, 50-69 moderate concerns, <50 significant issues
- findings: exactly 4 items (mix positive/negative), each detail max 20 words
- red_flags: 1-3 items only for genuine risks, each detail max 25 words
- evidence: max 20 words. Cite the actual data point from the RESEARCH section above. If the finding rests on your own sector knowledge rather than the provided research, write exactly "Sector knowledge".
- confidence: HIGH only when grounded in a specific figure/fact from the RESEARCH section; MEDIUM for reasoned inference; LOW for general/uncertain claims.
- EVIDENCE DISCIPLINE: only state something as a confirmed fact about the target when it is backed by the RESEARCH section. If a point is NOT grounded in that research (i.e. evidence would be "Sector knowledge"), phrase the title/detail as a diligence QUESTION or item to verify — e.g. "Verify customer concentration" or "Confirm change-of-control clauses" — NOT as an asserted fact. Never invent specific figures, customer names, competitors or percentages that are not in the research.
- key_metrics: exactly 4 metrics
- swing_factors: exactly 2 — the diligence questions that would most change your score if answered. `direction` = whether a favourable/unfavourable answer would raise, lower, or could move the score both ways. Each question max 22 words. Think like a partner deciding what to verify next.
- Be CONCISE. Total response must be under 900 tokens.
"""

CURR_SYM = {"EUR":"€","USD":"$","GBP":"£","INR":"₹","SGD":"S$","AED":"AED","JPY":"¥","CHF":"Fr","BRL":"R$","AUD":"A$","CNY":"¥"}

def build_user_prompt(pillar: str, deal: dict, context_chunks: list[str]) -> str:
    company  = deal.get('targetCompany', deal.get('target', 'Unknown'))
    acquirer = deal.get('acquirer', 'Unknown')
    sector   = deal.get('sector', '') or 'Unknown'
    sym      = CURR_SYM.get(deal.get('currency', 'EUR'), '€')
    unit     = deal.get('revenueUnit', 'M')

    if context_chunks:
        context = "\n\n".join(context_chunks)
    else:
        context = (f"No proprietary corpus for {company}. Rely on your knowledge of {company} "
                   f"and the {sector} sector, grounded in the deal context above. "
                   f"Produce {sector}-appropriate analysis only.")

    # Acquirer profile (if researched)
    acq_profile = deal.get('acquirerProfile') or {}
    acq_str = ""
    if acq_profile and acq_profile.get('company_name'):
        acq_str = (f"\nAcquirer Profile: {acq_profile.get('company_name')} | "
                   f"Sector: {acq_profile.get('sector','')} | "
                   f"Revenue: {acq_profile.get('revenue','')} | "
                   f"Mkt Cap: {acq_profile.get('market_cap','')}")

    deal_str = f"""
TARGET COMPANY (being acquired — analyse THIS company):
  Name: {company}
  Sector: {sector}
  Revenue: {sym}{deal.get('revenue', '?')}{unit} ({deal.get('revenueYear', '')})
  Employees: {deal.get('employees', '?')}
  Founded: {deal.get('founded', '?')}
  Location: {deal.get('location', 'Unknown')}
  Description: {deal.get('description', '')}

ACQUIRER (buying the target — context only, NOT the subject of this analysis):
  Name: {acquirer}{acq_str}

DEAL:
  Type: {deal.get('dealType', 'Strategic Acquisition')}
  Value: {deal.get('dealValue', 'Unknown')}
"""
    guardrail = (
        f"CRITICAL ANALYSIS RULES:\n"
        f"1. Analyse ONLY the TARGET company ({company}), which is in the **{sector}** sector.\n"
        f"2. Do NOT confuse the target with the acquirer ({acquirer}) — they are different companies.\n"
        f"3. Use ONLY metrics appropriate for {sector}: "
        f"{'EV/Revenue, ARR, NRR, churn' if 'software' in sector.lower() or 'saas' in sector.lower() or 'tech' in sector.lower() else 'EV/EBITDA, capacity utilisation, debt/equity, operating margins'}.\n"
        f"4. Do NOT apply SaaS/software metrics unless {company} is genuinely a software business."
    )

    return f"""DEAL CONTEXT:
{deal_str}
{guardrail}

DUE DILIGENCE RESEARCH ({pillar.upper()} PILLAR) — TARGET: {company}:
{context}

{OUTPUT_SCHEMA}"""
