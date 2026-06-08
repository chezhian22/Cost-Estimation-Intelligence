import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function CreateClientOrder() {
  const [clients, setClients]       = useState([])
  const [totalOrders, setTotalOrders] = useState(0)

  const [clientName, setClientName] = useState('')
  const [clientErr, setClientErr]   = useState(null)
  const [clientOk, setClientOk]     = useState(false)
  const [clientBusy, setClientBusy] = useState(false)

  const [orderClientId, setOrderClientId] = useState('')
  const [orderName, setOrderName]         = useState('')
  const [orderErr, setOrderErr]           = useState(null)
  const [orderOk, setOrderOk]             = useState(false)
  const [orderBusy, setOrderBusy]         = useState(false)

  async function loadAll() {
    const cs = await api.getClients().catch(() => [])
    setClients(cs)
    let total = 0
    await Promise.all(cs.map(async (c) => {
      const os = await api.getOrders(c.id).catch(() => [])
      total += os.length
    }))
    setTotalOrders(total)
  }

  useEffect(() => { loadAll() }, [])

  async function handleCreateClient(e) {
    e.preventDefault()
    const name = clientName.trim()
    if (!name) return
    setClientBusy(true); setClientErr(null); setClientOk(false)
    try {
      await api.createClient(name)
      setClientName('')
      setClientOk(true)
      loadAll()
      setTimeout(() => setClientOk(false), 3000)
    } catch (err) { setClientErr(err.message) }
    finally { setClientBusy(false) }
  }

  async function handleCreateOrder(e) {
    e.preventDefault()
    const name = orderName.trim()
    if (!orderClientId || !name) return
    setOrderBusy(true); setOrderErr(null); setOrderOk(false)
    try {
      await api.createOrder(Number(orderClientId), name)
      setOrderName('')
      setOrderOk(true)
      loadAll()
      setTimeout(() => setOrderOk(false), 3000)
    } catch (err) { setOrderErr(err.message) }
    finally { setOrderBusy(false) }
  }

  return (
    <div className="com-page">

      {/* ── Page header ── */}
      <div className="com-page-header">
        <div className="com-page-title-wrap">
          <div>
            <div className="com-page-title">Client &amp; Order Management</div>
            <div className="com-page-sub">Create and manage your clients and their orders</div>
          </div>
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

      {/* ── Two-column form area ── */}
      <div className="com-forms-grid">

        {/* Create Client */}
        <div className="com-form-card">
          <div className="com-form-card-header">
            <div>
              <div className="com-form-card-title">New Client</div>
              <div className="com-form-card-sub">Add a new client to the system</div>
            </div>
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
              <span className="com-hint">Must be unique. Up to 120 characters.</span>
            </div>

            {clientOk && (
              <div className="com-feedback com-feedback--ok">
                <span>✓</span> Client created successfully.
              </div>
            )}
            {clientErr && (
              <div className="com-feedback com-feedback--err">
                {clientErr}
              </div>
            )}

            <button
              className="com-btn"
              type="submit"
              disabled={clientBusy || !clientName.trim()}
            >
              {clientBusy
                ? <><span className="com-btn-spinner" /> Creating…</>
                : '+ Create Client'}
            </button>
          </form>
        </div>

        {/* Create Order */}
        <div className="com-form-card">
          <div className="com-form-card-header">
            
            <div>
              <div className="com-form-card-title">New Order</div>
              <div className="com-form-card-sub">Create an order under a client</div>
            </div>
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
                  {clients.length === 0 ? 'No clients — create one first' : '— Select a client —'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="com-field">
              <label className={`com-label${!orderClientId ? ' com-label--dim' : ''}`}>Order Name</label>
              <input
                className="com-input"
                type="text"
                placeholder="e.g. Order #1 · Jan 2025 Batch"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                disabled={orderBusy || !orderClientId}
                maxLength={200}
              />
              <span className="com-hint">A descriptive label for this batch of quotes.</span>
            </div>

            {orderOk && (
              <div className="com-feedback com-feedback--ok">
                <span>✓</span> Order created successfully.
              </div>
            )}
            {orderErr && (
              <div className="com-feedback com-feedback--err">
               {orderErr}
              </div>
            )}

            <button
              className="com-btn"
              type="submit"
              disabled={orderBusy || !orderClientId || !orderName.trim()}
            >
              {orderBusy
                ? <><span className="com-btn-spinner" /> Creating…</>
                : '+ Create Order'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
