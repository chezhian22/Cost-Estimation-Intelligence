import React, { useState } from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtN = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

const TIERS = [
  { key: 'rate_15',  label: '1 : 1.5' },
  { key: 'rate_175', label: '1 : 1.75' },
  { key: 'rate_2',   label: '1 : 2' },
]

function computePricing(row, inputs) {
  const label_w_cm = row.label_width / 10
  const label_h_cm = row.label_height / 10
  const labels_sqm = (10000 / label_w_cm) / label_h_cm
  const yld        = parseFloat(inputs.yield_pct) || 85
  const adj_labels = labels_sqm * yld / 100
  const substrate_price = parseFloat(inputs.substrate_price) || 0
  const foil_cost       = parseFloat(inputs.foil_cost)       || 0
  const custom_cost     = parseFloat(inputs.custom_cost)     || 0
  const exchange_rate   = parseFloat(inputs.exchange_rate)   || 85
  const cost_per_label  = (adj_labels > 0 ? (substrate_price + foil_cost) / adj_labels : 0) + custom_cost
  const rate_2 = cost_per_label * 2000
  return {
    label_w_cm, label_h_cm, labels_sqm, adj_labels,
    substrate_price, foil_cost, custom_cost,
    rate_15:  cost_per_label * 1500,
    rate_175: cost_per_label * 1750,
    rate_2,
    price_inr_label: rate_2 / 1000,
    price_inr_1000:  rate_2,
    price_usd_label: exchange_rate > 0 ? rate_2 / exchange_rate / 1000 : 0,
    price_usd_1000:  exchange_rate > 0 ? rate_2 / exchange_rate : 0,
  }
}

