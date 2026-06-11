import React from 'react'
import './PDFPreview.css'
import { generatePDF } from '../../../utils/generatePDF'

const SAMPLE = {
  client:  'Kingfisher Breweries Ltd.',
  order:   'KF-2026-Premium-Label',
  quoteNo: 'QT-2026-4291',
  inputs: {
    width:           64.5,
    height:          136,
    yield_pct:       85,
    substrate_price: 45,
    foil_cost:       3.5,
    custom_cost:     0.02,
    exchange_rate:   85,
    order_qty:       50000,
    substrate_name:  'BOPP Gloss 40µ',
  },
  cylinder: {
    teeth:        336,
    circumference: 336,
    label_width:   64.8,
    label_height:  136.0,
    around:        1,
    across:        5,
    paper_size:    340,
    efficiency:    99.5,
  },
  pricing: {
    label_w_cm:      6.48,
    label_h_cm:      13.6,
    labels_sqm:      113.5,
    adj_labels:      96.5,
    substrate_price: 45,
    foil_cost:       3.5,
    custom_cost:     0.02,
    rate_15:         767.2,
    rate_175:        895.1,
    rate_2:          1022.9,
    price_inr_label: 1.023,
    price_inr_1000:  1022.9,
    price_usd_label: 0.01204,
    price_usd_1000:  12.04,
  },
  order_analytics: {
    qty:           50000,
    sqm_needed:    518.1,
    linear_meters: 1524.1,
    total_inr_2:   51145,
    total_usd_2:   602.0,
  },
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className={`pp-info-row${highlight ? ' pp-info-row--hl' : ''}`}>
      <span className="pp-info-lbl">{label}</span>
      <span className="pp-info-val">{value}</span>
    </div>
  )
}

