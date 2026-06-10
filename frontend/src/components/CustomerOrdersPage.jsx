import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import CylinderTable from './CylinderTable'
import PricingPanel from './PricingPanel'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

// ── Edit Client Modal ─────────────────────────────────────────────────────────
function EditClientModal({ client, onUpdated, onClose }) {
  const [name, setName] = useState(client.name)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === client.name) { onClose(); return }
    setBusy(true); setErr(null)
    try {
      const updated = await api.updateClient(client.id, trimmed)
      onUpdated(updated)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cop-edit-overlay" onClick={onClose}>
      <div className="cop-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cop-edit-title">Edit Customer</div>
        <form onSubmit={handleSubmit}>
          <div className="cop-field">
            <label className="cop-label">Company Name <span className="cop-required">*</span></label>
            <input
              className="cop-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="cop-drawer-note" style={{ marginTop: '0.75rem' }}>
            ℹ Additional fields (location, email, industry) will be available once the backend is extended.
          </div>
          {err && <div className="cop-inline-err">{err}</div>}
          <div className="cop-edit-actions">
            <button
              className="cop-modal-btn cop-modal-btn--primary"
              type="submit"
              disabled={busy || !name.trim()}
            >
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
            <button className="cop-modal-btn" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Calculation Detail Modal ──────────────────────────────────────────────────
// Shows the full CylinderTable + PricingPanel for a saved calculation,
// plus Approve / Unapprove buttons.
function CalcDetailModal({ calcId, approvedId, onApproveRequest, onUnapprove, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getCalculation(calcId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [calcId])

  const isApproved = calcId === approvedId

  return (
    <div className="cop-detail-overlay" onClick={onClose}>
      <div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cop-detail-header">
          <button className="cop-detail-close" onClick={onClose}>← Close</button>
          <span className="cop-detail-title">Calculation Detail</span>
          {isApproved
            ? <span className="cop-status-badge cop-status-confirmed"><span className="cop-status-dot" /> Approved</span>
            : <span className="cop-status-badge cop-status-pending"><span className="cop-status-dot" /> Draft</span>
          }
        </div>

        {loading && (
          <div className="history-state" style={{ padding: '3rem' }}>
            <div className="history-spinner" />
            <span>Loading calculation…</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Meta strip */}
            <div className="cop-detail-meta-strip">
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Size:</span>
                <span className="cop-detail-meta-val">{fmt(data.width,1)} × {fmt(data.height,1)} mm</span>
              </span>
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Substrate:</span>
                <span className="cop-detail-meta-val">{data.substrate_name || 'Custom'} · ₹{fmt(data.substrate_price)}/m²</span>
              </span>
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Yield:</span>
                <span className="cop-detail-meta-val">{data.yield_pct}%</span>
              </span>
              {data.foil_cost > 0 && (
                <span className="cop-detail-meta-item">
                  <span className="cop-detail-meta-label">Foil:</span>
                  <span className="cop-detail-meta-val">₹{fmt(data.foil_cost)}/m²</span>
                </span>
              )}
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Rate:</span>
                <span className="cop-detail-meta-val">₹{fmt(data.exchange_rate,0)} / $</span>
              </span>
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Saved:</span>
                <span className="cop-detail-meta-val">{fmtDateTime(data.created_at)}</span>
              </span>
            </div>

            {/* Full calculation output */}
            <div className="cop-detail-body">
              {data.result && (
                <>
                  <CylinderTable result={data.result} orderQty="" pressSpeed={0} />
                  <PricingPanel result={data.result} orderQty="" />
                </>
              )}
            </div>

            {/* Approve / Unapprove footer */}
            <div className="cop-detail-footer">
              {isApproved ? (
                <>
                  <span className="cop-detail-approved-note">★ This calculation is approved for this order</span>
                  <button className="cop-detail-unapprove-btn" onClick={() => onUnapprove(calcId)}>
                    ↩ Unapprove
                  </button>
                </>
              ) : approvedId != null ? (
                <>
                  <span className="cop-detail-other-approved">Another calculation is already approved for this order.</span>
                  <button className="cop-detail-approve-btn" onClick={() => onApproveRequest(data)}>
                    ★ Approve this instead
                  </button>
                </>
              ) : (
                <button className="cop-detail-approve-btn" onClick={() => onApproveRequest(data)}>
                  ★ Approve this Calculation
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Approve confirmation modal ────────────────────────────────────────────────
function ApproveConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="cop-modal-overlay">
      <div className="cop-modal">
        <div className="cop-modal-icon">✦</div>
        <div className="cop-modal-title">Approve Calculation?</div>
        <div className="cop-modal-body">
          <p>Mark this as the approved quote for this order? This can be undone later.</p>
        </div>
        <div className="cop-modal-actions">
          <button className="cop-modal-btn cop-modal-btn--primary" onClick={onConfirm}>
            Yes, Approve
          </button>
          <button className="cop-modal-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Conflict modal ────────────────────────────────────────────────────────────
function ConflictModal({ approvedCalc, onViewApproved, onSwap, onCancel }) {
  return (
    <div className="cop-modal-overlay">
      <div className="cop-modal">
        <div className="cop-modal-icon" style={{ color: '#f59e0b' }}>⚠</div>
        <div className="cop-modal-title">Already Approved</div>
        <div className="cop-modal-body">
          <p>
            <strong>{fmt(approvedCalc.width, 1)} × {fmt(approvedCalc.height, 1)} mm
            {approvedCalc.substrate_name ? ` · ${approvedCalc.substrate_name}` : ''}</strong>
            {' '}is currently the approved quote for this order.
          </p>
          <p>What would you like to do?</p>
        </div>
        <div className="cop-modal-actions">
          <button className="cop-modal-btn" onClick={onViewApproved}>
            👁 View approved calculation
          </button>
          <button className="cop-modal-btn cop-modal-btn--primary" onClick={onSwap}>
            ↔ Approve this one instead
          </button>
          <button className="cop-modal-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Swap confirmation modal ───────────────────────────────────────────────────
function SwapConfirmModal({ approvedCalc, onConfirm, onCancel }) {
  return (
    <div className="cop-modal-overlay">
      <div className="cop-modal">
        <div className="cop-modal-icon">↔</div>
        <div className="cop-modal-title">Replace Approval?</div>
        <div className="cop-modal-body">
          <p>
            <strong>{fmt(approvedCalc.width, 1)} × {fmt(approvedCalc.height, 1)} mm</strong>
            {' '}will move back to Draft and the new calculation will become Approved.
          </p>
        </div>
        <div className="cop-modal-actions">
          <button className="cop-modal-btn cop-modal-btn--primary" onClick={onConfirm}>
            Yes, swap approval
          </button>
          <button className="cop-modal-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Calculation row ───────────────────────────────────────────────────────────
function CalcRow({ calc, isApproved, hasOtherApproved, onViewDetail, onApproveRequest }) {
  return (
    <div
      className={`cop-calc-row${isApproved ? ' cop-calc-row--approved' : ''}`}
      style={{ cursor: 'pointer' }}
      onClick={onViewDetail}
    >
      <div className="cop-calc-left">
        <div className="cop-calc-size">
          {fmt(calc.width, 1)} × {fmt(calc.height, 1)} mm
        </div>
        <div className="cop-calc-meta">
          {calc.substrate_name || 'Custom substrate'}
          {calc.yield_pct ? ` · ${calc.yield_pct}% yield` : ''}
          {' · '}{fmtDateTime(calc.created_at)}
        </div>
        {calc.pricing && (
          <div className="cop-calc-pricing">
            <span className="cop-calc-price-inr">₹ {fmt(calc.pricing.price_inr_1000)} / 1000</span>
            <span className="cop-calc-price-usd">$ {fmt(calc.pricing.price_usd_1000, 3)} / 1000</span>
          </div>
        )}
      </div>
      <div className="cop-calc-right" onClick={(e) => e.stopPropagation()}>
        {isApproved ? (
          <span className="cop-status-badge cop-status-confirmed">
            <span className="cop-status-dot" /> Approved
          </span>
        ) : (
          <span className="cop-status-badge cop-status-pending">
            <span className="cop-status-dot" /> Draft
          </span>
        )}
        <button
          className={`cop-approve-btn${isApproved ? ' cop-approve-btn--active' : ''}${hasOtherApproved ? ' cop-approve-btn--dimmed' : ''}`}
          onClick={() => onApproveRequest(calc)}
          disabled={isApproved}
          title={isApproved ? 'Currently approved' : hasOtherApproved ? 'Another calc is approved — click to swap' : 'Approve this calculation'}
        >
          {isApproved ? '★ Approved' : '☆ Approve'}
        </button>
      </div>
    </div>
  )
}

// ── Order panel ───────────────────────────────────────────────────────────────
function OrderPanel({ order }) {
  const [calcs, setCalcs]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [approvedId, setApprovedId] = useState(null)
  const [busy, setBusy]           = useState(false)

  // Modal states — only one shows at a time, except detailModal can layer over conflict
  const [detailModal, setDetailModal]         = useState(null) // { calcId, pendingCalcForConflict }
  const [approveConfirm, setApproveConfirm]   = useState(null) // calc object
  const [conflict, setConflict]               = useState(null) // { pendingCalc, approvedCalc }
  const [swapConfirm, setSwapConfirm]         = useState(null) // { pendingCalc, approvedCalc }

  useEffect(() => {
    setLoading(true)
    api.getOrderCalculations(order.id)
      .then((cs) => {
        setCalcs(cs)
        const approved = cs.find((c) => c.status === 'confirmed')
        if (approved) setApprovedId(approved.id)
      })
      .catch(() => setCalcs([]))
      .finally(() => setLoading(false))
  }, [order.id])

  // ── Approve request (from row button or detail modal) ──
  function handleApproveRequest(calc) {
    // Close detail modal first if open
    setDetailModal(null)
    if (calc.id === approvedId) return
    const approvedCalc = calcs?.find((c) => c.id === approvedId)
    if (approvedId != null && approvedCalc) {
      setConflict({ pendingCalc: calc, approvedCalc })
    } else {
      setApproveConfirm(calc)
    }
  }

  // ── Confirm fresh approve ──
  async function handleConfirmApprove() {
    const calc = approveConfirm
    setApproveConfirm(null)
    if (!calc) return
    setBusy(true)
    try {
      await api.updateQuoteStatus(calc.id, 'confirmed')
      setApprovedId(calc.id)
      setCalcs((prev) => prev.map((c) => ({ ...c, status: c.id === calc.id ? 'confirmed' : c.status })))
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  // ── From conflict: view approved calc ──
  function handleViewApproved() {
    const pending = conflict?.pendingCalc
    setConflict(null)
    setDetailModal({ calcId: approvedId, pendingCalcForConflict: pending })
  }

  // ── From conflict: go to swap confirm ──
  function handleConflictSwap() {
    const { pendingCalc, approvedCalc } = conflict
    setConflict(null)
    setSwapConfirm({ pendingCalc, approvedCalc })
  }

  // ── Confirm swap ──
  async function handleConfirmSwap() {
    const { pendingCalc, approvedCalc } = swapConfirm
    setSwapConfirm(null)
    setBusy(true)
    try {
      await api.updateQuoteStatus(approvedCalc.id, 'pending')
      await api.updateQuoteStatus(pendingCalc.id, 'confirmed')
      setApprovedId(pendingCalc.id)
      setCalcs((prev) => prev.map((c) => ({
        ...c,
        status: c.id === pendingCalc.id ? 'confirmed'
               : c.id === approvedCalc.id ? 'pending'
               : c.status,
      })))
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  // ── Unapprove (from detail modal) ──
  async function handleUnapprove(calcId) {
    const pendingCalcForConflict = detailModal?.pendingCalcForConflict ?? null
    setDetailModal(null)
    setBusy(true)
    try {
      await api.updateQuoteStatus(calcId, 'pending')
      setApprovedId(null)
      setCalcs((prev) => prev.map((c) => ({ ...c, status: c.id === calcId ? 'pending' : c.status })))
      // If this was opened from a conflict flow, auto-trigger approve for the pending calc
      if (pendingCalcForConflict) {
        setApproveConfirm(pendingCalcForConflict)
      }
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  return (
    <div className="cop-order-panel">
      <div className="cop-order-panel-header">
        <span className="cop-order-panel-name">{order.name}</span>
        <span className="cop-order-panel-date">{fmtDate(order.created_at)}</span>
        {approvedId && (
          <span className="cop-order-approved-badge">★ Has approved quote</span>
        )}
      </div>

      <div className="cop-calcs-area">
        {loading && (
          <div className="cop-calcs-loading">
            <span className="cop-spinner" /> Loading calculations…
          </div>
        )}
        {!loading && calcs?.length === 0 && (
          <div className="cop-calcs-empty">
            No calculations saved for this order yet. Run the Pricing Calculator and save a result.
          </div>
        )}
        {!loading && calcs && calcs.length > 0 && (
          <div className="cop-calcs-list">
            {calcs.map((c) => (
              <CalcRow
                key={c.id}
                calc={c}
                isApproved={c.id === approvedId}
                hasOtherApproved={approvedId != null && c.id !== approvedId}
                onViewDetail={() => setDetailModal({ calcId: c.id, pendingCalcForConflict: null })}
                onApproveRequest={handleApproveRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {detailModal && (
        <CalcDetailModal
          calcId={detailModal.calcId}
          approvedId={approvedId}
          onApproveRequest={handleApproveRequest}
          onUnapprove={handleUnapprove}
          onClose={() => setDetailModal(null)}
        />
      )}

      {approveConfirm && (
        <ApproveConfirmModal
          onConfirm={handleConfirmApprove}
          onCancel={() => setApproveConfirm(null)}
        />
      )}

      {conflict && (
        <ConflictModal
          approvedCalc={conflict.approvedCalc}
          onViewApproved={handleViewApproved}
          onSwap={handleConflictSwap}
          onCancel={() => setConflict(null)}
        />
      )}

      {swapConfirm && (
        <SwapConfirmModal
          approvedCalc={swapConfirm.approvedCalc}
          onConfirm={handleConfirmSwap}
          onCancel={() => setSwapConfirm(null)}
        />
      )}
    </div>
  )
}

// ── New Order inline form ─────────────────────────────────────────────────────
function NewOrderForm({ clientId, existingOrders, onCreated, onCancel }) {
  const nextNum = () => {
    if (!existingOrders || existingOrders.length === 0) return 'ORDER-001'
    const nums = existingOrders.map((o) => {
      const m = o.name.match(/(\d+)$/)
      return m ? parseInt(m[1], 10) : 0
    })
    return `ORDER-${String(Math.max(...nums, 0) + 1).padStart(3, '0')}`
  }

  const today = new Date().toISOString().split('T')[0]
  const [orderName, setOrderName] = useState(nextNum)
  const [orderDate, setOrderDate] = useState(today)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const name = orderName.trim()
    if (!name) return
    setBusy(true); setErr(null)
    try {
      const created = await api.createOrder(clientId, name, orderDate || null)
      onCreated(created)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="cop-new-order-form" onSubmit={handleSubmit}>
      <div className="cop-new-order-title">New Order</div>
      <div className="cop-new-order-fields">
        <div className="cop-field">
          <label className="cop-label">Order Name</label>
          <input
            className="cop-input" type="text"
            value={orderName} onChange={(e) => setOrderName(e.target.value)}
            disabled={busy} maxLength={200} autoFocus
          />
        </div>
        <div className="cop-field">
          <label className="cop-label">Order Date</label>
          <input
            className="cop-input" type="date"
            value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
      {err && <div className="cop-inline-err">{err}</div>}
      <div className="cop-new-order-actions">
        <button className="cop-btn cop-btn--primary" type="submit" disabled={busy || !orderName.trim()}>
          {busy ? '…' : '+ Create Order'}
        </button>
        <button className="cop-btn" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

// ── Customer card ─────────────────────────────────────────────────────────────
function CustomerCard({ client, onOrderCountChange, onClientUpdated }) {
  const [orders, setOrders]             = useState(null)
  const [expanded, setExpanded]         = useState(false)
  const [loadingOrders, setLoading]     = useState(false)
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showEdit, setShowEdit]         = useState(false)

  const initial = (client.name || '?').charAt(0).toUpperCase()

  async function toggle() {
    if (!expanded) {
      if (orders === null) {
        setLoading(true)
        try {
          const os = await api.getOrders(client.id)
          setOrders(os)
        } catch {
          setOrders([])
        } finally {
          setLoading(false)
        }
      }
      setExpanded(true)
    } else {
      setExpanded(false)
    }
  }

  function handleOrderCreated(newOrder) {
    setOrders((prev) => [...(prev ?? []), newOrder])
    setShowNewOrder(false)
    setActiveOrderId(newOrder.id)
    onOrderCountChange?.(1)
  }

  function handleClientUpdated(updated) {
    setShowEdit(false)
    onClientUpdated?.(updated)
  }

  return (
    <>
      <div className={`cop-customer-card${expanded ? ' cop-customer-card--expanded' : ''}`}>
        {/* ── header ── */}
        <div className="cop-customer-header" onClick={toggle}>
          <div className="cop-avatar">{initial}</div>
          <div className="cop-customer-info">
            <div className="cop-customer-name">{client.name}</div>
            <div className="cop-customer-meta">
              Added {fmtDate(client.created_at)}
              {orders !== null && ` · ${orders.length} order${orders.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="cop-edit-btn"
              onClick={(e) => { e.stopPropagation(); setShowEdit(true) }}
              title="Edit customer"
            >
              ✎ Edit
            </button>
            <span className={`cop-chevron${expanded ? ' cop-chevron--open' : ''}`}>▼</span>
          </div>
        </div>

        {/* ── expanded body ── */}
        {expanded && (
          <div className="cop-customer-body">
            {loadingOrders && (
              <div className="cop-orders-loading">
                <span className="cop-spinner" /> Loading orders…
              </div>
            )}

            {!loadingOrders && orders && (
              <>
                {orders.length === 0 && !showNewOrder && (
                  <div className="cop-orders-empty">No orders yet for this customer.</div>
                )}

                {orders.length > 0 && (
                  <div className="cop-orders-tabs">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        className={`cop-order-tab${activeOrderId === o.id ? ' cop-order-tab--active' : ''}`}
                        onClick={() => setActiveOrderId(activeOrderId === o.id ? null : o.id)}
                      >
                        {o.name}
                      </button>
                    ))}
                  </div>
                )}

                {activeOrderId && orders.find((o) => o.id === activeOrderId) && (
                  <OrderPanel order={orders.find((o) => o.id === activeOrderId)} clientId={client.id} />
                )}

                {showNewOrder ? (
                  <NewOrderForm
                    clientId={client.id}
                    existingOrders={orders}
                    onCreated={handleOrderCreated}
                    onCancel={() => setShowNewOrder(false)}
                  />
                ) : (
                  <button
                    className="cop-add-order-btn"
                    onClick={(e) => { e.stopPropagation(); setShowNewOrder(true) }}
                  >
                    + New Order
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <EditClientModal
          client={client}
          onUpdated={handleClientUpdated}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

// ── New Customer drawer ───────────────────────────────────────────────────────
function NewCustomerDrawer({ onCreated, onClose }) {
  const [name, setName]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true); setErr(null)
    try {
      const created = await api.createClient(trimmed)
      onCreated(created)
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cop-drawer-overlay" onClick={onClose}>
      <div className="cop-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cop-drawer-header">
          <div className="cop-drawer-title">New Customer</div>
          <button className="cop-drawer-close" onClick={onClose}>✕</button>
        </div>

        <form className="cop-drawer-form" onSubmit={handleSubmit}>
          <div className="cop-drawer-section-label">Company Details</div>

          <div className="cop-field">
            <label className="cop-label">Company Name <span className="cop-required">*</span></label>
            <input
              className="cop-input" type="text"
              placeholder="e.g. Kingfisher Breweries"
              value={name} onChange={(e) => setName(e.target.value)}
              disabled={busy} maxLength={120} autoFocus
            />
          </div>

          <div className="cop-drawer-note">
            ℹ Additional fields (location, industry, email, phone) will be added once
            the backend is extended. You can edit the customer name anytime from the Customers page.
          </div>

          {err && <div className="cop-inline-err">{err}</div>}

          <div className="cop-drawer-actions">
            <button
              className="cop-btn cop-btn--primary cop-btn--full"
              type="submit"
              disabled={busy || !name.trim()}
            >
              {busy ? <><span className="cop-spinner" /> Creating…</> : '+ Create Customer'}
            </button>
            <button className="cop-btn cop-btn--full" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomerOrdersPage() {
  const [clients, setClients]         = useState([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [showDrawer, setShowDrawer]   = useState(false)

  const loadClients = useCallback(async () => {
    const cs = await api.getClients().catch(() => [])
    const sorted = [...cs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setClients(sorted)
    let total = 0
    await Promise.all(cs.map(async (c) => {
      const os = await api.getOrders(c.id).catch(() => [])
      total += os.length
    }))
    setTotalOrders(total)
  }, [])

  useEffect(() => {
    loadClients()
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [loadClients])

  function handleCustomerCreated(newClient) {
    setClients((prev) => [newClient, ...prev])
    setShowDrawer(false)
  }

  function handleClientUpdated(updated) {
    setClients((prev) => prev.map((c) => c.id === updated.id ? { ...c, name: updated.name } : c))
  }

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="cop-page">
      {/* ── Page header ── */}
      <div className="cop-page-header">
        <div className="cop-page-title-wrap">
          <div className="cop-page-title">Customers &amp; Orders</div>
          <div className="cop-page-sub">
            Manage customers, orders and approve saved quotes
          </div>
        </div>

        <div className="cop-header-right">
          <div className="cop-stats-row">
            <div className="cop-stat">
              <span className="cop-stat-val">{clients.length}</span>
              <span className="cop-stat-label">Customers</span>
            </div>
            <div className="cop-stat-divider" />
            <div className="cop-stat">
              <span className="cop-stat-val">{totalOrders || '—'}</span>
              <span className="cop-stat-label">Orders</span>
            </div>
          </div>

          <button className="cop-new-customer-btn" onClick={() => setShowDrawer(true)}>
            + New Customer
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      {!loading && clients.length > 0 && (
        <div className="cop-toolbar">
          <input
            className="cop-search" type="text"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="cop-count">
            {filtered.length} of {clients.length} customer{clients.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div className="cop-state">
          <span className="cop-spinner" /><span>Loading customers…</span>
        </div>
      )}
      {error && <div className="error-banner" style={{ margin: '1rem 0' }}>⚠ {error}</div>}
      {!loading && !error && clients.length === 0 && (
        <div className="cop-state cop-state--empty">
          <div className="cop-empty-icon">👤</div>
          <div className="cop-empty-title">No customers yet</div>
          <div className="cop-empty-sub">Click "+ New Customer" to add your first one.</div>
        </div>
      )}
      {!loading && !error && clients.length > 0 && filtered.length === 0 && (
        <div className="cop-state"><span>No customers match "{search}".</span></div>
      )}

      {/* ── Customer list ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="cop-customers-list">
          {filtered.map((c) => (
            <CustomerCard
              key={c.id}
              client={c}
              onOrderCountChange={(d) => setTotalOrders((t) => t + d)}
              onClientUpdated={handleClientUpdated}
            />
          ))}
        </div>
      )}

      {showDrawer && (
        <NewCustomerDrawer
          onCreated={handleCustomerCreated}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  )
}
