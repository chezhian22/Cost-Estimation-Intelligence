import React from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)

function CylinderDotDiagram({ around, across, color, label, teeth, labelW, labelH, paperSize, circumference }) {
  const BODY_W = 420
  const BODY_H = circumference > 0
    ? Math.round(Math.min(Math.max(BODY_W * (paperSize / circumference), 80), 500))
    : 260
  const CAP_RY = 18
  const DOT    = 10

  const sx = Math.max(1, (BODY_W - around * DOT) / (around + 1))
  const sy = Math.max(1, (BODY_H - across * DOT) / (across + 1))

  const gox = sx
  const goy = CAP_RY + sy

  const SVG_H = BODY_H + CAP_RY * 2

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 340,
      background: 'var(--bg-raised)',
      border: `1px solid ${color}33`,
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, marginBottom: 4 }}>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-dim)' }}>
          {' '}· {teeth} teeth · {around}×{across} = {around * across} labels
        </span>
      </div>
      {(labelW != null || labelH != null) && (
        <div style={{ fontSize: 10.5, marginBottom: 8, color: 'var(--text-dim)' }}>
          {labelW != null && <span>↔ Width: {fmt(labelW)} mm</span>}
          {labelW != null && labelH != null && <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>}
          {labelH != null && <span>↕ Height: {fmt(labelH)} mm</span>}
        </div>
      )}

      <svg
        viewBox={`0 0 ${BODY_W} ${SVG_H}`}
        style={{ display: 'block', width: '100%', maxWidth: BODY_W }}
      >
        {/* cylinder body */}
        <rect x={0} y={CAP_RY} width={BODY_W} height={BODY_H}
          fill={color + '0d'} stroke={color + '44'} strokeWidth={1} />

        {/* top cap */}
        <ellipse cx={BODY_W / 2} cy={CAP_RY} rx={BODY_W / 2} ry={CAP_RY}
          fill={color + '22'} stroke={color + '66'} strokeWidth={1} />

        {/* dots */}
        {Array.from({ length: around * across }, (_, idx) => {
          const col = idx % around
          const row = Math.floor(idx / around)
          return (
            <circle
              key={idx}
              cx={gox + col * (DOT + sx) + DOT / 2}
              cy={goy + row * (DOT + sy) + DOT / 2}
              r={DOT / 2}
              fill={color}
              opacity={0.85}
            />
          )
        })}

        {/* bottom cap */}
        <ellipse cx={BODY_W / 2} cy={CAP_RY + BODY_H} rx={BODY_W / 2} ry={CAP_RY}
          fill={color + '22'} stroke={color + '66'} strokeWidth={1} />
      </svg>
    </div>
  )
}
const fmtC = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtN = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

function buildEfficiency(rows, matched, qty) {
  const mRow    = rows[matched.index]
  const bRow    = rows[matched.best_paper_index]
  const isSame  = matched.index === matched.best_paper_index
  const mLabels = mRow.around * mRow.across
  const bLabels = bRow.around * bRow.across
  const diff    = bLabels - mLabels
  const diffPct = mLabels > 0 ? (diff / mLabels * 100) : 0

  let production = null
  if (qty > 0) {
    const mRepeats = Math.ceil(qty / mLabels)
    const mMeters  = mRepeats * mRow.circumference / 1000
    const bRepeats = Math.ceil(qty / bLabels)
    const bMeters  = bRepeats * bRow.circumference / 1000
    production = {
      matched:   { repeats: mRepeats, meters: mMeters },
      bestPaper: { repeats: bRepeats, meters: bMeters },
    }
  }

  return { mRow, bRow, isSame, mLabels, bLabels, diff, diffPct, production }
}

export default function CylinderTable({ result, orderQty }) {
  if (!result) return null
  const { rows, matched } = result
  const { index: matchedIdx, best_paper_index: bestPaperIdx } = matched

  const qty = parseFloat(orderQty) || 0
  const eff = buildEfficiency(rows, matched, qty)

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
              <span className="ceff-label">Label Size</span>
              <span className="ceff-val">{fmt(eff.mRow.label_width)} × {fmt(eff.mRow.label_height)} mm</span>
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
              <span className="ceff-label">Label Size</span>
              <span className="ceff-val">{fmt(eff.bRow.label_width)} × {fmt(eff.bRow.label_height)} mm</span>
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
            labelW={eff.mRow.label_width}
            labelH={eff.mRow.label_height}
            paperSize={eff.mRow.paper_size}
            circumference={eff.mRow.circumference}
          />
          {!eff.isSame && (
            <CylinderDotDiagram
              around={eff.bRow.around}
              across={eff.bRow.across}
              color="#38bdf8"
              label="Best Yield"
              teeth={eff.bRow.teeth}
              labelW={eff.bRow.label_width}
              labelH={eff.bRow.label_height}
              paperSize={eff.bRow.paper_size}
              circumference={eff.bRow.circumference}
            />
          )}
        </div>
      </div>
    </section>
  )
}
