const BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' })
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
  login:  (email, password) => request('/api/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: ()                 => request('/api/auth/logout', { method: 'POST' }),
  getMe:  ()                 => request('/api/auth/me'),

  // User management (admin only)
  getUsers:   () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify({ ...data, app_url: window.location.origin }) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: (id) => request(`/api/users/${id}/reset-password`, { method: 'POST' }),

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
  updateOrder: (orderId, name) =>
    request(`/api/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  getOrderCalculations: (orderId) => request(`/api/orders/${orderId}/calculations`),

  // Calculations
  calculate: (payload) =>
    request('/api/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  getHistory: () => request('/api/calculations'),
  getCalculation: (id) => request(`/api/calculations/${id}`),
  getVersions: (calcId) => request(`/api/calculations/${calcId}/versions`),
  createVersion: (calcId, payload) =>
    request(`/api/calculations/${calcId}/versions`, { method: 'POST', body: JSON.stringify(payload) }),
  updateVersionStatus: (versionId, status, remarks) =>
    request(`/api/calculations/versions/${versionId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status, remarks: remarks ?? null }),
    }),
  updateQuoteStatus: (id, status, remarks) =>
    request(`/api/calculations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks: remarks ?? null }),
    }),
  updateClientStatus: (id, status) =>
    request(`/api/calculations/${id}/client-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateVersionClientStatus: (id, status) =>
    request(`/api/calculations/versions/${id}/client-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateSelectedCylinder: (id, selectedTeeth) =>
    request(`/api/calculations/${id}/cylinder`, {
      method: 'PATCH',
      body: JSON.stringify({ selected_teeth: selectedTeeth }),
    }),

  // Company settings — public (any user) vs admin (SMTP included)
  getPublicSettings:  () => request('/api/settings/public'),
  getCompanySettings: () => request('/api/settings/company'),
  updateCompanySettings: (data) =>
    request('/api/settings/company', { method: 'PATCH', body: JSON.stringify(data) }),

  uploadCompanyLogo: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/api/settings/company/logo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      const msg = Array.isArray(detail.detail)
        ? detail.detail.map(e => e.msg).join(', ')
        : detail.detail || `Request failed: ${res.status}`
      throw new Error(msg)
    }
    return res.json()
  },

  deleteCompanyLogo: () => request('/api/settings/company/logo', { method: 'DELETE' }),

  sendInvoiceEmail: (calcId, toEmail, subject, body) =>
    request('/api/send-invoice-email', {
      method: 'POST',
      body: JSON.stringify({ calc_id: calcId, to_email: toEmail, subject, body }),
    }),

  getEmailLogs: () => request('/api/email-logs'),
  updateEmailLog: (id, status, remarks) =>
    request(`/api/email-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    }),

  changePassword: (email, oldPassword, newPassword) =>
    request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email, old_password: oldPassword, new_password: newPassword }),
    }),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  getUnreadCount: () => request('/api/notifications/unread-count'),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
  getAdminNotifications: () => request('/api/admin/notifications'),
  getMonitorInterval: () => request('/api/admin/notifications/monitor-interval'),
  setMonitorInterval: (seconds) => request('/api/admin/notifications/monitor-interval', { method: 'PATCH', body: JSON.stringify({ interval_seconds: seconds }) }),
}