export default function PricingPanel({ result, orderQty, selectedIdx, inputs }) {
  const [activeTier,       setActiveTier]       = useState('rate_2')
  const [customMultiplier, setCustomMultiplier] = useState('')

  if (!result) return null
  const matchedRow  = result.rows[result.matched.index]
  const selIdx      = selectedIdx ?? result.matched.index
  const selectedRow = result.rows[selIdx]
  const isCustomSel = selIdx !== result.matched.index

  // Use recomputed pricing if a non-matched cylinder is selected and inputs available
  const p = (isCustomSel && inputs && selectedRow)
    ? computePricing(selectedRow, inputs)
    : result.pricing

  const qty = parseFloat(orderQty) || 0

  const costPerLabel = p.rate_2 / 2000
  const usdRatio     = p.rate_2 > 0 ? p.price_usd_1000 / p.rate_2 : 0

  const customM    = parseFloat(customMultiplier)
  const customRate = (!isNaN(customM) && customM > 0) ? costPerLabel * customM * 1000 : null

  const tierRate      = activeTier === 'custom' ? (customRate ?? 0) : p[activeTier]
  const priceInr1000  = tierRate
  const priceInrLabel = tierRate / 1000
  const priceUsd1000  = tierRate * usdRatio
  const priceUsdLabel = priceUsd1000 / 1000

  const activeTierLabel = activeTier === 'custom'
    ? `1 : ${customMultiplier || '?'}`
    : TIERS.find(t => t.key === activeTier)?.label

  const analytics = qty > 0 ? {
    sqm:      qty / p.adj_labels,
    meters:   (qty / p.adj_labels) / (matchedRow.paper_size / 1000),
    totalInr: qty * priceInrLabel,
    totalUsd: qty * priceUsdLabel,
  } : null

  return (
    <section className="card pricing-card">
      <div className="card-header">
        <div className="card-icon-wrap">◉</div>
        <span className="card-title">Pricing Output</span>
        {isCustomSel && selectedRow && (
          <span style={{
            marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700,
            padding: '0.15rem 0.55rem', borderRadius: 100,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.40)',
            color: '#a5b4fc',
          }}>
            {selectedRow.teeth} teeth selected
          </span>
        )}
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
          <span className="meta-label">Adj. Labels / m²</span>
          <span className="meta-value">{fmt(p.adj_labels)}</span>
        </div>
        {p.substrate_price != null && (
          <div className="meta-item">
            <span className="meta-label">Substrate Cost</span>
            <span className="meta-value">₹ {fmt(p.substrate_price)} / m²</span>
          </div>
        )}
        {p.foil_cost != null && p.foil_cost > 0 && (
          <div className="meta-item">
            <span className="meta-label">Foil Cost</span>
            <span className="meta-value meta-value--foil">₹ {fmt(p.foil_cost)} / m²</span>
          </div>
        )}
        {p.custom_cost != null && p.custom_cost > 0 && (
          <div className="meta-item">
            <span className="meta-label">Custom Cost</span>
            <span className="meta-value">₹ {fmt(p.custom_cost, 3)} / label</span>
          </div>
        )}
        {p.substrate_price != null && p.foil_cost != null && p.foil_cost > 0 && (
          <div className="meta-item">
            <span className="meta-label">Total Material</span>
            <span className="meta-value meta-value--total">₹ {fmt(p.substrate_price + p.foil_cost)} / m²</span>
          </div>
        )}
      </div>

      <div className="section-label">Rate Tiers</div>
      <div className="rates-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {TIERS.map(({ key, label }) => (
          <div
            key={key}
            className={`rate-card${activeTier === key ? ' active' : ''}`}
            onClick={() => setActiveTier(key)}
            style={{ cursor: 'pointer' }}
          >
            <span className="rate-ratio">{label}</span>
            <span className="rate-amount">₹ {fmt(p[key])}</span>
          </div>
        ))}
        <div
          className={`rate-card${activeTier === 'custom' ? ' active' : ''}`}
          onClick={() => setActiveTier('custom')}
          style={{ cursor: 'pointer' }}
        >
          <span className="rate-ratio">Custom</span>
          {activeTier === 'custom' ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.2rem', marginTop: '0.25rem',
                fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.9rem',
                color: 'var(--teal-bright)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span>1 :</span>
              <input
                type="number"
                min="0.1"
                step="0.05"
                placeholder="?"
                value={customMultiplier}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || parseFloat(v) > 0) setCustomMultiplier(v)
                }}
                style={{
                  width: '3rem',
                  background: 'transparent',
                  border: 'none', borderBottom: '1px solid var(--teal)',
                  color: 'var(--teal-bright)', fontFamily: 'JetBrains Mono',
                  fontSize: '0.9rem', fontWeight: 700,
                  textAlign: 'center', outline: 'none', padding: '0',
                }}
                autoFocus
              />
            </div>
          ) : (
            <span className="rate-amount" style={{ fontSize: '0.75rem' }}>
              {customRate != null ? `₹ ${fmt(customRate)}` : '1 : ?'}
            </span>
          )}
        </div>
      </div>

      <div className="section-divider" />

      <div className="section-label">
        Final Pricing
        <span style={{ marginLeft: '0.5rem', fontFamily: 'JetBrains Mono', color: 'var(--teal)', fontWeight: 700 }}>
          ({activeTierLabel})
        </span>
      </div>
      <div className="currency-row">
        <div className="currency-block inr-block">
          <div className="currency-symbol">
            <span className="currency-symbol-dot" />
            ₹ INR
          </div>
          <div className="price-row">
            <span className="price-row-label">Per Label</span>
            <span className="price-amount">₹ {fmt(priceInrLabel, 3)}</span>
          </div>
          <div className="price-row featured">
            <span className="price-row-label">Per 1000 Labels</span>
            <span className="price-amount">₹ {fmt(priceInr1000, 2)}</span>
          </div>
        </div>

        <div className="currency-block usd-block">
          <div className="currency-symbol">
            <span className="currency-symbol-dot" />
            $ USD
          </div>
          <div className="price-row">
            <span className="price-row-label">Per Label</span>
            <span className="price-amount">$ {fmt(priceUsdLabel, 3)}</span>
          </div>
          <div className="price-row featured">
            <span className="price-row-label">Per 1000 Labels</span>
            <span className="price-amount">$ {fmt(priceUsd1000, 2)}</span>
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
