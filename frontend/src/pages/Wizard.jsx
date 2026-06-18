import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, Building2, DollarSign,
  FileText, Settings2, Rocket, AlertCircle, Loader2, Sparkles,
  Search, TrendingUp, BarChart2, Newspaper, Database,
  CheckCircle2, RefreshCw, X
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { PILLARS } from '../lib/constants'

const STEPS = [
  { id: 'overview',  label: 'Deal Overview',   Icon: Building2  },
  { id: 'company',   label: 'Company Profile', Icon: DollarSign },
  { id: 'documents', label: 'Document Vault',  Icon: FileText   },
  { id: 'agents',    label: 'Agent Config',    Icon: Settings2  },
  { id: 'launch',    label: 'Review & Launch', Icon: Rocket     },
]

const DEAL_TYPES = ['Strategic Acquisition','Financial Acquisition','Merger','Asset Purchase','Majority Stake','Joint Venture']
const SECTORS    = ['Enterprise SaaS','FinTech','HealthTech','E-Commerce','Manufacturing','Steel & Metals',
                    'Pharmaceuticals','Energy','Banking & Finance','Logistics','Retail','Real Estate',
                    'Telecommunications','HR Technology','Other']

// Map Yahoo Finance sector + industry strings to our SECTORS list
function mapYFSector(yfSector, yfIndustry) {
  const s = (yfSector || '').toLowerCase()
  const ind = (yfIndustry || '').toLowerCase()
  const combined = `${s} ${ind}`
  if (combined.includes('steel') || combined.includes('metal') || combined.includes('iron')) return 'Steel & Metals'
  if (combined.includes('pharma') || combined.includes('drug') || combined.includes('biotech')) return 'Pharmaceuticals'
  if (combined.includes('software') || combined.includes('saas') || combined.includes('internet')) return 'Enterprise SaaS'
  if (combined.includes('fintech') || combined.includes('payment') || combined.includes('insurtech')) return 'FinTech'
  if (combined.includes('health') || combined.includes('medical') || combined.includes('hospital')) return 'HealthTech'
  if (combined.includes('bank') || combined.includes('financ') || combined.includes('insurance') || combined.includes('asset management')) return 'Banking & Finance'
  if (combined.includes('retail') || combined.includes('e-commerce') || combined.includes('ecommerce') || combined.includes('consumer cyclical')) return 'Retail'
  if (combined.includes('energy') || combined.includes('oil') || combined.includes('gas') || combined.includes('utility')) return 'Energy'
  if (combined.includes('logistic') || combined.includes('transport') || combined.includes('freight') || combined.includes('shipping')) return 'Logistics'
  if (combined.includes('real estate') || combined.includes('reit') || combined.includes('property')) return 'Real Estate'
  if (combined.includes('telecom') || combined.includes('communication') || combined.includes('wireless')) return 'Telecommunications'
  if (combined.includes('hr') || combined.includes('human resource') || combined.includes('staffing') || combined.includes('payroll')) return 'HR Technology'
  if (combined.includes('technolog') || combined.includes('semiconductor') || combined.includes('hardware')) return 'Enterprise SaaS'
  if (combined.includes('manufactur') || combined.includes('industrial') || combined.includes('basic material') || combined.includes('chemical')) return 'Manufacturing'
  if (combined.includes('consumer') || combined.includes('food') || combined.includes('beverage')) return 'Retail'
  return null // let the existing value remain
}
const CURRENCIES = ['EUR','USD','GBP','INR','SGD','AED','JPY','BRL','AUD','CHF','CNY']
const REVENUE_UNITS = ['M','B','Cr','K']

const DOC_TYPES = [
  { id: 'im',         label: 'Information Memorandum',   size: '4.2 MB',  type: 'PDF'  },
  { id: 'financial',  label: 'Financial Model (3-Year)', size: '1.8 MB',  type: 'XLSX' },
  { id: 'legal',      label: 'Legal Due Diligence Pack', size: '12.4 MB', type: 'PDF'  },
  { id: 'tech',       label: 'Technology Audit Report',  size: '3.1 MB',  type: 'PDF'  },
  { id: 'management', label: 'Management Presentation',  size: '8.7 MB',  type: 'PPTX' },
  { id: 'contracts',  label: 'Key Contracts Summary',    size: '2.3 MB',  type: 'PDF'  },
]

