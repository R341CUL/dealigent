export const PILLARS = [
  { id: 'commercial',   label: 'Commercial',   icon: 'TrendingUp',  color: '#006578' },
  { id: 'financial',    label: 'Financial',    icon: 'DollarSign',  color: '#175ead' },
  { id: 'operational',  label: 'Operational',  icon: 'Settings',    color: '#00D4F0' },
  { id: 'legal',        label: 'Legal',        icon: 'Scale',       color: '#7c3aed' },
  { id: 'technology',   label: 'Technology',   icon: 'Cpu',         color: '#059669' },
  { id: 'management',   label: 'Management',   icon: 'Users',       color: '#dc6b19' },
]

export const DEMO_DEAL = {
  id: 'deal_personio_001',
  targetCompany: 'Personio GmbH',
  acquirer: 'Workday Inc.',
  dealType: 'Strategic Acquisition',
  dealValue: '€1.8B',
  currency: 'EUR',
  location: 'Munich, Germany',
  sector: 'HR SaaS / Enterprise Software',
  revenue2023: 95,
  revenue2024est: 142,
  employees: 1800,
  founded: 2015,
  pillarScores: {
    commercial: 84,
    financial: 71,
    operational: 88,
    legal: 76,
    technology: 79,
    management: 65,
  },
  overallScore: 77,
  verdict: 'CONDITIONAL',
  createdAt: '2024-03-15',
}

export const VERDICT_CONFIG = {
  PROCEED:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Proceed' },
  CONDITIONAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Conditional' },
  ABORT:       { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Abort' },
}

export const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Live Dashboard',     icon: 'Activity' },
  { path: '/pillar',     label: 'Pillar Analysis',    icon: 'BarChart2' },
  { path: '/redflags',   label: 'Red Flags',          icon: 'AlertTriangle' },
  { path: '/financial',  label: 'Financial Model',    icon: 'LineChart' },
  { path: '/synthesis',  label: 'Synthesis',          icon: 'Layers' },
  { path: '/report',     label: 'Report Export',      icon: 'FileText' },
]
