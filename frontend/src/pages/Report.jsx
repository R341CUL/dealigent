import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Loader2, ArrowRight, Zap, CheckCircle2,
  AlertTriangle, Printer
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { PILLARS, VERDICT_CONFIG } from '../lib/constants'
import { sym, fmtMoney, fmtPct, fmtX } from '../lib/format'

const SEV = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#10b981' }

function ScoreDot({ score }) {
  const c = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : score ? '#ef4444' : '#94a3b8'
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />
}

export default function Report() {
  const navigate = useNavigate()
  const { activeDeal, pillarResults, redFlags, verdict, overallScore, realFinancials, realValuation, setRealFinancials } = useDealStore()
  const [synth, setSynth]   = useState(null)
  const [loading, setLoading] = useState(false)

  const hasResults = Object.keys(pillarResults || {}).length > 0

  useEffect(() => {
    if (!activeDeal?.id || !hasResults) return
    setLoading(true)
    Promise.all([
      fetch(`/api/synthesis/${activeDeal.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
      (!realFinancials ? fetch(`/api/financials/${activeDeal.id}`).then(r => r.json()).catch(() => null) : Promise.resolve(null)),
    ]).then(([s, f]) => {
      if (s && !s.detail) setSynth(s)
      if (f) setRealFinancials(f.financials, f.valuation)
    }).finally(() => setLoading(false))
    // eslint-disable-next-line
  }, [activeDeal?.id, hasResults])

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <FileText size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
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
          <FileText size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Run DD first</h2>
          <p className="text-[#64748b] text-sm mb-6">The report compiles all analysis. Launch the agents from the dashboard.</p>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>Go to Dashboard <ArrowRight size={14} /></button>
        </div>
      </div>
    )
  }

  const fin = realFinancials || {}
  const val = realValuation || {}
  const currency = fin.currency || activeDeal.currency || 'EUR'
  const unit = fin.unit || activeDeal.revenueUnit || 'M'
  const vcfg = (verdict && VERDICT_CONFIG[verdict]) || (synth?.recommendation && VERDICT_CONFIG[synth.recommendation]) || VERDICT_CONFIG.CONDITIONAL
  const finalScore = overallScore || synth?._overall_score || '—'
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const allFlags = []
  const seen = new Set()
  ;(redFlags || []).forEach(f => { if (!seen.has(f.title)) { seen.add(f.title); allFlags.push(f) } })
  Object.entries(pillarResults).forEach(([pid, r]) => (r?.red_flags || []).forEach(f => { if (!seen.has(f.title)) { seen.add(f.title); allFlags.push({ ...f, pillar: pid }) } }))
  allFlags.sort((a, b) => ({critical:0,high:1,medium:2,low:3}[a.severity] ?? 9) - ({critical:0,high:1,medium:2,low:3}[b.severity] ?? 9))

  return (
    <div className="min-h-screen report-root" style={{ background: '#f6fafc' }}>

      {/* Toolbar — screen only */}
      <div className="no-print sticky top-0 z-20 flex items-center justify-between px-8 py-3 border-b"
        style={{ background: 'rgba(246,250,252,0.96)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,101,120,0.10)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006578, #00899e)' }}>
            <Zap size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-sm text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dealigent</p>
            <p className="text-[9px] text-[#94a3b8] font-mono uppercase tracking-widest">Due Diligence Report</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className="flex items-center gap-1.5 text-xs text-[#64748b]"><Loader2 size={13} className="animate-spin" /> compiling…</span>}
          <button onClick={() => window.print()} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif', boxShadow: '0 4px 16px rgba(0,101,120,0.25)' }}>
            <Printer size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── REPORT DOCUMENT ── */}
      <div className="max-w-[820px] mx-auto px-8 py-8 space-y-6">

        {/* Cover — keeps dark background in print via report-cover class */}
        <div className="report-card report-cover print-avoid-break rounded-2xl overflow-hidden text-white relative"
          style={{ background: 'linear-gradient(135deg, #003d79 0%, #001e2b 100%)' }}>
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          {/* Top accent stripe */}
          <div className="relative h-1" style={{ background: 'linear-gradient(90deg, #00D4F0 0%, #006578 60%, #001f26 100%)' }} />

          <div className="relative z-10 p-8">
            {/* Dealigent logo row */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#00D4F0' }}>
                <Zap size={20} color="#001f26" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-xl leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dealigent</p>
                <p className="text-[10px] text-white/40 tracking-widest uppercase font-mono mt-0.5">AI Due Diligence Platform</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white/30 text-[9px] uppercase tracking-wider">Confidential</p>
                <p className="text-white/50 text-xs mt-0.5">{today}</p>
              </div>
            </div>

            {/* Deal title block */}
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">M&amp;A Due Diligence Report</p>
            <h1 className="text-4xl font-bold leading-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {activeDeal.targetCompany}
            </h1>
            <p className="text-white/55 text-base">
              {activeDeal.dealType} · <span className="text-white/70">acquired by</span> <span className="text-white font-semibold">{activeDeal.acquirer}</span>
            </p>

            {/* Key stats bar */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
              {[
                { label: 'Deal Value',      value: activeDeal.dealValue },
                { label: 'Overall Score',   value: `${finalScore}/100` },
                { label: 'Recommendation',  value: vcfg.label, color: vcfg.color },
                { label: 'Sector',          value: activeDeal.sector || '—' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-white/35 text-[9px] uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-bold text-lg leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif', color: color || 'white' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {synth && (
          <div className="report-card print-avoid-break glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-[#001f26] mb-3 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1 h-5 rounded-full" style={{ background: '#006578' }} /> Executive Summary
            </h2>
            <p className="text-sm text-[#334155] leading-relaxed">{synth.executive_summary}</p>
            {synth.investment_thesis && <p className="text-sm text-[#475569] leading-relaxed mt-3"><span className="font-semibold text-[#006578]">Thesis: </span>{synth.investment_thesis}</p>}
            {synth.recommendation_rationale && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: vcfg.bg, border: `1px solid ${vcfg.color}30` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: vcfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>Recommendation: {vcfg.label}</p>
                <p className="text-xs text-[#475569] leading-relaxed">{synth.recommendation_rationale}</p>
              </div>
            )}
          </div>
        )}

        {/* Data Confidence */}
        {synth?._data_quality && (() => {
          const dq = synth._data_quality
          const c = dq.level === 'High' ? '#22c55e' : dq.level === 'Low' ? '#ef4444' : '#f59e0b'
          return (
            <div className="report-card print-avoid-break glass rounded-2xl p-6">
              <h2 className="text-base font-bold text-[#001f26] mb-1 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className="w-1 h-5 rounded-full" style={{ background: c }} /> Data Confidence
                <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${c}18`, color: c }}>{dq.level} · {dq.score}/100</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                {Object.entries(dq.signals || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl p-3" style={{ background: 'rgba(0,101,120,0.05)' }}>
                    <p className="text-[9px] text-[#94a3b8] uppercase tracking-wider">{k}</p>
                    <p className="text-[11px] font-semibold text-[#1a2332] mt-0.5 leading-snug">{v}</p>
                  </div>
                ))}
              </div>
              <ul className="space-y-1">
                {(dq.caveats || []).map((cav, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-[#64748b] leading-snug">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: c }} />{cav}
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}

        {/* Pillar Scorecard */}
        <div className="report-card print-avoid-break glass rounded-2xl p-6">
          <h2 className="text-base font-bold text-[#001f26] mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            <span className="w-1 h-5 rounded-full" style={{ background: '#006578' }} /> Pillar Scorecard
          </h2>
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.12)' }}>
              {['Pillar','Score','Assessment'].map(h => <th key={h} className="text-left py-2 text-[#94a3b8] font-semibold uppercase tracking-wider text-[10px]">{h}</th>)}
            </tr></thead>
            <tbody>
              {PILLARS.map((p, i) => {
                const r = pillarResults[p.id]
                if (!r) return null
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,101,120,0.06)' }}>
                    <td className="py-2.5 font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{String.fromCharCode(65+i)}. {p.label}</td>
                    <td className="py-2.5"><span className="flex items-center gap-2"><ScoreDot score={r.score} /><span className="font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{Math.round(r.score)}</span></span></td>
                    <td className="py-2.5 text-[#475569] text-xs leading-snug pr-2">{(r.summary || '').slice(0, 120)}{r.summary?.length > 120 ? '…' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Snapshot */}
        {fin.found && (
          <div className="report-card print-avoid-break glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-[#001f26] mb-1 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1 h-5 rounded-full" style={{ background: '#006578' }} /> Financial Snapshot
            </h2>
            <p className="text-[10px] text-[#94a3b8] mb-4 font-mono">Source: Yahoo Finance · {fin.ticker} · live</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { l: 'Revenue (latest FY)', v: fmtMoney(fin.latest_revenue, currency, unit) },
                { l: 'Enterprise Value', v: fmtMoney(fin.enterprise_value, currency, unit) },
                { l: 'EV/EBITDA', v: fmtX(fin.ev_ebitda) },
                { l: 'Net Margin', v: fmtPct(fin.net_margin) },
              ].map(({ l, v }) => (
                <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(0,101,120,0.05)' }}>
                  <p className="text-[9px] text-[#94a3b8] uppercase tracking-wider">{l}</p>
                  <p className="font-bold text-base text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v}</p>
                </div>
              ))}
            </div>
            {fin.pl_years?.length > 0 && (
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                  <th className="text-left py-1.5 text-[#94a3b8] text-[10px] uppercase">Fiscal Year</th>
                  {fin.pl_years.map(y => <th key={y.label} className="text-right py-1.5 text-[#94a3b8] text-[10px]">{y.label}</th>)}
                </tr></thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(0,101,120,0.05)' }}>
                    <td className="py-1.5 font-semibold text-[#1a2332]">Revenue ({sym(currency)}{unit})</td>
                    {fin.pl_years.map(y => <td key={y.label} className="text-right py-1.5 text-[#475569]">{y.revenue ?? '—'}</td>)}
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-[#1a2332]">EBITDA ({sym(currency)}{unit})</td>
                    {fin.pl_years.map(y => <td key={y.label} className="text-right py-1.5 text-[#475569]">{y.ebitda ?? '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            )}
            {val.overpay_flag && (
              <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <AlertTriangle size={13} className="text-[#ef4444] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[#475569]"><span className="font-bold text-[#ef4444]">{val.overpay_flag.title}: </span>{val.overpay_flag.detail}</p>
              </div>
            )}
          </div>
        )}

        {/* Strengths & Risks */}
        {synth && (
          <div className="report-card print-avoid-break glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-[#001f26] mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1 h-5 rounded-full" style={{ background: '#006578' }} /> Strengths &amp; Risks
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-bold text-[#22c55e] uppercase tracking-wider mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Key Strengths</p>
                <div className="space-y-2">
                  {(synth.key_strengths || []).map((s, i) => (
                    <div key={i} className="flex items-start gap-2"><CheckCircle2 size={12} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                      <div><p className="text-xs font-semibold text-[#1a2332]">{s.title}</p><p className="text-[11px] text-[#64748b]">{s.detail}</p></div></div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Key Risks</p>
                <div className="space-y-2">
                  {(synth.key_risks || []).map((r, i) => (
                    <div key={i} className="flex items-start gap-2"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: SEV[r.severity] || '#94a3b8' }} />
                      <div><p className="text-xs font-semibold text-[#1a2332]">{r.title}</p><p className="text-[11px] text-[#64748b]">{r.detail}</p></div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Red Flags Register */}
        {allFlags.length > 0 && (
          <div className="report-card print-avoid-break glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-[#001f26] mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1 h-5 rounded-full" style={{ background: '#ef4444' }} /> Red Flags Register ({allFlags.length})
            </h2>
            <div className="space-y-2">
              {allFlags.map((f, i) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < allFlags.length-1 ? '1px solid rgba(0,101,120,0.06)' : 'none' }}>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0 mt-0.5" style={{ background: `${SEV[f.severity]}18`, color: SEV[f.severity], fontFamily: 'Space Grotesk, sans-serif' }}>{f.severity}</span>
                  <div><p className="text-xs font-semibold text-[#1a2332]">{f.title} {f.pillar && <span className="text-[10px] text-[#94a3b8] font-normal">· {PILLARS.find(p=>p.id===f.pillar)?.label}</span>}</p>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{f.detail}</p>
                    {f.evidence && f.evidence.toLowerCase() !== 'sector knowledge' && (
                      <p className="text-[10px] text-[#94a3b8] italic mt-0.5">Evidence: {f.evidence}{f.confidence ? ` · ${f.confidence} confidence` : ''}</p>
                    )}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Path to Close */}
        {synth && (synth.deal_conditions?.length > 0 || synth.hundred_day_priorities?.length > 0) && (
          <div className="report-card print-avoid-break glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-[#001f26] mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1 h-5 rounded-full" style={{ background: '#006578' }} /> Path to Close
            </h2>
            <div className="grid grid-cols-2 gap-5">
              {synth.deal_conditions?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Conditions Precedent</p>
                  <div className="space-y-1.5">
                    {synth.deal_conditions.map((c, i) => (
                      <div key={i} className="flex items-start gap-2"><span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white mt-0.5" style={{ background: '#f59e0b' }}>{i+1}</span><p className="text-[11px] text-[#475569]">{c}</p></div>
                    ))}
                  </div>
                </div>
              )}
              {synth.hundred_day_priorities?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>First 100 Days</p>
                  <div className="space-y-1.5">
                    {synth.hundred_day_priorities.map((p, i) => (
                      <div key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] mt-1.5 flex-shrink-0" /><p className="text-[11px] text-[#475569]">{p}</p></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-[10px] text-[#94a3b8] font-mono">Generated by Dealigent AI · {today} · Financials from Yahoo Finance · Multi-agent LLM analysis</p>
          <p className="text-[9px] text-[#cbd5e1] mt-1">CONFIDENTIAL — internal investment committee use only. AI-generated; verify material figures against primary filings.</p>
        </div>
      </div>
    </div>
  )
}
