"""Deep dive prompts for each pillar — generate rich structured intelligence."""

DEEPDIVE_PROMPTS = {

"commercial": '''You are an M&A commercial due diligence expert. Generate rich commercial intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}
Findings: {findings_text}

Return ONLY valid JSON (no markdown):
{{
  "market_data": {{
    "tam": "value with currency and year e.g. €14.5B (2024)",
    "sam": "value with context",
    "som": "value with context",
    "growth_rate": "X% CAGR YYYY-YYYY",
    "maturity_stage": "Introduction|Growth|Maturity|Decline",
    "key_drivers": ["driver1","driver2","driver3","driver4"]
  }},
  "competitors": [
    {{"name":"","hq":"","est_revenue":"","market_share":"","threat_level":"High|Medium|Low","funding":"","description":""}}
  ],
  "porters_5_forces": {{
    "threat_of_entry":  {{"score":3,"explanation":"one sentence"}},
    "buyer_power":      {{"score":3,"explanation":"one sentence"}},
    "supplier_power":   {{"score":3,"explanation":"one sentence"}},
    "substitutes":      {{"score":3,"explanation":"one sentence"}},
    "rivalry":          {{"score":4,"explanation":"one sentence"}}
  }},
  "revenue_quality": {{
    "recurring_pct": 85,
    "non_recurring_pct": 15,
    "avg_contract_length": "12 months",
    "customer_concentration": "top 3 = X% of revenue",
    "nrr_estimate": "XXX%",
    "churn_estimate": "X% annual"
  }},
  "tailwinds": [
    {{"title":"","description":"one sentence"}}
  ],
  "headwinds": [
    {{"title":"","description":"one sentence"}}
  ]
}}
Exactly 3 tailwinds and 3 headwinds. For "competitors", list ONLY real, named competitors of {company} that you are confident exist — if you cannot name real ones, return an empty array (do NOT invent placeholder company names). For tam/sam/som/growth_rate and any market_share/concentration/churn/NRR figures, only give a number if it is a well-known published figure; otherwise use null — do NOT fabricate precise statistics. Be concise — max 700 tokens total.''',

"financial": '''You are a senior investment banker. Generate financial deep dive intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}
Revenue: {revenue} {revenue_unit} {currency}

Return ONLY valid JSON (no markdown):
{{
  "pl_summary": {{
    "revenue_fy_2":  {{"value": 0, "label": "FY2022"}},
    "revenue_fy_1":  {{"value": 0, "label": "FY2023"}},
    "revenue_fy0":   {{"value": 0, "label": "FY2024A"}},
    "revenue_fy1e":  {{"value": 0, "label": "FY2025E"}},
    "revenue_fy2e":  {{"value": 0, "label": "FY2026E"}},
    "gross_margin_pct": 0,
    "ebitda_margin_pct": 0,
    "net_margin_pct": 0,
    "unit": "{revenue_unit}",
    "currency": "{currency}"
  }},
  "comps_table": [
    {{"company":"","ev_revenue":"0x","ev_ebitda":"0x","revenue_growth":"0%","notes":""}}
  ],
  "valuation_range": {{
    "low":  {{"ev": 0, "multiple": "Xx EV/Rev (bear)"}},
    "base": {{"ev": 0, "multiple": "Xx EV/Rev (base)"}},
    "high": {{"ev": 0, "multiple": "Xx EV/Rev (bull)"}}
  }},
  "key_ratios": [
    {{"ratio":"Rule of 40","value":"0%","benchmark":"≥40%","status":"In Range|Below|Above"}},
    {{"ratio":"Gross Margin","value":"0%","benchmark":"sector avg","status":"In Range|Below|Above"}},
    {{"ratio":"Current Ratio","value":"0.0","benchmark":"≥1.5","status":"In Range|Below|Above"}},
    {{"ratio":"Debt/Equity","value":"0.0","benchmark":"≤1.0","status":"In Range|Below|Above"}},
    {{"ratio":"ROCE","value":"0%","benchmark":"≥15%","status":"In Range|Below|Above"}}
  ],
  "cash_flow_status": "positive|negative|breakeven",
  "cash_flow_note": "one sentence",
  "deal_synergies": {{
    "revenue_synergies_note": "brief description and estimated value",
    "cost_synergies_note": "brief description and estimated value",
    "total_synergy_estimate": "value in {revenue_unit} {currency}"
  }}
}}
Do NOT invent the target's own financials — the real figures are injected separately and will overwrite pl_summary/valuation. For comps_table, name ONLY real comparable companies (empty array if unsure). Use null for any ratio you cannot ground. Max 700 tokens.''',

"operational": '''You are an operations due diligence expert. Generate operational intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}

Return ONLY valid JSON (no markdown):
{{
  "efficiency_metrics": {{
    "revenue_per_employee": "value with unit",
    "operating_leverage": "High|Medium|Low",
    "capacity_utilization": "XX%",
    "gross_margin": "XX%"
  }},
  "supply_chain": {{
    "resilience_score": 7,
    "single_source_risk": "Low|Medium|High",
    "key_suppliers": [
      {{"name":"","procurement_pct":"XX%","dependency":"High|Medium|Low","category":""}}
    ],
    "geographic_concentration": "description"
  }},
  "rd_pipeline": {{
    "rd_spend_pct_revenue": "X%",
    "industry_benchmark": "X%",
    "patents_last_3y": 0,
    "key_initiatives": [
      {{"name":"","status":"Active|Planned|Completed","description":""}}
    ]
  }},
  "workforce": {{
    "headcount_trend": "Growing|Stable|Declining",
    "attrition_estimate": "X%",
    "rev_per_employee_vs_benchmark": "Above|At|Below"
  }},
  "integration_complexity": "Low|Medium|High",
  "integration_notes": "2-3 sentence integration assessment"
}}
Max 600 tokens.''',

"legal": '''You are an M&A legal counsel. Generate legal due diligence intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}

Return ONLY valid JSON (no markdown):
{{
  "ip_portfolio": {{
    "patent_count": 0,
    "trademark_count": 0,
    "ip_strength_score": 7,
    "ip_strength_note": "brief",
    "key_patents": [
      {{"title":"","filed":"YYYY","status":"Active|Pending|Expired","strategic_value":"High|Medium|Low"}}
    ]
  }},
  "material_contracts": [
    {{"counterparty":"","contract_type":"","est_value":"","expiry":"","auto_renew":true,"risk_rating":"High|Medium|Low"}}
  ],
  "litigation": {{
    "active_cases": 0,
    "total_exposure_estimate": "value",
    "overall_risk": "Low|Medium|High",
    "cases": [
      {{"case":"","status":"","est_exposure":"","description":""}}
    ]
  }},
  "compliance": [
    {{"regulation":"","applicable":true,"status":"Compliant|Non-compliant|Partial|Unknown","notes":""}}
  ],
  "corporate_structure": {{
    "jurisdiction": "",
    "subsidiary_count": 0,
    "cross_border_complexity": "Low|Medium|High",
    "notes": ""
  }},
  "change_of_control": {{
    "coc_provisions": "description of key CoC clauses",
    "acceleration_obligations": "estimated value",
    "consent_requirements": "list of key consents needed"
  }}
}}
Max 600 tokens.''',

"technology": '''You are a CTO-level technology due diligence expert. Generate technology intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}

Return ONLY valid JSON (no markdown):
{{
  "tech_stack": [
    {{"layer":"Frontend","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"Backend","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"Database","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"Cloud/Infra","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"Data/Analytics","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"Security","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}},
    {{"layer":"DevOps","technologies":"","modernity":"Modern|Mixed|Legacy","notes":""}}
  ],
  "engineering_team": {{
    "headcount_estimate": 0,
    "eng_pct_of_total": "XX%",
    "benchmark_pct": "XX%",
    "key_roles": ["CTO", "VP Engineering"],
    "talent_quality": "Strong|Average|Below Average"
  }},
  "tech_debt": {{
    "score": 7,
    "score_note": "10=no debt, 1=severe",
    "key_indicators": ["indicator1","indicator2"],
    "remediation_estimate": "€X-Y M over Z years"
  }},
  "security_posture": {{
    "certifications": [
      {{"name":"SOC2 Type II","status":"Certified|In Progress|Not Started"}}
    ],
    "known_incidents": [],
    "cloud_provider": "",
    "infra_maturity": "Cloud-native|Cloud-migrated|On-premise|Hybrid"
  }},
  "product_roadmap": [
    {{"initiative":"","timeline":"H1 2025|H2 2025|2026","investment_signal":"High|Medium|Low","status":"Active|Planned"}}
  ],
  "ai_capability": {{
    "has_ai_features": true,
    "ai_maturity": "Early|Growing|Advanced",
    "description": "brief"
  }},
  "dora_metrics": {{
    "deployment_frequency": "Daily|Weekly|Monthly|Rarely",
    "lead_time": "<1 day|1-7 days|1-4 weeks|>1 month",
    "mttr": "< 1 hour|1-24 hours|1-7 days|>1 week",
    "change_fail_rate": "0-5%|5-15%|15-30%|>30%"
  }}
}}
Max 650 tokens.''',

"management": '''You are an executive assessment and M&A advisor. Generate management intelligence for {company} ({sector}).

Existing DD result:
Score: {score}
Summary: {summary}
Key metrics: {key_metrics}

Return ONLY valid JSON (no markdown):
{{
  "executives": [
    {{
      "title": "CEO",
      "name": "",
      "tenure_years": 0,
      "background": "2-3 key prior roles",
      "assessment": "Strong|Adequate|Weak",
      "key_risk": ""
    }}
  ],
  "key_man_risk": {{
    "score": 7,
    "score_note": "10=critical dependency, 1=well distributed",
    "key_persons": ["name — reason"],
    "retention_status": "Strong packages|Standard|Unknown|At Risk",
    "mitigation": "recommendation"
  }},
  "board": {{
    "total_size": 0,
    "independent_count": 0,
    "governance_score": 7,
    "notes": ""
  }},
  "culture": {{
    "glassdoor_rating": null,
    "glassdoor_note": "indicative only",
    "work_env": "European/US/Asian startup/corporate",
    "acquirer_fit": "Strong|Moderate|Weak",
    "integration_risk": "Low|Medium|High",
    "integration_strategy": "Autonomous BU|Partial Integration|Full Integration"
  }},
  "compensation": {{
    "c_suite_vs_benchmark": "Above|At|Below market",
    "esop_status": "Active|Not established|Unknown",
    "acceleration_obligations": "€X-Y M estimated"
  }},
  "org_structure": {{
    "management_layers": 0,
    "span_of_control": "Wide|Narrow|Average",
    "recent_restructuring": false,
    "restructuring_notes": ""
  }}
}}
Executives: include CEO, CTO/CPO, CFO, COO (4-5 entries). Max 700 tokens.'''

}


