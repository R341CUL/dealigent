import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import {
  TrendingUp, ArrowRight, TrendingDown, Minus, BarChart2, Activity,
  ExternalLink, Database, Clock, AlertTriangle, Loader2, CheckCircle2,
} from 'lucide-react'
import { useDealStore } from '../store/dealStore'
import { VERDICT_CONFIG } from '../lib/constants'
import { sym, fmtMoney, fmtPct, fmtX } from '../lib/format'

const CONF_COLOR = { HIGH:'#22c55e', MEDIUM:'#f59e0b', LOW:'#94a3b8' }

function ChartTip({ active, payload, label, currency, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-[#1a2332] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#475569]">{p.name}:</span>
          <span className="font-bold text-[#1a2332]">{fmtMoney(p.value, currency, unit)}</span>
        </div>
      ))}
    </div>
  )
}

function KPICard({ label, value, sub, trend, color = '#006578', delay = 0, conf }) {
  const tIcon = trend === 'up' ? <TrendingUp size={13} className="text-[#22c55e]" />
              : trend === 'down' ? <TrendingDown size={13} className="text-[#ef4444]" />
              : <Minus size={13} className="text-[#94a3b8]" />
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</p>
        {conf && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase"
            style={{ background: `${CONF_COLOR[conf]}18`, color: CONF_COLOR[conf] }}>
            <span className="w-1 h-1 rounded-full" style={{ background: CONF_COLOR[conf] }} />{conf}
          </span>
        )}
      </div>
      <p className="font-bold text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif', color }}>{value}</p>
      {sub && <div className="flex items-center gap-1.5 mt-1.5">{tIcon}<p className="text-xs text-[#64748b]">{sub}</p></div>}
    </motion.div>
  )
}

