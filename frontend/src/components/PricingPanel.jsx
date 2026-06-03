import React from 'react'

const fmt = (v, d = 2) => Number(v).toFixed(d)

export default function PricingPanel({ result }) {
  if (!result) return null
  const p = result.pricing

  return (
    <section className="card pricing-card">
      <h2><span className="card-icon">💰</span> Pricing</h2>
      <div className="pricing-grid">
        <div className="price-item label-size">
          <span className="price-label">Label Size</span>
          <span className="price-value">{fmt(p.label_w_cm)} × {fmt(p.label_h_cm)} cm</span>
        </div>
        <div className="price-item">
          <span className="price-label">Labels / m²</span>
          <span className="price-value">{fmt(p.labels_sqm)}</span>
        </div>
        <div className="price-item">
          <span className="price-label">Adjusted Labels / m²</span>
          <span className="price-value">{fmt(p.adj_labels)}</span>
        </div>

        <div className="divider"></div>

        <div className="rates-section">
          <h3>Rate Tiers</h3>
          <div className="rates-grid">
            <div className="rate-item">
              <span className="rate-label">Rate 1 : 1.5</span>
              <span className="rate-value">₹ {fmt(p.rate_15)}</span>
            </div>
            <div className="rate-item">
              <span className="rate-label">Rate 1 : 1.75</span>
              <span className="rate-value">₹ {fmt(p.rate_175)}</span>
            </div>
            <div className="rate-item highlight">
              <span className="rate-label">Rate 1 : 2</span>
              <span className="rate-value">₹ {fmt(p.rate_2)}</span>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="final-prices">
          <div className="currency-block inr-block">
            <h3>₹ INR</h3>
            <div className="price-row">
              <span>Price per Label</span>
              <span className="price-big">₹ {fmt(p.price_inr_label, 3)}</span>
            </div>
            <div className="price-row featured">
              <span>Price per 1000 Labels</span>
              <span className="price-big">₹ {fmt(p.price_inr_1000, 3)}</span>
            </div>
          </div>
          <div className="currency-block usd-block">
            <h3>$ USD</h3>
            <div className="price-row">
              <span>Price per Label</span>
              <span className="price-big">$ {fmt(p.price_usd_label, 3)}</span>
            </div>
            <div className="price-row featured">
              <span>Price per 1000 Labels</span>
              <span className="price-big">$ {fmt(p.price_usd_1000, 3)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
