import React from 'react'
import './PDFPreview.css'
import { generatePDF } from '../../../utils/generatePDF'

const SAMPLE = {
  client: {
    name:     'Kingfisher Breweries Ltd.',
    location: 'Bengaluru, Karnataka, India',
    email:    'procurement@kingfisher.com',
    phone:    '+91-80-2345-6789',
  },
  order: {
    order_id: 'CALC-108',
    label:    'KF-2026-Premium-Label',
  },
  inputs: {
    label_width_mm:  64.5,
    label_height_mm: 136.0,
    substrate:       'BOPP Gloss 40µ',
    total_qty:       100000,
  },
  approved_cylinder: {
    teeth:  336,
    around: 1,
    across: 5,
  },
  pricing: {
    selling_price_per_label: 1.1566,
    total_cost_inr:          115658,
    total_cost_usd:          1360.68,
  },
}

export default function PDFPreview() {
  const p        = SAMPLE.pricing
  const qty      = SAMPLE.inputs.total_qty
  const subtotal = p.total_cost_inr
  const gst      = subtotal * 0.18
  const totalInr = subtotal + gst

  const ind = (n, d = 2) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

  const subLine = [
    SAMPLE.inputs.substrate,
    `${SAMPLE.inputs.label_width_mm} × ${SAMPLE.inputs.label_height_mm} mm`,
    `Cyl. ${SAMPLE.approved_cylinder.teeth}T`,
    `Layout ${SAMPLE.approved_cylinder.across}×${SAMPLE.approved_cylinder.around}`,
  ].join(' · ')

  return (
    <div className="pp-page">

      <div className="pp-page-header">
        <div>
          <h1 className="pp-title">PDF Quote Preview</h1>
          <p className="pp-sub">Sample client quotation — no internal cost details shown</p>
        </div>
        <button className="pp-btn-generate" onClick={() => generatePDF(SAMPLE)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Generate Sample PDF
        </button>
      </div>

      {/* ── Invoice preview ── */}
      <div className="pp-invoice">

        {/* Header */}
        <div className="pp-inv-header">
          <div>
            <div className="pp-co-name">CHROMAPRINT</div>
            <div className="pp-co-sub">India Private Limited</div>
            <div className="pp-co-meta">
              Coimbatore – 641 022, India<br />
              +91-422-2642738 · sales@chromaprintindia.com
            </div>
          </div>
          <div className="pp-doc-block">
            <div className="pp-doc-type">QUOTATION</div>
            <div className="pp-quote-num"># QT-{new Date().getFullYear()}-4291</div>
            <div className="pp-quote-meta">
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br />
              Valid: 30 days from issue
            </div>
          </div>
        </div>

        <div className="pp-divider" />

        {/* Bill To */}
        <div className="pp-bill">
          <div className="pp-bill-label">Bill To</div>
          <div className="pp-bill-name">{SAMPLE.client.name}</div>
          <div className="pp-bill-detail">
            {SAMPLE.client.location}<br />
            {SAMPLE.client.email}<br />
            {SAMPLE.client.phone}
          </div>
          <div className="pp-bill-ref">
            <span><strong>Order:</strong> {SAMPLE.order.label}</span>
            <span><strong>Ref:</strong> {SAMPLE.order.order_id}</span>
          </div>
        </div>

        {/* Items table */}
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="pp-item-main">Pressure Sensitive Labels</div>
                  <div className="pp-item-sub">{subLine}</div>
                </td>
                <td>{qty.toLocaleString('en-IN')} labels</td>
                <td>₹ {p.selling_price_per_label.toFixed(4)} / label</td>
                <td>₹ {ind(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="pp-totals-wrap">
          <div className="pp-totals">
            <div className="pp-tot-row">
              <span className="pp-tot-lbl">Subtotal</span>
              <span className="pp-tot-val">₹ {ind(subtotal)}</span>
            </div>
            <div className="pp-tot-row">
              <span className="pp-tot-lbl">GST @ 18%</span>
              <span className="pp-tot-val">₹ {ind(gst)}</span>
            </div>
            <div className="pp-tot-final">
              <span className="pp-tot-final-lbl">TOTAL (INR)</span>
              <span className="pp-tot-final-val">₹ {ind(totalInr)}</span>
            </div>
            <div className="pp-tot-usd">
              <span className="pp-tot-lbl" style={{ color: '#2563eb' }}>Total (USD)</span>
              <span className="pp-tot-val" style={{ color: '#1d4ed8' }}>$ {Number(p.total_cost_usd).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pp-inv-footer">
          <div className="pp-footer-terms">
            <strong>Terms &amp; Conditions</strong><br />
            Valid 30 days · GST @ 18% included in total · 50% advance required before production<br />
            Subject to substrate availability · Prices subject to change without notice
          </div>
          <div className="pp-footer-contact">
            <strong>Chromaprint India Pvt. Ltd.</strong><br />
            sales@chromaprintindia.com<br />
            +91-422-2642739
          </div>
        </div>

      </div>{/* /invoice */}
    </div>
  )
}
