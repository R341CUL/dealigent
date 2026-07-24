import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Layers, Loader2, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, Target, Flag, Lightbulb, Calendar, Sparkles, Scale, FileText,
  ShieldCheck, Database
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { PILLARS, VERDICT_CONFIG } from '../lib/constants'

const SEV = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#10b981' }
const IMPACT = { High:'#22c55e', Medium:'#f59e0b', Low:'#94a3b8' }

function Card({ title, icon: Icon, children, accent = '#006578', delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-6">
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          {Icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}><Icon size={16} style={{ color: accent }} /></div>}
          <h3 className="font-bold text-base text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
        </div>
      )}
      {children}
    </motion.div>
  )
}

const DQ_CFG = {
  High:   { color: '#22c55e', label: 'High',   note: 'Well-grounded — findings tie back to specific data.' },
  Medium: { color: '#f59e0b', label: 'Medium', note: 'Partially grounded — treat as a directional first-pass read.' },
  Low:    { color: '#ef4444', label: 'Low',    note: 'Limited grounding — a screening view, not a decision-grade DD.' },
}

function DataQualityBanner({ dq }) {
  if (!dq) return null
  const cfg = DQ_CFG[dq.level] || DQ_CFG.Medium
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}
      className="rounded-2xl p-5" style={{ background: `${cfg.color}0d`, border: `1.5px solid ${cfg.color}35` }}>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}1f` }}>
          <ShieldCheck size={20} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
              Data Confidence: {cfg.label}
            </p>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
              {dq.score}/100
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-1 leading-relaxed">{cfg.note}</p>

          {/* Signals */}
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(dq.signals || {}).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                style={{ background: 'rgba(0,101,120,0.05)', color: '#475569', border: '1px solid rgba(0,101,120,0.10)' }}>
                <Database size={9} className="text-[#94a3b8]" />
                <span className="font-semibold text-[#334155]">{k}:</span> {v}
              </span>
            ))}
          </div>

          {/* Caveats */}
          {dq.caveats?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {dq.caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-[#64748b] leading-snug">
                  <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Synthesis() {
  const navigate = useNavigate()
  const { activeDeal, executionPhase, pillarResults } = useDealStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const hasResults = Object.keys(pillarResults || {}).length > 0

  const generate = async () => {
    if (!activeDeal?.id) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/synthesis/${activeDeal.id}`)
      if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail || 'failed') }
      setData(await r.json())
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (hasResults && !data && !loading) generate()
    // eslint-disable-next-line
  }, [activeDeal?.id, hasResults])

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <Layers size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No active deal</h2>
          <button onClick={() => navigate('/wizard')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto mt-4"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>Start Wizard <ArrowRight size={14} /></button>
        </div>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <Layers size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Run DD first</h2>
          <p className="text-[#64748b] text-sm mb-6">Synthesis ingests all 6 pillar analyses. Launch the agents from the dashboard.</p>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>Go to Dashboard <ArrowRight size={14} /></button>
        </div>
      </div>
    )
  }

  const verdict = data?.recommendation || ''
  const vcfg = VERDICT_CONFIG[verdict] || null

  return (
    <div className="min-h-screen p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[#94a3b8] text-xs font-mono uppercase tracking-wider mb-1">Investment Committee Synthesis</p>
          <h1 className="text-2xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{activeDeal.targetCompany}</h1>
          <p className="text-[#64748b] text-sm mt-0.5">
            {activeDeal.dealType} · {activeDeal.acquirer} · {activeDeal.dealValue}
            {data?._provider && <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,101,120,0.08)', color: '#006578' }}>via {data._provider}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && !loading && (
            <button onClick={generate} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#64748b] hover:text-[#006578] transition-all" style={{ background: 'rgba(0,101,120,0.05)' }}>
              <RefreshCw size={12} /> Regenerate
            </button>
          )}
          <button onClick={() => navigate('/report')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>
            <FileText size={14} /> Export Report
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="text-[#00D4F0] animate-spin" />
          <p className="text-sm text-[#64748b]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Partner agent synthesising all 6 pillars…</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle size={24} className="text-[#f59e0b] mx-auto mb-3" />
          <p className="text-sm text-[#475569]">Synthesis unavailable: {error}</p>
          <p className="text-xs text-[#94a3b8] mt-1">LLM may be rate-limited. Add a Gemini key or retry after reset.</p>
          <button onClick={generate} className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #006578, #00899e)' }}>Retry</button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Recommendation banner */}
          {vcfg && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-6 flex items-start gap-5 flex-wrap" style={{ background: vcfg.bg, border: `1.5px solid ${vcfg.color}35` }}>
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl flex-shrink-0" style={{ background: `${vcfg.color}20` }}>
                <Scale size={28} style={{ color: vcfg.color }} />
              </div>
              <div className="flex-1 min-w-[260px]">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: vcfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>Committee Recommendation</p>
                <p className="font-bold text-3xl" style={{ color: vcfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>{vcfg.label}</p>
                <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">{data.recommendation_rationale}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wider">Overall</p>
                <p className="font-bold text-4xl" style={{ color: vcfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>{data._overall_score}<span className="text-base opacity-60">/100</span></p>
                <p className="text-[10px] text-[#64748b] mt-1">Confidence: {data.confidence_level}</p>
              </div>
            </motion.div>
          )}

          {/* Data confidence / honesty banner */}
          <DataQualityBanner dq={data._data_quality} />

          {/* Executive summary + thesis */}
          <Card title="Executive Summary" icon={Sparkles} delay={0.05}>
            <p className="text-sm text-[#334155] leading-relaxed">{data.executive_summary}</p>
            {data.investment_thesis && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                <p className="text-[11px] font-bold text-[#006578] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Investment Thesis</p>
                <p className="text-sm text-[#475569] leading-relaxed">{data.investment_thesis}</p>
              </div>
            )}
            {data.valuation_view && (
              <div className="mt-4 pt-4 flex items-start gap-2" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                <TrendingUp size={14} className="text-[#006578] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-[#006578] uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Valuation View</p>
                  <p className="text-sm text-[#475569] leading-relaxed mt-0.5">{data.valuation_view}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Strengths + Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Key Strengths" icon={CheckCircle2} accent="#22c55e" delay={0.1}>
              <div className="space-y-3">
                {(data.key_strengths || []).map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <CheckCircle2 size={14} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.title}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Key Risks" icon={Flag} accent="#ef4444" delay={0.15}>
              <div className="space-y-3">
                {(data.key_risks || []).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${SEV[r.severity] || '#94a3b8'}0d`, border: `1px solid ${SEV[r.severity] || '#94a3b8'}25` }}>
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: SEV[r.severity] || '#94a3b8' }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{r.title}</p>
                        {r.severity && <span className={`pill pill-${r.severity}`}>{r.severity}</span>}
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Deal conditions */}
          {data.deal_conditions?.length > 0 && (
            <Card title="Conditions Precedent" icon={Target} accent="#f59e0b" delay={0.2}>
              <div className="space-y-2">
                {data.deal_conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white mt-0.5" style={{ background: '#f59e0b', fontFamily: 'Space Grotesk, sans-serif' }}>{i+1}</span>
                    <p className="text-sm text-[#475569]">{c}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Value creation + 100 day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Value Creation Levers" icon={Lightbulb} accent="#00D4F0" delay={0.25}>
              <div className="space-y-2.5">
                {(data.value_creation_levers || []).map((v, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,101,120,0.04)' }}>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v.lever}</p>
                      <p className="text-[10px] text-[#94a3b8] mt-0.5">{v.timeframe}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${IMPACT[v.impact] || '#94a3b8'}18`, color: IMPACT[v.impact] || '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{v.impact}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="First 100 Days" icon={Calendar} accent="#7c3aed" delay={0.3}>
              <div className="space-y-2">
                {(data.hundred_day_priorities || []).map((p, i) => (
                  <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < data.hundred_day_priorities.length-1 ? '1px solid rgba(0,101,120,0.06)' : 'none' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[#475569]">{p}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Pillar score recap */}
          <Card title="Pillar Scores" icon={Layers} delay={0.35}>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {PILLARS.map((p, i) => {
                const score = pillarResults[p.id]?.score
                const color = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : score ? '#ef4444' : '#94a3b8'
                return (
                  <div key={p.id} className="rounded-xl p-3 text-center cursor-pointer hover:shadow-md transition-all" style={{ background: 'rgba(0,101,120,0.04)' }}
                    onClick={() => navigate(`/pillar/${p.id}`)}>
                    <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-1">{String.fromCharCode(65+i)}. {p.label}</p>
                    <p className="font-bold text-2xl" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{score ? Math.round(score) : '—'}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
