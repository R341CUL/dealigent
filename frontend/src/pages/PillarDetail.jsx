import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'
import {
  ArrowLeft, ArrowRight, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  ExternalLink, Cpu, Users, Scale, TrendingUp, TrendingDown,
  DollarSign, Settings, Flag, Database, Quote, HelpCircle, ArrowUpDown
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { PILLARS } from '../lib/constants'

const CURR_SYM = { EUR:'€', USD:'$', GBP:'£', INR:'₹', SGD:'S$', AED:'AED', JPY:'¥', CHF:'Fr', BRL:'R$', AUD:'A$' }
const PILLAR_ICONS = { commercial: TrendingUp, financial: DollarSign, operational: Settings, legal: Scale, technology: Cpu, management: Users }
const THREAT_COLOR = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }
const MODERN_COLOR = { Modern: '#22c55e', Mixed: '#f59e0b', Legacy: '#ef4444' }
const STATUS_COLOR = { 'In Range':'#22c55e', Above:'#3b82f6', Below:'#ef4444' }

/* ── Evidence & confidence (shared) ── */
const CONF_CFG = {
  HIGH:   { color: '#22c55e', label: 'High confidence' },
  MEDIUM: { color: '#f59e0b', label: 'Medium confidence' },
  LOW:    { color: '#94a3b8', label: 'Low confidence' },
}

export function ConfidenceBadge({ level }) {
  if (!level) return null
  const key = String(level).toUpperCase()
  const cfg = CONF_CFG[key] || CONF_CFG.MEDIUM
  return (
    <span
      title={cfg.label}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
      style={{ fontSize: '9px', background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}33`, fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: cfg.color }} />
      {key}
    </span>
  )
}

const DIR_CFG = {
  raise: { color: '#22c55e', Icon: TrendingUp,   label: 'could raise' },
  lower: { color: '#ef4444', Icon: TrendingDown, label: 'could lower' },
  both:  { color: '#f59e0b', Icon: ArrowUpDown,  label: 'could swing either way' },
}

export function SwingFactors({ items }) {
  if (!items?.length) return null
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
          <HelpCircle size={16} className="text-[#7c3aed]" />
        </div>
        <h3 className="font-bold text-base text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>What Would Change This Score</h3>
      </div>
      <p className="text-[11px] text-[#94a3b8] mb-4 ml-10">The open questions this analysis most depends on — verify these next.</p>
      <div className="space-y-2.5">
        {items.map((s, i) => {
          const cfg = DIR_CFG[s.direction] || DIR_CFG.both
          const { Icon } = cfg
          return (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: `${cfg.color}0a`, border: `1px solid ${cfg.color}22` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${cfg.color}18` }}>
                <Icon size={13} style={{ color: cfg.color }} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1a2332] leading-snug">{s.question}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>{cfg.label}</span>
                  {s.impact && <ConfidenceBadge level={s.impact} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EvidenceLine({ evidence }) {
  if (!evidence) return null
  const generic = String(evidence).trim().toLowerCase() === 'sector knowledge'
  return (
    <div className="flex items-start gap-1.5 mt-1.5">
      <Quote size={10} className="mt-0.5 flex-shrink-0" style={{ color: generic ? '#cbd5e1' : '#94a3b8' }} strokeWidth={2} />
      <p className="text-[10px] leading-snug" style={{ color: generic ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>
        {generic ? 'Based on sector knowledge, not deal-specific evidence' : evidence}
      </p>
    </div>
  )
}

/* ── Primitives ── */
function ScoreRing({ score, size = 72, stroke = 7, color }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, pct = score ? (score / 100) * circ : 0
  const c = color || (score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444')
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,101,120,0.10)" strokeWidth={stroke} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - pct }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }} />
    </svg>
  )
}

function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-5">
          <h3 className="font-bold text-base text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
          {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

function NA({ msg = 'Data not available — manual verification required' }) {
  return <p className="text-sm text-[#94a3b8] italic py-3">{msg}</p>
}

function SevBadge({ level }) {
  const c = THREAT_COLOR[level] || '#94a3b8'
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
      style={{ background: `${c}18`, color: c, fontFamily: 'Space Grotesk, sans-serif' }}>{level}</span>
  )
}

function DeepDiveLoading() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="glass rounded-2xl p-6 space-y-3">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      ))}
      <div className="flex items-center gap-3 py-2">
        <Loader2 size={16} className="text-[#00D4F0] animate-spin" />
        <p className="text-sm text-[#64748b]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Generating deep analysis with Groq LLM…
        </p>
      </div>
    </div>
  )
}