const PILLAR_DESCRIPTIONS = {
  commercial:  'Market position, competitive moat, customer concentration & growth drivers',
  financial:   'Revenue quality, EBITDA bridge, cash flow, working capital & debt structure',
  operational: 'Business model scalability, unit economics, supply chain & cost base',
  legal:       'Regulatory exposure, IP ownership, litigation risk & compliance posture',
  technology:  'Tech stack maturity, scalability, security posture & engineering talent',
  management:  'Leadership quality, retention risk, org design & cultural alignment',
}

const RESEARCH_STAGES = [
  { id: 'profile',   label: 'Company Profile',        Icon: Building2   },
  { id: 'financials',label: 'Yahoo Finance (Live)',    Icon: TrendingUp  },
  { id: 'market',    label: 'Market Intelligence',     Icon: BarChart2   },
  { id: 'news',      label: 'News & Sentiment',        Icon: Newspaper   },
  { id: 'seeding',   label: 'Seeding AI Context',      Icon: Database    },
]

const CURRENCY_SYMBOL = { INR:'₹', USD:'$', EUR:'€', GBP:'£', SGD:'S$', AED:'AED', JPY:'¥', BRL:'R$', AUD:'A$', CHF:'Fr', CNY:'¥' }

const slide = (dir) => ({
  initial: { opacity: 0, x: dir * 40 }, animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: dir * -40 }, transition: { duration: 0.28, ease: 'easeOut' },
})

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#94a3b8]">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', prefix, suffix }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none">{prefix}</span>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full py-3 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none transition-all"
        style={{ paddingLeft: prefix ? '2.2rem' : '1rem', paddingRight: suffix ? '3rem' : '1rem',
          background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(0,101,120,0.15)',
          boxShadow: '0 1px 4px rgba(0,101,120,0.06)' }}
        onFocus={(e) => (e.target.style.borderColor = '#00D4F0')}
        onBlur={(e)  => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xs pointer-events-none">{suffix}</span>}
    </div>
  )
}