function Section({ title, subtitle, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-6">
      <div className="mb-5">
        <h3 className="font-bold text-base text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
        {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

export default function Financial() {
  const navigate = useNavigate()
  const { activeDeal, pillarResults, executionPhase, verdict, overallScore, realFinancials, realValuation, setRealFinancials } = useDealStore()

  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [sectorPeers, setSectorPeers] = useState([])

  const finResult  = pillarResults?.financial
  const verdictCfg = verdict ? VERDICT_CONFIG[verdict] : null

  // Fetch REAL financials from Yahoo on mount
  useEffect(() => {
    if (!activeDeal?.id) return
    let cancelled = false
    setLoading(true); setError(null)
    fetch(`/api/financials/${activeDeal.id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setRealFinancials(d.financials, d.valuation)
        if (d.sector_peers?.length) setSectorPeers(d.sector_peers)
        if (!d.financials?.found) setError('no-ticker')
      })
      .catch(() => !cancelled && setError('fetch-failed'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [activeDeal?.id])

  const fin = realFinancials || {}
  const val = realValuation || {}
  const currency = fin.currency || activeDeal?.currency || 'EUR'
  const unit     = fin.unit || activeDeal?.revenueUnit || 'M'
  const hasReal  = fin.found

  // Revenue bridge from REAL P&L
  const revenueData = useMemo(() => {
    if (!fin.pl_years?.length) return []
    return fin.pl_years.map((y, i, arr) => ({
      label: y.label, revenue: y.revenue,
      type: i === arr.length - 1 ? 'latest' : 'historical',
    }))
  }, [fin.pl_years])

  // Margin trend from REAL P&L — EBITDA margin for industrials; net margin for banks (no EBITDA)
  const hasEbitdaSeries = (fin.pl_years || []).some(y => y.ebitda != null)
  const marginMode = hasEbitdaSeries ? 'ebitda' : 'net'
  const marginData = useMemo(() => {
    if (!fin.pl_years?.length) return []
    return fin.pl_years.map(y => {
      const num = marginMode === 'ebitda' ? y.ebitda : y.net_income
      return { label: y.label, margin: y.revenue && num != null ? Math.round((num / y.revenue) * 100) : null }
    }).filter(d => d.margin != null)
  }, [fin.pl_years, marginMode])

  const isEquity = val.valuation_mode === 'equity'

  // Acquisition bridge from REAL valuation (equity-based for financials, EV-based otherwise)
  const bridgeData = useMemo(() => {
    if (!val.available) return []
    return [
      { label: isEquity ? 'Equity Value' : 'Standalone EV', value: val.standalone_ev,    color: '#006578' },
      { label: 'Revenue Synergies', value: val.revenue_synergies, color: '#22c55e' },
      { label: 'Cost Synergies',    value: val.cost_synergies,   color: '#10b981' },
      { label: 'Control Premium',   value: val.control_premium,  color: '#3b82f6' },
      { label: 'Fair Offer',        value: val.fair_offer,       color: '#00D4F0' },
      ...(val.deal_value_entered ? [{ label: 'Entered Deal Value', value: val.deal_value_entered, color: val.overpay_flag?.severity === 'high' ? '#ef4444' : '#f59e0b' }] : []),
    ].filter(d => d.value != null && d.value > 0)
  }, [val, isEquity])

  if (!activeDeal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <BarChart2 size={32} className="text-[#94a3b8] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#001f26] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>No active deal</h2>
          <button onClick={() => navigate('/wizard')} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm mx-auto mt-4"
            style={{ background: 'linear-gradient(135deg, #006578, #00899e)', fontFamily: 'Space Grotesk, sans-serif' }}>
            Start Wizard <ArrowRight size={14} />
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
          <p className="text-[#94a3b8] text-xs font-mono uppercase tracking-wider mb-1">Financial Model</p>
          <h1 className="text-2xl font-bold text-[#001f26]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{activeDeal.targetCompany}</h1>
          <p className="text-[#64748b] text-sm mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{fin.sector || activeDeal.sector} · {activeDeal.location} · {currency}</span>
            {fin.ticker && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold" style={{ background: 'rgba(0,101,120,0.08)', color: '#006578' }}>
                {fin.ticker}{fin.exchange ? ` · ${fin.exchange}` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
              style={{ background: `${CONF_COLOR[hasReal ? 'HIGH' : 'LOW']}18`, color: CONF_COLOR[hasReal ? 'HIGH' : 'LOW'], fontFamily: 'Space Grotesk, sans-serif' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: CONF_COLOR[hasReal ? 'HIGH' : 'LOW'] }} />
              {hasReal ? 'HIGH confidence · Live Yahoo Finance' : 'LOW · no ticker matched'}
            </span>
          </p>
        </div>
        {verdictCfg && (
          <div className="px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: verdictCfg.bg, border: `1.5px solid ${verdictCfg.color}30` }}>
            <p className="font-bold text-sm" style={{ color: verdictCfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>{verdictCfg.label} · {overallScore}/100</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="glass rounded-2xl p-8 flex items-center justify-center gap-3">
          <Loader2 size={18} className="text-[#00D4F0] animate-spin" />
          <span className="text-sm text-[#64748b]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Fetching live financials from Yahoo Finance…</span>
        </div>
      )}

      {/* Overpayment / valuation alert */}
      {val.overpay_flag && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: val.overpay_flag.severity === 'high' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                   border: `1.5px solid ${val.overpay_flag.severity === 'high' ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)'}` }}>
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: val.overpay_flag.severity === 'high' ? '#ef4444' : '#f59e0b' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: val.overpay_flag.severity === 'high' ? '#ef4444' : '#d97706', fontFamily: 'Space Grotesk, sans-serif' }}>{val.overpay_flag.title}</p>
            <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{val.overpay_flag.detail}</p>
          </div>
        </motion.div>
      )}

      {/* KPI row — all REAL */}
      {hasReal && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Revenue (latest FY)" value={fmtMoney(fin.latest_revenue, currency, unit)}
            sub={fin.revenue_growth != null ? `${fin.revenue_growth > 0 ? '+' : ''}${fin.revenue_growth}% YoY` : fin.pl_years?.slice(-1)[0]?.label}
            trend={fin.revenue_growth > 0 ? 'up' : 'down'} conf="HIGH" delay={0} />
          {isEquity ? (
            <KPICard label="Equity Value" value={fmtMoney(fin.market_cap, currency, unit)}
              sub={fin.pb_ratio ? `${fmtX(fin.pb_ratio)} P/B · market cap` : 'market cap'} trend="neutral" color="#175ead" conf="HIGH" delay={0.05} />
          ) : (
            <KPICard label="Enterprise Value" value={fmtMoney(fin.enterprise_value, currency, unit)}
              sub={fin.ev_ebitda ? `${fmtX(fin.ev_ebitda)} EV/EBITDA` : undefined} trend="neutral" color="#175ead" conf="HIGH" delay={0.05} />
          )}
          <KPICard label="Net Margin" value={fmtPct(fin.net_margin)}
            sub={`Net income ${fmtMoney(fin.latest_net_income, currency, unit)}`} trend={fin.net_margin > 5 ? 'up' : 'down'}
            color={fin.net_margin > 5 ? '#22c55e' : '#f59e0b'} conf="HIGH" delay={0.1} />
          <KPICard label="Debt / Equity" value={fin.debt_to_equity != null ? `${fin.debt_to_equity}x` : '—'}
            sub={fin.current_ratio ? `Current ratio ${fin.current_ratio}` : undefined} trend={fin.debt_to_equity < 1 ? 'up' : 'down'}
            color={fin.debt_to_equity < 1 ? '#22c55e' : '#ef4444'} conf="HIGH" delay={0.15} />
        </div>
      )}

      {/* AI qualitative analysis (from DD agent) */}
      {finResult && (
        <Section title="AI Financial Analysis" subtitle="Qualitative read by Groq Llama 3.3-70B · grounded on the real Yahoo figures above" delay={0.1}>
          <p className="text-sm text-[#475569] leading-relaxed mb-4">{finResult.summary}</p>
          {finResult.findings?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {finResult.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl p-3"
                  style={{ background: f.sentiment === 'positive' ? 'rgba(34,197,94,0.05)' : f.sentiment === 'negative' ? 'rgba(239,68,68,0.05)' : 'rgba(0,101,120,0.04)' }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: f.sentiment === 'positive' ? '#22c55e' : f.sentiment === 'negative' ? '#ef4444' : '#94a3b8' }} />
                  <div><p className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</p>
                    <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{f.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Charts — REAL data */}
      {revenueData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title="Revenue — Actuals" subtitle={`Reported fiscal years (${sym(currency)}, ${unit}) · Source: Yahoo Finance`} delay={0.2}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,101,120,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym(currency)}${v}`} />
                <Tooltip content={<ChartTip currency={currency} unit={unit} />} />
                <Bar dataKey="revenue" name="Revenue" radius={[6,6,0,0]}
                  label={{ position: 'top', fill: '#006578', fontSize: 10, fontFamily: 'Space Grotesk, sans-serif', formatter: v => `${sym(currency)}${v}` }}>
                  {revenueData.map((e, i) => <Cell key={i} fill={e.type === 'latest' ? '#006578' : '#175ead'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-[#94a3b8] mt-2 font-mono">All figures reported actuals — no estimates.</p>
          </Section>

          <Section title={marginMode === 'ebitda' ? 'EBITDA Margin Trend' : 'Net Margin Trend'}
            subtitle={marginMode === 'ebitda' ? 'Reported EBITDA ÷ revenue per fiscal year' : 'Reported net income ÷ revenue per fiscal year (banks do not report EBITDA)'} delay={0.25}>
            {marginData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px]"><p className="text-sm text-[#94a3b8] italic">Margin series not reported for this company</p></div>
            ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={marginData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,101,120,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div className="glass rounded-xl px-3 py-2 text-xs"><p className="font-bold text-[#1a2332]">{label}: {payload[0].value}%</p></div>
                ) : null} />
                <ReferenceLine y={0} stroke="rgba(0,101,120,0.20)" strokeDasharray="4 4" />
                <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#006578" stopOpacity={0.25} /><stop offset="95%" stopColor="#006578" stopOpacity={0.03} /></linearGradient></defs>
                <Area type="monotone" dataKey="margin" name={marginMode === 'ebitda' ? 'EBITDA Margin' : 'Net Margin'} stroke="#006578" strokeWidth={2.5} fill="url(#mg)" dot={{ fill: '#006578', r: 4, strokeWidth: 2, stroke: 'white' }} />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </Section>
        </div>
      )}

      {/* Acquisition bridge + valuation benchmarks — REAL */}
      {val.available && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title="Acquisition Value Bridge" subtitle={isEquity ? `Equity value + control premium · ${val.sector_label} (${sym(currency)}${unit})` : `${val.sector_label} multiples on real EBITDA (${sym(currency)}${unit})`} delay={0.3}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bridgeData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,101,120,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${sym(currency)}${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<ChartTip currency={currency} unit={unit} />} />
                <Bar dataKey="value" name="Value" radius={[0,6,6,0]}
                  label={{ position: 'right', fill: '#475569', fontSize: 10, formatter: v => `${sym(currency)}${v}` }}>
                  {bridgeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-[#94a3b8] mt-2 font-mono">
              {isEquity
                ? 'Fair offer = equity value (market cap) + 25% control premium. EV/EBITDA does not apply to financial institutions.'
                : 'Fair offer = standalone EV + synergies + 25% control premium. Compared to your entered deal value.'}
            </p>
          </Section>

          <Section title="Valuation Benchmarks" subtitle={`Real multiples vs. ${val.sector_label} sector range`} delay={0.35}>
            <div className="space-y-0">
              {(isEquity ? [
                { metric: 'P/B Ratio', deal: fmtX(fin.pb_ratio), range: '0.5–1.5x', status: fin.pb_ratio == null ? '—' : fin.pb_ratio <= 1.5 ? 'In range' : 'Above' },
                { metric: 'P/E Ratio', deal: fmtX(fin.pe_ratio), range: '8–14x', status: fin.pe_ratio == null ? '—' : (fin.pe_ratio >= 8 && fin.pe_ratio <= 14) ? 'In range' : fin.pe_ratio > 14 ? 'Above' : 'Below' },
                { metric: 'Net Margin', deal: fmtPct(fin.net_margin), range: 'sector', status: '—' },
                { metric: 'ROE', deal: fmtPct(fin.roe), range: '≥10%', status: fin.roe == null ? '—' : fin.roe >= 10 ? 'In range' : 'Below' },
                { metric: 'Revenue Growth', deal: fmtPct(fin.revenue_growth), range: 'YoY', status: fin.revenue_growth > 0 ? 'In range' : 'Below' },
              ] : [
                { metric: 'EV / Revenue', deal: fmtX(fin.ev_revenue), range: `${val.ev_rev_range[0]}–${val.ev_rev_range[2]}x`,
                  status: fin.ev_revenue >= val.ev_rev_range[0] && fin.ev_revenue <= val.ev_rev_range[2] ? 'In range' : fin.ev_revenue > val.ev_rev_range[2] ? 'Above' : 'Below' },
                { metric: 'EV / EBITDA', deal: fmtX(fin.ev_ebitda), range: `${val.ev_ebitda_range[0]}–${val.ev_ebitda_range[2]}x`,
                  status: fin.ev_ebitda >= val.ev_ebitda_range[0] && fin.ev_ebitda <= val.ev_ebitda_range[2] ? 'In range' : fin.ev_ebitda > val.ev_ebitda_range[2] ? 'Above' : 'Below' },
                { metric: 'P/E Ratio', deal: fmtX(fin.pe_ratio), range: 'sector', status: '—' },
                { metric: 'P/B Ratio', deal: fmtX(fin.pb_ratio), range: 'sector', status: '—' },
                { metric: 'Revenue Growth', deal: fmtPct(fin.revenue_growth), range: 'YoY', status: fin.revenue_growth > 0 ? 'In range' : 'Below' },
              ]).map(({ metric, deal, range, status }, i, arr) => (
                <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(0,101,120,0.07)' : 'none' }}>
                  <span className="text-xs text-[#475569]">{metric}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{deal}</span>
                    <span className="text-xs text-[#94a3b8] w-20 text-right">{range}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold w-16 text-center"
                      style={{ background: status === 'In range' ? 'rgba(34,197,94,0.10)' : status === 'Above' ? 'rgba(239,68,68,0.10)' : status === 'Below' ? 'rgba(245,158,11,0.10)' : 'rgba(0,101,120,0.06)',
                               color: status === 'In range' ? '#22c55e' : status === 'Above' ? '#ef4444' : status === 'Below' ? '#d97706' : '#94a3b8', fontFamily: 'Space Grotesk, sans-serif' }}>
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Sector Peer Benchmarking */}
      {sectorPeers.length > 0 && (
        <Section title="Sector Peer Benchmarking" subtitle={`Public comparables — ${activeDeal.sector || fin.sector || 'sector'} · live Yahoo Finance data`} delay={0.38}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
                  {['Company', 'Mkt Cap', 'EV/EBITDA', 'EV/Revenue', 'Gross Margin', 'Op. Margin'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[#94a3b8] font-semibold uppercase tracking-wider text-[10px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Target row */}
                {hasReal && (
                  <tr style={{ borderBottom: '1px solid rgba(0,101,120,0.08)', background: 'rgba(0,101,120,0.04)' }}>
                    <td className="py-2.5 px-3 font-bold text-[#006578]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {activeDeal.targetCompany} <span className="text-[9px] font-normal text-[#94a3b8]">(target)</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]">{fin.market_cap != null ? `${sym(fin.currency)}${fin.market_cap}${fin.unit}` : '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]">{fmtX(fin.ev_ebitda)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]">{fmtX(fin.ev_revenue)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]">{fmtPct(fin.gross_margin)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1a2332]">{fmtPct(fin.operating_margin)}</td>
                  </tr>
                )}
                {/* Peer rows */}
                {sectorPeers.map((p, i) => (
                  <tr key={i} style={{ borderBottom: i < sectorPeers.length - 1 ? '1px solid rgba(0,101,120,0.06)' : 'none' }}>
                    <td className="py-2.5 px-3 text-[#1a2332]">
                      <span className="font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{p.name}</span>
                      <span className="text-[10px] text-[#94a3b8] ml-1 font-mono">{p.ticker}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">{p.market_cap != null ? `${sym(p.currency)}${p.market_cap}${fin.unit || 'M'}` : '—'}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{fmtX(p.ev_ebitda)}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{fmtX(p.ev_revenue)}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{fmtPct(p.gross_margin)}</td>
                    <td className="py-2.5 px-3 text-[#475569]">{fmtPct(p.operating_margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#94a3b8] mt-2 font-mono">Peers sourced live from Yahoo Finance · {new Date().toLocaleDateString()}</p>
        </Section>
      )}

      {/* Financial risk flags */}
      {finResult?.red_flags?.length > 0 && (
        <Section title="Financial Risk Flags" subtitle="Identified by the Financial DD agent" delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {finResult.red_flags.map((flag, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: flag.severity === 'critical' ? 'rgba(239,68,68,0.06)' : flag.severity === 'high' ? 'rgba(245,158,11,0.06)' : 'rgba(59,130,246,0.06)', border: `1px solid ${flag.severity === 'critical' ? 'rgba(239,68,68,0.20)' : flag.severity === 'high' ? 'rgba(245,158,11,0.20)' : 'rgba(59,130,246,0.15)'}` }}>
                <div className="flex items-start gap-2.5">
                  <span className={`pill pill-${flag.severity} mt-0.5`}>{flag.severity}</span>
                  <div><p className="text-xs font-bold text-[#1a2332] mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{flag.title}</p>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{flag.detail}</p></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Data Sources & Provenance — REAL */}
      <Section title="Data Sources & Provenance" subtitle="Every figure traced to its source" delay={0.45}>
        <div className="flex items-center gap-4 mb-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <Database size={13} className="text-[#006578]" />
            <span className="text-[#475569]">Primary source:</span>
            {fin.source_url ? (
              <a href={fin.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#006578] hover:underline inline-flex items-center gap-1">
                {hasReal ? 'Yahoo Finance (live statements)' : 'No source'} <ExternalLink size={10} />
              </a>
            ) : <span className="font-semibold text-[#475569]">{hasReal ? 'Yahoo Finance' : 'No live source'}</span>}
          </div>
          {fin.ticker && <div className="flex items-center gap-1.5"><span className="text-[#475569]">Ticker:</span><span className="font-mono font-bold text-[#006578]">{fin.ticker}</span></div>}
          {fin.data_timestamp && <div className="flex items-center gap-1.5"><Clock size={13} className="text-[#94a3b8]" /><span className="text-[#94a3b8]">Updated: {new Date(fin.data_timestamp).toLocaleString()}</span></div>}
        </div>

        {hasReal ? (
          <table className="w-full text-xs">
            <thead><tr style={{ borderBottom: '1px solid rgba(0,101,120,0.10)' }}>
              {['Data Point','Value','Source','Confidence'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#94a3b8] font-semibold uppercase tracking-wider text-[10px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                { f: 'Revenue (latest FY)', v: fmtMoney(fin.latest_revenue, currency, unit) },
                { f: 'EBITDA (latest FY)', v: fmtMoney(fin.latest_ebitda, currency, unit) },
                { f: 'Net Income', v: fmtMoney(fin.latest_net_income, currency, unit) },
                ...(isEquity
                  ? [{ f: 'Market Cap', v: fmtMoney(fin.market_cap, currency, unit) }, { f: 'P/B Ratio', v: fmtX(fin.pb_ratio) }, { f: 'P/E Ratio', v: fmtX(fin.pe_ratio) }]
                  : [{ f: 'Enterprise Value', v: fmtMoney(fin.enterprise_value, currency, unit) }, { f: 'Market Cap', v: fmtMoney(fin.market_cap, currency, unit) }, { f: 'EV/EBITDA', v: fmtX(fin.ev_ebitda) }]),
                { f: 'Stock Price', v: `${sym(currency)}${fin.stock_price}` },
                { f: 'Debt/Equity', v: `${fin.debt_to_equity}x` },
              ].map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,101,120,0.06)' }}>
                  <td className="py-2.5 px-3 font-semibold text-[#1a2332]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{r.f}</td>
                  <td className="py-2.5 px-3 text-[#006578] font-bold">{r.v}</td>
                  <td className="py-2.5 px-3 text-[#475569]">
                    <a href={fin.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">Yahoo Finance <ExternalLink size={9} /></a>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', fontFamily: 'Space Grotesk, sans-serif' }}>
                      <span className="w-1 h-1 rounded-full bg-[#22c55e]" />HIGH
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)' }}>
            <p className="text-xs text-[#475569]">
              {error === 'fetch-failed' ? 'Could not reach the financials service.' : 'No Yahoo Finance ticker matched this company.'}
              {' '}Enter a valid stock ticker in the wizard (e.g. <span className="font-mono">MANAKSTEEL.NS</span>) to pull live statements.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 text-[10px] text-[#94a3b8]" style={{ borderTop: '1px solid rgba(0,101,120,0.08)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" />HIGH — live from Yahoo Finance</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#94a3b8]" />LOW — no ticker / agent estimate</span>
        </div>
      </Section>
    </div>
  )
}