/* ── COMMERCIAL ── */
function CommercialSections({ dd }) {
  const m = dd?.market_data || {}
  const comps = dd?.competitors || []
  const pf = dd?.porters_5_forces || {}
  const rq = dd?.revenue_quality || {}

  const radarData = [
    { axis: 'Entry',    value: pf.threat_of_entry?.score  || 0 },
    { axis: 'Buyers',   value: pf.buyer_power?.score      || 0 },
    { axis: 'Suppliers',value: pf.supplier_power?.score   || 0 },
    { axis: 'Subs',     value: pf.substitutes?.score      || 0 },
    { axis: 'Rivalry',  value: pf.rivalry?.score          || 0 },
  ]
  const donutData = rq.recurring_pct ? [
    { name: 'Recurring',     value: rq.recurring_pct },
    { name: 'Non-recurring', value: rq.non_recurring_pct || (100 - rq.recurring_pct) },
  ] : []

  return (
    <div className="space-y-5">
      <Card title="Market Overview" subtitle="TAM / SAM / SOM — addressable opportunity sizing">
        {!m.tam ? <NA /> : (
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'TAM', value: m.tam, desc: 'Total Addressable', color: '#006578' },
              { label: 'SAM', value: m.sam, desc: 'Serviceable Addressable', color: '#175ead' },
              { label: 'SOM', value: m.som, desc: 'Serviceable Obtainable', color: '#00D4F0' },
            ].map(({ label, value, desc, color }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}10`, border: `1.5px solid ${color}25` }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
                <p className="font-bold text-lg text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">{desc}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-[#94a3b8] mb-1">Growth Rate</p>
            <p className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{m.growth_rate || '—'}</p></div>
          <div><p className="text-xs text-[#94a3b8] mb-1">Market Stage</p>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,212,240,0.10)', color: '#006578', fontFamily: 'Space Grotesk, sans-serif' }}>{m.maturity_stage || '—'}</span></div>
        </div>
        {m.key_drivers?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-[#94a3b8] mb-2">Key Market Drivers</p>
            <div className="flex flex-wrap gap-2">
              {m.key_drivers.map((d, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium text-[#006578]" style={{ background: 'rgba(0,101,120,0.08)', border: '1px solid rgba(0,101,120,0.15)' }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title="Competitive Landscape" subtitle="Key competitors and threat assessment">
        {comps.length === 0 ? <NA /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                {['Competitor','HQ','Est. Revenue','Market Share','Threat'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[#94a3b8] font-semibold uppercase tracking-wider text-[10px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {comps.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.06)' }}>
                    <td className="py-3 px-3 font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{c.name}</td>
                    <td className="py-3 px-3 text-[#475569]">{c.hq || '—'}</td>
                    <td className="py-3 px-3 text-[#475569]">{c.est_revenue || '—'}</td>
                    <td className="py-3 px-3 text-[#475569]">{c.market_share || '—'}</td>
                    <td className="py-3 px-3"><SevBadge level={c.threat_level || 'Medium'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Porter's 5 Forces" subtitle="Competitive intensity (1=Low, 5=High)">
          {radarData.every(d => d.value === 0) ? <NA /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,101,120,0.12)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#00D4F0" fill="#00D4F0" fillOpacity={0.18} strokeWidth={2} dot={{ fill: '#006578', r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {Object.values(pf).map((val, i) => (
                  typeof val === 'object' && val?.explanation ? (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5" style={{ background: '#006578', color: 'white', fontFamily: 'Space Grotesk, sans-serif' }}>{val.score}</span>
                      <p className="text-[11px] text-[#475569] leading-relaxed">{val.explanation}</p>
                    </div>
                  ) : null
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Revenue Quality" subtitle="Recurring revenue and customer metrics">
          {!rq.recurring_pct ? <NA /> : (
            <div className="space-y-4">
              {donutData.length > 0 && (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      <Cell fill="#006578" /><Cell fill="rgba(0,101,120,0.20)" />
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Avg Contract', value: rq.avg_contract_length },
                  { label: 'Customer Conc.', value: rq.customer_concentration },
                  { label: 'NRR Estimate', value: rq.nrr_estimate },
                  { label: 'Churn Estimate', value: rq.churn_estimate },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5" style={{ background: 'rgba(0,101,120,0.05)' }}>
                    <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{label}</p>
                    <p className="font-bold text-sm text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {(dd?.tailwinds?.length > 0 || dd?.headwinds?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card title="Growth Tailwinds">
            <div className="space-y-3">
              {(dd.tailwinds || []).map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 flex-shrink-0" />
                  <div><p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t.title}</p>
                    <p className="text-[11px] text-[#475569] mt-0.5">{t.description}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Headwinds">
            <div className="space-y-3">
              {(dd.headwinds || []).map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <span className="w-2 h-2 rounded-full bg-[#ef4444] mt-1.5 flex-shrink-0" />
                  <div><p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{h.title}</p>
                    <p className="text-[11px] text-[#475569] mt-0.5">{h.description}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ── FINANCIAL ── */
function FinancialSections({ dd, deal }) {
  const pl = dd?.pl_summary || {}
  // Prefer the real Yahoo unit/currency embedded in the deep-dive data over the deal's wizard input
  const sym = CURR_SYM[pl.currency || deal?.currency] || '€'
  const unit = pl.unit || deal?.revenueUnit || 'M'
  const comps = dd?.comps_table || []
  const vr = dd?.valuation_range || {}
  const ratios = dd?.key_ratios || []
  const syn = dd?.deal_synergies || {}

  const revenueChartData = [
    pl.revenue_fy_2 && { ...pl.revenue_fy_2, type: 'historical' },
    pl.revenue_fy_1 && { ...pl.revenue_fy_1, type: 'historical' },
    pl.revenue_fy0  && { ...pl.revenue_fy0,  type: 'actual' },
    pl.revenue_fy1e && { ...pl.revenue_fy1e, type: 'projected' },
    pl.revenue_fy2e && { ...pl.revenue_fy2e, type: 'projected' },
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      {pl.revenue_fy0 && (
        <Card title="Revenue Trajectory" subtitle={`Historical + projected (${sym}, ${unit}) · E = Estimated`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,101,120,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym}${v}`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="glass rounded-xl px-3 py-2 text-xs"><p className="font-bold text-[#1a2332]">{label}: {sym}{payload[0]?.value}{unit}</p></div>
              ) : null} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {revenueChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.type === 'projected' ? '#00D4F080' : entry.type === 'actual' ? '#006578' : '#175ead'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[#94a3b8]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#175ead]" />Historical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#006578]" />Actual</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background:'#00D4F080' }} />Projected (E)</span>
          </div>
        </Card>
      )}

      {(pl.gross_margin_pct != null || pl.ebitda_margin_pct != null || pl.net_margin_pct != null) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Gross Margin', value: pl.gross_margin_pct, bench: 'sector avg' },
            { label: 'EBITDA Margin', value: pl.ebitda_margin_pct, bench: '20–35%' },
            { label: 'Net Margin', value: pl.net_margin_pct, bench: '10–25%' },
          ].map(({ label, value, bench }) => value != null ? (
            <div key={label} className="glass rounded-2xl p-4">
              <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider mb-1">{label}</p>
              <p className="font-bold text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif', color: value >= 0 ? '#006578' : '#ef4444' }}>{value}%</p>
              <p className="text-[10px] text-[#94a3b8] mt-1">Bench: {bench}</p>
            </div>
          ) : null)}
        </div>
      )}

      {comps.length > 0 && (
        <Card title="Comparable Companies" subtitle="Market multiples benchmark">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                {['Company','EV/Revenue','EV/EBITDA','Rev Growth','Notes'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[#94a3b8] font-semibold uppercase tracking-wider text-[10px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {comps.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.06)' }}>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{c.company}</td>
                    <td className="py-2.5 px-3 text-[#006578] font-bold">{c.ev_revenue}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{c.ev_ebitda}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{c.revenue_growth}</td>
                    <td className="py-2.5 px-3 text-[#94a3b8] text-[10px]">{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {vr.base?.ev && (
        <Card title="Valuation Range" subtitle="Bear / Base / Bull scenario">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Bear Case', data: vr.low,  color: '#ef4444' },
              { label: 'Base Case', data: vr.base, color: '#006578' },
              { label: 'Bull Case', data: vr.high, color: '#22c55e' },
            ].map(({ label, data, color }) => data ? (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}10`, border: `1.5px solid ${color}25` }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
                <p className="font-bold text-lg text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{sym}{data.ev}{unit}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">{data.multiple}</p>
              </div>
            ) : null)}
          </div>
        </Card>
      )}

      {ratios.length > 0 && (
        <Card title="Key Financial Ratios">
          <div className="space-y-0">
            {ratios.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < ratios.length - 1 ? '1px solid rgba(0,101,120,0.07)' : 'none' }}>
                <span className="text-sm text-[#475569]">{r.ratio}</span>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{r.value}</span>
                  <span className="text-xs text-[#94a3b8] w-24 text-right">{r.benchmark}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold w-20 text-center"
                    style={{ background: `${STATUS_COLOR[r.status] || '#94a3b8'}15`, color: STATUS_COLOR[r.status] || '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {syn.total_synergy_estimate && (
        <Card title="Acquisition Synergies" subtitle="Estimated value creation from deal">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p className="text-[10px] text-[#22c55e] uppercase tracking-wider font-bold mb-1">Revenue Synergies</p>
              <p className="text-xs text-[#475569]">{syn.revenue_synergies_note}</p></div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <p className="text-[10px] text-[#3b82f6] uppercase tracking-wider font-bold mb-1">Cost Synergies</p>
              <p className="text-xs text-[#475569]">{syn.cost_synergies_note}</p></div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(0,101,120,0.08)', border: '1px solid rgba(0,101,120,0.15)' }}>
              <p className="text-[10px] text-[#006578] uppercase tracking-wider font-bold mb-1">Total Estimate</p>
              <p className="font-bold text-lg text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{syn.total_synergy_estimate}</p></div>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── OPERATIONAL ── */
function OperationalSections({ dd }) {
  const em = dd?.efficiency_metrics || {}
  const sc = dd?.supply_chain || {}
  const rd = dd?.rd_pipeline || {}
  const wf = dd?.workforce || {}

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rev / Employee', value: em.revenue_per_employee },
          { label: 'Operating Leverage', value: em.operating_leverage },
          { label: 'Capacity Utilization', value: em.capacity_utilization },
          { label: 'Gross Margin', value: em.gross_margin },
        ].filter(x => x.value).map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-4">
            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider mb-1">{label}</p>
            <p className="font-bold text-lg text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
          </div>
        ))}
      </div>

      <Card title="Supply Chain Analysis" subtitle="Supplier concentration and resilience">
        {!sc.resilience_score ? <NA /> : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="font-bold text-3xl text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{sc.resilience_score}/10</p>
                <p className="text-[10px] text-[#94a3b8]">Resilience</p></div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-[#475569]">Single-source risk</span><SevBadge level={sc.single_source_risk || 'Low'} /></div>
                <div className="flex justify-between text-xs"><span className="text-[#475569]">Geographic concentration</span><span className="text-[#475569]">{sc.geographic_concentration || '—'}</span></div>
              </div>
            </div>
            {(sc.key_suppliers || []).length > 0 && (
              <table className="w-full text-xs mt-3">
                <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                  {['Supplier','Category','% Procurement','Dependency'].map(h => <th key={h} className="text-left py-2 px-2 text-[#94a3b8] font-semibold text-[10px] uppercase tracking-wider">{h}</th>)}
                </tr></thead>
                <tbody>
                  {sc.key_suppliers.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.05)' }}>
                      <td className="py-2 px-2 font-medium text-[#1a2332]">{s.name}</td>
                      <td className="py-2 px-2 text-[#475569]">{s.category}</td>
                      <td className="py-2 px-2 text-[#475569]">{s.procurement_pct}</td>
                      <td className="py-2 px-2"><SevBadge level={s.dependency} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="R&D Pipeline">
          {!rd.rd_spend_pct_revenue ? <NA /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div><p className="text-[10px] text-[#94a3b8]">R&D Spend</p><p className="font-bold text-xl text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{rd.rd_spend_pct_revenue}</p></div>
                <div><p className="text-[10px] text-[#94a3b8]">Industry Avg</p><p className="font-bold text-xl text-[#475569]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{rd.industry_benchmark}</p></div>
                <div><p className="text-[10px] text-[#94a3b8]">Patents (3Y)</p><p className="font-bold text-xl text-[#175ead]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{rd.patents_last_3y ?? '—'}</p></div>
              </div>
              {(rd.key_initiatives || []).map((init, i) => (
                <div key={i} className="flex items-center gap-3 py-2" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: init.status === 'Active' ? 'rgba(34,197,94,0.10)' : init.status === 'Completed' ? 'rgba(59,130,246,0.10)' : 'rgba(0,101,120,0.08)', color: init.status === 'Active' ? '#22c55e' : init.status === 'Completed' ? '#3b82f6' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{init.status}</span>
                  <p className="text-xs text-[#1a2332] font-medium">{init.name}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Workforce Metrics">
          {!wf.headcount_trend ? <NA /> : (
            <div className="space-y-3">
              {[
                { label: 'Headcount Trend', value: wf.headcount_trend, badge: true },
                { label: 'Est. Attrition', value: wf.attrition_estimate },
                { label: 'Rev/Employee vs Benchmark', value: wf.rev_per_employee_vs_benchmark, badge: true },
              ].map(({ label, value, badge }) => (
                <div key={label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid rgba(0,101,120,0.07)' }}>
                  <span className="text-xs text-[#475569]">{label}</span>
                  {badge ? <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: value === 'Growing' || value === 'Above' ? 'rgba(34,197,94,0.10)' : value === 'Declining' || value === 'Below' ? 'rgba(239,68,68,0.10)' : 'rgba(0,101,120,0.08)', color: value === 'Growing' || value === 'Above' ? '#22c55e' : value === 'Declining' || value === 'Below' ? '#ef4444' : '#64748b', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</span>
                    : <span className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {dd?.integration_complexity && (
        <Card title="Integration Assessment">
          <div className="flex items-center gap-3 mb-2"><p className="text-xs text-[#475569]">Integration Complexity:</p><SevBadge level={dd.integration_complexity} /></div>
          <p className="text-sm text-[#475569] leading-relaxed">{dd.integration_notes}</p>
        </Card>
      )}
    </div>
  )
}

/* ── LEGAL ── */
function LegalSections({ dd }) {
  const ip = dd?.ip_portfolio || {}
  const lit = dd?.litigation || {}
  const comp = dd?.compliance || []
  const coc = dd?.change_of_control || {}

  return (
    <div className="space-y-5">
      <Card title="IP Portfolio" subtitle="Patent, trademark and copyright assets">
        {!ip.patent_count && !ip.ip_strength_score ? <NA /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Patents', value: ip.patent_count ?? '—' },
                { label: 'Trademarks', value: ip.trademark_count ?? '—' },
                { label: 'IP Strength', value: ip.ip_strength_score ? `${ip.ip_strength_score}/10` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,101,120,0.05)' }}>
                  <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{label}</p>
                  <p className="font-bold text-xl text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
                </div>
              ))}
            </div>
            {ip.ip_strength_note && <p className="text-xs text-[#475569]">{ip.ip_strength_note}</p>}
            {(ip.key_patents || []).length > 0 && (
              <table className="w-full text-xs mt-3">
                <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                  {['Patent Title','Filed','Status','Value'].map(h => <th key={h} className="text-left py-2 px-2 text-[#94a3b8] font-semibold text-[10px] uppercase">{h}</th>)}
                </tr></thead>
                <tbody>
                  {ip.key_patents.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.05)' }}>
                      <td className="py-2 px-2 font-medium text-[#1a2332]">{p.title}</td>
                      <td className="py-2 px-2 text-[#475569]">{p.filed}</td>
                      <td className="py-2 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: p.status === 'Active' ? 'rgba(34,197,94,0.10)' : 'rgba(0,101,120,0.08)', color: p.status === 'Active' ? '#22c55e' : '#94a3b8' }}>{p.status}</span></td>
                      <td className="py-2 px-2"><SevBadge level={p.strategic_value} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Litigation Register">
          {!lit.overall_risk ? <NA /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div><p className="text-[10px] text-[#94a3b8]">Active Cases</p><p className="font-bold text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif', color: lit.active_cases > 2 ? '#ef4444' : '#22c55e' }}>{lit.active_cases}</p></div>
                <div><p className="text-[10px] text-[#94a3b8]">Total Exposure</p><p className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{lit.total_exposure_estimate || '—'}</p></div>
                <div><p className="text-[10px] text-[#94a3b8]">Overall Risk</p><SevBadge level={lit.overall_risk} /></div>
              </div>
              {(lit.cases || []).map((c, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(0,101,120,0.04)', border: '1px solid rgba(0,101,120,0.08)' }}>
                  <p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{c.case}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-[#94a3b8]"><span>Status: {c.status}</span><span>Exposure: {c.est_exposure}</span></div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Regulatory Compliance">
          {comp.length === 0 ? <NA /> : (
            <div className="space-y-2">
              {comp.map((r, i) => (
                <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid rgba(0,101,120,0.07)' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: r.status === 'Compliant' ? '#22c55e' : r.status === 'Non-compliant' ? '#ef4444' : '#f59e0b' }}>
                    {r.status === 'Compliant' ? <CheckCircle2 size={10} color="white" /> : <AlertTriangle size={9} color="white" />}
                  </span>
                  <div><p className="text-xs font-semibold text-[#1a2332]">{r.regulation}</p><p className="text-[10px] text-[#94a3b8]">{r.notes}</p></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {coc.coc_provisions && (
        <Card title="Change of Control Provisions">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Key Provisions', value: coc.coc_provisions },
              { label: 'Acceleration Obligations', value: coc.acceleration_obligations },
              { label: 'Consent Requirements', value: coc.consent_requirements },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <p className="text-[10px] text-[#ef4444] font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs text-[#475569]">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── TECHNOLOGY ── */
function TechnologySections({ dd }) {
  const ts = dd?.tech_stack || []
  const td = dd?.tech_debt || {}
  const sec = dd?.security_posture || {}
  const ai = dd?.ai_capability || {}
  const dora = dd?.dora_metrics || {}

  return (
    <div className="space-y-5">
      <Card title="Technology Stack" subtitle="Layer-by-layer maturity assessment">
        {ts.length === 0 ? <NA /> : (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
              {['Layer','Technologies','Modernity','Notes'].map(h => <th key={h} className="text-left py-2 px-3 text-[#94a3b8] font-semibold text-[10px] uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody>
              {ts.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.05)' }}>
                  <td className="py-2.5 px-3 font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{row.layer}</td>
                  <td className="py-2.5 px-3 text-[#475569] font-mono text-[10px]">{row.technologies}</td>
                  <td className="py-2.5 px-3"><span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${MODERN_COLOR[row.modernity] || '#94a3b8'}15`, color: MODERN_COLOR[row.modernity] || '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{row.modernity}</span></td>
                  <td className="py-2.5 px-3 text-[#94a3b8] text-[10px]">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Technical Debt Assessment">
          {!td.score ? <NA /> : (
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="font-bold text-3xl" style={{ fontFamily: 'Space Grotesk, sans-serif', color: td.score >= 7 ? '#22c55e' : td.score >= 5 ? '#f59e0b' : '#ef4444' }}>{td.score}/10</p>
                <p className="text-[10px] text-[#94a3b8]">Debt Score</p><p className="text-[9px] text-[#94a3b8]">(10=minimal)</p></div>
              <div className="flex-1">
                <p className="text-xs text-[#94a3b8] mb-1">Key Indicators</p>
                {(td.key_indicators || []).map((ind, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /><p className="text-xs text-[#475569]">{ind}</p></div>
                ))}
                {td.remediation_estimate && <p className="text-[11px] text-[#94a3b8] mt-2">Remediation: <span className="font-semibold text-[#475569]">{td.remediation_estimate}</span></p>}
              </div>
            </div>
          )}
        </Card>
        <Card title="Security Posture">
          {!sec.infra_maturity && !sec.certifications?.length ? <NA /> : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {(sec.certifications || []).map((cert, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: cert.status === 'Certified' ? 'rgba(34,197,94,0.10)' : 'rgba(245,158,11,0.10)', color: cert.status === 'Certified' ? '#22c55e' : '#f59e0b', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {cert.status === 'Certified' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}{cert.name}
                  </span>
                ))}
              </div>
              <div className="flex justify-between text-xs py-2" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}><span className="text-[#475569]">Cloud Provider</span><span className="font-medium text-[#1a2332]">{sec.cloud_provider || '—'}</span></div>
              <div className="flex justify-between text-xs py-2" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}><span className="text-[#475569]">Infrastructure</span><span className="font-medium text-[#1a2332]">{sec.infra_maturity || '—'}</span></div>
            </div>
          )}
        </Card>
      </div>

      {Object.keys(dora).length > 0 && (
        <Card title="Engineering Velocity (DORA Metrics)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Deploy Frequency', value: dora.deployment_frequency },
              { label: 'Lead Time', value: dora.lead_time },
              { label: 'MTTR', value: dora.mttr },
              { label: 'Change Fail Rate', value: dora.change_fail_rate },
            ].map(({ label, value }) => value ? (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,101,120,0.05)' }}>
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-1">{label}</p>
                <p className="font-bold text-sm text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
              </div>
            ) : null)}
          </div>
        </Card>
      )}

      {ai.description && (
        <Card title="AI & Innovation Capability">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: ai.ai_maturity === 'Advanced' ? 'rgba(0,212,240,0.15)' : 'rgba(0,101,120,0.08)', color: ai.ai_maturity === 'Advanced' ? '#006578' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{ai.ai_maturity}</span>
            {ai.has_ai_features && <CheckCircle2 size={14} className="text-[#22c55e]" />}
          </div>
          <p className="text-sm text-[#475569] leading-relaxed">{ai.description}</p>
        </Card>
      )}
    </div>
  )
}