function SelectField({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full px-4 py-3 rounded-xl text-sm text-[#1a2332] outline-none transition-all appearance-none cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(0,101,120,0.15)',
        boxShadow: '0 1px 4px rgba(0,101,120,0.06)' }}
      onFocus={(e) => (e.target.style.borderColor = '#00D4F0')}
      onBlur={(e)  => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl p-6" style={{
      background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 4px 24px rgba(0,101,120,0.08)',
    }}>
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
        {subtitle && <p className="text-xs text-[#64748b] mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Shared Company Research Panel (target or acquirer) ──────────
function ResearchPanel({ onComplete, peerCompany, savedResult, mode = 'target' }) {
  const isAcquirer = mode === 'acquirer'
  const accent     = isAcquirer ? '#7c3aed' : '#006578'
  const accentLight = isAcquirer ? 'rgba(124,58,237,0.08)' : 'rgba(0,212,240,0.06)'
  const accentBorder = isAcquirer ? '1.5px solid rgba(124,58,237,0.25)' : '1.5px solid rgba(0,212,240,0.20)'

  const [query, setQuery]         = useState(savedResult?.company_name || '')
  const [country, setCountry]     = useState('Europe')
  const [isRunning, setIsRunning] = useState(false)
  const [stages, setStages]       = useState(
    savedResult ? { profile: 'complete', financials: 'complete', market: 'complete', news: 'complete', seeding: 'complete' } : {}
  )
  const [done, setDone]           = useState(!!savedResult)
  const [result, setResult]       = useState(savedResult || null)
  const esRef = useRef(null)

  const COUNTRIES = ['Europe','Germany','United Kingdom','France','Netherlands','Switzerland',
                     'Sweden','Spain','India','United States','Singapore','UAE','Japan','Australia','Brazil','China','Other']

  const startResearch = async () => {
    if (!query.trim()) return
    setIsRunning(true)
    setDone(false)
    setStages({})
    setResult(null)
    if (esRef.current) esRef.current.close()

    try {
      const resp = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: query.trim(), country, acquirer: peerCompany }),
      })

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(5))
              if (currentEvent === 'stage_start') {
                setStages(s => ({ ...s, [data.stage]: 'running' }))
              } else if (currentEvent === 'stage_complete') {
                setStages(s => ({ ...s, [data.stage]: 'complete' }))
              } else if (currentEvent === 'research_complete') {
                setResult(data.data)
              } else if (currentEvent === 'done') {
                setDone(true)
                setIsRunning(false)
              }
            } catch {}
            currentEvent = ''
          }
        }
      }
    } catch (e) {
      setIsRunning(false)
    }
  }

  const title    = isAcquirer ? 'AI Acquirer Research' : 'AI Target Research'
  const subtitle = isAcquirer
    ? 'Research the acquirer — fetch their financials, strategic priorities, and acquisition history.'
    : 'Enter a target company name — fetch real financial data, market intelligence, and news automatically.'
  const placeholder = isAcquirer ? 'e.g. Workday, SAP, Microsoft...' : 'e.g. Personio GmbH, ASML, Siemens Energy...'
  const btnLabel = isAcquirer ? 'Use This Data → Fill Acquirer' : 'Use This Data → Auto-fill Form'

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Company Name">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startResearch()}
                  placeholder={placeholder}
                  className="w-full py-3 pl-10 pr-4 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none"
                  style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(0,101,120,0.15)',
                    boxShadow: '0 1px 4px rgba(0,101,120,0.06)' }}
                  onFocus={e => (e.target.style.borderColor = isAcquirer ? '#7c3aed' : '#00D4F0')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')}
                />
              </div>
            </Field>
          </div>
          <Field label="Country">
            <SelectField value={country} onChange={e => setCountry(e.target.value)} options={COUNTRIES} />
          </Field>
        </div>

        <motion.button
          onClick={startResearch}
          disabled={!query.trim() || isRunning}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Space Grotesk, sans-serif',
            background: isAcquirer ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'linear-gradient(135deg, #006578 0%, #00899e 100%)',
            boxShadow: isAcquirer ? '0 4px 16px rgba(124,58,237,0.25)' : '0 4px 16px rgba(0,101,120,0.25)' }}
        >
          {isRunning ? <><Loader2 size={15} className="animate-spin" /> Researching...</>
                     : <><Sparkles size={15} /> Research {isAcquirer ? 'Acquirer' : 'Company'}</>}
        </motion.button>

        {/* Stage progress */}
        {(isRunning || done) && (
          <div className="space-y-2 pt-2">
            {RESEARCH_STAGES.map(({ id, label, Icon }) => {
              const st = stages[id]
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl"
                  style={{
                    background: st === 'complete' ? 'rgba(34,197,94,0.06)' :
                                st === 'running'  ? (isAcquirer ? 'rgba(124,58,237,0.06)' : 'rgba(0,212,240,0.06)') : 'rgba(0,0,0,0.02)',
                    border: st === 'complete' ? '1px solid rgba(34,197,94,0.20)' :
                            st === 'running'  ? (isAcquirer ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(0,212,240,0.25)') : '1px solid transparent',
                  }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: st === 'complete' ? '#22c55e' : st === 'running' ? (isAcquirer ? '#7c3aed' : '#00D4F0') : 'rgba(0,0,0,0.08)' }}>
                    {st === 'complete' ? <Check size={11} color="white" strokeWidth={3} />
                      : st === 'running' ? <Loader2 size={11} color="white" className="animate-spin" />
                      : <Icon size={11} color="#94a3b8" />}
                  </div>
                  <span className="text-sm font-medium" style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: st === 'complete' ? '#16a34a' : st === 'running' ? accent : '#94a3b8'
                  }}>{label}</span>
                  {st === 'running' && (
                    <span className="text-[10px] font-mono ml-auto animate-pulse" style={{ color: isAcquirer ? '#7c3aed' : '#00D4F0' }}>live</span>
                  )}
                  {st === 'complete' && (
                    <CheckCircle2 size={12} className="ml-auto text-green-500" />
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Result summary */}
        {done && result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: accentLight, border: accentBorder }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: accent, fontFamily: 'Space Grotesk, sans-serif' }}>
                {result.company_name}
              </p>
              {result.ticker && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${accent}15`, color: accent }}>
                  {result.ticker}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {result.revenue && (
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider text-[10px]">Revenue</p>
                  <p className="font-bold text-[#1a2332]">{CURRENCY_SYMBOL[result.currency] || ''}{result.revenue} {result.revenue_unit}</p>
                </div>
              )}
              {result.market_cap && (
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider text-[10px]">Mkt Cap</p>
                  <p className="font-bold text-[#1a2332]">{CURRENCY_SYMBOL[result.currency] || ''}{result.market_cap} {result.revenue_unit}</p>
                </div>
              )}
              {result.sentiment && (
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider text-[10px]">Sentiment</p>
                  <p className="font-bold" style={{ color: result.sentiment === 'positive' ? '#22c55e' : result.sentiment === 'negative' ? '#ef4444' : '#f59e0b' }}>
                    {result.sentiment}
                  </p>
                </div>
              )}
            </div>
            {result.market_size && (
              <p className="text-xs text-[#475569]">
                <span className="text-[#94a3b8]">Market: </span>{result.market_size}
              </p>
            )}
            {result.competitors?.length > 0 && (
              <p className="text-xs text-[#475569]">
                <span className="text-[#94a3b8]">{isAcquirer ? 'Recent acquisitions / peers: ' : 'Competitors: '}</span>{result.competitors.join(' · ')}
              </p>
            )}
            <motion.button
              onClick={() => onComplete(result)}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-1"
              style={{ background: isAcquirer ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'linear-gradient(135deg, #006578 0%, #00899e 100%)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {btnLabel}
            </motion.button>
          </motion.div>
        )}
      </div>
    </SectionCard>
  )
}

// ── Main Wizard ─────────────────────────────────────────────────
export default function Wizard() {
  const navigate = useNavigate()
  const { setActiveDeal, resetExecution, wizardDraft, setWizardDraft, clearWizardDraft } = useDealStore()

  const BLANK_FORM = {
    target: '', acquirer: '', dealType: DEAL_TYPES[0], dealValue: '', currency: 'EUR',
    revenueUnit: 'M', codeName: '', ticker: '',
    sector: SECTORS[0], location: '', employees: '', founded: '', revenue: '',
    revenueYear: '2026', description: '', dealRationale: '',
  }

  const [step, setStep]       = useState(wizardDraft?.step || 0)
  const [dir, setDir]         = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadedDocs, setUploadedDocs]     = useState(wizardDraft?.uploadedDocs || [])
  const [enabledPillars, setEnabledPillars] = useState(wizardDraft?.enabledPillars || PILLARS.map(p => p.id))
  const [form, setForm]       = useState(wizardDraft?.form || BLANK_FORM)
  // Persisted research results — survives navigation
  const [savedResearch, setSavedResearch]         = useState(wizardDraft?.researchResult || null)
  const [savedAcquirerResearch, setSavedAcquirerResearch] = useState(wizardDraft?.acquirerResearchResult || null)

  // Persist draft on every change
  useEffect(() => {
    setWizardDraft({ form, uploadedDocs, enabledPillars, step, researchResult: savedResearch, acquirerResearchResult: savedAcquirerResearch })
  }, [form, uploadedDocs, enabledPillars, step, savedResearch, savedAcquirerResearch])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleResearchComplete = (data) => {
    setSavedResearch(data)
    // Map Yahoo Finance sector names to our SECTORS list
    const mappedSector = mapYFSector(data.sector, data.industry)
    const sector = SECTORS.includes(data.sector) ? data.sector
                 : mappedSector ? mappedSector
                 : null
    setForm(f => ({
      ...f,
      target:      data.company_name  || f.target,
      sector:      sector || f.sector,
      location:    data.hq            || f.location,
      employees:   data.employees     ? String(data.employees) : f.employees,
      founded:     data.founded       ? String(data.founded)   : f.founded,
      revenue:     data.revenue       ? String(data.revenue)   : f.revenue,
      revenueUnit: data.revenue_unit  || f.revenueUnit,
      currency:    CURRENCIES.includes(data.currency) ? data.currency : f.currency,
      description: data.description   || f.description,
      dealRationale: data.deal_rationale || f.dealRationale,
      ticker:      data.ticker        || f.ticker,
    }))
  }

  const handleAcquirerResearchComplete = (data) => {
    setSavedAcquirerResearch(data)
    setForm(f => ({
      ...f,
      acquirer: data.company_name || f.acquirer,
    }))
  }

  const goNext = () => { setDir(1);  setStep(s => s + 1) }
  const goPrev = () => { setDir(-1); setStep(s => s - 1) }
  const toggleDoc    = (id) => setUploadedDocs(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id])
  const togglePillar = (id) => setEnabledPillars(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const canProceed = () => {
    if (step === 0) return form.target.trim() && form.acquirer.trim()
    if (step === 2) return uploadedDocs.length > 0
    if (step === 3) return enabledPillars.length > 0
    return true
  }

  const currSymbol = CURRENCY_SYMBOL[form.currency] || form.currency

  const handleLaunch = async () => {
    setLoading(true)
    // Financial provenance captured during research (confidence + data sources)
    const financials = savedResearch ? {
      confidence:      savedResearch.confidence,
      confidence_note: savedResearch.confidence_note,
      ticker_source:   savedResearch.ticker_source,
      exchange:        savedResearch.exchange,
      source_url:      savedResearch.source_url,
      data_timestamp:  savedResearch.data_timestamp,
      data_sources:    savedResearch.data_sources || [],
      ebitda:          savedResearch.ebitda,
      net_income:      savedResearch.net_income,
      gross_margin:    savedResearch.gross_margin,
      ebitda_margin:   savedResearch.ebitda_margin,
      net_margin:      savedResearch.net_margin,
      debt_to_equity:  savedResearch.debt_to_equity,
      revenue_growth:  savedResearch.revenue_growth,
      pe_ratio:        savedResearch.pe_ratio,
      ev_revenue:      savedResearch.ev_revenue,
      stock_price:     savedResearch.stock_price,
      market_cap:      savedResearch.market_cap,
      yf_found:        savedResearch.yf_found,
    } : { confidence: 'LOW', data_sources: [], yf_found: false }

    const dealPayload = {
      target: form.target, acquirer: form.acquirer, deal_type: form.dealType,
      deal_value: `${currSymbol}${form.dealValue}${form.revenueUnit}`,
      sector: form.sector, currency: form.currency,
      deal_meta: {
        codeName: form.codeName, ticker: form.ticker,
        location: form.location, employees: Number(form.employees),
        founded: Number(form.founded), revenue: Number(form.revenue),
        revenueUnit: form.revenueUnit, revenueYear: form.revenueYear,
        description: form.description, dealRationale: form.dealRationale,
        enabledPillars, uploadedDocs, financials,
        acquirerProfile: savedAcquirerResearch ? {
          company_name: savedAcquirerResearch.company_name,
          ticker: savedAcquirerResearch.ticker,
          market_cap: savedAcquirerResearch.market_cap,
          revenue: savedAcquirerResearch.revenue,
          description: savedAcquirerResearch.description,
          sector: savedAcquirerResearch.sector,
        } : null,
      },
    }
    try {
      const res  = await fetch('/api/deals/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dealPayload) })
      const deal = await res.json()
      resetExecution()
      clearWizardDraft()
      setActiveDeal({ id: deal.id, targetCompany: deal.target, acquirer: deal.acquirer, dealType: deal.deal_type, dealValue: deal.deal_value, sector: deal.sector, currency: deal.currency, ...deal.deal_meta })
    } catch {
      resetExecution()
      clearWizardDraft()
      setActiveDeal({ id: 'local_' + Date.now(), targetCompany: form.target, acquirer: form.acquirer, dealType: form.dealType, dealValue: `${currSymbol}${form.dealValue}${form.revenueUnit}`, sector: form.sector, currency: form.currency, location: form.location, employees: Number(form.employees), founded: Number(form.founded), revenue: Number(form.revenue), revenueUnit: form.revenueUnit, revenueYear: form.revenueYear, description: form.description, enabledPillars, uploadedDocs, financials })
    }
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f6fafc' }}>
      {/* ── Left progress panel ── */}
      <div className="hidden lg:flex flex-col w-72 min-h-screen fixed left-64 top-0 bottom-0 p-8 z-10"
        style={{ background: 'linear-gradient(180deg, #003d79 0%, #001f26 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-8">Setup Wizard</p>
          {STEPS.map((s, i) => {
            const done = i < step, active = i === step
            return (
              <div key={s.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{ background: done ? '#22c55e' : active ? '#00D4F0' : 'rgba(255,255,255,0.08)', boxShadow: active ? '0 0 16px rgba(0,212,240,0.45)' : 'none' }}>
                    {done ? <Check size={13} color="white" strokeWidth={3} />
                           : <span className="text-xs font-bold" style={{ color: active ? '#001f26' : 'rgba(255,255,255,0.30)', fontFamily: 'Space Grotesk, sans-serif' }}>{i + 1}</span>}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px min-h-[32px] mt-1 transition-all duration-500" style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.10)' }} />
                  )}
                </div>
                <div className="pt-1.5 pb-5">
                  <p className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: done ? '#22c55e' : active ? 'white' : 'rgba(255,255,255,0.28)' }}>
                    {s.label}
                  </p>
                  {active && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00D4F0] text-[11px] mt-0.5 font-mono">In progress</motion.p>}
                </div>
              </div>
            )
          })}
        </div>
        {/* Draft indicator */}
        {wizardDraft && (
          <div className="relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
            style={{ background: 'rgba(0,212,240,0.08)', border: '1px solid rgba(0,212,240,0.20)' }}>
            <RefreshCw size={12} className="text-[#00D4F0]" />
            <p className="text-[#00D4F0] text-xs flex-1">Draft saved</p>
            <button onClick={() => { setForm(BLANK_FORM); setUploadedDocs([]); setEnabledPillars(PILLARS.map(p => p.id)); clearWizardDraft(); setStep(0) }}>
              <X size={12} className="text-white/40 hover:text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ── Form area ── */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-8 py-5 sticky top-0 z-20"
          style={{ background: 'rgba(246,250,252,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,101,120,0.08)' }}>
          <div>
            <h1 className="text-xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{STEPS[step].label}</h1>
            <p className="text-xs text-[#64748b] mt-0.5">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center px-8 py-10">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div key={step} {...slide(dir)}>

                {/* Step 0 — Deal Overview */}
                {step === 0 && (
                  <div className="space-y-5">
                    <ResearchPanel onComplete={handleResearchComplete} peerCompany={form.acquirer} savedResult={savedResearch} mode="target" />
                    <ResearchPanel onComplete={handleAcquirerResearchComplete} peerCompany={form.target} savedResult={savedAcquirerResearch} mode="acquirer" />
                    <SectionCard title="Deal Parties">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Target Company *">
                          <Input value={form.target} onChange={set('target')} placeholder="e.g. Manaksia Steels" />
                        </Field>
                        <Field label="Acquirer *">
                          <Input value={form.acquirer} onChange={set('acquirer')} placeholder="e.g. JSW Steel" />
                        </Field>
                      </div>
                    </SectionCard>
                    <SectionCard title="Deal Parameters">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Deal Type">
                          <SelectField value={form.dealType} onChange={set('dealType')} options={DEAL_TYPES} />
                        </Field>
                        <Field label="Code Name">
                          <Input value={form.codeName} onChange={set('codeName')} placeholder="e.g. Project Anvil" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-4">
                        <Field label="Currency">
                          <SelectField value={form.currency} onChange={set('currency')} options={CURRENCIES} />
                        </Field>
                        <div className="col-span-2">
                          <Field label="Deal Value" hint="Enter the number only">
                            <Input value={form.dealValue} onChange={set('dealValue')} placeholder="1200" type="number" prefix={currSymbol} />
                          </Field>
                        </div>
                        <Field label="Unit">
                          <SelectField value={form.revenueUnit} onChange={set('revenueUnit')} options={REVENUE_UNITS} />
                        </Field>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Step 1 — Company Profile */}
                {step === 1 && (
                  <div className="space-y-5">
                    <SectionCard title="Business Details">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Sector">
                          <SelectField value={form.sector} onChange={set('sector')} options={SECTORS} />
                        </Field>
                        <Field label="HQ Location">
                          <Input value={form.location} onChange={set('location')} placeholder="e.g. Kolkata, West Bengal" />
                        </Field>
                        <Field label="Employees">
                          <Input value={form.employees} onChange={set('employees')} placeholder="2100" type="number" />
                        </Field>
                        <Field label="Founded">
                          <Input value={form.founded} onChange={set('founded')} placeholder="2006" type="number" />
                        </Field>
                        <Field label="Stock Ticker">
                          <Input value={form.ticker} onChange={set('ticker')} placeholder="e.g. MANAKSTEEL.NS" />
                        </Field>
                        <Field label="Revenue Year">
                          <SelectField value={form.revenueYear} onChange={set('revenueYear')} options={['2026','2025','2024','2023','2022']} />
                        </Field>
                      </div>
                    </SectionCard>
                    <SectionCard title="Financials">
                      <div className="grid grid-cols-4 gap-3">
                        <Field label="Currency">
                          <SelectField value={form.currency} onChange={set('currency')} options={CURRENCIES} />
                        </Field>
                        <div className="col-span-2">
                          <Field label="Revenue" hint="Annual revenue">
                            <Input value={form.revenue} onChange={set('revenue')} placeholder="1820" type="number" prefix={currSymbol} />
                          </Field>
                        </div>
                        <Field label="Unit">
                          <SelectField value={form.revenueUnit} onChange={set('revenueUnit')} options={REVENUE_UNITS} />
                        </Field>
                      </div>
                    </SectionCard>
                    <SectionCard title="Company Description">
                      <textarea value={form.description} onChange={set('description')} rows={3}
                        placeholder="Business description, market position, strategic rationale..."
                        className="w-full px-4 py-3 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none resize-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(0,101,120,0.15)', boxShadow: '0 1px 4px rgba(0,101,120,0.06)' }}
                        onFocus={e => (e.target.style.borderColor = '#00D4F0')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')} />
                    </SectionCard>
                  </div>
                )}

                {/* Step 2 — Documents */}
                {step === 2 && (
                  <SectionCard title="Document Vault" subtitle="Select available documents. AI agents cite these during analysis.">
                    <div className="space-y-2.5">
                      {DOC_TYPES.map((doc) => {
                        const sel = uploadedDocs.includes(doc.id)
                        return (
                          <motion.button key={doc.id} onClick={() => toggleDoc(doc.id)} whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all"
                            style={{ background: sel ? 'rgba(0,212,240,0.07)' : 'rgba(255,255,255,0.70)', border: `1.5px solid ${sel ? '#00D4F0' : 'rgba(0,101,120,0.12)'}` }}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                              style={{ background: sel ? 'rgba(0,212,240,0.15)' : 'rgba(0,101,120,0.07)', color: sel ? '#006578' : '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                              {doc.type}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{doc.label}</p>
                              <p className="text-xs text-[#94a3b8] mt-0.5">{doc.size}</p>
                            </div>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: sel ? '#00D4F0' : 'rgba(0,101,120,0.10)' }}>
                              {sel && <Check size={11} color="white" strokeWidth={3} />}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                      <p className="text-sm text-[#64748b]">{uploadedDocs.length} of {DOC_TYPES.length} selected</p>
                      <button onClick={() => setUploadedDocs(uploadedDocs.length === DOC_TYPES.length ? [] : DOC_TYPES.map(d => d.id))}
                        className="text-xs font-semibold text-[#006578] hover:text-[#00D4F0] transition-colors">
                        {uploadedDocs.length === DOC_TYPES.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </SectionCard>
                )}

                {/* Step 3 — Agent Config */}
                {step === 3 && (
                  <SectionCard title="DD Agent Pillars" subtitle="Each active pillar runs as a parallel LangGraph agent with Groq LLM + RAG on your researched data.">
                    <div className="space-y-2.5">
                      {PILLARS.map((pillar, i) => {
                        const active = enabledPillars.includes(pillar.id)
                        return (
                          <motion.button key={pillar.id} onClick={() => togglePillar(pillar.id)} whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all"
                            style={{ background: active ? 'rgba(0,212,240,0.07)' : 'rgba(255,255,255,0.70)', border: `1.5px solid ${active ? '#00D4F0' : 'rgba(0,101,120,0.12)'}` }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                              style={{ background: active ? pillar.color + '22' : 'rgba(0,101,120,0.07)', color: active ? pillar.color : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif', border: active ? `1.5px solid ${pillar.color}44` : '1.5px solid transparent' }}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{pillar.label}</p>
                              <p className="text-xs text-[#94a3b8] mt-0.5">{PILLAR_DESCRIPTIONS[pillar.id]}</p>
                            </div>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: active ? '#00D4F0' : 'rgba(0,101,120,0.10)' }}>
                              {active && <Check size={11} color="white" strokeWidth={3} />}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-4 flex items-center gap-1.5">
                      <AlertCircle size={11} /> All 6 pillars recommended for comprehensive analysis
                    </p>
                  </SectionCard>
                )}

                {/* Step 4 — Review & Launch */}
                {step === 4 && (
                  <div className="space-y-5">
                    <SectionCard title="Deal Summary">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {[
                          { label: 'Target',     value: form.target    || '—' },
                          { label: 'Acquirer',   value: form.acquirer  || '—' },
                          { label: 'Deal Type',  value: form.dealType  },
                          { label: 'Deal Value', value: form.dealValue ? `${currSymbol}${form.dealValue} ${form.revenueUnit}` : '—' },
                          { label: 'Sector',     value: form.sector    },
                          { label: 'Location',   value: form.location  || '—' },
                          { label: 'Employees',  value: form.employees ? Number(form.employees).toLocaleString() : '—' },
                          { label: 'Revenue',    value: form.revenue   ? `${currSymbol}${form.revenue} ${form.revenueUnit} (${form.revenueYear})` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-sm font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {form.dealRationale && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                          <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-1">Deal Rationale</p>
                          <p className="text-xs text-[#475569] leading-relaxed">{form.dealRationale}</p>
                        </div>
                      )}
                    </SectionCard>
                    <div className="grid grid-cols-2 gap-4">
                      <SectionCard title="Documents Ready">
                        <p className="text-3xl font-bold text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{uploadedDocs.length}</p>
                        <p className="text-xs text-[#94a3b8] mt-1">files queued for RAG ingestion</p>
                      </SectionCard>
                      <SectionCard title="Active Agents">
                        <p className="text-3xl font-bold text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{enabledPillars.length}</p>
                        <p className="text-xs text-[#94a3b8] mt-1">pillars running in parallel</p>
                      </SectionCard>
                    </div>
                    <motion.button onClick={handleLaunch} disabled={loading} whileTap={{ scale: 0.985 }}
                      className="w-full py-5 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-70"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', background: loading ? '#006578' : 'linear-gradient(135deg, #003d79 0%, #006578 50%, #00899e 100%)', boxShadow: loading ? 'none' : '0 8px 32px rgba(0,101,120,0.40)' }}>
                      {loading ? <><Loader2 size={20} className="animate-spin" /> Initialising agents...</>
                               : <><Rocket size={20} strokeWidth={2} /> Launch Due Diligence</>}
                    </motion.button>
                    <p className="text-center text-[11px] text-[#94a3b8]">
                      {enabledPillars.length} AI agents · real Yahoo Finance data · RAG-grounded analysis
                    </p>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {step < 4 && (
              <div className="flex items-center justify-between mt-8">
                <button onClick={goPrev} disabled={step === 0}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[#475569] hover:text-[#006578]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <ChevronLeft size={16} strokeWidth={2.5} /> Back
                </button>
                <motion.button onClick={goNext} disabled={!canProceed()} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Space Grotesk, sans-serif',
                    background: canProceed() ? 'linear-gradient(135deg, #006578 0%, #00899e 100%)' : '#94a3b8',
                    boxShadow: canProceed() ? '0 4px 16px rgba(0,101,120,0.30)' : 'none' }}>
                  Continue <ChevronRight size={16} strokeWidth={2.5} />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
