// Route all relative /api and /stream calls to the hosted backend.
// In local dev the Vite proxy handles these; in production there is no proxy,
// so we prepend the deployed backend origin. Override with VITE_API_URL if needed.
const API_BASE = (import.meta.env.VITE_API_URL || 'https://dealigent-api.onrender.com').replace(/\/$/, '')

const needsBase = (u) => typeof u === 'string' && (u.startsWith('/api') || u.startsWith('/stream'))
const withBase = (u) => (needsBase(u) ? API_BASE + u : u)

// Only rewrite in the browser and only when not already served from the API origin.
if (typeof window !== 'undefined' && API_BASE) {
  const rawFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (typeof input === 'string') return rawFetch(withBase(input), init)
    if (input instanceof Request && needsBase(input.url)) {
      return rawFetch(new Request(API_BASE + input.url, input), init)
    }
    return rawFetch(input, init)
  }

  const RawES = window.EventSource
  if (RawES) {
    const PatchedES = function (url, config) {
      return new RawES(withBase(url), config)
    }
    PatchedES.prototype = RawES.prototype
    PatchedES.CONNECTING = RawES.CONNECTING
    PatchedES.OPEN = RawES.OPEN
    PatchedES.CLOSED = RawES.CLOSED
    window.EventSource = PatchedES
  }
}

export default API_BASE