/* ── MANAGEMENT ── */
function ManagementSections({ dd }) {
  const execs = dd?.executives || []
  const km = dd?.key_man_risk || {}
  const board = dd?.board || {}
  const culture = dd?.culture || {}
  const comp = dd?.compensation || {}
  const ASSESS_COLOR = { Strong: '#22c55e', Adequate: '#f59e0b', Weak: '#ef4444' }

  return (
    <div className="space-y-5">
      {execs.length > 0 && (
        <div>
          <h3 className="font-bold text-base text-[#1a2332] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Executive Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {execs.map((exec, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #003d79, #006578)', fontFamily: 'Space Grotesk, sans-serif' }}>{(exec.name || exec.title || '?')[0].toUpperCase()}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{exec.name || 'Name N/A'}</p>
                      {exec.assessment && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${ASSESS_COLOR[exec.assessment] || '#94a3b8'}15`, color: ASSESS_COLOR[exec.assessment] || '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{exec.assessment}</span>}
                    </div>
                    <p className="text-xs text-[#006578] font-semibold mt-0.5">{exec.title}</p>
                    <p className="text-[11px] text-[#475569] mt-1 leading-relaxed">{exec.background}</p>
                    {exec.tenure_years > 0 && <p className="text-[10px] text-[#94a3b8] mt-1.5">{exec.tenure_years}yr tenure</p>}
                    {exec.key_risk && <p className="text-[10px] text-[#ef4444] mt-1 flex items-center gap-1"><AlertTriangle size={9} /> {exec.key_risk}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {km.score != null && (
        <Card title="Key Man Dependency Risk">
          <div className="flex items-center gap-5 mb-4">
            <div className="text-center"><p className="font-bold text-4xl" style={{ fontFamily: 'Space Grotesk, sans-serif', color: km.score >= 8 ? '#ef4444' : km.score >= 6 ? '#f59e0b' : '#22c55e' }}>{km.score}/10</p>
              <p className="text-[10px] text-[#94a3b8]">Risk Score</p><p className="text-[9px] text-[#94a3b8]">(10=critical)</p></div>
            <div className="flex-1 space-y-2">
              {(km.key_persons || []).map((p, i) => (
                <div key={i} className="flex items-start gap-2"><Flag size={11} className="text-[#f59e0b] mt-0.5 flex-shrink-0" /><p className="text-xs text-[#475569]">{p}</p></div>
              ))}
            </div>
          </div>
          {km.retention_status && <div className="flex items-center gap-2 mb-2"><span className="text-xs text-[#475569]">Retention packages:</span><span className="text-xs font-semibold text-[#1a2332]">{km.retention_status}</span></div>}
          {km.mitigation && <p className="text-xs text-[#475569] italic border-t border-dashed border-[#e2e8f0] pt-2 mt-2">{km.mitigation}</p>}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Board Composition">
          {!board.total_size ? <NA /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,101,120,0.05)' }}><p className="font-bold text-2xl text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{board.total_size}</p><p className="text-[10px] text-[#94a3b8]">Total</p></div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,101,120,0.05)' }}><p className="font-bold text-2xl text-[#22c55e]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{board.independent_count}</p><p className="text-[10px] text-[#94a3b8]">Independent</p></div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,101,120,0.05)' }}><p className="font-bold text-2xl text-[#175ead]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{board.governance_score}/10</p><p className="text-[10px] text-[#94a3b8]">Governance</p></div>
              </div>
              {board.notes && <p className="text-xs text-[#475569]">{board.notes}</p>}
            </div>
          )}
        </Card>
        <Card title="Cultural Fit Assessment">
          {!culture.acquirer_fit ? <NA /> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-xs text-[#475569]">Acquirer cultural fit</span><SevBadge level={culture.acquirer_fit} /></div>
              <div className="flex items-center justify-between"><span className="text-xs text-[#475569]">Integration risk</span><SevBadge level={culture.integration_risk} /></div>
              <div className="flex items-center justify-between"><span className="text-xs text-[#475569]">Recommended strategy</span><span className="text-xs font-semibold text-[#1a2332]">{culture.integration_strategy}</span></div>
              {culture.glassdoor_rating && <div className="flex items-center gap-2 pt-2 border-t border-dashed border-[#e2e8f0]"><span className="text-xs text-[#94a3b8]">Glassdoor (indicative):</span><span className="font-bold text-sm text-[#f59e0b]">{culture.glassdoor_rating}⭐</span></div>}
              {culture.work_env && <p className="text-[11px] text-[#475569]">{culture.work_env}</p>}
            </div>
          )}
        </Card>
      </div>

      {comp.c_suite_vs_benchmark && (
        <Card title="Compensation & Incentives">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'C-Suite vs Market', value: comp.c_suite_vs_benchmark, badge: true },
              { label: 'ESOP Status', value: comp.esop_status },
              { label: 'Acceleration Obligations', value: comp.acceleration_obligations },
            ].map(({ label, value, badge }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(0,101,120,0.04)' }}>
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-1">{label}</p>
                {badge ? <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: value === 'Above' ? 'rgba(59,130,246,0.10)' : value === 'At' ? 'rgba(34,197,94,0.10)' : 'rgba(0,101,120,0.08)', color: value === 'Above' ? '#3b82f6' : value === 'At' ? '#22c55e' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</span>
                  : <p className="font-semibold text-sm text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value || '—'}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ════ MAIN ════ */
export default function PillarDetail() {
  const { id: pillarId } = useParams()
  const navigate = useNavigate()
  const {
    activeDeal, pillarResults, pillarDeepDive, deepDiveLoading,
    setPillarDeepDive, setDeepDiveLoading, redFlags,
  } = useDealStore()

  const pillar    = PILLARS.find(p => p.id === pillarId)
  const pillarIdx = PILLARS.indexOf(pillar)
  const result    = pillarResults[pillarId]
  const dd         = pillarDeepDive[pillarId]
  const isLoading  = deepDiveLoading[pillarId]
  const Icon       = PILLAR_ICONS[pillarId] || TrendingUp

  const pillarFlags = []
  const seen = new Set()
  ;(redFlags || []).filter(f => f.pillar === pillarId).forEach(f => { if (!seen.has(f.title)) { seen.add(f.title); pillarFlags.push(f) } })
  ;(result?.red_flags || []).forEach(f => { if (!seen.has(f.title)) { seen.add(f.title); pillarFlags.push({ ...f, pillar: pillarId }) } })

  const abortRef = useRef(null)

  const loadDeepDive = async () => {
    if (!activeDeal?.id || !pillarId || isLoading) return
    // cancel any in-flight stream before starting a new one
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setDeepDiveLoading(pillarId, true)
    try {
      const resp = await fetch(`/api/deepdive/${activeDeal.id}/${pillarId}/stream`, { signal: controller.signal })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', currentEvent = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('event:')) currentEvent = line.slice(6).trim()
          else if (line.startsWith('data:') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(5))
              if (currentEvent === 'deepdive_complete') setPillarDeepDive(pillarId, data.data)
            } catch {}
            currentEvent = ''
          }
        }
      }
    } catch (e) {
      // Ignore aborts from navigating away / switching pillars; only surface real failures
      if (e.name !== 'AbortError') console.warn('Deep dive interrupted:', e.message)
    } finally {
      if (abortRef.current === controller) {
        setDeepDiveLoading(pillarId, false)
        abortRef.current = null
      }
    }
  }

  useEffect(() => {
    if (result && !dd && !isLoading) loadDeepDive()
    // abort the stream when leaving the page or switching pillars
    return () => { if (abortRef.current) abortRef.current.abort() }
    // eslint-disable-next-line
  }, [pillarId, result])

  if (!pillar) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#94a3b8]">Unknown pillar: {pillarId}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-[#006578] text-sm hover:underline">← Back to Dashboard</button>
      </div>
    )
  }

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <Icon size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No active deal</h2>
          <button onClick={() => navigate('/wizard')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto mt-4" style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>Start Wizard <ArrowRight size={14} /></button>
        </div>
      </div>
    )
  }

  const score = result?.score
  const scoreColor = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : score ? '#ef4444' : '#94a3b8'

  return (
    <div className="min-h-screen p-6 space-y-5">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#006578] transition-colors">
        <ArrowLeft size={13} /><span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dashboard / {pillar.label}</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative flex items-center justify-center flex-shrink-0">
            <ScoreRing score={score} size={80} stroke={7} color={scoreColor} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: scoreColor }}>{score ? Math.round(score) : '—'}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: pillar.color, fontFamily: 'Space Grotesk, sans-serif' }}>{String.fromCharCode(65 + pillarIdx)}. {pillar.label}</span>
              {result && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', fontFamily: 'Space Grotesk, sans-serif' }}><CheckCircle2 size={11} /> Analysis Complete</span>}
            </div>
            <h1 className="text-xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{pillar.label} Due Diligence — {activeDeal.targetCompany}</h1>
            {result?.summary && <p className="text-sm text-[#475569] mt-1 leading-relaxed max-w-2xl">{result.summary}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!result && <span className="text-xs text-[#94a3b8] italic">Run DD agents first</span>}
            {result && !dd && !isLoading && (
              <button onClick={loadDeepDive} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}><Database size={13} /> Generate Deep Dive</button>
            )}
            {isLoading && <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-[#006578]" style={{ background: 'rgba(0,101,120,0.08)' }}><Loader2 size={13} className="animate-spin" /><span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Generating…</span></div>}
            {dd && !isLoading && <button onClick={loadDeepDive} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#64748b] hover:text-[#006578] transition-all" style={{ background: 'rgba(0,101,120,0.05)' }}><RefreshCw size={12} /> Refresh</button>}
          </div>
        </div>
        {result?.key_metrics && Object.keys(result.key_metrics).length > 0 && (
          <div className="flex gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
            {Object.entries(result.key_metrics).slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2"><span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{k}:</span><span className="text-sm font-bold text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v}</span></div>
            ))}
          </div>
        )}
      </motion.div>

      {!result && (
        <Card title="Awaiting Analysis">
          <div className="text-center py-8">
            <Icon size={28} className="text-[#94a3b8] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#64748b]">Launch the DD agents from the dashboard to generate {pillar.label} analysis.</p>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold mx-auto mt-4" style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>Go to Dashboard</button>
          </div>
        </Card>
      )}

      {result?.findings?.length > 0 && (
        <Card title="Agent Findings" subtitle={result?.grounding?.basis || `${result.findings.length} findings from agent analysis`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.findings.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: f.sentiment === 'positive' ? 'rgba(34,197,94,0.05)' : f.sentiment === 'negative' ? 'rgba(239,68,68,0.05)' : 'rgba(0,101,120,0.04)' }}>
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: f.sentiment === 'positive' ? '#22c55e' : f.sentiment === 'negative' ? '#ef4444' : '#94a3b8' }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</p>
                    <ConfidenceBadge level={f.confidence} />
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{f.detail}</p>
                  <EvidenceLine evidence={f.evidence} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {result?.swing_factors?.length > 0 && <SwingFactors items={result.swing_factors} />}

      {isLoading && <DeepDiveLoading />}

      {dd && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {pillarId === 'commercial'  && <CommercialSections  dd={dd} />}
          {pillarId === 'financial'   && <FinancialSections   dd={dd} deal={activeDeal} />}
          {pillarId === 'operational' && <OperationalSections dd={dd} />}
          {pillarId === 'legal'       && <LegalSections       dd={dd} />}
          {pillarId === 'technology'  && <TechnologySections  dd={dd} />}
          {pillarId === 'management'  && <ManagementSections  dd={dd} />}
        </motion.div>
      )}

      {pillarFlags.length > 0 && (
        <Card title={`${pillar.label} Risk Flags`} subtitle="Identified by DD agent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pillarFlags.map((flag, i) => {
              const c = flag.severity === 'critical' ? '#ef4444' : flag.severity === 'high' ? '#f59e0b' : '#3b82f6'
              return (
                <div key={i} className="rounded-xl p-4" style={{ background: `${c}08`, border: `1px solid ${c}25` }}>
                  <div className="flex items-start gap-2.5">
                    <span className={`pill pill-${flag.severity} mt-0.5 flex-shrink-0`}>{flag.severity}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{flag.title}</p>
                        <ConfidenceBadge level={flag.confidence} />
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{flag.detail}</p>
                      <EvidenceLine evidence={flag.evidence} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