export default function PDFPreview() {
  const p  = SAMPLE.pricing
  const oa = SAMPLE.order_analytics

  const usdRatio = p.price_usd_1000 / p.rate_2

  const tiers = [
    { label: '1 : 1.5',  inr: p.rate_15,  usd: p.rate_15 * usdRatio },
    { label: '1 : 1.75', inr: p.rate_175, usd: p.rate_175 * usdRatio },
    { label: '1 : 2',    inr: p.rate_2,   usd: p.price_usd_1000, highlight: true },
  ]

  const ind = (n, d = 2) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

  function handleGenerate() {
    generatePDF(SAMPLE)
  }

  return (
    <div className="pp-page">

      {/* Page header */}
      <div className="pp-page-header">
        <div>
          <h1 className="pp-title">PDF Quote Generator</h1>
          <p className="pp-sub">Preview of the generated quote layout &mdash; sample data shown</p>
        </div>
        <button className="pp-btn-generate" onClick={handleGenerate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Generate Sample PDF
        </button>
      </div>

      {/* Document preview */}
      <div className="pp-doc">

        {/* Header */}
        <div className="pp-doc-header">
          <div>
            <div className="pp-co-name">CHROMAPRINT <span>INDIA</span></div>
            <div className="pp-co-addr">
              SF No. 215/2, Mettupalayam Road, Coimbatore &ndash; 641 022<br />
              +91-422-2642738 &nbsp;·&nbsp; sales@chromaprintindia.com
            </div>
          </div>
          <div className="pp-quote-block">
            <div className="pp-quote-badge">Price Quotation</div>
            <div className="pp-quote-no">{SAMPLE.quoteNo}</div>
            <div className="pp-quote-date">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div className="pp-doc-body">

          {/* Bill To */}
          <div className="pp-bill-row">
            <div className="pp-bill-card">
              <div className="pp-bill-head">Bill To</div>
              <div className="pp-bill-name">{SAMPLE.client}</div>
              <div className="pp-bill-sub">Order: {SAMPLE.order}</div>
            </div>
            <div className="pp-bill-card">
              <div className="pp-bill-head">Quote Details</div>
              <InfoRow label="Quote Number" value={SAMPLE.quoteNo} />
              <InfoRow label="Date Issued"  value={new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} />
              <InfoRow label="Valid Until"  value={(() => { const d = new Date(); d.setDate(d.getDate()+30); return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) })()} />
            </div>
          </div>

          {/* Specification */}
          <div className="pp-sec-head">Label &amp; Cylinder Specification</div>
          <div className="pp-spec-grid">
            {[
              ['Label Width',    `${SAMPLE.inputs.width} mm`],
              ['Label Height',   `${SAMPLE.inputs.height} mm`],
              ['Yield',          `${SAMPLE.inputs.yield_pct}%`],
              ['Substrate',      SAMPLE.inputs.substrate_name],
              ['Substrate Cost', `₹ ${SAMPLE.inputs.substrate_price} / m²`],
              ['Foil Cost',      `₹ ${SAMPLE.inputs.foil_cost} / m²`],
              ['Exchange Rate',  `₹ ${SAMPLE.inputs.exchange_rate} per $1`],
              ['Order Qty',      `${SAMPLE.inputs.order_qty.toLocaleString('en-IN')} labels`],
              ['Cylinder Teeth',  SAMPLE.cylinder.teeth],
              ['Circumference',  `${SAMPLE.cylinder.circumference} mm`],
              ['Around × Across',`${SAMPLE.cylinder.around} × ${SAMPLE.cylinder.across}`],
              ['Paper Size',     `${SAMPLE.cylinder.paper_size} mm`],
            ].map(([l, v]) => (
              <div key={l} className="pp-spec-cell">
                <span className="pp-spec-lbl">{l}</span>
                <span className="pp-spec-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Rate Tiers */}
          <div className="pp-sec-head">Rate Tier Pricing</div>
          <div className="pp-tier-row">
            {tiers.map(t => (
              <div key={t.label} className={`pp-tier-box${t.highlight ? ' pp-tier-box--hl' : ''}`}>
                {t.highlight && <div className="pp-rec-badge">Recommended</div>}
                <div className="pp-tier-ratio">{t.label}</div>
                <div className="pp-tier-inr">₹ {ind(t.inr)}</div>
                <div className="pp-tier-sub">per 1000 labels</div>
                <div className="pp-tier-usd">$ {t.usd.toFixed(2)} / 1000 labels</div>
              </div>
            ))}
          </div>

          {/* Order Analytics */}
          <div className="pp-sec-head">Order Analytics &mdash; {oa.qty.toLocaleString('en-IN')} Labels</div>
          <div className="pp-analytics-grid">
            <div className="pp-an-card">
              <div className="pp-an-lbl">Substrate Area</div>
              <div className="pp-an-val">{ind(oa.sqm_needed)} m²</div>
            </div>
            <div className="pp-an-card">
              <div className="pp-an-lbl">Linear Meters</div>
              <div className="pp-an-val">{ind(oa.linear_meters)} m</div>
            </div>
            <div className="pp-an-card pp-an-card--inr">
              <div className="pp-an-lbl">Total Cost (INR)</div>
              <div className="pp-an-val">₹ {ind(oa.total_inr_2, 0)}</div>
            </div>
            <div className="pp-an-card pp-an-card--usd">
              <div className="pp-an-lbl">Total Cost (USD)</div>
              <div className="pp-an-val">$ {oa.total_usd_2.toFixed(2)}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="pp-doc-footer">
            <div className="pp-doc-footer-left">
              <strong>Chromaprint India Private Limited</strong><br />
              SF No. 215/2, Mettupalayam Road, Coimbatore &ndash; 641 022, Tamil Nadu<br />
              Tel: +91-422-2642738 &nbsp;·&nbsp; Email: sales@chromaprintindia.com
            </div>
            <div className="pp-doc-footer-right">
              <div className="pp-sig-line">Authorised Signatory</div>
              <div className="pp-sig-co">Chromaprint India Pvt. Ltd.</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
