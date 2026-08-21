/* Dealigent showcase capture — injects fully-analyzed deals via localStorage and
   screenshots every screen at 2x, plus records a walkthrough video for one deal. */
const { chromium } = require('playwright')
const path = require('path')

const API = 'http://localhost:8000'
const APP = 'http://localhost:5173'
const OUT = path.join(__dirname, 'shots')
const VID = path.join(__dirname, 'video')

const DEALS = [
  { prefix: '664c8f6a', slug: 'personio',    pillar: 'financial', record: true  },
  { prefix: '581686cc', slug: 'tatasteel',   pillar: 'financial', record: false },
  { prefix: 'acb989f2', slug: 'commerzbank', pillar: 'legal',     record: false },
]

async function resolveRow(prefix) {
  const d = await (await fetch(`${API}/api/deals/`)).json()
  return d.find(x => x.id.startsWith(prefix))
}

async function buildPersist(row) {
  const id = row.id
  const rows = await (await fetch(`${API}/api/execute/${id}/results`)).json()
  const pillarResults = {}, agentStatus = {}, redFlags = []
  for (const r of rows) {
    let km = {}, grounding = {}, swing = []
    try { const raw = JSON.parse(r.raw_output || '{}'); km = raw.key_metrics || {}; grounding = raw.grounding || {}; swing = raw.swing_factors || [] } catch {}
    pillarResults[r.pillar] = { score: r.score, summary: r.summary, findings: r.findings || [], red_flags: r.red_flags || [], key_metrics: km, grounding, swing_factors: swing }
    agentStatus[r.pillar] = 'complete'
    ;(r.red_flags || []).forEach(f => redFlags.push({ ...f, pillar: r.pillar }))
  }
  const scores = Object.values(pillarResults).map(p => p.score || 0)
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1))
  const activeDeal = {
    id, targetCompany: row.target, acquirer: row.acquirer, dealType: row.deal_type,
    dealValue: row.deal_value, sector: row.sector, currency: row.currency, ...(row.deal_meta || {}),
  }
  const state = {
    isAuthenticated: true,
    user: { name: 'Anish Chatterjee', email: 'anish@dealigent.ai', role: 'Deal Lead' },
    activeDeal, executionPhase: 'complete',
    overallScore: row.overall_score || overall, verdict: row.verdict || 'CONDITIONAL',
    agentStatus, pillarResults, redFlags, wizardDraft: null, pillarDeepDive: {},
  }
  return JSON.stringify({ state, version: 0 })
}

async function shoot(page, url, file, { waitFor, delay = 2200, full = true } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (waitFor) { try { await page.getByText(waitFor, { exact: false }).first().waitFor({ timeout: 45000 }) } catch {} }
  await page.waitForTimeout(delay)
  await page.screenshot({ path: path.join(OUT, file), fullPage: full })
  console.log('  shot', file)
}

;(async () => {
  const browser = await chromium.launch()

  // ── Login screen (clean context, no injection) ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(OUT, '00_login.png'), fullPage: false })
    console.log('shot 00_login.png')
    await ctx.close()
  }

  for (const d of DEALS) {
    const row = await resolveRow(d.prefix)
    if (!row) { console.log('!! no row for', d.prefix); continue }
    const persist = await buildPersist(row)
    console.log(`\n=== ${d.slug} (${row.target}) ===`)

    const ctxOpts = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
    if (d.record) ctxOpts.recordVideo = { dir: VID, size: { width: 1440, height: 900 } }
    const ctx = await browser.newContext(ctxOpts)
    // Inject authenticated + analyzed state before any app script runs.
    await ctx.addInitScript(v => window.localStorage.setItem('dealigent-store', v), persist)
    const page = await ctx.newPage()

    await shoot(page, `${APP}/dashboard`, `${d.slug}_1_dashboard.png`, { waitFor: 'Overall', full: true })
    await shoot(page, `${APP}/pillar/${d.pillar}`, `${d.slug}_2_pillar.png`, { waitFor: 'Findings', full: true })
    await shoot(page, `${APP}/redflags`, `${d.slug}_3_redflags.png`, { waitFor: 'Red Flags', full: true })
    await shoot(page, `${APP}/financial`, `${d.slug}_4_financial.png`, { delay: 4000, full: true })
    await shoot(page, `${APP}/synthesis`, `${d.slug}_5_synthesis.png`, { waitFor: 'Recommendation', delay: 3500, full: true })
    await shoot(page, `${APP}/report`, `${d.slug}_6_report.png`, { waitFor: 'Due Diligence', delay: 4500, full: true })

    await ctx.close() // flushes video
    console.log(`  done ${d.slug}`)
  }

  await browser.close()
  console.log('\nCAPTURE COMPLETE')
})().catch(e => { console.error('CAPTURE ERROR', e); process.exit(1) })
