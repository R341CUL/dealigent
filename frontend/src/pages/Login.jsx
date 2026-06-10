import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useDealStore } from '../store/dealStore'

const DEMO_CREDS = { email: 'anish@dealigent.ai', password: 'demo2024' }

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useDealStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    await new Promise((r) => setTimeout(r, 900))

    if (email === DEMO_CREDS.email && password === DEMO_CREDS.password) {
      login({ name: 'Anish Chatterjee', email, role: 'Deal Lead' })
      navigate('/dashboard')
    } else {
      setError('Invalid credentials. Use the demo credentials below.')
    }
    setLoading(false)
  }

  const fillDemo = () => {
    setEmail(DEMO_CREDS.email)
    setPassword(DEMO_CREDS.password)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#f6fafc] flex overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00D4F0 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-48 -right-48 w-[700px] h-[700px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #003d79 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 left-1/2 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #175ead 0%, transparent 70%)' }}
        />
      </div>

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[55%] sidebar-gradient flex-col justify-between p-14 relative overflow-hidden"
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4F0] flex items-center justify-center teal-glow">
            <Zap size={20} className="text-[#001f26]" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-white font-display font-bold text-xl tracking-tight">Dealigent</span>
            <span className="block text-white/40 text-[11px] font-mono tracking-widest uppercase">AI Due Diligence Platform</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-white text-5xl font-display font-bold leading-[1.1] tracking-tight">
              M&A Due Diligence,<br />
              <span className="text-[#00D4F0]">Reimagined.</span>
            </h1>
            <p className="text-white/60 text-lg mt-4 leading-relaxed max-w-md">
              6 AI agents run in parallel across every deal pillar — delivering institutional-grade analysis in minutes, not weeks.
            </p>
          </motion.div>

          {/* Feature chips */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {[
              '6 Parallel AI Agents',
              'Real-time Streaming',
              'RAG-powered Citations',
              'Instant Report Export',
            ].map((feat) => (
              <span
                key={feat}
                className="px-3 py-1.5 rounded-full text-xs font-semibold font-display text-white/80"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {feat}
              </span>
            ))}
          </motion.div>

          {/* Live deal card preview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="glass-dark rounded-2xl p-5 max-w-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Demo Deal</p>
                <p className="text-white font-display font-semibold text-base">Personio GmbH</p>
                <p className="text-white/50 text-xs">Acquired by Workday Inc · €1.8B</p>
              </div>
              <span className="pill" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                Conditional
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Commercial', score: 84 },
                { label: 'Financial', score: 71 },
                { label: 'Technology', score: 79 },
              ].map(({ label, score }) => (
                <div key={label} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[#00D4F0] font-display font-bold text-lg">{score}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs font-mono">© 2024 Dealigent · Powered by LangGraph + Groq</p>
        </div>
      </motion.div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#00D4F0] flex items-center justify-center">
              <Zap size={16} className="text-[#001f26]" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl text-[#001f26] tracking-tight">Dealigent</span>
          </div>

          <h2 className="font-display font-bold text-3xl text-[#001f26] tracking-tight mb-1">
            Welcome back
          </h2>
          <p className="text-[#64748b] text-sm mb-8">Sign in to your deal workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" strokeWidth={2} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@dealigent.ai"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    border: '1.5px solid rgba(0,101,120,0.15)',
                    boxShadow: '0 1px 4px rgba(0,101,120,0.06)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#00D4F0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" strokeWidth={2} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-[#1a2332] placeholder-[#94a3b8] outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    border: '1.5px solid rgba(0,101,120,0.15)',
                    boxShadow: '0 1px 4px rgba(0,101,120,0.06)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#00D4F0')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(0,101,120,0.15)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#006578] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[#ef4444]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <AlertCircle size={14} strokeWidth={2} />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold font-display text-white flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-70"
              style={{
                background: loading ? '#006578' : 'linear-gradient(135deg, #006578 0%, #00899e 100%)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(0,101,120,0.35)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo credentials helper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 rounded-xl cursor-pointer group transition-all"
            style={{ background: 'rgba(0,101,120,0.06)', border: '1px dashed rgba(0,101,120,0.2)' }}
            onClick={fillDemo}
          >
            <p className="text-xs font-semibold text-[#006578] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Zap size={11} strokeWidth={2.5} />
              Demo credentials — click to fill
            </p>
            <p className="text-xs text-[#64748b] font-mono">anish@dealigent.ai · demo2024</p>
          </motion.div>

          <p className="text-center text-[#94a3b8] text-xs mt-8">
            Dealigent v1.0 · AI-powered M&A due diligence
          </p>
        </motion.div>
      </div>
    </div>
  )
}
