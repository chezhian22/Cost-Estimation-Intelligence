import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function ClientOrderSelector({ onClientChange, onOrderChange }) {
  const [clients, setClients]           = useState([])
  const [query, setQuery]               = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)

  const [orders, setOrders]               = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)

  const [savingClient, setSavingClient] = useState(false)
  const [savingOrder, setSavingOrder]   = useState(false)
  const [clientError, setClientError]   = useState(null)
  const [orderError, setOrderError]     = useState(null)

  const wrapRef = useRef(null)

  // Load client list on mount
  useEffect(() => {
    api.getClients().then(setClients).catch(() => {})
  }, [])

  // Load orders whenever client changes
  useEffect(() => {
    if (!selectedClient) { setOrders([]); return }
    api.getOrders(selectedClient.id).then(setOrders).catch(() => {})
  }, [selectedClient])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )
  const isNew = query.trim() &&
    !clients.some((c) => c.name.toLowerCase() === query.trim().toLowerCase())

  function pickClient(client) {
    setSelectedClient(client)
    setQuery(client.name)
    setDropdownOpen(false)
    setSelectedOrder(null)
    setClientError(null)
    onClientChange(client.id)
    onOrderChange(null)
  }

  async function handleCreateClient() {
    const name = query.trim()
    if (!name) return
    setSavingClient(true)
    setClientError(null)
    try {
      const c = await api.createClient(name)
      setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
      pickClient(c)
    } catch (e) {
      setClientError(e.message)
    } finally {
      setSavingClient(false)
    }
  }

  function clearClient() {
    setSelectedClient(null)
    setQuery('')
    setOrders([])
    setSelectedOrder(null)
    setClientError(null)
    setOrderError(null)
    onClientChange(null)
    onOrderChange(null)
  }

  function pickOrder(order) {
    setSelectedOrder(order)
    setOrderError(null)
    onOrderChange(order.id)
  }

  async function handleCreateOrder() {
    if (!selectedClient) return
    const name = `Order #${orders.length + 1}`
    setSavingOrder(true)
    setOrderError(null)
    try {
      const o = await api.createOrder(selectedClient.id, name)
      setOrders((prev) => [o, ...prev])
      pickOrder(o)
    } catch (e) {
      setOrderError(e.message)
    } finally {
      setSavingOrder(false)
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
            placeholder="Search or type new name…"
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
            <button className="combobox-clear" onClick={clearClient} title="Clear client">✕</button>
          )}
        </div>

        {dropdownOpen && (filteredClients.length > 0 || isNew) && (
          <div className="combobox-dropdown">
            {filteredClients.map((c) => (
              <button key={c.id} className="combobox-option" onMouseDown={() => pickClient(c)}>
                <span className="option-icon">◉</span> {c.name}
              </button>
            ))}
            {isNew && (
              <button
                className="combobox-option combobox-option--new"
                onMouseDown={handleCreateClient}
                disabled={savingClient}
              >
                <span className="option-icon">＋</span>
                {savingClient ? 'Creating…' : `Add "${query.trim()}"`}
              </button>
            )}
          </div>
        )}

        {clientError && <div className="selector-error">{clientError}</div>}
      </div>

      {/* ── Order selector ── */}
      {selectedClient && (
        <div className="field order-section">
          <label className="field-label">◈ Order</label>

          {orders.length > 0 && (
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

          <button
            className="new-order-btn"
            onClick={handleCreateOrder}
            disabled={savingOrder}
          >
            {savingOrder ? 'Creating…' : '＋ New Order'}
          </button>

          {orderError && <div className="selector-error">{orderError}</div>}
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

      {selectedClient && !selectedOrder && (
        <div className="no-order-note">
          Select or create an order to save calculations.
        </div>
      )}

      <div className="field-divider" style={{ marginTop: '1rem' }} />
    </div>
  )
}
