import React from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)

function CylinderDotDiagram({ around, across, color, label, teeth }) {
  const BODY_W = 280
  const BODY_H = 160
  const CAP_RY = 14  // ellipse cap height (radius)
  const gap = 2

  // scale dot size so ALL labels always fit inside the fixed body area
  const dot = Math.max(2, Math.min(
    Math.floor((BODY_W - gap * (around - 1)) / around),
    Math.floor((BODY_H - gap * (across - 1)) / across)
  ))

  const gridW = around * dot + (around - 1) * gap
  const gridH = across * dot + (across - 1) * gap
  const ox = (BODY_W - gridW) / 2
  const oy = CAP_RY + (BODY_H - gridH) / 2
  const SVG_H = BODY_H + CAP_RY * 2

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 200,
      background: 'var(--bg-raised)',
      border: `1px solid ${color}33`,
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, marginBottom: 8 }}>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-dim)' }}>
          {' '}· {teeth} teeth · {around}×{across} = {around * across} labels
        </span>
      </div>

      <svg
        viewBox={`0 0 ${BODY_W} ${SVG_H}`}
        style={{ display: 'block', width: '100%', maxWidth: BODY_W }}
      >
        {/* cylinder body */}
        <rect
          x={0} y={CAP_RY}
          width={BODY_W} height={BODY_H}
          fill={color + '0d'} stroke={color + '44'} strokeWidth={1}
        />

        {/* top cap */}
        <ellipse
          cx={BODY_W / 2} cy={CAP_RY}
          rx={BODY_W / 2} ry={CAP_RY}
          fill={color + '22'} stroke={color + '66'} strokeWidth={1}
        />

        {/* label dots — every single label shown, dot size auto-scaled */}
        {Array.from({ length: around * across }, (_, idx) => {
          const col = idx % around
          const row = Math.floor(idx / around)
          return (
            <circle
              key={idx}
              cx={ox + col * (dot + gap) + dot / 2}
              cy={oy + row * (dot + gap) + dot / 2}
              r={dot / 2}
              fill={color}
              opacity={0.85}
            />
          )
        })}

        {/* bottom cap */}
        <ellipse
          cx={BODY_W / 2} cy={CAP_RY + BODY_H}
          rx={BODY_W / 2} ry={CAP_RY}
          fill={color + '22'} stroke={color + '66'} strokeWidth={1}
        />
      </svg>
    </div>
  )
}
const fmtC = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtN = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

function fmtTime(minutes) {
  if (minutes <= 0) return '—'
  if (minutes < 1) return `${Math.ceil(minutes * 60)} sec`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h === 0 ? `${m} min` : `${h}h ${m}min`
}

function buildEfficiency(rows, matched, qty, speed) {
  const mRow    = rows[matched.index]
  const bRow    = rows[matched.best_paper_index]
  const isSame  = matched.index === matched.best_paper_index
  const mLabels = mRow.around * mRow.across
  const bLabels = bRow.around * bRow.across
  const diff    = bLabels - mLabels
  const diffPct = mLabels > 0 ? (diff / mLabels * 100) : 0

  let production = null
  if (qty > 0 && speed > 0) {
    const mRepeats = Math.ceil(qty / mLabels)
    const mMeters  = mRepeats * mRow.circumference / 1000
    const bRepeats = Math.ceil(qty / bLabels)
    const bMeters  = bRepeats * bRow.circumference / 1000
    production = {
      matched:   { repeats: mRepeats, meters: mMeters, time: mMeters / speed },
      bestPaper: { repeats: bRepeats, meters: bMeters, time: bMeters / speed },
    }
  }

  return { mRow, bRow, isSame, mLabels, bLabels, diff, diffPct, production }
}

