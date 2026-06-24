import React, { useState } from 'react'
import { createPortal } from 'react-dom'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtN = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

const TIERS = [
  { key: 'rate_15',  label: '1 : 1.5',  multiplier: 1.5  },
  { key: 'rate_175', label: '1 : 1.75', multiplier: 1.75 },
  { key: 'rate_2',   label: '1 : 2',    multiplier: 2.0  },
]

const QTY_BRACKETS = [100, 500, 1000, 5000, 10000, 50000]

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
    substrate_price, foil_cost, custom_cost, exchange_rate,
    rate_15:  cost_per_label * 1500,
    rate_175: cost_per_label * 1750,
    rate_2,
    price_inr_label: rate_2 / 1000,
    price_inr_1000:  rate_2,
    price_usd_label: exchange_rate > 0 ? rate_2 / exchange_rate / 1000 : 0,
    price_usd_1000:  exchange_rate > 0 ? rate_2 / exchange_rate : 0,
  }
}

export default function PricingPanel({ result, orderQty, selectedIdx, inputs, readOnly = false, initialTier, onTierChange }) {
  const [activeTier,            setActiveTier]            = useState(() => {
    if (initialTier && initialTier.startsWith('custom:')) return 'custom'
    return initialTier || 'rate_2'
  })
  const [customMultiplier,      setCustomMultiplier]      = useState(() => {
    if (initialTier && initialTier.startsWith('custom:')) return initialTier.slice(7)
    return ''
  })
  const [pendingTier,           setPendingTier]           = useState(null)
  const [pendingCustomMultiplier, setPendingCustomMultiplier] = useState('')

  if (!result) return null
  const matchedRow  = result.rows[result.matched.index]
  const selIdx      = selectedIdx ?? result.matched.index
  const selectedRow = result.rows[selIdx]
  const isCustomSel = selIdx !== result.matched.index

  const p = (isCustomSel && inputs && selectedRow)
    ? computePricing(selectedRow, inputs)
    : result.pricing

  const qty = parseFloat(orderQty) || 0

  const costPerLabel     = p.rate_2 / 2000
  const materialPerLabel = costPerLabel - (p.custom_cost || 0)
  const totalMaterial    = (p.substrate_price || 0) + (p.foil_cost || 0)
  const usdRatio         = p.rate_2 > 0 ? p.price_usd_1000 / p.rate_2 : 0

  const customM    = parseFloat(customMultiplier)
  const customRate = (!isNaN(customM) && customM > 0) ? costPerLabel * customM * 1000 : null

  const tierRate      = activeTier === 'custom' ? (customRate ?? 0) : p[activeTier]
  const priceInr1000  = tierRate
  const priceInrLabel = tierRate / 1000
  const priceUsd1000  = tierRate * usdRatio
  const priceUsdLabel = priceUsd1000 / 1000

  const activeTierObj   = TIERS.find(t => t.key === activeTier)
  const activeTierLabel = activeTier === 'custom'
    ? `1 : ${customMultiplier || '?'}`
    : activeTierObj?.label

  // Derived margin figures
  const costPer1000    = costPerLabel * 1000
  const marginPer1000  = priceInr1000 - costPer1000
  const marginPer1000Usd = priceUsd1000 - (costPer1000 * usdRatio)
  const marginPct      = priceInr1000 > 0 ? (marginPer1000 / priceInr1000 * 100) : 0

  // Label spec
  const labelArea_mm2 = p.label_w_cm * p.label_h_cm * 100
  const wasteLabels   = p.labels_sqm - p.adj_labels

  const analytics = qty > 0 ? {
    sqm:      qty / p.adj_labels,
    meters:   (qty / p.adj_labels) / (matchedRow.paper_size / 1000),
    totalInr: qty * priceInrLabel,
    totalUsd: qty * priceUsdLabel,
    totalCost: qty * costPerLabel,
    totalMargin: qty * (priceInrLabel - costPerLabel),
  } : null

  return (
    <section className="card pricing-card">
      {/* ── Header ── */}
      <div className="card-header">
        <div className="card-icon-wrap">◉</div>
        <span className="card-title">Pricing Output</span>
        {isCustomSel && selectedRow && (
          <span style={{
            marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 700,
            padding: '0.15rem 0.55rem', borderRadius: 100,
            background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.45)',
            color: '#4f46e5',
          }}>
            {selectedRow.teeth} teeth selected
          </span>
        )}
        <span className="card-number">SYS-03</span>
      </div>

      {/* ── Job Specification Strip ── */}
      <div className="spec-strip">
        <div className="spec-item">
          <span className="spec-item-label">Label Size</span>
          <span className="spec-item-val">{fmt(p.label_w_cm * 10, 1)} × {fmt(p.label_h_cm * 10, 1)} mm</span>
        </div>
        <div className="spec-sep" />
        <div className="spec-item">
          <span className="spec-item-label">Label Area</span>
          <span className="spec-item-val">{fmt(labelArea_mm2, 1)} mm²</span>
        </div>
        <div className="spec-sep" />
        <div className="spec-item">
          <span className="spec-item-label">Raw Labels / m²</span>
          <span className="spec-item-val">{fmt(p.labels_sqm, 1)}</span>
        </div>
        <div className="spec-sep" />
        <div className="spec-item">
          <span className="spec-item-label">Yield Adj. / m²</span>
          <span className="spec-item-val spec-item-val--teal">{fmt(p.adj_labels, 1)}</span>
          <span className="spec-item-sub">−{fmt(wasteLabels, 1)} waste</span>
        </div>
        <div className="spec-sep" />
        <div className="spec-item">
          <span className="spec-item-label">Yield</span>
          <span className="spec-item-val">{parseFloat(inputs?.yield_pct) || 85}%</span>
        </div>
        {(p.foil_cost || 0) > 0 && (
          <>
            <div className="spec-sep" />
            <div className="spec-item">
              <span className="spec-item-label">Foil</span>
              <span className="spec-item-val spec-item-val--amber">₹ {fmt(p.foil_cost)} / m²</span>
            </div>
          </>
        )}
      </div>

      {/* ── Cost Calculation Sheet ── */}
      <div className="calc-sheet">

        {/* Material inputs */}
        <div className="cs-row">
          <span className="cs-label">Substrate cost</span>
          <span className="cs-value">₹ {fmt(p.substrate_price)}<span className="cs-unit"> / m²</span></span>
        </div>
        {(p.foil_cost || 0) > 0 && (
          <div className="cs-row">
            <span className="cs-label">Foil cost</span>
            <span className="cs-value cs-value--amber">₹ {fmt(p.foil_cost)}<span className="cs-unit"> / m²</span></span>
          </div>
        )}
        {(p.foil_cost || 0) > 0 && (
          <div className="cs-row cs-row--subtotal">
            <span className="cs-label">Total material</span>
            <span className="cs-value">₹ {fmt(totalMaterial)}<span className="cs-unit"> / m²</span></span>
          </div>
        )}

        <div className="cs-divider" />

        {/* Label layout */}
        <div className="cs-row">
          <span className="cs-label">
            Labels per m²
            <span className="cs-hint">{fmt(p.labels_sqm)} raw × {inputs?.yield_pct || 85}% yield</span>
          </span>
          <span className="cs-value">{fmt(p.adj_labels)}</span>
        </div>

        <div className="cs-divider" />

        {/* Cost per label */}
        <div className="cs-row">
          <span className="cs-label">
            {(p.custom_cost || 0) > 0 ? 'Material per label' : 'Cost per label'}
            <span className="cs-hint">₹ {fmt(totalMaterial)} ÷ {fmt(p.adj_labels)}</span>
          </span>
          <span className="cs-value">₹ {fmt(materialPerLabel, 4)}</span>
        </div>
        {(p.custom_cost || 0) > 0 && (
          <div className="cs-row">
            <span className="cs-label">Custom cost</span>
            <span className="cs-value">₹ {fmt(p.custom_cost, 4)}<span className="cs-unit"> / label</span></span>
          </div>
        )}
        {(p.custom_cost || 0) > 0 && (
          <div className="cs-row cs-row--subtotal">
            <span className="cs-label">Cost per label</span>
            <span className="cs-value">₹ {fmt(costPerLabel, 4)}</span>
          </div>
        )}

        {/* Final result */}
        <div className="cs-result">
          <span className="cs-result-label">Base cost per 1000 labels</span>
          <div className="cs-result-right">
            <span className="cs-result-hint">₹ {fmt(costPerLabel, 4)} × 1000</span>
            <span className="cs-result-val">₹ {fmtN(costPerLabel * 1000, 2)}</span>
          </div>
        </div>

      </div>

      {/* ── Rate Tiers ── */}
      <div style={{ padding: '1rem 1.4rem 0' }}>
        <div className="section-label" style={{ marginBottom: '0.65rem' }}>
          Margin Tiers
          {!readOnly && <span className="tier-hint">select to apply</span>}
        </div>
      </div>
      <div style={{ padding: '0 1.4rem 1rem' }}>
        <div className={`tier-selector${readOnly ? ' tier-selector--readonly' : ''}`}>
          {TIERS.map(({ key, label, multiplier }) => {
            const profitPct = Math.round((multiplier - 1) * 100)
            return (
              <button
                key={key}
                className={`tier-option${activeTier === key ? ' tier-option--active' : ''}${readOnly ? ' tier-option--readonly' : ''}`}
                onClick={() => { if (!readOnly && activeTier !== key) setPendingTier({ key, label, multiplier }) }}
                disabled={readOnly}
              >
                <span className="tier-pct">{profitPct}%</span>
                <span className="tier-profit-word">profit margin</span>
                <span className="tier-ratio-badge">{label}</span>
                {activeTier === key && <span className="tier-option-check">✓</span>}
              </button>
            )
          })}
          {!readOnly && (
            <button
              className={`tier-option${activeTier === 'custom' ? ' tier-option--active' : ''}`}
              onClick={() => { setPendingCustomMultiplier(customMultiplier); setPendingTier({ key: 'custom' }) }}
            >
              <span className="tier-pct" style={{ fontSize: customM > 0 ? undefined : '1.1rem' }}>
                {customRate != null && customM > 1
                  ? `${Math.round((customM - 1) * 100)}%`
                  : '?'}
              </span>
              <span className="tier-profit-word">profit margin</span>
              <span className="tier-ratio-badge">
                {customM > 0 ? `1 : ${customM}` : 'custom'}
              </span>
              {activeTier === 'custom' && <span className="tier-option-check">✓</span>}
            </button>
          )}
        </div>
      </div>

      {/* ── Final Pricing ── */}
      <div style={{ padding: '0 1.4rem' }}>
        <div className="section-label" style={{ marginBottom: '0.75rem' }}>
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
            <div className="price-hero">
              <span className="price-hero-amount">₹ {fmtN(priceInr1000, 2)}</span>
              <span className="price-hero-unit">per 1000 labels</span>
            </div>
            <div className="price-sub">
              <span className="price-sub-label">Per Label</span>
              <span className="price-sub-amount">₹ {fmt(priceInrLabel, 3)}</span>
            </div>
            <div className="price-margin-row">
              <span className="price-margin-label">Margin / 1000</span>
              <span className="price-margin-val">₹ {fmtN(marginPer1000, 2)}</span>
            </div>
          </div>

          <div className="currency-block usd-block">
            <div className="currency-symbol">
              <span className="currency-symbol-dot" />
              $ USD
            </div>
            <div className="price-hero">
              <span className="price-hero-amount">$ {fmt(priceUsd1000, 2)}</span>
              <span className="price-hero-unit">per 1000 labels</span>
            </div>
            <div className="price-sub">
              <span className="price-sub-label">Per Label</span>
              <span className="price-sub-amount">$ {fmt(priceUsdLabel, 3)}</span>
            </div>
            <div className="price-margin-row">
              <span className="price-margin-label">Margin / 1000</span>
              <span className="price-margin-val">$ {fmt(marginPer1000Usd, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Margin Analysis ── */}
      <div style={{ padding: '1rem 1.4rem 0' }}>
        <div className="section-label" style={{ marginBottom: '0.75rem' }}>Margin Analysis</div>
        <div className="margin-analysis">
          <div className="margin-bar-wrap">
            <div className="margin-bar-track">
              <div
                className="margin-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
              />
            </div>
            <span className="margin-bar-pct">{fmt(marginPct, 1)}%</span>
          </div>
          <div className="margin-grid">
            <div className="margin-item margin-item--cost">
              <span className="margin-item-label">Cost / 1000</span>
              <span className="margin-item-val">₹ {fmtN(costPer1000, 2)}</span>
              <span className="margin-item-sub">$ {fmt(costPer1000 * usdRatio, 2)}</span>
            </div>
            <div className="margin-item-plus">+</div>
            <div className="margin-item margin-item--profit">
              <span className="margin-item-label">Margin / 1000</span>
              <span className="margin-item-val">₹ {fmtN(marginPer1000, 2)}</span>
              <span className="margin-item-sub">$ {fmt(marginPer1000Usd, 2)}</span>
            </div>
            <div className="margin-item-eq">=</div>
            <div className="margin-item margin-item--sell">
              <span className="margin-item-label">Sell / 1000</span>
              <span className="margin-item-val">₹ {fmtN(priceInr1000, 2)}</span>
              <span className="margin-item-sub">$ {fmt(priceUsd1000, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quantity Price Table ── */}
      <div style={{ padding: '1rem 1.4rem 0' }}>
        <div className="section-label" style={{ marginBottom: '0.65rem' }}>Price at Quantity</div>
        <div className="qty-price-table">
          <div className="qty-table-head">
            <span>Quantity</span>
            <span>Rate / Label</span>
            <span>Total INR</span>
            <span>Total USD</span>
          </div>
          {QTY_BRACKETS.map((q) => {
            const totalInr = q * priceInrLabel
            const totalUsd = q * priceUsdLabel
            const isOrderQty = qty > 0 && Math.abs(q - qty) / q < 0.01
            return (
              <div key={q} className={`qty-table-row${isOrderQty ? ' qty-table-row--active' : ''}`}>
                <span className="qty-table-qty">{Number(q).toLocaleString('en-IN')}</span>
                <span className="qty-table-rate">₹ {fmt(priceInrLabel, 3)}</span>
                <span className="qty-table-inr">₹ {fmtN(totalInr, 0)}</span>
                <span className="qty-table-usd">$ {fmt(totalUsd, 2)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Order Analytics ── */}
      {analytics && (
        <div style={{ padding: '1rem 1.4rem 0' }}>
          <div className="section-label" style={{ marginBottom: '0.5rem' }}>
            Order Analytics{' '}
            <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
              for {Number(qty).toLocaleString('en-IN')} labels
            </span>
          </div>
          <div className="oa-band">
            <div className="oa-stat">
              <span className="oa-stat-val">{fmtN(analytics.sqm)} m²</span>
              <span className="oa-stat-label">Substrate Area</span>
            </div>
            <div className="oa-sep" />
            <div className="oa-stat">
              <span className="oa-stat-val">{fmtN(analytics.meters)} m</span>
              <span className="oa-stat-label">Linear Meters</span>
            </div>
            <div className="oa-sep" />
            <div className="oa-stat oa-stat--inr">
              <span className="oa-stat-val">₹ {fmtN(analytics.totalInr, 0)}</span>
              <span className="oa-stat-label">Total Revenue</span>
            </div>
            <div className="oa-sep" />
            <div className="oa-stat oa-stat--usd">
              <span className="oa-stat-val">$ {fmtN(analytics.totalUsd, 2)}</span>
              <span className="oa-stat-label">Total (USD)</span>
            </div>
          </div>
          <div className="oa-margin-strip">
            <div className="oa-margin-item">
              <span className="oa-margin-label">Material Cost</span>
              <span className="oa-margin-val oa-margin-val--cost">₹ {fmtN(analytics.totalCost, 0)}</span>
            </div>
            <div className="oa-margin-arrow">→</div>
            <div className="oa-margin-item">
              <span className="oa-margin-label">Gross Margin</span>
              <span className="oa-margin-val oa-margin-val--profit">₹ {fmtN(analytics.totalMargin, 0)}</span>
            </div>
            <div className="oa-margin-arrow">→</div>
            <div className="oa-margin-item">
              <span className="oa-margin-label">Margin %</span>
              <span className="oa-margin-val oa-margin-val--pct">{fmt(marginPct, 1)}%</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: '1.4rem' }} />

      {/* ── Tier confirmation modal ── */}
      {pendingTier && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setPendingTier(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--teal)',
              borderRadius: 'var(--radius)', padding: '2rem 2.2rem',
              width: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
              display: 'flex', flexDirection: 'column', gap: '1.1rem',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.3rem' }}>◉</span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
                {pendingTier.key === 'custom' ? 'Set Custom Rate Tier' : 'Change Rate Tier'}
              </span>
            </div>

            {pendingTier.key === 'custom' ? (
              <>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  Enter a custom cost-to-price multiplier ratio.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '1.1rem', color: 'var(--teal-bright)' }}>1 :</span>
                  <input
                    type="number" min="0.1" step="0.05" placeholder="e.g. 2.5"
                    value={pendingCustomMultiplier}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || parseFloat(v) > 0) setPendingCustomMultiplier(v)
                    }}
                    style={{
                      width: '4rem', padding: '0.35rem 0.5rem',
                      background: 'var(--bg-input, rgba(255,255,255,0.06))',
                      border: '1px solid var(--teal)',
                      borderRadius: 6, color: 'var(--teal-bright)',
                      fontFamily: 'JetBrains Mono', fontSize: '1rem', fontWeight: 800,
                      textAlign: 'center', outline: 'none',
                    }}
                    autoFocus
                  />
                  {(() => {
                    const m = parseFloat(pendingCustomMultiplier)
                    return !isNaN(m) && m > 1
                      ? <span style={{ fontSize: '0.78rem', color: 'var(--teal)', fontWeight: 700 }}>= {Math.round((m - 1) * 100)}% margin</span>
                      : null
                  })()}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                Apply the <strong style={{ color: 'var(--text-bright)' }}>{pendingTier.label}</strong> margin tier?
                This sets a <strong style={{ color: 'var(--teal)' }}>{Math.round((pendingTier.multiplier - 1) * 100)}% profit margin</strong> on all pricing outputs.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setPendingTier(null)}
                style={{
                  flex: 1, padding: '0.5rem 0', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingTier.key === 'custom') {
                    const m = parseFloat(pendingCustomMultiplier)
                    if (!isNaN(m) && m > 0) {
                      setCustomMultiplier(pendingCustomMultiplier)
                      setActiveTier('custom')
                      onTierChange?.(`custom:${pendingCustomMultiplier}`)
                    }
                  } else {
                    setActiveTier(pendingTier.key)
                    onTierChange?.(pendingTier.key)
                  }
                  setPendingTier(null)
                }}
                disabled={pendingTier.key === 'custom' && !(parseFloat(pendingCustomMultiplier) > 0)}
                style={{
                  flex: 1, padding: '0.5rem 0', borderRadius: 8,
                  border: '1px solid var(--teal)', background: 'rgba(54,229,194,0.12)',
                  color: 'var(--teal)', fontSize: '0.82rem', fontWeight: 700,
                  cursor: pendingTier.key === 'custom' && !(parseFloat(pendingCustomMultiplier) > 0) ? 'not-allowed' : 'pointer',
                  opacity: pendingTier.key === 'custom' && !(parseFloat(pendingCustomMultiplier) > 0) ? 0.45 : 1,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Apply Tier
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
