# Security policy

Please report vulnerabilities privately via **GitHub → Security → Report a vulnerability** on this
repository rather than opening a public issue. We aim to respond within 5 working days.

Dealigent never needs credentials beyond the LLM / Apify API keys in `backend/.env`, which is
git-ignored. Never commit real keys. Rotate them immediately if one is ever exposed.
