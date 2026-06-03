"""
Personio GmbH M&A due diligence corpus.
Seeded into ChromaDB so agents can retrieve relevant context via RAG.
"""

PERSONIO_CORPUS = [
    # ── COMMERCIAL ──────────────────────────────────────────────
    {
        "id": "com_001", "pillar": "commercial",
        "text": "Personio is Europe's leading HR software platform for SMBs with 10-2000 employees. As of 2024, the company serves over 14,000 customers across more than 100 countries, with core markets in DACH (Germany, Austria, Switzerland), UK, Spain, Ireland, and the Netherlands. Market penetration in DACH is estimated at ~8% of the addressable SMB segment, indicating significant room for expansion."
    },
    {
        "id": "com_002", "pillar": "commercial",
        "text": "Personio's net revenue retention (NRR) stands at approximately 118%, driven by seat expansion as customers grow and upsell to premium modules (Payroll, Recruiting, Performance). Gross churn is approximately 6% annually, well below the SaaS industry average of 8-12% for the SMB segment. Customer lifetime value (LTV) averages €42,000 per customer, with an LTV:CAC ratio of 4.2x."
    },
    {
        "id": "com_003", "pillar": "commercial",
        "text": "The European HR tech TAM is estimated at €14.5B by 2026, growing at 11% CAGR. Personio competes primarily with BambooHR (US-focused), HiBob, and Factorial in the SMB segment. Against legacy ERPs like SAP SuccessFactors and Workday itself, Personio wins on simplicity and price-to-value for sub-2000 employee companies. The Workday acquisition would eliminate a competitor while gaining European SMB distribution."
    },
    {
        "id": "com_004", "pillar": "commercial",
        "text": "Top 10 customers represent approximately 9% of ARR — healthy diversification for an SMB-focused platform. Average contract value (ACV) increased from €6,800 (2021) to €10,200 (2024) as Personio moves upmarket toward the 200-2000 employee segment. Sales cycles average 45 days for <200 employee deals and 90-120 days for enterprise deals. Channel partnerships with 850+ HR consultancies contribute ~22% of new ARR."
    },

    # ── FINANCIAL ──────────────────────────────────────────────
    {
        "id": "fin_001", "pillar": "financial",
        "text": "Personio reported €95M ARR in FY2023, growing 49% YoY. FY2024 estimated ARR reaches €142M (+49% YoY), with ~94% subscription revenue and 6% implementation/professional services. Gross margins are 73%, reflecting the cloud-native SaaS model. EBITDA margin stands at -18% in FY2024 as Personio invests heavily in product, S&M and international expansion. The company has a clear path to EBITDA profitability by FY2026 at current growth trajectory."
    },
    {
        "id": "fin_002", "pillar": "financial",
        "text": "Personio raised €200M Series E in October 2021 at a €6.3B valuation, with investors including Greenoaks, Accel, and Index Ventures. Total funding is €499M across 6 rounds. Cash position as of Q3 2024 is approximately €140M with a monthly burn rate of €8.2M, giving ~17 months of runway. The deal at €1.8B represents a significant discount to peak valuation — acquisition multiple of approximately 12.7x LTM ARR."
    },
    {
        "id": "fin_003", "pillar": "financial",
        "text": "Revenue quality assessment: 94% recurring, 3-year average contract term, annual prepay for 68% of customers (strong cash conversion), net cash from operations improving from -€45M (FY2022) to -€28M (FY2024). Rule of 40 score: 49% + (-18%) = 31% — below the 40% benchmark, reflecting growth-phase investment prioritisation. Key financial risk: customer cohort analysis shows payback period extending from 18 months (2021 cohorts) to 26 months (2023 cohorts) as CAC increases in competitive markets."
    },
    {
        "id": "fin_004", "pillar": "financial",
        "text": "Workday acquisition synergy modelling: Cost synergies of ~€22M by year 3 through G&A consolidation, infrastructure and vendor rationalisation. Revenue synergies of €35-55M by year 3 through cross-sell of Workday Financial Management and HCM to Personio's 14,000 customer base, and Personio's product bundled into Workday's mid-market offering. Estimated 3-year NPV of synergies: €180-220M at a 12% discount rate."
    },

    # ── OPERATIONAL ──────────────────────────────────────────────
    {
        "id": "ops_001", "pillar": "operational",
        "text": "Personio operates from 7 offices across Munich (HQ), Madrid, London, Dublin, Amsterdam, New York, and Berlin with approximately 1,800 FTEs. R&D accounts for 38% of headcount (680 engineers), Sales & Marketing 35% (630), G&A 12%, and Customer Success 15%. The company processed payroll for 1.4M employees across its platform in 2024, with 99.95% platform uptime. Infrastructure runs entirely on AWS (eu-west-1 primary, eu-central-1 DR)."
    },
    {
        "id": "ops_002", "pillar": "operational",
        "text": "Unit economics are strong: Customer Acquisition Cost (CAC) averages €9,800 per customer (blended across SMB and mid-market), with the self-serve/PLG motion accounting for 18% of new customers at ~€1,200 CAC. Average revenue per employee (ARPE) €79K — competitive for European SaaS. Sales efficiency ratio (new ARR / S&M spend) of 0.68, improving from 0.52 in FY2022 as the business scales. NPS score consistently 58-62, industry-leading for HR software."
    },
    {
        "id": "ops_003", "pillar": "operational",
        "text": "Personio's multi-country payroll module (launched 2022) covers 12 European countries and represents the highest-value and highest-complexity part of the platform. Localisation for payroll compliance requires ongoing investment (estimated €6M/year) but creates significant competitive moat. Operational risk: the payroll module experienced 3 processing errors affecting ~200 customers in FY2023 — each required manual remediation and generated reputational risk. Post-acquisition integration complexity is elevated given payroll regulatory requirements."
    },

    # ── LEGAL ──────────────────────────────────────────────────
    {
        "id": "leg_001", "pillar": "legal",
        "text": "Personio processes employee personal data for 1.4M individuals across the EU, subject to GDPR. The company holds ISO 27001 and SOC 2 Type II certifications. A Data Processing Agreement (DPA) is standard in all customer contracts. In 2023, Personio received 2 regulatory inquiries from German data protection authorities (Bavarian DPA) regarding employee data retention practices — both resolved without formal proceedings. GDPR compliance posture is rated 'Strong' by external auditors."
    },
    {
        "id": "leg_002", "pillar": "legal",
        "text": "Intellectual property: Personio holds 23 registered patents (EU and US) covering HR workflow automation, payroll calculation engines, and AI-powered people analytics. Core IP was developed in-house. Following the 2022 acquisition of Back (employee benefits platform), 4 additional patents were absorbed — IP transfer documentation is complete but one patent (US11,456,890) has an unresolved co-inventor dispute with a former Back employee. Legal risk rating: Medium. Resolution expected Q1 2025."
    },
    {
        "id": "leg_003", "pillar": "legal",
        "text": "Litigation: 3 active proceedings — (1) German labour court dispute with former VP Sales over equity vesting terms (€380K claimed, low probability of material loss), (2) IP infringement claim from PeopleDoc (now part of UKG) regarding document management workflow (settled in principle for €250K), (3) Customer data breach class action in Netherlands involving 1,200 employee records exposed in 2022 incident (potential exposure €1.2M-2.5M, adequately reserved). No material undisclosed liabilities identified in VDD process."
    },

    # ── TECHNOLOGY ──────────────────────────────────────────────
    {
        "id": "tec_001", "pillar": "technology",
        "text": "Personio's platform is built on a modern microservices architecture deployed on AWS (EKS). Core backend services are written in Ruby on Rails (legacy) and Go (new services), with React/TypeScript frontend. The company transitioned from a monolith to microservices in 2021-2023. Currently 67% of traffic goes through new Go microservices, with 33% still on the Rails monolith. Technical debt is visible in the legacy payroll and document management modules. Engineering team of 680 includes 12% ML/AI specialists."
    },
    {
        "id": "tec_002", "pillar": "technology",
        "text": "Personio AI features ('Personio Intelligence') launched in 2024, covering automated candidate screening, absence pattern analysis, and people analytics. The AI layer uses fine-tuned Llama 3 models served on AWS Bedrock, with proprietary HR ontology. AI adoption rate among customers: 34% of enterprise tier, 8% of SMB tier. This represents a meaningful competitive differentiator and upsell opportunity. The AI architecture is compatible with Workday's AI platform (Workday AI) — integration pathway exists."
    },
    {
        "id": "tec_003", "pillar": "technology",
        "text": "Security posture: ISO 27001 certified, SOC 2 Type II, pen testing conducted semi-annually by NCC Group. One critical vulnerability (CVSS 9.1) in the API gateway was discovered and patched in 72 hours in Q2 2024 — no customer data exposed. Security incident response time: P1 issues resolved in <4 hours average. Infrastructure-as-code via Terraform (95% coverage). Observability via Datadog. DORA metrics: deployment frequency daily, lead time for changes <2 days, MTTR 45 minutes — industry-leading DevOps performance."
    },

    # ── MANAGEMENT ──────────────────────────────────────────────
    {
        "id": "mgmt_001", "pillar": "management",
        "text": "Personio was co-founded in 2015 by Hanno Renner (CEO), Roman Schumacher, Arseniy Vershinin, Ignaz Forstmeier, and Jonas Rieke. The founding team retains 22% equity post-Series E. CEO Hanno Renner (34) is a first-time CEO with strong product vision but limited experience managing a 1,800-person organisation through a major acquisition. Key risk: Renner's employment contract includes a standard 12-month non-compete and change-of-control provisions requiring 2x acceleration on unvested options — estimated €18M in accelerated vesting obligations."
    },
    {
        "id": "mgmt_002", "pillar": "management",
        "text": "Executive team assessment: CPO (Marc Müller, ex-SAP) — Strong, 4 years tenure, key product architecture knowledge. CRO (Sarah Chen, ex-Salesforce) — Hired 2023, strong SaaS enterprise sales background, critical for upmarket motion. CFO (Thomas Weber, ex-Wirecard/Klarna) — Solid financial controls implementation, appropriate for pre-IPO/exit stage. CTO (Klaus Hoffmann, ex-Google Cloud) — Respected by engineering team, leads the microservices migration. Key person risk: departure of Chen or Hoffmann would materially impact execution."
    },
    {
        "id": "mgmt_003", "pillar": "management",
        "text": "Cultural alignment assessment: Personio has a distinctly European, employee-first culture (ranked #4 Great Place to Work Germany 2024). Workday's culture is US-enterprise with stronger performance management norms. Integration risk is elevated — Workday's previous European acquisition (Adaptive Insights, 2018) experienced 28% voluntary attrition in year 1. Recommended mitigation: retain Personio as an autonomous business unit for 18-24 months post-close, with brand preservation and Munich HQ maintained. Employee NPS 72 — retention at risk if integration is heavy-handed."
    },
]
