import { useCallback, useRef } from 'react'
import { useDealStore } from '../store/dealStore'

export function useAgentStream() {
  const {
    activeDeal, setAgentStatus, appendAgentOutput,
    setExecutionPhase, setVerdict, setPillarResult,
    setRedFlags, setCriticStatus, setCriticReview,
  } = useDealStore()
  const esRef = useRef(null)

  const start = useCallback(async () => {
    if (!activeDeal?.id) return
    if (esRef.current) esRef.current.close()

    setExecutionPhase('running')

    // Start execution on backend (fire and don't wait)
    try {
      await fetch(`/api/execute/${activeDeal.id}/run`, { method: 'POST' })
    } catch {
      // If backend unavailable, stream will use demo fallbacks
    }

    const es = new EventSource(`/api/execute/${activeDeal.id}/stream`)
    esRef.current = es

    es.addEventListener('agent_start', (e) => {
      const { pillar } = JSON.parse(e.data)
      setAgentStatus(pillar, 'running')
    })

    es.addEventListener('agent_chunk', (e) => {
      const { pillar, chunk } = JSON.parse(e.data)
      appendAgentOutput(pillar, chunk)
    })

    es.addEventListener('agent_complete', (e) => {
      const data = JSON.parse(e.data)
      setAgentStatus(data.pillar, 'complete')
      setPillarResult(data.pillar, data)
    })

    es.addEventListener('critic_start', () => {
      setCriticStatus('running')
    })

    es.addEventListener('critic_complete', (e) => {
      const { review } = JSON.parse(e.data)
      setCriticReview(review)
    })

    es.addEventListener('synthesis_complete', (e) => {
      const { overall_score, verdict, pillar_scores, red_flags_all } = JSON.parse(e.data)
      setVerdict(Math.round(overall_score), verdict)
      if (red_flags_all) setRedFlags(red_flags_all)
    })

    es.addEventListener('done', () => {
      setExecutionPhase('complete')
      es.close()
    })

    es.addEventListener('error', (e) => {
      setExecutionPhase('error')
      es.close()
    })

    es.onerror = () => {
      // If backend not running, fall back to demo mode
      setExecutionPhase('error')
      es.close()
    }
  }, [activeDeal])

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setExecutionPhase('idle')
  }, [])

  return { start, stop }
}
