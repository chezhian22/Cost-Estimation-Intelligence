// Thin API client for the FastAPI backend.
// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
// In production, set VITE_API_BASE to your backend origin.

const BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getSubstrates: () => request('/api/substrates'),
  getTeeth: () => request('/api/teeth'),
  calculate: (payload) =>
    request('/api/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHistory: () => request('/api/calculations'),
}
