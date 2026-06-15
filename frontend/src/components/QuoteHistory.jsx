import React, { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import CylinderTable from './CylinderTable'
import PricingPanel from './PricingPanel'
import { toast } from '../utils/toast'
import { generateQuotationPDF } from '../utils/generatePDF'

const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Calculation Detail Modal ──────────────────────────────────────────────────
function CalcDetailModal({ calcId, onClose }) {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    api.getCalculation(calcId)
      .then(setData)
      .catch((e) => setLoadError(e.message || 'Failed to load calculation'))
      .finally(() => setLoading(false))
  }, [calcId])

  const statusCfg = {
    confirmed: { label: 'Approved',  cls: 'cop-status-confirmed' },
    pending:   { label: 'Draft',     cls: 'cop-status-pending'   },
    rejected:  { label: 'Rejected',  cls: 'cop-status-rejected'  },
  }
  const cfg = statusCfg[data?.status] ?? statusCfg.pending

  return createPortal(
    <div className="cop-detail-overlay" onClick={onClose}>
      <div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>

        <div className="cop-detail-header">
          <button className="cop-detail-close" onClick={onClose}>← Close</button>
          <span className="cop-detail-title">Calculation Detail</span>
          {data && (
            <span className={`cop-status-badge ${cfg.cls}`}>
              <span className="cop-status-dot" /> {cfg.label}
            </span>
          )}
        </div>

        {loading && (
          <div className="history-state" style={{ padding: '3rem' }}>
            <div className="history-spinner" />
            <span>Loading calculation…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="error-banner" style={{ margin: '2rem 1.5rem' }}>⚠ {loadError}</div>
        )}

        {!loading && data && (
          <>
            <div className="cop-detail-meta-strip">
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Client:</span>
                <span className="cop-detail-meta-val">{data.client_name || '—'}</span>
              </span>
              <span className="cop-detail-meta-item">
                <span className="cop-detail-meta-label">Order:</span>
                <span className="cop-detail-meta-val">{data.order_name || '—'}</span>
              </span>
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

            <div className="cop-detail-body">
              {data.result && (
                <>
                  <CylinderTable result={data.result} orderQty="" pressSpeed={0} />
                  <PricingPanel result={data.result} orderQty="" />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

function UserChip({ name }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.75rem', fontWeight: 600,
      color: 'var(--teal)', whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(54,229,194,0.15)', border: '1px solid rgba(54,229,194,0.35)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', fontWeight: 800, color: 'var(--teal)',
      }}>
        {name[0].toUpperCase()}
      </span>
      {name}
    </span>
  )
}

// ── Version Detail Modal ──────────────────────────────────────────────────────
function VersionDetailModal({ version, onClose, clientName, orderName }) {
  const [quotationLoading, setQuotationLoading] = useState(false)

  const statusCfg = {
    confirmed: { label: 'Confirmed', cls: 'cop-status-confirmed' },
    pending:   { label: 'Draft',     cls: 'cop-status-pending'   },
    rejected:  { label: 'Rejected',  cls: 'cop-status-rejected'  },
  }
  const cfg = statusCfg[version.status] ?? statusCfg.pending

  async function handleQuotationPDF() {
    setQuotationLoading(true)
    try {
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateQuotationPDF({
        client:  { name: clientName || 'N/A', location: '', email: '', phone: '' },
        order:   { label: orderName || '', ref: `Edit v${version.version_number}` },
        inputs: {
          label_width_mm:  version.width,
          label_height_mm: version.height,
          yield_pct:       version.yield_pct       || 85,
          substrate_name:  version.substrate_name  || 'Custom',
          substrate_price: version.substrate_price || 0,
          foil_cost:       version.foil_cost        || 0,
          custom_cost:     version.custom_cost      ?? 0,
          exchange_rate:   version.exchange_rate    || 85,
          order_qty:       0,
        },
        result:     version.result || {},
        preparedBy: version.created_by_name || '',
      }, cs)
    } catch (err) {
      toast.error(err.message || 'PDF generation failed')
    } finally {
      setQuotationLoading(false)
    }
  }

  return createPortal(
    <div className="cop-detail-overlay" onClick={onClose}>
      <div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cop-detail-header">
          <button className="cop-detail-close" onClick={onClose}>← Close</button>
          <span className="cop-detail-title">Edit v{version.version_number}</span>
          <span className={`cop-status-badge ${cfg.cls}`}>
            <span className="cop-status-dot" /> {cfg.label}
          </span>
        </div>
        <div className="cop-detail-meta-strip">
          <span className="cop-detail-meta-item">
            <span className="cop-detail-meta-label">Size:</span>
            <span className="cop-detail-meta-val">{fmt(version.width,1)} × {fmt(version.height,1)} mm</span>
          </span>
          <span className="cop-detail-meta-item">
            <span className="cop-detail-meta-label">Substrate:</span>
            <span className="cop-detail-meta-val">{version.substrate_name || 'Custom'} · ₹{fmt(version.substrate_price)}/m²</span>
          </span>
          <span className="cop-detail-meta-item">
            <span className="cop-detail-meta-label">Yield:</span>
            <span className="cop-detail-meta-val">{version.yield_pct}%</span>
          </span>
          {version.foil_cost > 0 && (
            <span className="cop-detail-meta-item">
              <span className="cop-detail-meta-label">Foil:</span>
              <span className="cop-detail-meta-val">₹{fmt(version.foil_cost)}/m²</span>
            </span>
          )}
          <span className="cop-detail-meta-item">
            <span className="cop-detail-meta-label">Rate:</span>
            <span className="cop-detail-meta-val">₹{fmt(version.exchange_rate,0)} / $</span>
          </span>
          {version.created_by_name && (
            <span className="cop-detail-meta-item">
              <span className="cop-detail-meta-label">By:</span>
              <span className="cop-detail-meta-val"><UserChip name={version.created_by_name} /></span>
            </span>
          )}
          <span className="cop-detail-meta-item">
            <span className="cop-detail-meta-label">Saved:</span>
            <span className="cop-detail-meta-val">{fmtDateTime(version.created_at)}</span>
          </span>
        </div>
        <div className="cop-detail-body">
          {version.result && (
            <>
              <CylinderTable result={version.result} orderQty="" pressSpeed={0} />
              <PricingPanel result={version.result} orderQty="" />
            </>
          )}
        </div>
        <div className="cop-detail-footer">
          <span />
          <button className="cop-pdf-btn" onClick={handleQuotationPDF} disabled={quotationLoading}>
            {quotationLoading ? (
              <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            )}
            {quotationLoading ? 'Generating…' : 'Quotation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Versions section — tree layout ───────────────────────────────────────────
function VersionsSection({ calcId, onStatusChange, refreshAt, clientName, orderName }) {
  const [versions, setVersions] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [detailVersion, setDetailVersion] = useState(null)
  const [pdfLoadingIds, setPdfLoadingIds] = useState(new Set())

  async function handleVersionQuotationPDF(e, v) {
    e.stopPropagation()
    setPdfLoadingIds(prev => new Set(prev).add(v.id))
    try {
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateQuotationPDF({
        client:  { name: clientName || 'N/A', location: '', email: '', phone: '' },
        order:   { label: orderName || '', ref: `Edit v${v.version_number}` },
        inputs: {
          label_width_mm:  v.width,
          label_height_mm: v.height,
          yield_pct:       v.yield_pct       || 85,
          substrate_name:  v.substrate_name  || 'Custom',
          substrate_price: v.substrate_price || 0,
          foil_cost:       v.foil_cost        || 0,
          custom_cost:     v.custom_cost      ?? 0,
          exchange_rate:   v.exchange_rate    || 85,
          order_qty:       0,
        },
        result:     v.result || {},
        preparedBy: v.created_by_name || '',
      }, cs)
    } catch (err) {
      toast.error(err.message || 'PDF generation failed')
    } finally {
      setPdfLoadingIds(prev => { const s = new Set(prev); s.delete(v.id); return s })
    }
  }

  useEffect(() => {
    setLoading(true)
    api.getVersions(calcId)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [calcId])

  useEffect(() => {
    if (refreshAt === null || refreshAt === undefined) return
    api.getVersions(calcId).then(setVersions).catch(() => {})
  }, [refreshAt])

  function handleStatusChange(versionId, next) {
    setVersions((prev) => prev.map((v) =>
      v.id === versionId ? { ...v, status: next }
      : next === 'confirmed' && v.status === 'confirmed' ? { ...v, status: 'pending' }
      : v
    ))
    onStatusChange?.(next)
  }

  if (loading) return (
    <div className="qh-tree-loading">
      <span className="cop-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
      Loading versions…
    </div>
  )

  // Descending order: newest version first
  const sorted = versions ? [...versions].sort((a, b) => b.version_number - a.version_number) : []

  if (!sorted.length) return (
    <div className="qh-tree-empty">
      No edited versions yet. Click <strong>Edit</strong> to revise this quote.
    </div>
  )

  return (
    <>
      <div className="qh-tree-list">
        {sorted.map((v) => (
          <div key={v.id} className="qh-tree-node">
            {/* Horizontal arm + arrowhead connecting from trunk to card */}
            <div className="qh-tree-arm" />
            <div className={`qh-v-card${v.status === 'confirmed' ? ' qh-v-card--confirmed' : v.status === 'rejected' ? ' qh-v-card--rejected' : ''}`}>
              <span className="qh-v-badge">Edit v{v.version_number}</span>
              <span className="qh-v-size">{fmt(v.width,1)} × {fmt(v.height,1)} mm</span>
              <span className="qh-v-sub">{v.substrate_name || 'Custom'}</span>
              {v.created_by_name
                ? <UserChip name={v.created_by_name} />
                : <span style={{ color: 'var(--text-dim)', fontSize: '0.77rem' }}>—</span>
              }
              <span className="qh-v-date">
                {v.created_at ? new Date(v.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>
              <div className="qh-v-status" onClick={(e) => e.stopPropagation()}>
                <StatusBadge
                  calcId={v.id}
                  status={v.status}
                  onSave={(next) => api.updateVersionStatus(v.id, next)}
                  onChoose={(id, next) => handleStatusChange(id, next)}
                />
              </div>
              <button className="qh-v-view-btn" onClick={() => setDetailVersion(v)}>
                View
              </button>
              <button
                className="qh-v-view-btn"
                onClick={(e) => handleVersionQuotationPDF(e, v)}
                disabled={pdfLoadingIds.has(v.id)}
                title="Download internal quotation"
              >
                {pdfLoadingIds.has(v.id) ? '…' : 'Quotation'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {detailVersion && (
        <VersionDetailModal
          version={detailVersion}
          onClose={() => setDetailVersion(null)}
          clientName={clientName}
          orderName={orderName}
        />
      )}
    </>
  )
}

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   cls: 'status-pending'   },
  confirmed: { label: 'Confirmed', cls: 'status-confirmed' },
  rejected:  { label: 'Rejected',  cls: 'status-rejected'  },
}

function StatusBadge({ calcId, status, onChoose, onSave }) {
  const [saving, setSaving]       = useState(false)
  const [dropdownPos, setDropdownPos] = useState(null)
  const btnRef = useRef(null)

  function open(e) {
    e.stopPropagation()
    if (dropdownPos) { setDropdownPos(null); return }
    const rect = btnRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: rect.left })
  }

  useEffect(() => {
    if (!dropdownPos) return
    const close = () => setDropdownPos(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [dropdownPos])

  async function choose(e, next) {
    e.stopPropagation()
    setDropdownPos(null)
    if (next === status) return
    setSaving(true)
    try {
      if (onSave) {
        await onSave(next)
      } else {
        await api.updateQuoteStatus(calcId, next)
      }
      onChoose(calcId, next)
    } catch (e) { toast.error(e.message || 'Failed to update status') }
    finally { setSaving(false) }
  }

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  const dropdown = dropdownPos && createPortal(
    <div
      className="status-dropdown"
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {Object.entries(STATUS_CONFIG).map(([key, c]) => (
        <button
          key={key}
          className={`status-option ${c.cls}${status === key ? ' current' : ''}`}
          onClick={(e) => choose(e, key)}
        >
          {status === key && <span className="status-check">✓ </span>}
          {c.label}
        </button>
      ))}
    </div>,
    document.body
  )

  return (
    <div className="status-wrap">
      <button
        ref={btnRef}
        className={`status-badge ${cfg.cls}${saving ? ' status-saving' : ''}`}
        onClick={open}
        disabled={saving}
        title="Click to change status"
      >
        {saving ? '…' : cfg.label}
        <span className="status-caret">▾</span>
      </button>
      {dropdown}
    </div>
  )
}

export default function QuoteHistory({ onEditCalc }) {
  const [quotes, setQuotes]               = useState(null)
  const [clients, setClients]             = useState([])
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError]                 = useState(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedOrder, setSelectedOrder]   = useState('')
  const [detailCalcId, setDetailCalcId]     = useState(null)
  const [expandedRows, setExpandedRows]     = useState(new Set())
  const [versionsRefreshAt, setVersionsRefreshAt] = useState(null)
  const [pdfLoadingIds, setPdfLoadingIds]   = useState(new Set())

  async function handleQuotationPDF(e, q) {
    e.stopPropagation()
    setPdfLoadingIds(prev => new Set(prev).add(q.id))
    try {
      const data = await api.getCalculation(q.id)
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateQuotationPDF({
        client:  { name: data.client_name || 'N/A', location: data.client_location || '', email: data.client_email || '', phone: data.client_phone || '' },
        order:   { order_id: `CALC-${data.id}`, label: data.order_name || '' },
        inputs: {
          label_width_mm:  data.width,
          label_height_mm: data.height,
          yield_pct:       data.yield_pct       || 85,
          substrate_name:  data.substrate_name  || 'Custom',
          substrate_price: data.substrate_price || 0,
          foil_cost:       data.foil_cost        || 0,
          custom_cost:     data.custom_cost      ?? 0,
          exchange_rate:   data.exchange_rate    || 85,
          order_qty:       data.order_qty        || 0,
        },
        result:     data.result || {},
        preparedBy: '',
      }, cs)
    } catch (err) {
      toast.error(err.message || 'PDF generation failed')
    } finally {
      setPdfLoadingIds(prev => { const s = new Set(prev); s.delete(q.id); return s })
    }
  }

  function toggleExpand(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

  function handleStatusChange(calcId, next) {
    setQuotes((prev) => {
      const orderId = prev.find((x) => x.id === calcId)?.order_id
      return prev.map((q) => {
        if (q.id === calcId) return { ...q, status: next }
        if (next === 'confirmed' && orderId && q.order_id === orderId)
          return { ...q, status: 'pending' }
        return q
      })
    })
    if (next === 'confirmed') setVersionsRefreshAt(Date.now())
  }

  function handleVersionStatusChange(parentCalcId, next) {
    if (next !== 'confirmed') return
    setQuotes((prev) => {
      const orderId = prev.find((x) => x.id === parentCalcId)?.order_id
      return prev.map((q) => {
        if (orderId && q.order_id === orderId) return { ...q, status: 'pending' }
        if (q.id === parentCalcId) return { ...q, status: 'pending' }
        return q
      })
    })
  }

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
                  <th style={{ textAlign: 'left' }}>Created by</th>
                  <th style={{ textAlign: 'left' }}>Updated by</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
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
                  filtered.flatMap((q, i) => {
                    const isExpanded = expandedRows.has(q.id)
                    return [
                      <tr
                        key={q.id ?? i}
                        className={`qh-quote-row${isExpanded ? ' qh-quote-row--expanded' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleExpand(q.id)}
                      >
                        <td style={{ textAlign: 'left' }}>
                          <div className="qh-row-client-cell">
                            <svg
                              className={`qh-row-chevron${isExpanded ? ' qh-row-chevron--open' : ''}`}
                              width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                            {q.client_name ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
                          </div>
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
                        <td style={{ textAlign: 'left' }}>
                          {q.created_by_name
                            ? <UserChip name={q.created_by_name} />
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          {q.updated_by_name ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <UserChip name={q.updated_by_name} />
                              {q.updated_at && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  {new Date(q.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <StatusBadge calcId={q.id} status={q.status} onChoose={handleStatusChange} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            {onEditCalc && (
                              <button
                                className="qh-action-btn qh-action-btn--edit"
                                onClick={() => onEditCalc(q)}
                                title="Edit this calculation"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                            )}
                            <button
                              className="qh-action-btn qh-action-btn--view"
                              onClick={() => setDetailCalcId(q.id)}
                              title="View full details"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
                            </button>
                            <button
                              className="qh-action-btn"
                              onClick={(e) => handleQuotationPDF(e, q)}
                              disabled={pdfLoadingIds.has(q.id)}
                              title="Download internal quotation"
                            >
                              {pdfLoadingIds.has(q.id) ? (
                                <span className="cop-spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />
                              ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                              )}
                              Quotation
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`versions-${q.id}`} className="qh-versions-expand-row">
                          <td colSpan={12} style={{ padding: 0 }}>
                            <div className="qh-versions-container">
                              <div className="qh-versions-header">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="6" y1="3" x2="6" y2="15"/>
                                  <circle cx="18" cy="6" r="3"/>
                                  <circle cx="6" cy="18" r="3"/>
                                  <path d="M18 9a9 9 0 0 1-9 9"/>
                                </svg>
                                Edit History
                              </div>
                              <VersionsSection
                                calcId={q.id}
                                onStatusChange={(next) => handleVersionStatusChange(q.id, next)}
                                refreshAt={versionsRefreshAt}
                                clientName={q.client_name}
                                orderName={q.order_name}
                              />
                            </div>
                          </td>
                        </tr>
                      ),
                    ].filter(Boolean)
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailCalcId && (
        <CalcDetailModal
          calcId={detailCalcId}
          onClose={() => setDetailCalcId(null)}
        />
      )}
    </section>
  )
}
