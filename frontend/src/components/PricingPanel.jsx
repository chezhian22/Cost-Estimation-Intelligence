import React from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtN = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

function orderAnalytics(pricing, matchedRow, qty) {
  if (!qty || qty <= 0) return null
  const paperSizeM = matchedRow.paper_size / 1000
  const sqm        = qty / pricing.adj_labels
  const meters     = sqm / paperSizeM
  const totalInr   = qty * pricing.price_inr_label
  const totalUsd   = qty * pricing.price_usd_label
  return { sqm, meters, totalInr, totalUsd }
}

export default function PricingPanel({ result, orderQty }) {
  if (!result) return null
  const p          = result.pricing
  const matchedRow = result.rows[result.matched.index]
  const qty        = parseFloat(orderQty) || 0
  const analytics  = orderAnalytics(p, matchedRow, qty)

  return (
    <section className="card pricing-card">
      <div className="card-header">
        <div className="card-icon-wrap">◉</div>
        <span className="card-title">Pricing Output</span>
        <span className="card-number">SYS-03</span>
      </div>

      <div className="pricing-meta">
        <div className="meta-item">
          <span className="meta-label">Label Size</span>
          <span className="meta-value">{fmt(p.label_w_cm)} × {fmt(p.label_h_cm)} cm</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Labels / m²</span>
          <span className="meta-value">{fmt(p.labels_sqm)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Labels after wastage / m²</span>
          <span className="meta-value">{fmt(p.adj_labels)}</span>
        </div>
      </div>

      <div className="section-label">Rate Tiers</div>
      <div className="rates-grid">
        <div className="rate-card">
          <span className="rate-ratio">1 : 1.5</span>
          <span className="rate-amount">₹ {fmt(p.rate_15)}</span>
        </div>
        <div className="rate-card">
          <span className="rate-ratio">1 : 1.75</span>
          <span className="rate-amount">₹ {fmt(p.rate_175)}</span>
        </div>
        <div className="rate-card active">
          <span className="rate-ratio">1 : 2</span>
          <span className="rate-amount">₹ {fmt(p.rate_2)}</span>
        </div>
      </div>

      <div className="section-divider" />

      <div className="section-label">Final Pricing</div>
      <div className="currency-row">
        <div className="currency-block inr-block">
          <div className="currency-symbol">
            <span className="currency-symbol-dot" />
            ₹ INR
          </div>
          <div className="price-row">
            <span className="price-row-label">Price per Label</span>
            <span className="price-amount">₹ {fmt(p.price_inr_label, 3)}</span>
          </div>
          <div className="price-row featured">
            <span className="price-row-label">Per 1000 Labels</span>
            <span className="price-amount">₹ {fmt(p.price_inr_1000, 3)}</span>
          </div>
        </div>

        <div className="currency-block usd-block">
          <div className="currency-symbol">
            <span className="currency-symbol-dot" />
            $ USD
          </div>
          <div className="price-row">
            <span className="price-row-label">Price per Label</span>
            <span className="price-amount">$ {fmt(p.price_usd_label, 3)}</span>
          </div>
          <div className="price-row featured">
            <span className="price-row-label">Per 1000 Labels</span>
            <span className="price-amount">$ {fmt(p.price_usd_1000, 3)}</span>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          <div className="section-divider" />
          <div className="section-label">
            Order Analytics{' '}
            <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
              × {Number(qty).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="order-analytics-grid">
            <div className="oa-card">
              <span className="oa-label">Substrate Area</span>
              <span className="oa-value">{fmtN(analytics.sqm)} m²</span>
            </div>
            <div className="oa-card">
              <span className="oa-label">Linear Meters</span>
              <span className="oa-value">{fmtN(analytics.meters)} m</span>
            </div>
            <div className="oa-card oa-inr">
              <span className="oa-label">Total Cost (INR)</span>
              <span className="oa-value">₹ {fmtN(analytics.totalInr, 0)}</span>
            </div>
            <div className="oa-card oa-usd">
              <span className="oa-label">Total Cost (USD)</span>
              <span className="oa-value">$ {fmtN(analytics.totalUsd, 2)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
