import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

function nextOrderNumber(orders) {
  if (!orders || orders.length === 0) return 'ORDER-001'
  const nums = orders.map((o) => {
    const m = o.name.match(/(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  return `ORDER-${String(Math.max(...nums, 0) + 1).padStart(3, '0')}`
}

export default function ClientOrderSelector({ onClientChange, onOrderChange }) {
  const [clients, setClients]               = useState([])
  const [query, setQuery]                   = useState('')
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [orders, setOrders]                 = useState([])
  const [selectedOrder, setSelectedOrder]   = useState(null)
  const wrapRef = useRef(null)

  // create client inline
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [clientBusy, setClientBusy]       = useState(false)
  const [clientErr, setClientErr]         = useState(null)

  // create order inline
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [newOrderName, setNewOrderName] = useState('')
  const [newOrderDate, setNewOrderDate] = useState('')
  const [orderBusy, setOrderBusy]       = useState(false)
  const [orderErr, setOrderErr]         = useState(null)

  useEffect(() => {
    api.getClients().then(setClients).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedClient) { setOrders([]); return }
    api.getOrders(selectedClient.id).then(setOrders).catch(() => {})
  }, [selectedClient])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  function pickClient(client) {
    setSelectedClient(client)
    setQuery(client.name)
    setDropdownOpen(false)
    setSelectedOrder(null)
    setShowNewClient(false)
    setClientErr(null)
    onClientChange(client.id, client.name)
    onOrderChange(null, null)
  }

  function clearClient() {
    setSelectedClient(null)
    setQuery('')
    setOrders([])
    setSelectedOrder(null)
    setShowNewClient(false)
    setClientErr(null)
    onClientChange(null, null)
    onOrderChange(null, null)
  }

  function pickOrder(order) {
    setSelectedOrder(order)
    onOrderChange(order.id, order.name)
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    const name = newClientName.trim()
    if (!name) return
    setClientBusy(true)
    setClientErr(null)
    try {
      const created = await api.createClient({ name })
      const updated = await api.getClients()
      setClients(updated)
      setNewClientName('')
      pickClient(created)
    } catch (err) {
      setClientErr(err.message)
    } finally {
      setClientBusy(false)
    }
  }

  function openNewOrder() {
    setNewOrderName(nextOrderNumber(orders))
    setNewOrderDate(new Date().toISOString().split('T')[0])
    setOrderErr(null)
    setShowNewOrder(true)
  }

  function cancelNewOrder() {
    setShowNewOrder(false)
    setNewOrderName('')
    setNewOrderDate('')
    setOrderErr(null)
  }

  async function handleCreateOrder(e) {
    e.preventDefault()
    if (!selectedClient) return
    const name = newOrderName.trim() || nextOrderNumber(orders)
    setOrderBusy(true)
    setOrderErr(null)
    try {
      const created = await api.createOrder(selectedClient.id, name, newOrderDate || null)
      const updated = await api.getOrders(selectedClient.id)
      setOrders(updated)
      cancelNewOrder()
      pickOrder(created)
    } catch (err) {
      setOrderErr(err.message)
    } finally {
      setOrderBusy(false)
    }
  }

  return (
    <div className="client-order-selector">
      <div className="selector-section-title">
        <span className="sidebar-title-bar" />
        Client &amp; Order
      </div>

      {/* ── Client combobox ── */}
      <div className="field" ref={wrapRef} style={{ position: 'relative' }}>
        <label className="field-label">◉ Client</label>
        <div className="combobox-row">
          <input
            className="combobox-input"
            type="text"
            placeholder="Search clients…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setDropdownOpen(true)
              if (selectedClient) {
                setSelectedClient(null)
                setOrders([])
                setSelectedOrder(null)
                onClientChange(null)
                onOrderChange(null)
              }
            }}
            onFocus={() => setDropdownOpen(true)}
            autoComplete="off"
          />
          {selectedClient && (
            <button className="combobox-clear" onClick={clearClient} title="Clear">✕</button>
          )}
        </div>

        {dropdownOpen && filteredClients.length > 0 && (
          <div className="combobox-dropdown">
            {filteredClients.map((c) => (
              <button key={c.id} className="combobox-option" onMouseDown={() => pickClient(c)}>
                <span className="option-icon">◉</span> {c.name}
              </button>
            ))}
          </div>
        )}

        {dropdownOpen && query.trim() && filteredClients.length === 0 && (
          <div className="combobox-dropdown">
            <div className="combobox-option" style={{ cursor: 'default', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              No clients found
            </div>
          </div>
        )}
      </div>

      {/* ── New Client inline form ── */}
      {!selectedClient && (
        <div style={{ marginTop: 8 }}>
          {!showNewClient ? (
            <button
              className="cos-action-btn"
              onClick={() => { setShowNewClient(true); setClientErr(null) }}
            >
              + New Client
            </button>
          ) : (
            <form className="cos-inline-form" onSubmit={handleCreateClient}>
              <input
                className="cos-inline-input"
                type="text"
                placeholder="Client name…"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                disabled={clientBusy}
                autoFocus
                maxLength={120}
              />
              <div className="cos-inline-actions">
                <button
                  className="cos-inline-btn cos-inline-btn--primary"
                  type="submit"
                  disabled={clientBusy || !newClientName.trim()}
                >
                  {clientBusy ? '…' : 'Create'}
                </button>
                <button
                  className="cos-inline-btn"
                  type="button"
                  onClick={() => { setShowNewClient(false); setNewClientName(''); setClientErr(null) }}
                  disabled={clientBusy}
                >
                  Cancel
                </button>
              </div>
              {clientErr && <div className="cos-inline-err">{clientErr}</div>}
            </form>
          )}
        </div>
      )}

      {/* ── Order selector ── */}
      {selectedClient && (
        <div className="field order-section">
          <label className="field-label">◈ Order</label>
          {orders.length === 0 ? (
            <div className="no-order-note">No orders for this client yet.</div>
          ) : (
            <select
              value={selectedOrder?.id ?? ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10)
                const o = orders.find((x) => x.id === id)
                if (o) pickOrder(o)
              }}
            >
              <option value="">— Select an order —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── New Order inline form ── */}
      {selectedClient && (
        <div style={{ marginTop: 8 }}>
          {!showNewOrder ? (
            <button className="cos-action-btn" onClick={openNewOrder}>
              + New Order
            </button>
          ) : (
            <form className="cos-order-form" onSubmit={handleCreateOrder}>
              <div className="cos-order-form-header">New Order</div>
              <div className="cos-order-fields">
                <div className="cos-order-field">
                  <label className="cos-order-label">Order Name</label>
                  <input
                    className="cos-inline-input"
                    type="text"
                    value={newOrderName}
                    onChange={(e) => setNewOrderName(e.target.value)}
                    disabled={orderBusy}
                    autoFocus
                    maxLength={200}
                  />
                </div>
                <div className="cos-order-field">
                  <label className="cos-order-label">Date <span style={{ opacity: 0.55 }}>(optional)</span></label>
                  <input
                    className="cos-inline-input"
                    type="date"
                    value={newOrderDate}
                    onChange={(e) => setNewOrderDate(e.target.value)}
                    disabled={orderBusy}
                  />
                </div>
              </div>
              {orderErr && <div className="cos-inline-err">{orderErr}</div>}
              <div className="cos-inline-actions">
                <button
                  className="cos-inline-btn cos-inline-btn--primary"
                  type="submit"
                  disabled={orderBusy || !newOrderName.trim()}
                >
                  {orderBusy ? '…' : 'Create Order'}
                </button>
                <button
                  className="cos-inline-btn"
                  type="button"
                  onClick={cancelNewOrder}
                  disabled={orderBusy}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Active save badge ── */}
      {selectedOrder && (
        <div className="active-order-badge">
          <span className="badge-dot" />
          <span>
            Saving to&nbsp;<strong>{selectedClient.name}</strong>
            &nbsp;/&nbsp;<strong>{selectedOrder.name}</strong>
          </span>
        </div>
      )}

      {selectedClient && !selectedOrder && orders.length > 0 && (
        <div className="no-order-note">Select an order to save calculations.</div>
      )}

      <div className="field-divider" style={{ marginTop: '1rem' }} />
    </div>
  )
}
