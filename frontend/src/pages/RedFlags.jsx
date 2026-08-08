import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Flag, Filter, ChevronDown, ChevronUp,
  ArrowRight, Shield, TrendingDown, Rocket, Search,
  CheckCircle2, XCircle, AlertCircle, Info
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { PILLARS, VERDICT_CONFIG } from '../lib/constants'
import { ConfidenceBadge, EvidenceLine } from './PillarDetail'

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', Icon: XCircle,      rank: 0 },
  high:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', Icon: AlertTriangle, rank: 1 },
  medium:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)',  Icon: AlertCircle,   rank: 2 },
  low:      { color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)',  Icon: Info,          rank: 3 },
}

const PILLAR_COLORS = Object.fromEntries(PILLARS.map(p => [p.id, p.color]))

function SeverityPill({ severity, size = 'normal' }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium
  const { Icon } = cfg
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
      style={{
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        fontSize: size === 'small' ? '10px' : '11px',
        fontFamily: 'Space Grotesk, sans-serif',
      }}
    >
      <Icon size={size === 'small' ? 9 : 10} strokeWidth={2.5} />
      {severity}
    </span>
  )
}

function PillarBadge({ pillarId }) {
  const pillar = PILLARS.find(p => p.id === pillarId)
  const idx    = PILLARS.indexOf(pillar)
  if (!pillar) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: `${pillar.color}15`, color: pillar.color,
        border: `1px solid ${pillar.color}30`,
        fontFamily: 'Space Grotesk, sans-serif',
      }}
    >
      {String.fromCharCode(65 + idx)}. {pillar.label}
    </span>
  )
}

