import React, { useEffect, useState } from 'react'
import { api } from '../api'

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function ClientCard({ client, onOrderAdded }) {
  const [orders, setOrders]     = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading]   = useState(false)

  const [addName, setAddName]   = useState('')
  const [addBusy, setAddBusy]   = useState(false)
  const [addOk, setAddOk]       = useState(false)
  const [addErr, setAddErr]     = useState(null)

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

  async function handleAddOrder(e) {
    e.preventDefault()
    const name = addName.trim()
    if (!name) return
    setAddBusy(true); setAddErr(null); setAddOk(false)
    try {
      const newOrder = await api.createOrder(client.id, name)
      setAddName('')
      setOrders((prev) => [...(prev ?? []), newOrder])
      setAddOk(true)
      onOrderAdded?.()
      setTimeout(() => setAddOk(false), 2500)
    } catch (err) { setAddErr(err.message) }
    finally { setAddBusy(false) }
  }

  const initial = (client.name || '?').charAt(0).toUpperCase()

  return (
    <div className="cov-card">
      <div className="cov-card-header" onClick={toggle}>
        <div className="cov-avatar">{initial}</div>
        <div className="cov-client-info">
          <div className="cov-client-name">{client.name}</div>
          <div className="cov-client-meta">Created {fmtDate(client.created_at)}</div>
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
          {loading && <div className="cov-empty">Loading orders…</div>}

          {!loading && orders?.length === 0 && (
            <div className="cov-empty">No orders yet. Create one below.</div>
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

          {!loading && (
            <form className="cov-add-order-row" onSubmit={handleAddOrder}>
              <input
                className="cov-add-input"
                type="text"
                placeholder="New order name…"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                disabled={addBusy}
                maxLength={200}
              />
              <button
                className="cov-add-btn"
                type="submit"
                disabled={addBusy || !addName.trim()}
              >
                {addBusy ? '…' : '+ Add Order'}
              </button>
            </form>
          )}
          {addOk  && <div className="cov-add-ok">✓ Order added.</div>}
          {addErr && <div className="cov-add-err">{addErr}</div>}
        </div>
      )}
    </div>
  )
}

export default function ClientOrderView() {
  const [clients, setClients]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [totalOrders, setTotalOrders] = useState(0)
  const [search, setSearch]           = useState('')

  async function loadClients() {
    const cs = await api.getClients().catch(() => [])
    setClients(cs)
    let total = 0
    await Promise.all(cs.map(async (c) => {
      const os = await api.getOrders(c.id).catch(() => [])
      total += os.length
    }))
    setTotalOrders(total)
  }

  useEffect(() => {
    loadClients()
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients?.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="com-page">

      {/* Page header */}
      <div className="com-page-header">
        <div className="com-page-title-wrap">
          
          <div>
            <div className="com-page-title">Clients &amp; Orders</div>
            <div className="com-page-sub">Browse all clients and their associated orders</div>
          </div>
        </div>
        <div className="com-stats-row">
          <div className="com-stat">
            <span className="com-stat-val">{clients?.length ?? '…'}</span>
            <span className="com-stat-label">Clients</span>
          </div>
          <div className="com-stat-divider" />
          <div className="com-stat">
            <span className="com-stat-val">{totalOrders > 0 ? totalOrders : '…'}</span>
            <span className="com-stat-label">Orders</span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {!loading && !error && (clients?.length ?? 0) > 0 && (
        <div className="cov-toolbar">
          <input
            className="cov-search"
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="cov-count">
            {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Loading / error / empty states */}
      {loading && (
        <div className="history-state">
          <div className="history-spinner" />
          <span>Loading clients…</span>
        </div>
      )}
      {error && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>⚠ {error}</div>
      )}
      {!loading && !error && (clients?.length ?? 0) === 0 && (
        <div className="history-state">
          <span className="history-empty-icon">👤</span>
          <span>No clients yet. Go to "Create" to add one.</span>
        </div>
      )}
      {!loading && !error && (clients?.length ?? 0) > 0 && filtered.length === 0 && (
        <div className="history-state">
          
          <span>No clients match "{search}".</span>
        </div>
      )}

      {/* Client cards */}
      {!loading && !error && filtered.length > 0 && (
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
  )
}
