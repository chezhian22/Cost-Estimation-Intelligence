import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../api'

const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   cls: 'status-pending'   },
  confirmed: { label: 'Confirmed', cls: 'status-confirmed' },
  rejected:  { label: 'Rejected',  cls: 'status-rejected'  },
}

function StatusBadge({ calcId, initial }) {
  const [status, setStatus] = useState(initial || 'pending')
  const [saving, setSaving] = useState(false)
  const [open, setOpen]     = useState(false)

  async function choose(next) {
    setOpen(false)
    if (next === status) return
    setSaving(true)
    try {
      await api.updateQuoteStatus(calcId, next)
      setStatus(next)
    } catch { /* keep current on error */ }
    finally { setSaving(false) }
  }

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <div className="status-wrap">
      <button
        className={`status-badge ${cfg.cls}${saving ? ' status-saving' : ''}`}
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        title="Click to change status"
      >
        {saving ? '…' : cfg.label}
        <span className="status-caret">▾</span>
      </button>
      {open && (
        <div className="status-dropdown">
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <button
              key={key}
              className={`status-option ${c.cls}${status === key ? ' current' : ''}`}
              onClick={() => choose(key)}
            >
              {status === key && <span className="status-check">✓ </span>}
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function QuoteHistory() {
  const [quotes, setQuotes]               = useState(null)
  const [clients, setClients]             = useState([])
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError]                 = useState(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedOrder, setSelectedOrder]   = useState('')

  useEffect(() => {
    Promise.all([api.getHistory(), api.getClients()])
      .then(([qs, cs]) => { setQuotes(qs); setClients(cs) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // When client changes, fetch its orders and reset order selection
  useEffect(() => {
    setSelectedOrder('')
    setOrders([])
    if (!selectedClient) return
    setOrdersLoading(true)
    api.getOrders(Number(selectedClient))
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))
  }, [selectedClient])

  const filtered = useMemo(() => {
    if (!quotes) return []
    return quotes.filter((q) => {
      const matchClient = !selectedClient || q.client_id === Number(selectedClient)
      const matchOrder  = !selectedOrder  || q.order_id  === Number(selectedOrder)
      return matchClient && matchOrder
    })
  }, [quotes, selectedClient, selectedOrder])

  function clearFilters() {
    setSelectedClient('')
    setSelectedOrder('')
    setOrders([])
  }

  const hasFilters = selectedClient || selectedOrder

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">🕘</div>
        <span className="card-title">Quote History</span>
        <span className="card-number">SYS-05</span>
      </div>

      {loading && (
        <div className="history-state">
          <div className="history-spinner" />
          <span>Loading history…</span>
        </div>
      )}

      {error && (
        <div className="history-state error-banner" style={{ margin: '1.4rem' }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && quotes?.length === 0 && (
        <div className="history-state">
          <span className="history-empty-icon">📋</span>
          <span>No quotes saved yet. Run a calculation with a client and order to save it.</span>
        </div>
      )}

      {!loading && !error && quotes?.length > 0 && (
        <>
          {/* ── Cascading filter bar ── */}
          <div className="qh-filter-bar">

            {/* Step 1 — Client */}
            <div className="qh-filter-group">
              <label className="qh-filter-label">① Client</label>
              <select
                className="qh-filter-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2 — Order (only active after client is picked) */}
            <div className="qh-filter-group">
              <label className={`qh-filter-label${!selectedClient ? ' qh-filter-label--dim' : ''}`}>
                ② Order
              </label>
              <select
                className="qh-filter-select"
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                disabled={!selectedClient || ordersLoading}
              >
                <option value="">
                  {!selectedClient
                    ? 'Select a client first'
                    : ordersLoading
                    ? 'Loading…'
                    : 'All orders'}
                </option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button className="qh-filter-clear" onClick={clearFilters}>
                ✕ Clear
              </button>
            )}

            <span className="qh-filter-count">
              {filtered.length} / {quotes.length} quotes
            </span>
          </div>

          {/* ── Flat table ── */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Client</th>
                  <th style={{ textAlign: 'left' }}>Order</th>
                  <th>Size <span className="th-unit">mm</span></th>
                  <th>Yield%</th>
                  <th style={{ textAlign: 'left' }}>Substrate</th>
                  <th>₹ / 1000</th>
                  <th>$ / 1000</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: 'center',
                        padding: '2.5rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'Inter, sans-serif',
                        fontStyle: 'italic',
                      }}
                    >
                      No quotes match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((q, i) => (
                    <tr key={q.id ?? i}>
                      <td style={{ textAlign: 'left' }}>
                        {q.client_name ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'left', color: 'var(--text)', fontWeight: 500 }}>
                        {q.order_name ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td>{fmt(q.width, 1)} × {fmt(q.height, 1)}</td>
                      <td>{q.yield_pct != null ? `${q.yield_pct}%` : '—'}</td>
                      <td style={{ textAlign: 'left', color: 'var(--text)', fontWeight: 400 }}>
                        {q.substrate_name ?? 'Custom'}
                      </td>
                      <td>{fmt(q.pricing?.price_inr_1000)}</td>
                      <td>{fmt(q.pricing?.price_usd_1000, 3)}</td>
                      <td>
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td>
                        <StatusBadge calcId={q.id} initial={q.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
