import React from 'react'

const fmt = (v, d = 2) => Number(v).toFixed(d)

export default function PricingPanel({ result }) {
  if (!result) return null
  const p = result.pricing

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
          <span className="meta-label">Adjusted Labels / m²</span>
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
    </section>
  )
}
