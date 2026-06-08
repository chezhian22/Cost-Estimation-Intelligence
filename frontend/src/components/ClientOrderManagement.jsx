import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../api'

function nextOrderNumber(orders) {
  if (!orders || orders.length === 0) return 'ORDER-001'
  const nums = orders.map((o) => {
    const m = o.name.match(/(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  const max = Math.max(...nums, 0)
  return `ORDER-${String(max + 1).padStart(3, '0')}`
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function ClientCard({ client, onOrderAdded }) {
  const [orders, setOrders]   = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggle() {
    if (!expanded && orders === null) {
      setLoading(true)
      api.getOrders(client.id)
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false))
    }
    setExpanded((v) => !v)
  }

  const initial = (client.name || '?').charAt(0).toUpperCase()

  return (
    <div className="cov-card">
      <div className="cov-card-header" onClick={toggle}>
        <div className="cov-avatar">{initial}</div>
        <div className="cov-client-info">
          <div className="cov-client-name">{client.name}</div>
          <div className="cov-client-meta">Added {fmtDate(client.created_at)}</div>
        </div>
        {orders !== null && (
          <span className="cov-order-count">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </span>
        )}
        <span className={`cov-chevron${expanded ? ' open' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="cov-body">
          {loading && <div className="cov-empty">Loading…</div>}

          {!loading && orders?.length === 0 && (
            <div className="cov-empty">No orders yet for this client.</div>
          )}

          {!loading && orders && orders.length > 0 && (
            <ul className="cov-orders-list">
              {orders.map((o) => (
                <li key={o.id} className="cov-order-item">
                  <span className="cov-order-item-name">{o.name}</span>
                  <span className="cov-order-item-date">{fmtDate(o.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClientOrderManagement() {
  const [clients, setClients]         = useState([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [search, setSearch]           = useState('')

  // Create client state
  const [clientName, setClientName] = useState('')
  const [clientBusy, setClientBusy] = useState(false)
  const [clientOk, setClientOk]     = useState(false)
  const [clientErr, setClientErr]   = useState(null)

  // Create order state
  const [orderClientId, setOrderClientId]   = useState('')
  const [orderClientOrders, setOrderClientOrders] = useState([])
  const [orderDate, setOrderDate]           = useState('')
  const [orderBusy, setOrderBusy]           = useState(false)
  const [orderOk, setOrderOk]               = useState(false)
  const [orderErr, setOrderErr]             = useState(null)

  const loadAll = useCallback(async () => {
    const cs = await api.getClients().catch(() => [])
    setClients(cs)
    let total = 0
    await Promise.all(cs.map(async (c) => {
      const os = await api.getOrders(c.id).catch(() => [])
      total += os.length
    }))
    setTotalOrders(total)
  }, [])

  useEffect(() => {
    loadAll().finally(() => setPageLoading(false))
  }, [loadAll])

  useEffect(() => {
    setOrderClientOrders([])
    if (!orderClientId) return
    api.getOrders(Number(orderClientId)).then(setOrderClientOrders).catch(() => setOrderClientOrders([]))
  }, [orderClientId])

  const autoOrderNum = useMemo(() => nextOrderNumber(orderClientOrders), [orderClientOrders])

  async function handleCreateClient(e) {
    e.preventDefault()
    const name = clientName.trim()
    if (!name) return
    setClientBusy(true); setClientErr(null); setClientOk(false)
    try {
      await api.createClient(name)
      setClientName('')
      setClientOk(true)
      await loadAll()
      setTimeout(() => setClientOk(false), 3000)
    } catch (err) { setClientErr(err.message) }
    finally { setClientBusy(false) }
  }

  async function handleCreateOrder(e) {
    e.preventDefault()
    if (!orderClientId) return
    setOrderBusy(true); setOrderErr(null); setOrderOk(false)
    try {
      await api.createOrder(Number(orderClientId), autoOrderNum, orderDate || null)
      setOrderDate('')
      setOrderOk(true)
      await loadAll()
      // refresh the client's order list so the next auto-number advances
      const updated = await api.getOrders(Number(orderClientId)).catch(() => [])
      setOrderClientOrders(updated)
      setTimeout(() => setOrderOk(false), 3000)
    } catch (err) { setOrderErr(err.message) }
    finally { setOrderBusy(false) }
  }

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="com-page">

      {/* ── Page header ── */}
      <div className="com-page-header">
        <div>
          <div className="com-page-title">Client &amp; Order Management</div>
          <div className="com-page-sub">Create clients and orders, then browse them below</div>
        </div>
        <div className="com-stats-row">
          <div className="com-stat">
            <span className="com-stat-val">{clients.length}</span>
            <span className="com-stat-label">Clients</span>
          </div>
          <div className="com-stat-divider" />
          <div className="com-stat">
            <span className="com-stat-val">{totalOrders}</span>
            <span className="com-stat-label">Orders</span>
          </div>
        </div>
      </div>

      {/* ── Create forms ── */}
      <div className="com-forms-grid">

        {/* Create Client */}
        <div className="com-form-card">
          <div className="com-form-card-header">
            <div className="com-form-card-title">New Client</div>
            <div className="com-form-card-sub">Add a new client to the system</div>
          </div>
          <form className="com-form" onSubmit={handleCreateClient}>
            <div className="com-field">
              <label className="com-label">Client Name</label>
              <input
                className="com-input"
                type="text"
                placeholder="e.g. Kingfisher Breweries"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={clientBusy}
                maxLength={120}
              />
            </div>
            {clientOk  && <div className="com-feedback com-feedback--ok">Client created successfully.</div>}
            {clientErr && <div className="com-feedback com-feedback--err">{clientErr}</div>}
            <button className="com-btn" type="submit" disabled={clientBusy || !clientName.trim()}>
              {clientBusy ? <><span className="com-btn-spinner" /> Creating…</> : '+ Create Client'}
            </button>
          </form>
        </div>

        {/* Create Order */}
        <div className="com-form-card">
          <div className="com-form-card-header">
            <div className="com-form-card-title">New Order</div>
            <div className="com-form-card-sub">Create an order under a client</div>
          </div>
          <form className="com-form" onSubmit={handleCreateOrder}>
            <div className="com-field">
              <label className="com-label">Client</label>
              <select
                className="com-select"
                value={orderClientId}
                onChange={(e) => setOrderClientId(e.target.value)}
                disabled={orderBusy || clients.length === 0}
              >
                <option value="">
                  {clients.length === 0 ? 'No clients yet' : '— Select client —'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="com-field-row">
              <div className="com-field">
                <label className={`com-label${!orderClientId ? ' com-label--dim' : ''}`}>Order Number</label>
                <div className={`com-auto-num${!orderClientId ? ' com-auto-num--dim' : ''}`}>
                  {orderClientId ? autoOrderNum : '—'}
                </div>
              </div>
              <div className="com-field">
                <label className={`com-label${!orderClientId ? ' com-label--dim' : ''}`}>Date</label>
                <input
                  className="com-input com-input--date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={orderBusy || !orderClientId}
                />
              </div>
            </div>
            {orderOk  && <div className="com-feedback com-feedback--ok">Order created successfully.</div>}
            {orderErr && <div className="com-feedback com-feedback--err">{orderErr}</div>}
            <button
              className="com-btn"
              type="submit"
              disabled={orderBusy || !orderClientId}
            >
              {orderBusy ? <><span className="com-btn-spinner" /> Creating…</> : '+ Create Order'}
            </button>
          </form>
        </div>

      </div>

      {/* ── Clients & Orders list ── */}
      <div className="com-list-section">
        <div className="com-list-header">
          <div className="com-list-title">Clients &amp; Orders</div>
          {!pageLoading && clients.length > 0 && (
            <input
              className="cov-search"
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
          )}
        </div>

        {pageLoading && (
          <div className="history-state">
            <div className="history-spinner" />
            <span>Loading…</span>
          </div>
        )}

        {!pageLoading && clients.length === 0 && (
          <div className="history-state">
            <span>No clients yet. Create one above.</span>
          </div>
        )}

        {!pageLoading && clients.length > 0 && filtered.length === 0 && (
          <div className="history-state">
            <span>No clients match "{search}".</span>
          </div>
        )}

        {!pageLoading && filtered.length > 0 && (
          <div className="cov-cards">
            {filtered.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onOrderAdded={() => setTotalOrders((t) => t + 1)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
