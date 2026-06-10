import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDealStore = create(
  persist(
    (set) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      login:  (user) => set({ isAuthenticated: true, user }),
      logout: () => set({ isAuthenticated: false, user: null, activeDeal: null, agentStatus: {}, agentOutputs: {}, executionPhase: 'idle', overallScore: null, verdict: null, redFlags: [], pillarResults: {} }),

      // Active deal
      activeDeal: null,
      setActiveDeal: (deal) => set({ activeDeal: deal }),

      // Agent execution
      agentStatus: {},
      agentOutputs: {},
      executionPhase: 'idle',
      overallScore: null,
      verdict: null,

      setAgentStatus: (pillar, status) =>
        set((s) => ({ agentStatus: { ...s.agentStatus, [pillar]: status } })),

      appendAgentOutput: (pillar, chunk) =>
        set((s) => ({ agentOutputs: { ...s.agentOutputs, [pillar]: (s.agentOutputs[pillar] || '') + chunk } })),

      setExecutionPhase: (phase) => set({ executionPhase: phase }),
      setVerdict: (score, verdict) => set({ overallScore: score, verdict }),

      resetExecution: () =>
        set({ agentStatus: {}, agentOutputs: {}, executionPhase: 'idle', overallScore: null, verdict: null,
              pillarResults: {}, pillarDeepDive: {}, redFlags: [], realFinancials: null, realValuation: null,
              criticReview: null, criticStatus: 'idle' }),

      // Red flags & pillar results
      redFlags: [],
      setRedFlags: (flags) => set({ redFlags: flags }),

      pillarResults: {},
      setPillarResult: (pillar, result) =>
        set((s) => ({ pillarResults: { ...s.pillarResults, [pillar]: result } })),

      // Wizard draft — persists across navigation
      wizardDraft: null,
      setWizardDraft: (draft) => set({ wizardDraft: draft }),
      clearWizardDraft: () => set({ wizardDraft: null }),

      // Pillar deep dive data (rich sections per pillar)
      pillarDeepDive: {},
      setPillarDeepDive: (pillar, data) =>
        set((s) => ({ pillarDeepDive: { ...s.pillarDeepDive, [pillar]: data } })),
      deepDiveLoading: {},
      setDeepDiveLoading: (pillar, loading) =>
        set((s) => ({ deepDiveLoading: { ...s.deepDiveLoading, [pillar]: loading } })),

      // Real Yahoo Finance financials (fetched live on Financial page)
      realFinancials: null,
      realValuation: null,
      setRealFinancials: (fin, val) => set({ realFinancials: fin, realValuation: val }),

      // Critic / QA review (supervisory agent output)
      criticReview: null,
      criticStatus: 'idle', // idle | running | complete
      setCriticStatus: (s) => set({ criticStatus: s }),
      setCriticReview: (review) => set({ criticReview: review, criticStatus: 'complete' }),
    }),
    {
      name: 'dealigent-store',
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        user:            s.user,
        activeDeal:      s.activeDeal,
        executionPhase:  s.executionPhase,
        overallScore:    s.overallScore,
        verdict:         s.verdict,
        agentStatus:     s.agentStatus,
        pillarResults:   s.pillarResults,
        redFlags:        s.redFlags,
        wizardDraft:     s.wizardDraft,
        pillarDeepDive:  s.pillarDeepDive,
      }),
    }
  )
)
