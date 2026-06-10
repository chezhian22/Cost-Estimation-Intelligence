import React from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtN = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

// ── SVG cylinder layout diagram ───────────────────────────────────────────────
function CylinderDiagram({ row, matched, color }) {
  const VW = 260, VH = 165
  const PT = 50, PR = 10, PB = 22, PL = 14

  const drawW = VW - PL - PR   // 236
  const drawH = VH - PT - PB   // 93

  const { around, across } = row

  // Gap between cells — shrinks as count grows so cells never disappear
  const gapX = Math.max(2, Math.min(5, Math.floor(drawW / around / 6)))
  const gapY = Math.max(2, Math.min(6, Math.floor(drawH / across  / 4)))

  const cellW = (drawW - gapX * (around + 1)) / around
  const cellH = (drawH - gapY * (across  + 1)) / across

  const cells = []
  for (let i = 0; i < around; i++) {
    for (let j = 0; j < across; j++) {
      cells.push({
        x: PL + gapX + i * (cellW + gapX),
        y: PT + gapY + j * (cellH + gapY),
      })
    }
  }

  const lw = fmt(matched.matched_width, 1)
  const lh = fmt(matched.matched_height, 1)

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="cyl-diagram"
      aria-label={`${around} labels around × ${across} across`}
    >
      {/* ── surface background ── */}
      <rect
        x={PL} y={PT} width={drawW} height={drawH}
        fill="rgba(0,0,0,0.28)"
        stroke={color} strokeWidth="1.5" strokeOpacity="0.45"
        rx="3"
      />

      {/* ── wrap seam indicators (dashed lines at left/right edges) ── */}
      {[PL, PL + drawW].map((x, k) => (
        <line key={k}
          x1={x} y1={PT - 5} x2={x} y2={PT}
          stroke={color} strokeWidth="1.2" strokeOpacity="0.35"
          strokeDasharray="2,2"
        />
      ))}

      {/* ── label cells ── */}
      {cells.map((c, k) => (
        <rect key={k}
          x={c.x} y={c.y} width={cellW} height={cellH}
          fill={color + '30'}
          stroke={color} strokeWidth="1" strokeOpacity="0.85"
          rx="1.5"
        />
      ))}

      {/* ── width label (top, line 1) ── */}
      <text
        x={PL + drawW / 2} y={PT - 36}
        textAnchor="middle" fontSize="9"
        fill={color} fillOpacity="0.95"
        fontFamily="Inter,sans-serif" fontWeight="700" letterSpacing="0.3"
      >
        ↔ Width: {lw} mm  ({around} around drum)
      </text>

      {/* ── height label (top, line 2) ── */}
      <text
        x={PL + drawW / 2} y={PT - 23}
        textAnchor="middle" fontSize="9"
        fill={color} fillOpacity="0.95"
        fontFamily="Inter,sans-serif" fontWeight="700" letterSpacing="0.3"
      >
        ↕ Height: {lh} mm  ({across} across web)
      </text>

      {/* ── "around" dimension line ── */}
      <line x1={PL} y1={PT - 12} x2={PL + drawW} y2={PT - 12}
        stroke={color} strokeWidth="0.9" strokeOpacity="0.55" />
      <line x1={PL}         y1={PT - 16} x2={PL}         y2={PT - 8}
        stroke={color} strokeWidth="0.9" strokeOpacity="0.55" />
      <line x1={PL + drawW} y1={PT - 16} x2={PL + drawW} y2={PT - 8}
        stroke={color} strokeWidth="0.9" strokeOpacity="0.55" />

      {/* ── bottom: circumference + paper size ── */}
      <text
        x={PL + drawW / 2} y={VH - 6}
        textAnchor="middle" fontSize="7.5"
        fill="rgba(255,255,255,0.28)"
        fontFamily="JetBrains Mono,monospace"
      >
        ⌀ {fmt(row.circumference, 1)} mm circ · {row.paper_size} mm web
      </text>
    </svg>
  )
}

// ── Orientation block ─────────────────────────────────────────────────────────
function OrientBlock({ title, dims, pricing, matched, rows, color, isWinner, orderQty }) {
  const qty        = parseFloat(orderQty) || 0
  const matchedRow = rows[matched.index]
  const paperSizeM = matchedRow.paper_size / 1000
  const sqm        = qty > 0 ? qty / pricing.adj_labels : null
  const meters     = sqm != null ? sqm / paperSizeM : null
  const totalInr   = qty > 0 ? qty * pricing.price_inr_label : null
  const totalUsd   = qty > 0 ? qty * pricing.price_usd_label : null

  return (
    <div className={`orient-block${isWinner ? ' orient-winner' : ''}`}>
      <div className="orient-head">
        <div className="orient-head-left">
          <span className="orient-title">{title}</span>
          <span className="orient-dims">{dims}</span>
        </div>
        {isWinner && <span className="orient-badge">★ Better</span>}
      </div>

      {/* ── cylinder layout diagram ── */}
      <div className="orient-diagram-wrap">
        <CylinderDiagram row={matchedRow} matched={matched} color={color} />
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

        {qty > 0 && (
          <>
            <div className="orient-divider" style={{ marginTop: '0.6rem' }} />
            <div className="orient-analytics-label">
              Order Analytics · {Number(qty).toLocaleString('en-IN')} labels
            </div>
            <div className="orient-row">
              <span className="orient-label">Substrate Area</span>
              <span className="orient-val">{fmtN(sqm, 2)} m²</span>
            </div>
            <div className="orient-row">
              <span className="orient-label">Linear Meters</span>
              <span className={`orient-val${isWinner ? ' val-highlight' : ''}`}>
                {fmtN(meters, 2)} m
              </span>
            </div>
            <div className="orient-featured inr" style={{ marginTop: '0.3rem' }}>
              <span className="orient-featured-label">Total Cost (INR)</span>
              <span className="orient-featured-val">₹ {fmtN(totalInr, 0)}</span>
            </div>
            <div className="orient-featured usd">
              <span className="orient-featured-label">Total Cost (USD)</span>
              <span className="orient-featured-val">$ {fmtN(totalUsd, 2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ComparisonPanel({ resultA, resultB, inputs, orderQty }) {
  if (!resultA || !resultB) return null

  const pA = resultA.pricing
  const pB = resultB.pricing

  const aWins         = pA.price_inr_1000 <= pB.price_inr_1000
  const loser         = aWins ? pB : pA
  const costSaving    = Math.abs(pA.price_inr_1000 - pB.price_inr_1000)
  const costSavingPct = (costSaving / loser.price_inr_1000 * 100).toFixed(1)
  const adjDiff       = Math.abs(pA.adj_labels - pB.adj_labels)
  const adjWinner     = Math.max(pA.adj_labels, pB.adj_labels)
  const wasteSaved    = (adjDiff / adjWinner * 100).toFixed(1)

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
          rows={resultA.rows}
          color="#f97316"
          isWinner={aWins}
          orderQty={orderQty}
        />
        <div className="orient-vs"><span>VS</span></div>
        <OrientBlock
          title="Rotated 90°"
          dims={`${h} × ${w} mm`}
          pricing={pB}
          matched={resultB.matched}
          rows={resultB.rows}
          color="#38bdf8"
          isWinner={!aWins}
          orderQty={orderQty}
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