function FlagCard({ flag, index }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium
  const { Icon } = cfg

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${cfg.border}`,
        boxShadow: `0 2px 12px ${cfg.bg}`,
      }}
    >
      {/* Severity top bar */}
      <div className="h-0.5 w-full" style={{ background: cfg.color }} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}
          >
            <Icon size={18} style={{ color: cfg.color }} strokeWidth={2} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1">
                <h3 className="font-bold text-[#1a2332] text-sm leading-snug" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {flag.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <SeverityPill severity={flag.severity} />
                  {flag.pillar && <PillarBadge pillarId={flag.pillar} />}
                  <ConfidenceBadge level={flag.confidence} />
                </div>
              </div>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed mt-3">{flag.detail}</p>
            <EvidenceLine evidence={flag.evidence} />

            {/* Recommendation if available */}
            {flag.recommendation && (
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: 'rgba(0,101,120,0.12)' }}>
                      <p className="text-[11px] font-semibold text-[#006578] uppercase tracking-wider mb-1"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Mitigation</p>
                      <p className="text-xs text-[#475569] leading-relaxed">{flag.recommendation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {flag.recommendation && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs font-semibold text-[#006578] hover:text-[#00D4F0] transition-colors flex items-center gap-1"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {expanded ? 'Hide mitigation' : 'Show mitigation'}
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function RedFlags() {
  const navigate = useNavigate()
  const { activeDeal, pillarResults, redFlags, executionPhase, verdict, overallScore } = useDealStore()

  const [severityFilter, setSeverityFilter] = useState('all')
  const [pillarFilter, setPillarFilter]     = useState('all')
  const [searchQuery, setSearchQuery]       = useState('')
  const [sortBy, setSortBy]                 = useState('severity')

  // Aggregate all flags from pillar results + redFlags store
  const allFlags = useMemo(() => {
    const flags = []

    // From pillar results (most complete — includes detail)
    Object.entries(pillarResults).forEach(([pillarId, result]) => {
      (result?.red_flags || []).forEach(flag => {
        flags.push({ ...flag, pillar: pillarId, id: `${pillarId}_${flag.title}` })
      })
    })

    // From redFlags store (synthesis output) — deduplicate
    ;(redFlags || []).forEach(flag => {
      const exists = flags.find(f => f.title === flag.title && f.pillar === flag.pillar)
      if (!exists) flags.push({ ...flag, id: `synth_${flag.title}` })
    })

    return flags
  }, [pillarResults, redFlags])

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...allFlags]
    if (severityFilter !== 'all') list = list.filter(f => f.severity === severityFilter)
    if (pillarFilter !== 'all')   list = list.filter(f => f.pillar === pillarFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(f => f.title?.toLowerCase().includes(q) || f.detail?.toLowerCase().includes(q))
    }
    if (sortBy === 'severity') {
      list.sort((a, b) => (SEVERITY_CONFIG[a.severity]?.rank ?? 99) - (SEVERITY_CONFIG[b.severity]?.rank ?? 99))
    } else if (sortBy === 'pillar') {
      list.sort((a, b) => (a.pillar || '').localeCompare(b.pillar || ''))
    }
    return list
  }, [allFlags, severityFilter, pillarFilter, searchQuery, sortBy])

  // Count by severity
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 }
    allFlags.forEach(f => { if (c[f.severity] !== undefined) c[f.severity]++ })
    return c
  }, [allFlags])

  const verdictCfg = verdict ? VERDICT_CONFIG[verdict] : null

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <AlertTriangle size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No active deal
          </h2>
          <p className="text-[#64748b] text-sm mb-6">Set up a deal and run due diligence to see the red flags register.</p>
          <button onClick={() => navigate('/wizard')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>
            Start Wizard <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  if (executionPhase === 'idle' || (executionPhase !== 'complete' && allFlags.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <Shield size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Awaiting Analysis
          </h2>
          <p className="text-[#64748b] text-sm mb-6">
            {executionPhase === 'running'
              ? 'DD agents are running — red flags will appear as each pillar completes.'
              : 'Launch the DD agents from the dashboard to generate the red flags register.'}
          </p>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>
            {executionPhase === 'running' ? 'View Dashboard' : 'Launch Agents'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#94a3b8] text-xs font-mono uppercase tracking-wider mb-1">Risk Register</p>
          <h1 className="text-2xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Red Flags — {activeDeal.targetCompany}
          </h1>
          <p className="text-[#64748b] text-sm mt-0.5">
            {allFlags.length} risk{allFlags.length !== 1 ? 's' : ''} identified across {Object.keys(pillarResults).length} pillars
          </p>
        </div>
        {verdictCfg && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: verdictCfg.bg, border: `1.5px solid ${verdictCfg.color}30` }}>
            <CheckCircle2 size={16} style={{ color: verdictCfg.color }} />
            <div>
              <p className="text-[11px] text-[#64748b] uppercase tracking-wider">Verdict</p>
              <p className="font-bold text-sm" style={{ color: verdictCfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                {verdictCfg.label} · {overallScore}/100
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => {
          const count = counts[sev] || 0
          const { Icon } = cfg
          return (
            <motion.button
              key={sev}
              onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
              whileTap={{ scale: 0.97 }}
              className="rounded-2xl p-4 text-left transition-all"
              style={{
                background: severityFilter === sev ? cfg.bg : 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(16px)',
                border: `1.5px solid ${severityFilter === sev ? cfg.border : 'rgba(255,255,255,0.55)'}`,
                boxShadow: severityFilter === sev ? `0 0 0 3px ${cfg.bg}` : '0 2px 8px rgba(0,101,120,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} style={{ color: cfg.color }} strokeWidth={2} />
                <span className="font-bold text-2xl" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {count}
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                {sev}
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* Filters row */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search flags..."
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none"
            style={{ background: 'rgba(0,101,120,0.05)', border: '1px solid rgba(0,101,120,0.12)' }}
          />
        </div>

        {/* Pillar filter */}
        <select
          value={pillarFilter}
          onChange={e => setPillarFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-[#1a2332] outline-none appearance-none cursor-pointer"
          style={{ background: 'rgba(0,101,120,0.05)', border: '1px solid rgba(0,101,120,0.12)' }}
        >
          <option value="all">All Pillars</option>
          {PILLARS.map((p, i) => (
            <option key={p.id} value={p.id}>{String.fromCharCode(65+i)}. {p.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-[#1a2332] outline-none appearance-none cursor-pointer"
          style={{ background: 'rgba(0,101,120,0.05)', border: '1px solid rgba(0,101,120,0.12)' }}
        >
          <option value="severity">Sort: Severity</option>
          <option value="pillar">Sort: Pillar</option>
        </select>

        <span className="text-xs text-[#94a3b8] ml-auto whitespace-nowrap">
          {filtered.length} of {allFlags.length}
        </span>
      </div>

      {/* Flags grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Shield size={28} className="text-[#22c55e] mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No flags match your filters
          </p>
          <p className="text-xs text-[#94a3b8] mt-1">Try clearing the filters above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((flag, i) => (
            <FlagCard key={flag.id || i} flag={flag} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
