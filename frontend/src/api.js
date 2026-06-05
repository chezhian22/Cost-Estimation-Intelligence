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
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Substrates
  getSubstrates: () => request('/api/substrates'),
  createSubstrate: (name, price) =>
    request('/api/substrates', { method: 'POST', body: JSON.stringify({ name, price }) }),
  deleteSubstrate: (id) => request(`/api/substrates/${id}`, { method: 'DELETE' }),

  // Teeth / Cylinders
  getTeeth: () => request('/api/teeth'),
  createTooth: (teeth, paper_size) =>
    request('/api/teeth', { method: 'POST', body: JSON.stringify({ teeth, paper_size }) }),
  deleteTooth: (id) => request(`/api/teeth/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => request('/api/clients'),
  createClient: (name) =>
    request('/api/clients', { method: 'POST', body: JSON.stringify({ name }) }),

  // Orders
  getOrders: (clientId) => request(`/api/clients/${clientId}/orders`),
  createOrder: (clientId, name) =>
    request(`/api/clients/${clientId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getOrderCalculations: (orderId) => request(`/api/orders/${orderId}/calculations`),

  // Calculations
  calculate: (payload) =>
    request('/api/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  getHistory: () => request('/api/calculations'),
  getCalculation: (id) => request(`/api/calculations/${id}`),
  updateQuoteStatus: (id, status) =>
    request(`/api/calculations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}