export default function CylinderTable({ result, orderQty, pressSpeed }) {
  if (!result) return null
  const { rows, matched } = result
  const { index: matchedIdx, best_paper_index: bestPaperIdx } = matched

  const qty   = parseFloat(orderQty)   || 0
  const speed = parseFloat(pressSpeed) || 50
  const eff   = buildEfficiency(rows, matched, qty, speed)

  return (
    <section className="card table-card">
      <div className="card-header">
        <div className="card-icon-wrap">◈</div>
        <span className="card-title">Cylinder Calculation Matrix</span>
        <span className="card-number">SYS-02</span>
      </div>

      <div className="best-match-badge">
        <span className="badge-dot" />
        <span className="badge-label">Best Match</span>
        <span className="badge-sep">·</span>
        <span className="badge-value">
          {fmt(matched.matched_width)} × {fmt(matched.matched_height)} mm
        </span>
        <span className="badge-sep">·</span>
        <span className="badge-label">Teeth {matched.matched_teeth}</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Teeth</th>
              <th>Circum&shy;ference</th>
              <th>Input Width</th>
              <th>Around</th>
              <th>Label Width <span className="th-unit">mm</span></th>
              <th>Paper Size</th>
              <th>Paper +20</th>
              <th>Input Height</th>
              <th>Across</th>
              <th>Label Height <span className="th-unit">mm</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cls = [
                i === matchedIdx   ? 'matched'    : '',
                i === bestPaperIdx ? 'best-paper' : '',
              ].join(' ').trim()
              return (
                <tr key={r.teeth} className={cls}>
                  <td>{r.teeth}</td>
                  <td>{fmt(r.circumference)}</td>
                  <td>{fmt(r.input_width)}</td>
                  <td>{r.around}</td>
                  <td>{fmt(r.label_width)}</td>
                  <td>{i === bestPaperIdx ? '★ ' : ''}{fmtC(r.paper_size)}</td>
                  <td>{fmtC(r.paper_plus_20)}</td>
                  <td>{fmt(r.input_height)}</td>
                  <td>{r.across}</td>
                  <td>{fmt(r.label_height)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Cylinder Efficiency ── */}
      <div className="ceff-section">
        <div className="ceff-section-title">
          <span className="ceff-section-title-bar" />
          Cylinder Efficiency
        </div>

        {eff.isSame && (
          <div className="ceff-same-note">
            Best Match and Best Yield are the same cylinder ({eff.mRow.teeth} teeth).
          </div>
        )}

        <div className="ceff-grid">
          {/* Best Match */}
          <div className="ceff-block ceff-match">
            <div className="ceff-block-head">
              <span className="ceff-block-title">Best Match</span>
              <span className="ceff-block-teeth">{eff.mRow.teeth} teeth</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Around × Across</span>
              <span className="ceff-val">{eff.mRow.around} × {eff.mRow.across}</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Labels / Repeat</span>
              <span className="ceff-val ceff-big">{eff.mLabels}</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Circumference</span>
              <span className="ceff-val">{fmt(eff.mRow.circumference)} mm</span>
            </div>
            {eff.production && (
              <>
                <div className="ceff-divider" />
                <div className="ceff-row">
                  <span className="ceff-label">Repeats Needed</span>
                  <span className="ceff-val">{fmtN(eff.production.matched.repeats)}</span>
                </div>
                <div className="ceff-row">
                  <span className="ceff-label">Web Meters</span>
                  <span className="ceff-val">{fmtN(eff.production.matched.meters, 1)} m</span>
                </div>
                <div className="ceff-row ceff-time-row">
                  <span className="ceff-label">Time @ {speed} m/min</span>
                  <span className="ceff-val ceff-time">{fmtTime(eff.production.matched.time)}</span>
                </div>
              </>
            )}
          </div>

          <div className="ceff-vs">VS</div>

          {/* Best Yield */}
          <div className="ceff-block ceff-paper">
            <div className="ceff-block-head">
              <span className="ceff-block-title">Best Yield ★</span>
              <span className="ceff-block-teeth">{eff.bRow.teeth} teeth</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Around × Across</span>
              <span className="ceff-val">{eff.bRow.around} × {eff.bRow.across}</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Labels / Repeat</span>
              <span className="ceff-val ceff-big">{eff.bLabels}</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Circumference</span>
              <span className="ceff-val">{fmt(eff.bRow.circumference)} mm</span>
            </div>
            {eff.production && (
              <>
                <div className="ceff-divider" />
                <div className="ceff-row">
                  <span className="ceff-label">Repeats Needed</span>
                  <span className="ceff-val">{fmtN(eff.production.bestPaper.repeats)}</span>
                </div>
                <div className="ceff-row">
                  <span className="ceff-label">Web Meters</span>
                  <span className="ceff-val">{fmtN(eff.production.bestPaper.meters, 1)} m</span>
                </div>
                <div className="ceff-row ceff-time-row">
                  <span className="ceff-label">Time @ {speed} m/min</span>
                  <span className="ceff-val ceff-time">{fmtTime(eff.production.bestPaper.time)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {!eff.isSame && (
          <div className="ceff-diff-bar">
            <span className="ceff-diff-icon">{eff.diff > 0 ? '▲' : '▼'}</span>
            <span className="ceff-diff-text">
              Best Yield yields{' '}
              <strong>
                {Math.abs(eff.diff)} {Math.abs(eff.diff) === 1 ? 'label' : 'labels'}{' '}
                {eff.diff > 0 ? 'more' : 'fewer'} per repeat
              </strong>
              {' '}({Math.abs(eff.diffPct).toFixed(1)}%{eff.diff > 0 ? ' more efficient' : ' less efficient'})
            </span>
            {eff.production && Math.abs(eff.production.matched.time - eff.production.bestPaper.time) >= 0.5 && (
              <span className="ceff-diff-time">
                · saves {fmtTime(Math.abs(eff.production.matched.time - eff.production.bestPaper.time))} press time
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Cylinder Layout Diagram ── */}
      <div className="ceff-section">
        <div className="ceff-section-title">
          <span className="ceff-section-title-bar" />
          Cylinder Layout
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <CylinderDotDiagram
            around={eff.mRow.around}
            across={eff.mRow.across}
            color="#f97316"
            label="Best Match"
            teeth={eff.mRow.teeth}
          />
          {!eff.isSame && (
            <CylinderDotDiagram
              around={eff.bRow.around}
              across={eff.bRow.across}
              color="#38bdf8"
              label="Best Yield"
              teeth={eff.bRow.teeth}
            />
          )}
        </div>
      </div>
    </section>
  )
}
