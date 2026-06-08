import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'

export default function ClientOrderSelector({ onClientChange, onOrderChange }) {
  const [clients, setClients]               = useState([])
  const [query, setQuery]                   = useState('')
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [orders, setOrders]                 = useState([])
  const [selectedOrder, setSelectedOrder]   = useState(null)

  const wrapRef = useRef(null)

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
    onClientChange(client.id)
    onOrderChange(null)
  }

  function clearClient() {
    setSelectedClient(null)
    setQuery('')
    setOrders([])
    setSelectedOrder(null)
    onClientChange(null)
    onOrderChange(null)
  }

  function pickOrder(order) {
    setSelectedOrder(order)
    onOrderChange(order.id)
  }

  return (
    <div className="client-order-selector">
      <div className="selector-section-title">
        <span className="sidebar-title-bar" />
        Client &amp; Order
      </div>

      {/* Client combobox */}
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

      {/* Order selector */}
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

      {/* Active save badge */}
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
