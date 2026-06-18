import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts'
import {
  Rocket, ArrowRight, Play, RotateCcw, AlertTriangle,
  CheckCircle2, Clock, Loader2, Activity, ChevronDown,
  ChevronUp, Flag, TrendingUp, Zap, ShieldCheck,
  Upload, FileText, Trash2, FolderOpen
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { useAgentStream } from '../hooks/useAgentStream'
import { PILLARS, VERDICT_CONFIG } from '../lib/constants'
import { fmtMoney } from '../lib/format'

/* ── Score Ring ─────────────────────────────────────────────── */
function ScoreRing({ score, size = 64, stroke = 6, delay = 0 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = score ? (score / 100) * circ : 0
  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: score ? circ - pct : circ }}
        transition={{ duration: 1.4, ease: 'easeOut', delay }}
      />
    </svg>
  )
}

/* ── Big Overall Ring ──────────────────────────────────────── */
function OverallRing({ score, verdict }) {
  const size = 140, stroke = 10
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = score ? (score / 100) * circ : 0
  const cfg  = verdict ? VERDICT_CONFIG[verdict] : null
  const color = cfg?.color || '#00D4F0'
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,101,120,0.12)" strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: score ? circ - pct : circ }}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="text-center z-10">
        <motion.p
          className="font-bold leading-none"
          style={{ fontSize: 36, fontFamily: 'Space Grotesk, sans-serif', color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
        >
          {score || '—'}
        </motion.p>
        <p className="text-[#94a3b8] text-[11px] mt-0.5 font-mono">/100</p>
      </div>
    </div>
  )
}