def build_deepdive_prompt(pillar: str, deal: dict, pillar_result: dict) -> str:
    template = DEEPDIVE_PROMPTS.get(pillar, '')
    if not template:
        return ''

    findings_text = ' | '.join([f.get('title', '') for f in (pillar_result.get('findings') or [])[:4]])
    company = deal.get('targetCompany', deal.get('target', 'Unknown'))
    sector  = deal.get('sector', '') or 'Unknown'
    description = (deal.get('description') or '').strip()
    acquirer = deal.get('acquirer', '') or ''

    body = template.format(
        company      = company,
        sector       = sector,
        score        = pillar_result.get('score', 70),
        summary      = pillar_result.get('summary', '')[:300],
        key_metrics  = str(pillar_result.get('key_metrics', {}))[:300],
        findings_text= findings_text,
        revenue      = deal.get('revenue', ''),
        revenue_unit = deal.get('revenueUnit', 'M'),
        currency     = deal.get('currency', 'EUR'),
    )

    # ── Anchor block: bind the model to THIS company's real identity ──
    anchor = f"TARGET COMPANY: {company}\nSECTOR: {sector}\n"
    if description:
        anchor += f"BUSINESS: {description[:500]}\n"
    if acquirer:
        anchor += f"ACQUIRER (context only): {acquirer}\n"

    # ── Integrity guardrail — no fabrication, no sector drift, honest gaps ──
    guardrail = (
        anchor +
        f"\nINTEGRITY RULES (read carefully):\n"
        f"1. Describe ONLY {company}, exactly as characterised above. NEVER substitute another company or "
        f"another industry's characteristics. If the business is in {sector}, every detail must fit a {sector} "
        f"business — do not drift into retail, apparel, SaaS or any other model that is not {company}.\n"
        f"2. Do NOT fabricate. If you do not have grounded knowledge for a specific value (a figure, percentage, "
        f"named person, competitor, patent, contract, certification), return null, an empty array, or "
        f"\"Not disclosed\" — never invent a plausible-looking number or name.\n"
        f"3. Only name real, verifiable entities (competitors, executives, suppliers, regulators). "
        f"Placeholder or made-up names are strictly forbidden.\n"
        f"4. Any number that is your own estimate rather than a known fact must be conservative and clearly generic; "
        f"prefer ranges or null over false precision.\n\n"
    )
    return guardrail + body
