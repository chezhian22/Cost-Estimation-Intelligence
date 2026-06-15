import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import { generateInvoicePDF, generateQuotationPDF } from '../utils/generatePDF'
import { toast } from '../utils/toast'
import CylinderTable from './CylinderTable'
import PricingPanel from './PricingPanel'

// ── Helpers ───────────────────────────────────────────────────────────────────
function blockNonPhone(e) {
  const allowed = ['Backspace','Delete','Tab','Enter','Escape',
                   'ArrowLeft','ArrowRight','Home','End']
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (e.key >= '0' && e.key <= '9') return
  if (e.key === '+' || e.key === '-' || e.key === ' ') return
  e.preventDefault()
}

function pastePhoneOnly(e) {
  const text = e.clipboardData.getData('text')
  if (!/^[0-9+\- ]*$/.test(text)) e.preventDefault()
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

// ── PDF payload builders ──────────────────────────────────────────────────────
function buildInvoicePayload(calcData, clientName, orderName) {
  const result   = calcData.result  || {}
  const matched  = result.matched   || {}
  const rows     = result.rows      || []
  const pricing  = result.pricing   || {}
  const row      = rows[matched.index] || {}
  const orderQty = calcData.order_qty || 0
  const pricePerLabel = pricing.price_inr_label || 0
  const subtotal = orderQty > 0 ? orderQty * pricePerLabel : 0
  const totalUsd = orderQty > 0 ? orderQty * (pricing.price_usd_label || 0) : 0

  return {
    client: {
      name:     clientName || calcData.client_name || 'N/A',
      location: '', email: '', phone: '',
    },
    order: {
      order_id: calcData.id ? `CALC-${calcData.id}` : '',
      label:    orderName  || calcData.order_name || '',
    },
    inputs: {
      label_width_mm:  calcData.width,
      label_height_mm: calcData.height,
      substrate:       calcData.substrate_name || 'Custom',
      total_qty:       orderQty,
    },
    approved_cylinder: {
      teeth:  row.teeth,
      around: row.around,
      across: row.across,
    },
    pricing: {
      selling_price_per_label: pricePerLabel,
      total_cost_inr:          subtotal,
      total_cost_usd:          totalUsd,
    },
  }
}

function buildQuotationPayload(calcData, clientName, orderName) {
  const orderQty = calcData.order_qty || 0
  return {
    client: {
      name:     clientName || calcData.client_name || 'N/A',
      location: '', email: '', phone: '',
    },
    order: {
      order_id: calcData.id ? `CALC-${calcData.id}` : '',
      label:    orderName  || calcData.order_name || '',
      ref:      calcData.version_number ? `Edit v${calcData.version_number}` : '',
    },
    inputs: {
      label_width_mm:  calcData.width,
      label_height_mm: calcData.height,
      yield_pct:       calcData.yield_pct       || 85,
      substrate_name:  calcData.substrate_name  || 'Custom',
      substrate_price: calcData.substrate_price || 0,
      foil_cost:       calcData.foil_cost        || 0,
      custom_cost:     calcData.custom_cost  ?? (calcData.result?.pricing?.custom_cost || 0),
      exchange_rate:   calcData.exchange_rate    || 85,
      order_qty:       orderQty,
    },
    result:     calcData.result || {},
    preparedBy: '',
  }
}

// ── Edit Client Modal ─────────────────────────────────────────────────────────
function EditClientModal({ client, onUpdated, onClose }) {
  const [name,     setName]     = useState(client.name)
  const [location, setLocation] = useState(client.location || '')
  const [industry, setIndustry] = useState(client.industry || '')
  const [email,    setEmail]    = useState(client.email    || '')
  const [phone,    setPhone]    = useState(client.phone    || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true); setErr(null)
    try {
      const updated = await api.updateClient(client.id, {
        name: trimmed,
        location: location.trim() || null,
        industry: industry.trim() || null,
        email:    email.trim()    || null,
        phone:    phone.trim()    || null,
      })
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
              className="cop-input" type="text"
              value={name} onChange={(e) => setName(e.target.value)}
              disabled={busy} maxLength={120} autoFocus
            />
          </div>
          <div className="cop-field">
            <label className="cop-label">Location</label>
            <input
              className="cop-input" type="text"
              placeholder="e.g. Bengaluru"
              value={location} onChange={(e) => setLocation(e.target.value)}
              disabled={busy} maxLength={200}
            />
          </div>
          <div className="cop-field">
            <label className="cop-label">Industry</label>
            <input
              className="cop-input" type="text"
              placeholder="e.g. Beverages"
              value={industry} onChange={(e) => setIndustry(e.target.value)}
              disabled={busy} maxLength={120}
            />
          </div>
          <div className="cop-field">
            <label className="cop-label">Email</label>
            <input
              className="cop-input" type="email"
              placeholder="e.g. contact@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={busy} maxLength={200}
            />
          </div>
          <div className="cop-field">
            <label className="cop-label">Phone</label>
            <input
              className="cop-input" type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              onKeyDown={blockNonPhone} onPaste={pastePhoneOnly}
              disabled={busy} maxLength={15}
            />
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
function CalcDetailModal({ calcId, approvedId, onApproveRequest, onUnapprove, onClose, clientName, orderName }) {
  const [data, setData]                         = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [loadError, setLoadError]               = useState(null)
  const [pdfLoading, setPdfLoading]             = useState(false)
  const [quotationLoading, setQuotationLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    api.getCalculation(calcId)
      .then(setData)
      .catch((e) => setLoadError(e.message || 'Failed to load calculation'))
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

        {!loading && loadError && (
          <div className="error-banner" style={{ margin: '2rem 1.5rem' }}>⚠ {loadError}</div>
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
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button
                      className="cop-pdf-btn"
                      disabled={quotationLoading}
                      onClick={async () => {
                        setQuotationLoading(true)
                        try {
                          let cs = {}
                          try { cs = await api.getCompanySettings() } catch (_) {}
                          generateQuotationPDF(buildQuotationPayload(data, clientName, orderName), cs)
                        } finally { setQuotationLoading(false) }
                      }}
                    >
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
                    <button
                      className="cop-pdf-btn"
                      disabled={pdfLoading}
                      onClick={async () => {
                        setPdfLoading(true)
                        try {
                          let cs = {}
                          try { cs = await api.getCompanySettings() } catch (_) {}
                          generateInvoicePDF(buildInvoicePayload(data, clientName, orderName), cs)
                        } finally { setPdfLoading(false) }
                      }}
                    >
                      {pdfLoading ? (
                        <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      )}
                      {pdfLoading ? 'Generating…' : 'Invoice'}
                    </button>
                    <button className="cop-detail-unapprove-btn" onClick={() => onUnapprove(calcId)}>
                      ↩ Unapprove
                    </button>
                  </div>
                </>
              ) : approvedId != null ? (
                <>
                  <span className="cop-detail-other-approved">Another calculation is already approved for this order.</span>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button
                      className="cop-pdf-btn"
                      disabled={quotationLoading}
                      onClick={async () => {
                        setQuotationLoading(true)
                        try {
                          let cs = {}
                          try { cs = await api.getCompanySettings() } catch (_) {}
                          generateQuotationPDF(buildQuotationPayload(data, clientName, orderName), cs)
                        } finally { setQuotationLoading(false) }
                      }}
                    >
                      {quotationLoading ? <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> : 'Quotation'}
                    </button>
                    <button className="cop-detail-approve-btn" onClick={() => onApproveRequest(data)}>
                      ★ Approve this instead
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <button
                    className="cop-pdf-btn"
                    disabled={quotationLoading}
                    onClick={async () => {
                      setQuotationLoading(true)
                      try {
                        let cs = {}
                        try { cs = await api.getCompanySettings() } catch (_) {}
                        generateQuotationPDF(buildQuotationPayload(data, clientName, orderName), cs)
                      } finally { setQuotationLoading(false) }
                    }}
                  >
                    {quotationLoading ? <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> : 'Quotation'}
                  </button>
                  <button className="cop-detail-approve-btn" onClick={() => onApproveRequest(data)}>
                    ★ Approve this Calculation
                  </button>
                </div>
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

// ── Version quote detail modal (data already loaded from getVersions) ────────
function VersionQuoteDetailModal({ version, onClose, clientName, orderName }) {
  const [pdfLoading, setPdfLoading]             = useState(false)
  const [quotationLoading, setQuotationLoading] = useState(false)

  async function handleInvoice() {
    setPdfLoading(true)
    try {
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateInvoicePDF(buildInvoicePayload(
        { ...version, result: version.result },
        clientName, orderName,
      ), cs)
    } finally { setPdfLoading(false) }
  }

  async function handleQuotation() {
    setQuotationLoading(true)
    try {
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateQuotationPDF(buildQuotationPayload(
        { ...version, result: version.result },
        clientName, orderName,
      ), cs)
    } finally { setQuotationLoading(false) }
  }

  return (
    <div className="cop-detail-overlay" onClick={onClose}>
      <div className="cop-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cop-detail-header">
          <button className="cop-detail-close" onClick={onClose}>← Close</button>
          <span className="cop-detail-title">Edit v{version.version_number}</span>
          <span className="cop-status-badge cop-status-confirmed">
            <span className="cop-status-dot" /> Approved
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
          <span className="cop-detail-approved-note">★ This version is approved for this order</span>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button className="cop-pdf-btn" onClick={handleQuotation} disabled={quotationLoading}>
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
            <button className="cop-pdf-btn" onClick={handleInvoice} disabled={pdfLoading}>
              {pdfLoading ? (
                <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {pdfLoading ? 'Generating…' : 'Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Draft Email Modal ─────────────────────────────────────────────────────────
function DraftEmailModal({ calc, clientEmail, clientName, orderName, onClose }) {
  const [loading, setLoading]           = useState(true)
  const [calcData, setCalcData]         = useState(null)
  const [companySettings, setCompanySettings] = useState({})
  const [subject, setSubject]           = useState('')
  const [body, setBody]                 = useState('')
  const [copied, setCopied]             = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [sending, setSending]           = useState(false)
  const [sent, setSent]                 = useState(false)

  const calcId = calc.calculation_id || calc.id  // versions use calculation_id; regular calcs use id

  useEffect(() => {
    async function init() {
      try {
        const [data, cs] = await Promise.all([
          api.getCalculation(calcId),
          api.getCompanySettings().catch(() => ({})),
        ])
        setCalcData(data)
        setCompanySettings(cs)

        const coName  = cs.company_name || 'ChromaPrint'
        const coPhone = cs.phone || ''
        const coEmail = cs.email || ''
        const today   = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        const invNo   = `INV-${new Date().getFullYear()}-${String(calcId).padStart(4, '0')}`
        const qty     = Number(data.order_qty) || 0
        const pricing = calc.pricing || data.result?.pricing || {}
        const pricePerLabel = Number(pricing.price_inr_label || 0)
        const amountDue = qty > 0 && pricePerLabel > 0
          ? `₹ ${(qty * pricePerLabel).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : 'Please refer to the attached invoice'

        setSubject(`Invoice ${invNo} — ${orderName || 'Your Order'}`)
        setBody(
`Dear ${clientName || 'Sir/Madam'},

I hope you are doing well.

Please find the attached invoice for the services provided. Kindly review the invoice and process the payment as per the payment terms mentioned in the document.

Invoice Number: ${invNo}
Invoice Date: ${today}
Amount Due: ${amountDue}

If you have any questions or require any additional information, please feel free to contact me.

Thank you for your business and continued support.

Best regards,
${coName}${coPhone ? '\n' + coPhone : ''}${coEmail ? '\n' + coEmail : ''}`)
      } catch (err) {
        toast.error(err.message || 'Failed to load details')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleDownloadInvoice() {
    if (!calcData) return
    setInvoiceLoading(true)
    try {
      generateInvoicePDF(buildInvoicePayload(calcData, clientName, orderName), companySettings)
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoice')
    } finally {
      setInvoiceLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — please select and copy manually')
    }
  }

  async function handleSendEmail() {
    if (!clientEmail) return toast.error('No email address on file for this client')
    setSending(true)
    try {
      await api.sendInvoiceEmail(calcId, clientEmail, subject, body)
      setSent(true)
      setTimeout(() => setSent(false), 4000)
      toast.error('') // clear any previous error
    } catch (err) {
      toast.error(err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="cop-detail-overlay" onClick={onClose}>
      <div
        className="cop-detail-modal"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cop-detail-header">
          <button className="cop-detail-close" onClick={onClose}>← Close</button>
          <span className="cop-detail-title">Draft Invoice Email</span>
          <span className="cop-status-badge cop-status-confirmed">
            <span className="cop-status-dot" /> Approved
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            <span className="cop-spinner" />
            Preparing email…
          </div>
        ) : (
          <div className="cop-detail-body" style={{ gap: '0.9rem' }}>
            <div style={{
              background: 'rgba(54,229,194,0.07)',
              border: '1px solid rgba(54,229,194,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.9rem',
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
              lineHeight: 1.7,
            }}>
              <strong style={{ color: 'var(--teal)', display: 'block', marginBottom: '0.15rem' }}>
                Invoice will be attached automatically.
              </strong>
              Edit the subject and body if needed, then click <strong style={{ color: 'var(--text)' }}>Send Email</strong>.
              The invoice PDF will be generated and sent as an attachment via your configured SMTP server.
              {' '}<span style={{ opacity: 0.7 }}>( Settings → Email / SMTP to configure )</span>
            </div>
            <div className="qh-email-field">
              <label className="qh-email-label">To</label>
              <div className="qh-email-to">
                {clientEmail
                  ? <a href={`mailto:${clientEmail}`} className="qh-email-addr">{clientEmail}</a>
                  : <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No email address on file for this client</span>
                }
              </div>
            </div>
            <div className="qh-email-field">
              <label className="qh-email-label">Subject</label>
              <input
                className="qh-email-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="qh-email-field">
              <label className="qh-email-label">Body</label>
              <textarea
                className="qh-email-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
              />
            </div>
          </div>
        )}

        {!loading && (
          <div className="cop-detail-footer" style={{ justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button className="qh-action-btn" onClick={handleCopy} style={{ minWidth: 110 }}>
              {copied ? '✓ Copied!' : 'Copy Body'}
            </button>
            <button className="cop-pdf-btn" onClick={handleDownloadInvoice} disabled={invoiceLoading} title="Preview invoice PDF">
              {invoiceLoading ? (
                <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              )}
              {invoiceLoading ? 'Generating…' : 'Preview PDF'}
            </button>
            <button
              className="cop-pdf-btn"
              onClick={handleSendEmail}
              disabled={sending || !clientEmail}
              title={clientEmail ? `Send to ${clientEmail} with PDF attached` : 'No email address on file for this client'}
              style={sent ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)', color: '#4ade80' } : {}}
            >
              {sending ? (
                <span className="cop-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
              ) : sent ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              )}
              {sending ? 'Sending…' : sent ? 'Sent!' : 'Send Email'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Calculation row ───────────────────────────────────────────────────────────
function CalcRow({ calc, isApproved, hasOtherApproved, onViewDetail, onApproveRequest, onEmailDraft, versionLabel, clientName, orderName }) {
  const [pdfLoading, setPdfLoading]             = useState(false)
  const [quotationLoading, setQuotationLoading] = useState(false)

  async function handleInvoicePDF(e) {
    e.stopPropagation()
    setPdfLoading(true)
    try {
      const data = calc.result ? calc : await api.getCalculation(calc.id)
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateInvoicePDF(buildInvoicePayload(data, clientName, orderName), cs)
    } catch (err) {
      toast.error(err.message || 'PDF generation failed')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleQuotationPDF(e) {
    e.stopPropagation()
    setQuotationLoading(true)
    try {
      const data = calc.result ? calc : await api.getCalculation(calc.id)
      let cs = {}
      try { cs = await api.getCompanySettings() } catch (_) {}
      generateQuotationPDF(buildQuotationPayload(data, clientName, orderName), cs)
    } catch (err) {
      console.error(err)
    } finally {
      setQuotationLoading(false)
    }
  }

  return (
    <div
      className={`cop-calc-row${isApproved ? ' cop-calc-row--approved' : ''}`}
      onClick={onViewDetail}
    >
      {/* left accent bar */}
      <div className="cop-calc-accent" />

      {/* main info */}
      <div className="cop-calc-main">
        <div className="cop-calc-size">
          {versionLabel && (
            <span style={{
              fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--teal-light)', background: 'var(--teal-dim)',
              border: '1px solid var(--teal-mid)', borderRadius: 4,
              padding: '0.1rem 0.4rem', marginRight: '0.45rem', letterSpacing: '0.04em',
            }}>
              {versionLabel}
            </span>
          )}
          {fmt(calc.width, 1)} × {fmt(calc.height, 1)} mm
        </div>
        <div className="cop-calc-meta">
          {calc.substrate_name || 'Custom substrate'}
          {calc.yield_pct ? ` · ${calc.yield_pct}% yield` : ''}
          {' · '}{fmtDateTime(calc.created_at)}
        </div>
      </div>

      {/* pricing block */}
      {calc.pricing && (
        <div className="cop-calc-prices">
          <div className="cop-calc-price-inr">₹ {fmt(calc.pricing.price_inr_1000)}</div>
          <div className="cop-calc-price-usd">$ {fmt(calc.pricing.price_usd_1000, 3)}</div>
          <div className="cop-calc-price-unit">/ 1000 labels</div>
        </div>
      )}

      {/* approve action */}
      <div className="cop-calc-actions" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {isApproved && (
            <span className="cop-approved-chip">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Approved
            </span>
          )}
          <button className="cop-pdf-btn cop-pdf-btn--sm" onClick={handleQuotationPDF} disabled={quotationLoading} title="Download internal quotation">
            {quotationLoading ? (
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
          {isApproved ? (
            <>
              <button className="cop-pdf-btn cop-pdf-btn--sm" onClick={handleInvoicePDF} disabled={pdfLoading} title="Download client invoice">
                {pdfLoading ? (
                  <span className="cop-spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                Invoice
              </button>
              <button
                className="cop-pdf-btn cop-pdf-btn--sm"
                onClick={(e) => { e.stopPropagation(); onEmailDraft?.(calc) }}
                title="Draft invoice email to client"
                style={{ background: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.30)', color: '#818cf8' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
              </button>
            </>
          ) : (
            <button
              className={`cop-approve-btn${hasOtherApproved ? ' cop-approve-btn--dimmed' : ''}`}
              onClick={() => onApproveRequest(calc)}
              title={hasOtherApproved ? 'Another calc is approved — click to swap' : 'Approve this calculation'}
            >
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Order panel ───────────────────────────────────────────────────────────────
function OrderPanel({ order, hideHeader, clientName, clientEmail }) {
  const [calcs, setCalcs]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [approvedId, setApprovedId] = useState(null)
  const [approvedVersions, setApprovedVersions] = useState([])
  const [busy, setBusy]           = useState(false)
  const [companySettings, setCompanySettings] = useState({})

  useEffect(() => {
    api.getCompanySettings().then(setCompanySettings).catch(() => {})
  }, [])

  // Modal states — only one shows at a time, except detailModal can layer over conflict
  const [detailModal, setDetailModal]         = useState(null) // { calcId, pendingCalcForConflict }
  const [versionDetailModal, setVersionDetailModal] = useState(null) // version object
  const [approveConfirm, setApproveConfirm]   = useState(null) // calc object
  const [conflict, setConflict]               = useState(null) // { pendingCalc, approvedCalc }
  const [swapConfirm, setSwapConfirm]         = useState(null) // { pendingCalc, approvedCalc }
  const [emailDraftCalc, setEmailDraftCalc]   = useState(null) // calc object for email draft

  useEffect(() => {
    setLoading(true)
    api.getOrderCalculations(order.id)
      .then(async (cs) => {
        setCalcs(cs)
        const approved = cs.find((c) => c.status === 'confirmed')
        if (approved) setApprovedId(approved.id)

        // Also find any approved edited versions across all calcs in this order
        if (cs.length > 0) {
          const arrays = await Promise.all(cs.map((c) => api.getVersions(c.id).catch(() => [])))
          setApprovedVersions(arrays.flat().filter((v) => v.status === 'confirmed'))
        }
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
    } catch (e) { toast.error(e.message || 'Failed to approve quote') }
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
    } catch (e) { toast.error(e.message || 'Failed to swap approval') }
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
    } catch (e) { toast.error(e.message || 'Failed to unapprove quote') }
    setBusy(false)
  }

  return (
    <div className="cop-order-panel">
      {!hideHeader && (
        <div className="cop-order-panel-header">
          <span className="cop-order-panel-name">{order.name}</span>
          <span className="cop-order-panel-date">{fmtDate(order.created_at)}</span>
          {(approvedId || approvedVersions.length > 0) && (
            <span className="cop-order-approved-badge">★ Has approved quote</span>
          )}
        </div>
      )}

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
        {!loading && calcs && calcs.length > 0 &&
          calcs.filter((c) => c.status === 'confirmed').length === 0 &&
          approvedVersions.length === 0 && (
          <div className="cop-calcs-empty">
            No approved quotes for this order yet. Go to Pricing Calculator, save a result and approve it.
          </div>
        )}
        {!loading && calcs && (
          calcs.filter((c) => c.status === 'confirmed').length > 0 ||
          approvedVersions.length > 0
        ) && (
          <div className="cop-calcs-list">
            {calcs.filter((c) => c.status === 'confirmed').map((c) => (
              <CalcRow
                key={c.id}
                calc={c}
                isApproved={true}
                hasOtherApproved={false}
                onViewDetail={() => setDetailModal({ calcId: c.id, pendingCalcForConflict: null })}
                onApproveRequest={handleApproveRequest}
                onEmailDraft={setEmailDraftCalc}
                clientName={clientName}
                orderName={order.name}
                companySettings={companySettings}
              />
            ))}
            {approvedVersions.map((v) => (
              <CalcRow
                key={`v-${v.id}`}
                calc={{ ...v, pricing: v.result?.pricing }}
                isApproved={true}
                hasOtherApproved={false}
                versionLabel={`Edit v${v.version_number}`}
                onViewDetail={() => setVersionDetailModal(v)}
                onApproveRequest={() => {}}
                onEmailDraft={setEmailDraftCalc}
                clientName={clientName}
                orderName={order.name}
                companySettings={companySettings}
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
          clientName={clientName}
          orderName={order.name}
          companySettings={companySettings}
        />
      )}

      {versionDetailModal && (
        <VersionQuoteDetailModal
          version={versionDetailModal}
          onClose={() => setVersionDetailModal(null)}
          clientName={clientName}
          orderName={order.name}
          companySettings={companySettings}
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

      {emailDraftCalc && (
        <DraftEmailModal
          calc={emailDraftCalc}
          clientEmail={clientEmail}
          clientName={clientName}
          orderName={order.name}
          onClose={() => setEmailDraftCalc(null)}
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
  const orderName                = nextNum()
  const [orderDate, setOrderDate] = useState(today)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const created = await api.createOrder(clientId, orderName, orderDate || null)
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
            value={orderName}
            readOnly
            style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-raised)' }}
          />
        </div>
        <div className="cop-field">
          <label className="cop-label">Order Date</label>
          <input
            className="cop-input" type="date"
            value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
            disabled={busy} autoFocus
          />
        </div>
      </div>
      {err && <div className="cop-inline-err">{err}</div>}
      <div className="cop-new-order-actions">
        <button className="cop-btn cop-btn--primary" type="submit" disabled={busy}>
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
        } catch (e) {
          setOrders([])
          toast.error(e.message || 'Failed to load orders')
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
              {[client.industry, client.location].filter(Boolean).join(' · ')}
              {(client.industry || client.location) ? ' · ' : ''}
              Added {fmtDate(client.created_at)}
              {orders !== null && ` · ${orders.length} order${orders.length !== 1 ? 's' : ''}`}
            </div>
            {(client.email || client.phone) && (
              <div className="cop-customer-contacts">
                {client.email && <span className="cop-contact-item">✉ {client.email}</span>}
                {client.phone && <span className="cop-contact-item">📞 {client.phone}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="cop-edit-btn"
              onClick={(e) => { e.stopPropagation(); setShowEdit(true) }}
              title="Edit customer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
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
                  <div className="cop-orders-list">
                    {orders.map((o) => {
                      const isActive = activeOrderId === o.id
                      return (
                        <div key={o.id} className={`cop-order-item${isActive ? ' cop-order-item--open' : ''}`}>
                          <button
                            className="cop-order-item-row"
                            onClick={() => setActiveOrderId(isActive ? null : o.id)}
                          >
                            <div className="cop-order-item-icon">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            </div>
                            <div className="cop-order-item-info">
                              <span className="cop-order-item-name">{o.name}</span>
                              <span className="cop-order-item-date">{fmtDate(o.created_at)}</span>
                            </div>
                            <svg
                              className={`cop-order-item-chevron${isActive ? ' cop-order-item-chevron--open' : ''}`}
                              width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round"
                            >
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>
                          {isActive && (
                            <div className="cop-order-item-body">
                              <OrderPanel order={o} hideHeader clientName={client.name} clientEmail={client.email || ''} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
  const [name,     setName]     = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true); setErr(null)
    try {
      const created = await api.createClient({
        name: trimmed,
        location: location.trim() || null,
        industry: industry.trim() || null,
        email:    email.trim()    || null,
        phone:    phone.trim()    || null,
      })
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

          <div className="cop-field">
            <label className="cop-label">Location</label>
            <input
              className="cop-input" type="text"
              placeholder="e.g. Bengaluru"
              value={location} onChange={(e) => setLocation(e.target.value)}
              disabled={busy} maxLength={200}
            />
          </div>

          <div className="cop-field">
            <label className="cop-label">Industry</label>
            <input
              className="cop-input" type="text"
              placeholder="e.g. Beverages"
              value={industry} onChange={(e) => setIndustry(e.target.value)}
              disabled={busy} maxLength={120}
            />
          </div>

          <div className="cop-field">
            <label className="cop-label">Email</label>
            <input
              className="cop-input" type="email"
              placeholder="e.g. contact@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={busy} maxLength={200}
            />
          </div>

          <div className="cop-field">
            <label className="cop-label">Phone</label>
            <input
              className="cop-input" type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              onKeyDown={blockNonPhone} onPaste={pastePhoneOnly}
              disabled={busy} maxLength={15}
            />
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