/* ── Verdict Banner ────────────────────────────────────────── */
function VerdictBanner({ verdict, score, redFlagsCount }) {
  if (!verdict) return null
  const cfg = VERDICT_CONFIG[verdict]
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="rounded-2xl p-5 flex items-center gap-5"
      style={{ background: `linear-gradient(135deg, ${cfg.bg} 0%, ${cfg.bg} 100%)`, border: `1.5px solid ${cfg.color}35` }}
    >
      <OverallRing score={score} verdict={verdict} />
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
          Deal Verdict
        </p>
        <p className="font-bold text-3xl" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
          {cfg.label}
        </p>
        <p className="text-sm text-[#64748b] mt-1">
          Based on {PILLARS.length} pillar analysis · {redFlagsCount} risk{redFlagsCount !== 1 ? 's' : ''} flagged
        </p>
      </div>
      <div className="hidden md:grid grid-cols-3 gap-3">
        {Object.entries(VERDICT_CONFIG).map(([k, v]) => (
          <div key={k} className="px-3 py-2 rounded-xl text-center"
            style={{ background: k === verdict ? v.bg : 'rgba(0,0,0,0.03)', border: `1px solid ${k === verdict ? v.color + '40' : 'transparent'}` }}>
            <p className="text-[11px] font-bold uppercase" style={{ color: k === verdict ? v.color : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{v.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Pillar Card ───────────────────────────────────────────── */
function PillarCard({ pillar, index }) {
  const { agentStatus, agentOutputs, pillarResults } = useDealStore()
  const [expanded, setExpanded] = useState(false)
  const status  = agentStatus[pillar.id]  || 'idle'
  const output  = agentOutputs[pillar.id] || ''
  const result  = pillarResults[pillar.id]
  const score   = result?.score

  const isRunning  = status === 'running'
  const isComplete = status === 'complete'
  const isIdle     = status === 'idle'

  // Show last 3 lines of streaming output
  const streamLines = output.split('\n').filter(l => l.trim()).slice(-3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: isRunning  ? 'rgba(0,212,240,0.04)'
                  : isComplete ? 'rgba(255,255,255,0.82)'
                  : 'rgba(255,255,255,0.60)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${isRunning ? 'rgba(0,212,240,0.35)' : isComplete ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.40)'}`,
        boxShadow: isRunning ? '0 0 24px rgba(0,212,240,0.08)' : '0 4px 16px rgba(0,101,120,0.06)',
      }}
    >
      {/* Animated top border for running state */}
      {isRunning && (
        <motion.div className="h-0.5 w-full"
          style={{ background: 'linear-gradient(90deg, #003d79, #00D4F0, #003d79)' }}
          animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                background: isComplete ? `${pillar.color}18` : isRunning ? 'rgba(0,212,240,0.12)' : 'rgba(0,101,120,0.06)',
                color: isComplete ? pillar.color : isRunning ? '#00D4F0' : '#94a3b8',
                border: `1.5px solid ${isComplete ? pillar.color + '30' : isRunning ? 'rgba(0,212,240,0.30)' : 'transparent'}`,
              }}>
              {String.fromCharCode(65 + index)}
            </div>
            <div>
              <p className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {pillar.label}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isIdle     && <Clock size={10} className="text-[#94a3b8]" />}
                {isRunning  && <Loader2 size={10} className="text-[#00D4F0] animate-spin" />}
                {isComplete && <CheckCircle2 size={10} className="text-[#22c55e]" />}
                <span className="text-[11px] font-semibold"
                  style={{ color: isComplete ? '#22c55e' : isRunning ? '#00D4F0' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {isIdle ? 'Queued' : isRunning ? 'Analysing' : 'Complete'}
                </span>
              </div>
            </div>
          </div>

          {score != null && (
            <div className="relative flex items-center justify-center flex-shrink-0">
              <ScoreRing score={score} size={52} stroke={5} delay={index * 0.1} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {Math.round(score)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Streaming output */}
        {isRunning && (
          <div className="rounded-xl p-3 mb-3"
            style={{ background: 'rgba(0,31,38,0.05)', border: '1px solid rgba(0,101,120,0.08)' }}>
            {streamLines.length > 0
              ? streamLines.map((line, i) => (
                  <p key={i} className="text-xs text-[#475569] font-mono leading-relaxed truncate animate-stream">{line}</p>
                ))
              : (
                <div className="flex items-center gap-2">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-3.5 rounded-sm bg-[#00D4F0]" />
                  <span className="text-xs text-[#94a3b8] font-mono">Connecting to Groq LLM...</span>
                </div>
              )
            }
          </div>
        )}

        {/* Summary */}
        {isComplete && result?.summary && (
          <p className="text-xs text-[#475569] leading-relaxed mb-3 line-clamp-2">{result.summary}</p>
        )}

        {/* Red flags row */}
        {isComplete && result?.red_flags?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {result.red_flags.map((f, i) => (
              <span key={i} className={`pill pill-${f.severity}`}>
                <Flag size={8} /> {f.severity}
              </span>
            ))}
          </div>
        )}

        {/* Expandable findings */}
        {isComplete && result?.findings?.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#006578] hover:bg-[#006578]/5 transition-all"
            >
              <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {result.findings.length} findings
              </span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-2 space-y-1.5"
                >
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                      style={{ background: f.sentiment === 'positive' ? 'rgba(34,197,94,0.05)' : f.sentiment === 'negative' ? 'rgba(239,68,68,0.05)' : 'rgba(0,101,120,0.04)' }}>
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: f.sentiment === 'positive' ? '#22c55e' : f.sentiment === 'negative' ? '#ef4444' : '#94a3b8' }} />
                      <div>
                        <p className="text-xs font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{f.detail}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  )
}

/* ── Radar Chart ───────────────────────────────────────────── */
function PillarRadar({ pillarResults }) {
  const data = PILLARS.map((p, i) => ({
    pillar: String.fromCharCode(65 + i),
    label:  p.label,
    score:  Math.round(pillarResults[p.id]?.score || 0),
    fullMark: 100,
  }))

  if (data.every(d => d.score === 0)) return null

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(0,101,120,0.12)" />
          <PolarAngleAxis
            dataKey="pillar"
            tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Score" dataKey="score" stroke="#00D4F0" fill="#00D4F0" fillOpacity={0.15}
            strokeWidth={2}
            dot={{ fill: '#006578', r: 3 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = data[payload[0]?.payload?.index] || payload[0]?.payload
              return (
                <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
                  <p className="font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {d.label}: {d.score}
                  </p>
                </div>
              )
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Score Bars ────────────────────────────────────────────── */
function ScoreBars({ pillarResults }) {
  return (
    <div className="space-y-2.5">
      {PILLARS.map((pillar, i) => {
        const score = pillarResults[pillar.id]?.score
        if (!score) return null
        const color = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444'
        return (
          <div key={pillar.id}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[#475569]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {String.fromCharCode(65+i)}. {pillar.label}
              </span>
              <span className="text-xs font-bold" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>
                {Math.round(score)}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,101,120,0.08)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Data Room uploader (grounds the analysis) ─────────────── */
function DataRoomPanel({ dealId }) {
  const [docs, setDocs]         = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState(null)
  const [open, setOpen]         = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!dealId) return
    fetch(`/api/documents/${dealId}`).then(r => r.ok ? r.json() : { documents: [] })
      .then(d => setDocs(d.documents || [])).catch(() => {})
  }, [dealId])

  const upload = async (files) => {
    if (!files?.length) return
    setError(null); setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append('file', file)
        const r = await fetch(`/api/documents/${dealId}/upload`, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.detail || `Upload failed for ${file.name}`)
        setDocs(j.documents || [])
      }
    } catch (e) { setError(e.message) } finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const remove = async (source) => {
    try {
      const r = await fetch(`/api/documents/${dealId}?source=${encodeURIComponent(source)}`, { method: 'DELETE' })
      const j = await r.json().catch(() => ({}))
      setDocs(j.documents || [])
    } catch {}
  }

  const totalChunks = docs.reduce((a, d) => a + (d.chunks || 0), 0)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,101,120,0.10)' }}>
          <FolderOpen size={17} className="text-[#006578]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Data Room <span className="text-[11px] font-normal text-[#94a3b8]">· optional</span>
          </p>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            {docs.length > 0
              ? `${docs.length} document${docs.length>1?'s':''} · ${totalChunks} chunks grounding the analysis`
              : 'Upload deal docs (PDF, TXT, MD) so agents cite them with higher confidence'}
          </p>
        </div>
        {docs.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#22c55e] flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.10)', fontFamily: 'Space Grotesk, sans-serif' }}>
            <ShieldCheck size={10} /> grounded
          </span>
        )}
        {open ? <ChevronUp size={16} className="text-[#94a3b8]" /> : <ChevronDown size={16} className="text-[#94a3b8]" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 mt-3" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
              <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.md,.markdown,.csv" className="hidden"
                onChange={e => upload(Array.from(e.target.files || []))} />
              <button onClick={() => inputRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[#006578] disabled:opacity-50 transition-all"
                style={{ background: 'rgba(0,101,120,0.05)', border: '1.5px dashed rgba(0,101,120,0.25)', fontFamily: 'Space Grotesk, sans-serif' }}>
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Ingesting…</> : <><Upload size={14} /> Upload documents</>}
              </button>

              {error && <p className="text-[11px] text-[#ef4444] mt-2">{error}</p>}

              {docs.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  {docs.map(d => (
                    <div key={d.source} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,101,120,0.04)' }}>
                      <FileText size={13} className="text-[#006578] flex-shrink-0" />
                      <span className="text-xs text-[#1a2332] font-medium truncate flex-1" title={d.source}>{d.source}</span>
                      <span className="text-[10px] text-[#94a3b8] flex-shrink-0">{d.chunks} chunks</span>
                      <button onClick={() => remove(d.source)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[#94a3b8] mt-2.5 leading-snug">
                Text is chunked & embedded into the vector store. On the next agent run, findings sourced from these docs get real evidence and higher confidence.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const {
    activeDeal, executionPhase, agentStatus,
    overallScore, verdict, resetExecution, pillarResults, redFlags,
    criticReview, criticStatus, setActiveDeal, setPillarResult, setVerdict, setRedFlags, setAgentStatus, setExecutionPhase,
  } = useDealStore()
  const { start } = useAgentStream()
  const [activityLog, setActivityLog] = useState([])
  const [loadingDeal, setLoadingDeal] = useState(false)
  const logRef = useRef(null)

  // Auto-load the most recent deal from API if store has no active deal
  useEffect(() => {
    if (activeDeal) return
    setLoadingDeal(true)
    fetch('/api/deals/')
      .then(r => r.ok ? r.json() : [])
      .then(async (deals) => {
        if (!deals.length) return
        const latest = deals[0]
        const deal = {
          id: latest.id,
          targetCompany: latest.target,
          acquirer: latest.acquirer,
          dealType: latest.deal_type,
          dealValue: latest.deal_value,
          sector: latest.sector,
          currency: latest.currency,
          ...(latest.deal_meta || {}),
        }
        setActiveDeal(deal)
        // Restore pillar results from DB
        const resResp = await fetch(`/api/execute/${latest.id}/results`)
        if (resResp.ok) {
          const rows = await resResp.json()
          const flags = []
          rows.forEach(row => {
            let km = {}, grounding = {}, swing = []
            try { const raw = JSON.parse(row.raw_output || '{}'); km = raw.key_metrics || {}; grounding = raw.grounding || {}; swing = raw.swing_factors || [] } catch {}
            setPillarResult(row.pillar, {
              score: row.score, summary: row.summary,
              findings: row.findings || [], red_flags: row.red_flags || [],
              key_metrics: km, grounding, swing_factors: swing,
            })
            setAgentStatus(row.pillar, 'complete')
            ;(row.red_flags || []).forEach(f => flags.push({ ...f, pillar: row.pillar }))
          })
          if (flags.length) setRedFlags(flags)
          if (latest.overall_score != null && latest.verdict) {
            setVerdict(latest.overall_score, latest.verdict)
            if (rows.length > 0) setExecutionPhase('complete')
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDeal(false))
  // eslint-disable-next-line
  }, [])

  const completedCount = Object.values(agentStatus).filter(s => s === 'complete').length
  const totalPillars   = activeDeal?.enabledPillars?.length || 6
  const progress       = Math.round((completedCount / totalPillars) * 100)
  const redFlagsCount  = redFlags?.length || 0

  // Build live activity feed
  useEffect(() => {
    Object.entries(agentStatus).forEach(([pillar, status]) => {
      const label = PILLARS.find(p => p.id === pillar)?.label || pillar
      if (status === 'running') {
        setActivityLog(prev => {
          if (prev.find(e => e.pillar === pillar && e.status === 'running')) return prev
          return [{ pillar, status: 'running', time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), label }, ...prev].slice(0, 30)
        })
      }
      if (status === 'complete') {
        setActivityLog(prev => [{
          pillar, status: 'complete',
          time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          label,
          score: pillarResults[pillar]?.score,
        }, ...prev.filter(e => !(e.pillar === pillar && e.status === 'running'))].slice(0, 30))
      }
    })
  }, [agentStatus, pillarResults])

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-14 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003d79] to-[#006578] flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow: '0 8px 24px rgba(0,101,120,0.30)' }}>
            {loadingDeal
              ? <Loader2 size={28} color="white" className="animate-spin" />
              : <Rocket size={28} color="white" strokeWidth={1.5} />}
          </div>
          <h2 className="text-2xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {loadingDeal ? 'Loading deal…' : 'No active deal'}
          </h2>
          <p className="text-[#64748b] text-sm mb-8 leading-relaxed">
            {loadingDeal ? 'Restoring your last deal from the database.' : 'Configure a deal in the wizard to launch your 6 AI agents.'}
          </p>
          {!loadingDeal && (
            <motion.button onClick={() => navigate('/wizard')} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm mx-auto"
              style={{ fontFamily: 'Space Grotesk, sans-serif', background: 'linear-gradient(135deg, #006578 0%, #00899e 100%)', boxShadow: '0 4px 16px rgba(0,101,120,0.30)' }}>
              Start Setup Wizard <ArrowRight size={15} strokeWidth={2.5} />
            </motion.button>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span className="text-[#94a3b8] text-xs font-mono uppercase tracking-wider">Live Execution</span>
            {executionPhase === 'running' && (
              <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#00D4F0]"
                style={{ background: 'rgba(0,212,240,0.12)', fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D4F0]" />
                RUNNING
              </motion.span>
            )}
            {executionPhase === 'complete' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#22c55e]"
                style={{ background: 'rgba(34,197,94,0.12)', fontFamily: 'Space Grotesk, sans-serif' }}>
                <CheckCircle2 size={10} /> COMPLETE
              </span>
            )}
            {redFlagsCount > 0 && executionPhase === 'complete' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#ef4444]"
                style={{ background: 'rgba(239,68,68,0.10)', fontFamily: 'Space Grotesk, sans-serif' }}>
                <AlertTriangle size={10} /> {redFlagsCount} Risks
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {activeDeal.targetCompany}
          </h1>
          <p className="text-[#64748b] text-sm mt-0.5">
            {activeDeal.dealType} · {activeDeal.acquirer} · {activeDeal.dealValue}
            {activeDeal.sector && ` · ${activeDeal.sector}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {executionPhase === 'idle' && (
            <motion.button onClick={start} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ fontFamily: 'Space Grotesk, sans-serif', background: 'linear-gradient(135deg, #003d79 0%, #00899e 100%)', boxShadow: '0 4px 20px rgba(0,101,120,0.35)' }}>
              <Play size={14} strokeWidth={2.5} fill="white" /> Launch Agents
            </motion.button>
          )}
          {executionPhase === 'running' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#00D4F0] text-sm font-semibold"
              style={{ background: 'rgba(0,212,240,0.08)', border: '1px solid rgba(0,212,240,0.20)', fontFamily: 'Space Grotesk, sans-serif' }}>
              <Loader2 size={14} className="animate-spin" /> {completedCount}/{totalPillars} agents
            </div>
          )}
          {(executionPhase === 'complete' || executionPhase === 'error') && (
            <button onClick={() => { resetExecution(); setActivityLog([]) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#475569] hover:text-[#006578] transition-all"
              style={{ background: 'rgba(0,101,120,0.06)', border: '1px solid rgba(0,101,120,0.12)', fontFamily: 'Space Grotesk, sans-serif' }}>
              <RotateCcw size={13} strokeWidth={2} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Data Room (upload docs to ground the analysis) ── */}
      {executionPhase === 'idle' && <DataRoomPanel dealId={activeDeal.id} />}

      {/* ── Verdict Banner ── */}
      <AnimatePresence>
        {verdict && overallScore && (
          <VerdictBanner verdict={verdict} score={overallScore} redFlagsCount={redFlagsCount} />
        )}
      </AnimatePresence>

      {/* ── Progress bar ── */}
      {executionPhase !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#006578]" />
              <span className="text-sm font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Analysis Progress
              </span>
            </div>
            <span className="text-sm font-bold text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {completedCount} / {totalPillars} pillars · {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,101,120,0.08)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #003d79, #00D4F0)' }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {/* Pillar progress dots */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {PILLARS.map((p, i) => {
              const st = agentStatus[p.id] || 'idle'
              return (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full transition-all duration-500"
                    style={{ background: st === 'complete' ? '#22c55e' : st === 'running' ? '#00D4F0' : 'rgba(0,101,120,0.15)' }} />
                  <span className="text-[11px]" style={{ color: st === 'complete' ? '#22c55e' : st === 'running' ? '#00D4F0' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif', fontWeight: st !== 'idle' ? 600 : 400 }}>
                    {String.fromCharCode(65+i)}. {p.label}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Pillar cards — 2/3 width */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {PILLARS.map((pillar, i) => (
            <PillarCard key={pillar.id} pillar={pillar} index={i} />
          ))}
        </div>

        {/* Right panel — 1/3 */}
        <div className="space-y-4">

          {/* Radar chart */}
          {executionPhase === 'complete' && Object.keys(pillarResults).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5">
              <h3 className="font-bold text-sm text-[#1a2332] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Pillar Analysis
              </h3>
              <p className="text-xs text-[#94a3b8] mb-3">Score across all 6 DD dimensions</p>
              <PillarRadar pillarResults={pillarResults} />
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                <ScoreBars pillarResults={pillarResults} />
              </div>
            </motion.div>
          )}

          {/* Scores during run */}
          {executionPhase === 'running' && completedCount > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-5">
              <h3 className="font-bold text-sm text-[#1a2332] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Live Scores</h3>
              <ScoreBars pillarResults={pillarResults} />
            </motion.div>
          )}

          {/* QA / Critic review — the supervisory layer */}
          {(criticStatus === 'running' || criticReview) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} className="text-[#7c3aed]" />
                <h3 className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>QA Review</h3>
                {criticStatus === 'running' && !criticReview && <Loader2 size={12} className="animate-spin text-[#7c3aed] ml-auto" />}
              </div>
              {criticReview ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Quality</p>
                      <p className="font-bold text-sm" style={{ color: criticReview.overall_quality === 'High' ? '#22c55e' : criticReview.overall_quality === 'Low' ? '#ef4444' : '#f59e0b', fontFamily: 'Space Grotesk, sans-serif' }}>{criticReview.overall_quality}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Consistency</p>
                      <p className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{criticReview.consistency}</p>
                    </div>
                  </div>
                  {criticReview.reviewer_verdict && (
                    <p className="text-xs text-[#475569] leading-relaxed italic border-l-2 pl-2.5" style={{ borderColor: '#7c3aed' }}>
                      "{criticReview.reviewer_verdict}"
                    </p>
                  )}
                  {criticReview.cross_pillar_flags?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-1">Cross-pillar flags</p>
                      {criticReview.cross_pillar_flags.map((f, i) => (
                        <p key={i} className="text-[11px] text-[#d97706] flex items-start gap-1.5"><AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />{f}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#94a3b8]">Reviewing all 6 pillars for quality &amp; consistency…</p>
              )}
            </motion.div>
          )}

          {/* Activity feed */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#006578]" />
              <h3 className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Agent Activity</h3>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto" ref={logRef}>
              {activityLog.length === 0 ? (
                <p className="text-xs text-[#94a3b8] text-center py-6 font-mono">
                  {executionPhase === 'idle' ? 'Launch agents to begin...' : 'Waiting for agents...'}
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {activityLog.map((entry, i) => (
                    <motion.div
                      key={`${entry.pillar}-${entry.status}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg"
                      style={{ background: entry.status === 'complete' ? 'rgba(34,197,94,0.04)' : 'rgba(0,212,240,0.04)' }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: entry.status === 'complete' ? '#22c55e' : '#00D4F0' }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {entry.label}
                        </span>
                        <span className="text-xs text-[#94a3b8] ml-1.5">
                          {entry.status === 'complete'
                            ? `→ ${entry.score ? Math.round(entry.score) : '—'}/100`
                            : '→ started'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#94a3b8] font-mono flex-shrink-0">{entry.time}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Deal metadata */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold text-sm text-[#1a2332] mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Deal Context
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Target',    value: activeDeal.targetCompany },
                { label: 'Acquirer',  value: activeDeal.acquirer },
                { label: 'Sector',    value: activeDeal.sector },
                { label: 'Location',  value: activeDeal.location },
                { label: 'Employees', value: activeDeal.employees ? Number(activeDeal.employees).toLocaleString() : null },
                { label: 'Revenue',   value: activeDeal.revenue ? fmtMoney(activeDeal.revenue, activeDeal.currency, activeDeal.revenueUnit || 'M') : null },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1"
                  style={{ borderBottom: '1px solid rgba(0,101,120,0.05)' }}>
                  <span className="text-[11px] text-[#94a3b8] uppercase tracking-wider"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</span>
                  <span className="text-xs font-semibold text-[#1a2332] text-right ml-4 truncate max-w-[160px]"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
