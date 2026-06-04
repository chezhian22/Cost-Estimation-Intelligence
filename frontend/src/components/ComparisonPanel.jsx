import React from 'react'

const fmt = (v, d = 2) => Number(v).toFixed(d)

function OrientBlock({ title, dims, pricing, matched, isWinner }) {
  return (
    <div className={`orient-block${isWinner ? ' orient-winner' : ''}`}>
      <div className="orient-head">
        <div className="orient-head-left">
          <span className="orient-title">{title}</span>
          <span className="orient-dims">{dims}</span>
        </div>
        {isWinner && <span className="orient-badge">★ Better</span>}
      </div>

      <div className="orient-metrics">
        <div className="orient-row">
          <span className="orient-label">Best Match</span>
          <span className="orient-val">
            {fmt(matched.matched_width)} × {fmt(matched.matched_height)} mm
          </span>
        </div>
        <div className="orient-row">
          <span className="orient-label">Teeth</span>
          <span className="orient-val">{matched.matched_teeth}</span>
        </div>
        <div className="orient-row">
          <span className="orient-label">Labels / m²</span>
          <span className="orient-val">{fmt(pricing.labels_sqm)}</span>
        </div>
        <div className="orient-row">
          <span className="orient-label">Adj. Labels / m²</span>
          <span className={`orient-val${isWinner ? ' val-highlight' : ''}`}>
            {fmt(pricing.adj_labels)}
          </span>
        </div>

        <div className="orient-divider" />

        <div className="orient-row">
          <span className="orient-label">Rate 1:1.5</span>
          <span className="orient-val">₹ {fmt(pricing.rate_15)}</span>
        </div>
        <div className="orient-row">
          <span className="orient-label">Rate 1:1.75</span>
          <span className="orient-val">₹ {fmt(pricing.rate_175)}</span>
        </div>
        <div className="orient-row">
          <span className="orient-label">Rate 1:2</span>
          <span className="orient-val">₹ {fmt(pricing.rate_2)}</span>
        </div>

        <div className="orient-featured inr">
          <span className="orient-featured-label">₹ per 1000 Labels</span>
          <span className="orient-featured-val">{fmt(pricing.price_inr_1000)}</span>
        </div>
        <div className="orient-featured usd">
          <span className="orient-featured-label">$ per 1000 Labels</span>
          <span className="orient-featured-val">{fmt(pricing.price_usd_1000, 3)}</span>
        </div>
      </div>
    </div>
  )
}

export default function ComparisonPanel({ resultA, resultB, inputs }) {
  if (!resultA || !resultB) return null

  const pA = resultA.pricing
  const pB = resultB.pricing

  const aWins = pA.price_inr_1000 <= pB.price_inr_1000
  const winner = aWins ? pA : pB
  const loser  = aWins ? pB : pA

  const costSaving    = Math.abs(pA.price_inr_1000 - pB.price_inr_1000)
  const costSavingPct = (costSaving / loser.price_inr_1000 * 100).toFixed(1)

  const adjDiff    = Math.abs(pA.adj_labels - pB.adj_labels)
  const adjWinner  = Math.max(pA.adj_labels, pB.adj_labels)
  const wasteSaved = (adjDiff / adjWinner * 100).toFixed(1)

  const w = Number(inputs.width)
  const h = Number(inputs.height)

  return (
    <section className="card comparison-card">
      <div className="card-header">
        <div className="card-icon-wrap">⇄</div>
        <span className="card-title">Orientation Comparison</span>
        <span className="card-number">SYS-04</span>
      </div>

      <p className="comparison-intro">
        Rotating the label 90° on press changes which dimension runs around the cylinder.
        Both orientations are calculated below — the cheaper one is highlighted.
      </p>

      <div className="orient-grid">
        <OrientBlock
          title="Normal"
          dims={`${w} × ${h} mm`}
          pricing={pA}
          matched={resultA.matched}
          isWinner={aWins}
        />
        <div className="orient-vs">
          <span>VS</span>
        </div>
        <OrientBlock
          title="Rotated 90°"
          dims={`${h} × ${w} mm`}
          pricing={pB}
          matched={resultB.matched}
          isWinner={!aWins}
        />
      </div>

      <div className="comparison-summary">
        <div className="summary-icon">✦</div>
        <div className="summary-text">
          <strong>{aWins ? 'Normal' : 'Rotated 90°'}</strong> orientation fits{' '}
          <strong>{fmt(adjWinner)} labels/m²</strong> vs {fmt(aWins ? pB.adj_labels : pA.adj_labels)} —
          using <strong>{wasteSaved}% less material</strong> per label and saving{' '}
          <strong>₹{fmt(costSaving)} per 1000 labels</strong> ({costSavingPct}% cheaper).
        </div>
      </div>
    </section>
  )
}
