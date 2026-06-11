const BASE = import.meta.env.VITE_API_BASE || ''

function getToken() { return localStorage.getItem('cp_token') }
export function setToken(t) { t ? localStorage.setItem('cp_token', t) : localStorage.removeItem('cp_token') }

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    const msg = Array.isArray(detail.detail)
      ? detail.detail.map(e => e.msg).join(', ')
      : detail.detail || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe:  () => request('/api/auth/me'),

  // User management (admin only)
  getUsers:   () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  // Substrates
  getSubstrates: () => request('/api/substrates'),
  createSubstrate: (name, price) =>
    request('/api/substrates', { method: 'POST', body: JSON.stringify({ name, price }) }),
  updateSubstrate: (id, name, price) =>
    request(`/api/substrates/${id}`, { method: 'PATCH', body: JSON.stringify({ name, price }) }),
  deleteSubstrate: (id) => request(`/api/substrates/${id}`, { method: 'DELETE' }),
  setSubstrateAvailability: (id, available) =>
    request(`/api/substrates/${id}/availability`, {
      method: 'PATCH', body: JSON.stringify({ available }),
    }),

  // Teeth / Cylinders
  getTeeth: () => request('/api/teeth'),
  createTooth: (teeth, paper_size) =>
    request('/api/teeth', { method: 'POST', body: JSON.stringify({ teeth, paper_size }) }),
  updateTooth: (id, teeth, paper_size) =>
    request(`/api/teeth/${id}`, { method: 'PATCH', body: JSON.stringify({ teeth, paper_size }) }),
  deleteTooth: (id) => request(`/api/teeth/${id}`, { method: 'DELETE' }),
  setCylinderAvailability: (id, available) =>
    request(`/api/teeth/${id}/availability`, {
      method: 'PATCH', body: JSON.stringify({ available }),
    }),

  // Clients
  getClients: () => request('/api/clients'),
  createClient: (fields) =>
    request('/api/clients', { method: 'POST', body: JSON.stringify(fields) }),
  updateClient: (id, fields) =>
    request(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }),

  // Orders
  getOrders: (clientId) => request(`/api/clients/${clientId}/orders`),
  createOrder: (clientId, name, orderDate) =>
    request(`/api/clients/${clientId}/orders`, {
      method: 'POST',
      body: JSON.stringify({ name, order_date: orderDate || null }),
    }),
  getOrderCalculations: (orderId) => request(`/api/orders/${orderId}/calculations`),

  // Calculations
  calculate: (payload) =>
    request('/api/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  getHistory: () => request('/api/calculations'),
  getCalculation: (id) => request(`/api/calculations/${id}`),
  getVersions: (calcId) => request(`/api/calculations/${calcId}/versions`),
  createVersion: (calcId, payload) =>
    request(`/api/calculations/${calcId}/versions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateVersionStatus: (versionId, status) =>
    request(`/api/calculations/versions/${versionId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }),
  updateQuoteStatus: (id, status) =>
    request(`/api/calculations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateSelectedCylinder: (id, selectedTeeth) =>
    request(`/api/calculations/${id}/cylinder`, {
      method: 'PATCH',
      body: JSON.stringify({ selected_teeth: selectedTeeth }),
    }),
}
