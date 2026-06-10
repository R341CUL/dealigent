import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, LineChart, Layers, FileText,
  LogOut, Zap, Handshake, TrendingUp, DollarSign,
  Settings, Scale, Cpu, Users
} from 'lucide-react'
import { useDealStore } from '../../store/dealStore'
import { PILLARS, VERDICT_CONFIG } from '../../lib/constants'

const PILLAR_STATUS_COLOR = {
  complete: '#22c55e',
  running:  '#00D4F0',
  pending:  'rgba(255,255,255,0.22)',
  error:    '#ef4444',
}

function PillarDot({ status = 'pending' }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-500"
      style={{ background: PILLAR_STATUS_COLOR[status] }}
    />
  )
}

export default function Sidebar() {
  const { logout, activeDeal, verdict, overallScore, agentStatus } = useDealStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const verdictCfg = verdict ? VERDICT_CONFIG[verdict] : null

  const getPillarStatus = (id) => {
    const st = agentStatus[id]
    if (st === 'complete') return 'complete'
    if (st === 'running')  return 'running'
    return 'pending'
  }

  return (
    <aside
      className="w-64 flex flex-col fixed left-0 top-0 bottom-0 z-40 select-none overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #003d79 0%, #001f26 100%)', height: '100vh' }}
    >
      {/* Dot-grid strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[14px] pointer-events-none z-10"
        style={{
          background: '#0d1f3c',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '6px 6px',
        }}
      />

      {/* Inner column — full height, flex */}
      <div className="flex flex-col h-full ml-[14px] min-h-0">

        {/* Logo — fixed */}
        <div className="flex-shrink-0 px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#00D4F0', boxShadow: '0 0 16px rgba(0,212,240,0.40)' }}>
              <Zap size={17} color="#0d1f3c" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-[17px] leading-none tracking-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dealigent</p>
              <p className="text-[#7aa3c8] text-[10px] mt-0.5 tracking-widest uppercase font-mono">AI Due Diligence</p>
            </div>
          </div>
        </div>

        {/* Active deal verdict chip */}
        {verdictCfg && overallScore && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 mx-3 mb-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[9px] font-mono uppercase tracking-widest">Verdict</p>
                <p className="font-bold text-sm" style={{ color: verdictCfg.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {verdictCfg.label}
                </p>
              </div>
              <p className="font-bold text-xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {overallScore}<span className="text-white/30 text-xs">/100</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 pb-2 space-y-0.5">

          {/* M&A Context */}
          <NavLink to="/wizard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group ${
                isActive ? 'text-white' : 'text-[#7aa3c8] hover:text-white hover:bg-white/5'}`}
            style={({ isActive }) => isActive ? { background: 'rgba(0,212,240,0.12)', borderLeft: '3px solid #00D4F0' } : {}}
          >
            {({ isActive }) => (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isActive ? 'rgba(0,212,240,0.15)' : 'rgba(255,255,255,0.06)' }}>
                  <Handshake size={16} color={isActive ? '#00D4F0' : 'rgba(255,255,255,0.45)'} strokeWidth={2} />
                </div>
                <span className="font-semibold text-[15px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>M&amp;A Context</span>
              </>
            )}
          </NavLink>

          {/* DD Pillars section */}
          <div className="px-4 pt-5 pb-2">
            <p className="text-[#4a7099] text-[11px] font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>DD Pillars</p>
          </div>

          {PILLARS.map((pillar, i) => {
            const status = getPillarStatus(pillar.id)
            return (
              <NavLink key={pillar.id} to={`/pillar/${pillar.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive ? 'text-white'
                    : status === 'pending' ? 'text-[#4a7099] hover:text-[#7aa3c8]'
                    : 'text-[#a0c4e0] hover:text-white hover:bg-white/5'}`}
                style={({ isActive }) => isActive ? { background: 'rgba(0,212,240,0.12)', borderLeft: '3px solid #00D4F0' } : {}}
              >
                <PillarDot status={status} />
                <span className="flex-1 text-[14px]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: status !== 'pending' ? 700 : 400 }}>
                  {String.fromCharCode(65 + i)}. {pillar.label}
                </span>
              </NavLink>
            )
          })}

          {/* Outputs section */}
          <div className="px-4 pt-5 pb-2">
            <p className="text-[#4a7099] text-[11px] font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Outputs</p>
          </div>

          {[
            { path: '/dashboard',  label: 'Live Dashboard',  Icon: Activity      },
            { path: '/redflags',   label: 'Red Flags',       Icon: AlertTriangle },
            { path: '/financial',  label: 'Financial Model', Icon: LineChart     },
            { path: '/synthesis',  label: 'Synthesis',       Icon: Layers        },
            { path: '/report',     label: 'Report Export',   Icon: FileText      },
          ].map(({ path, label, Icon }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive ? 'text-white' : 'text-[#7aa3c8] hover:text-white hover:bg-white/5'}`}
              style={({ isActive }) => isActive ? { background: 'rgba(0,212,240,0.12)', borderLeft: '3px solid #00D4F0' } : {}}
            >
              {({ isActive }) => (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? 'rgba(0,212,240,0.15)' : 'rgba(255,255,255,0.06)' }}>
                    <Icon size={15} color={isActive ? '#00D4F0' : 'rgba(255,255,255,0.45)'} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-[14px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout — always visible at bottom */}
        <div className="flex-shrink-0 px-3 pt-3 pb-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #00D4F0 0%, #006578 100%)' }}>
              {(useDealStore.getState().user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {useDealStore.getState().user?.name || 'Deal Lead'}
              </p>
              <p className="text-[#4a7099] text-[11px] truncate">
                {useDealStore.getState().user?.role || 'Analyst'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#4a7099] hover:text-white hover:bg-white/5 transition-all text-sm mt-0.5 cursor-pointer"
          >
            <LogOut size={15} strokeWidth={2} />
            <span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Sign out</span>
          </button>
        </div>

      </div>
    </aside>
  )
}
