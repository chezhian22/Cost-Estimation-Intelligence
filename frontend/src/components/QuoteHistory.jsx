import React, { useEffect, useState } from 'react'
import { api } from '../api'

const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

function OrderCalcTable({ orderId, orderName }) {
  const [calcs, setCalcs] = useState(null)
  const [err, setErr]     = useState(null)

  useEffect(() => {
    api.getOrderCalculations(orderId)
      .then(setCalcs)
      .catch((e) => setErr(e.message))
  }, [orderId])

  if (err) return <div className="history-state error-banner" style={{ margin: '1rem' }}>⚠ {err}</div>
  if (!calcs) return <div className="history-state" style={{ padding: '1.5rem' }}><div className="history-spinner" /></div>
  if (calcs.length === 0) return (
    <div className="history-state" style={{ padding: '1.5rem', fontSize: '0.82rem' }}>
      No calculations saved under this order yet.
    </div>
  )

  return (
    <div className="table-wrapper order-calc-table">
      <table>
        <thead>
          <tr>
            <th>Size <span className="th-unit">mm</span></th>
            <th>Waste%</th>
            <th>Substrate</th>
            <th>Labels/m²</th>
            <th>₹ / 1000</th>
            <th>$ / 1000</th>
            <th>Saved</th>
          </tr>
        </thead>
        <tbody>
          {calcs.map((c, i) => (
            <tr key={c.id ?? i}>
              <td style={{ textAlign: 'left' }}>{fmt(c.width, 1)} × {fmt(c.height, 1)}</td>
              <td>{c.waste_pct != null ? `${c.waste_pct}%` : '—'}</td>
              <td style={{ textAlign: 'left' }}>{c.substrate_name ?? 'Custom'}</td>
              <td>{fmt(c.pricing?.adj_labels)}</td>
              <td>{fmt(c.pricing?.price_inr_1000)}</td>
              <td>{fmt(c.pricing?.price_usd_1000, 3)}</td>
              <td>
                {c.created_at
                  ? new Date(c.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientAccordion({ client, orders }) {
  const [openOrder, setOpenOrder] = useState(null)

  return (
    <div className="history-client">
      <div className="history-client-header">
        <span className="history-client-icon">◉</span>
        <span className="history-client-name">{client.name}</span>
        <span className="history-client-meta">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {orders.length === 0 ? (
        <div className="history-order-empty">No orders yet.</div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="history-order">
            <button
              className={`history-order-header${openOrder === o.id ? ' open' : ''}`}
              onClick={() => setOpenOrder(openOrder === o.id ? null : o.id)}
            >
              <span className="history-order-icon">◈</span>
              <span className="history-order-name">{o.name}</span>
              <span className="history-order-chevron">{openOrder === o.id ? '▲' : '▼'}</span>
            </button>
            {openOrder === o.id && (
              <OrderCalcTable orderId={o.id} orderName={o.name} />
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default function QuoteHistory() {
  const [clients, setClients] = useState(null)
  const [orders, setOrders]   = useState({})   // { clientId: [orders] }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.getClients()
      .then(async (clientList) => {
        setClients(clientList)
        const orderMap = {}
        await Promise.all(
          clientList.map(async (c) => {
            const os = await api.getOrders(c.id).catch(() => [])
            orderMap[c.id] = os
          })
        )
        setOrders(orderMap)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
        <div className="history-state error-banner" style={{ margin: '1.4rem' }}>⚠ {error}</div>
      )}

      {!loading && !error && clients?.length === 0 && (
        <div className="history-state">
          <span className="history-empty-icon">📋</span>
          <span>No clients yet. Add a client and create an order to save quotes.</span>
        </div>
      )}

      {!loading && !error && clients?.length > 0 && (
        <div className="history-list">
          {clients.map((c) => (
            <ClientAccordion
              key={c.id}
              client={c}
              orders={orders[c.id] ?? []}
            />
          ))}
        </div>
      )}
    </section>
  )
}
