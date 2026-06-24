import React, { useState } from 'react'
import { createPortal } from 'react-dom'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtC = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtN = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

function getRowCostPerLabel(row, inputs) {
  if (!inputs) return null
  const w_cm = row.label_width / 10
  const h_cm = row.label_height / 10
  const labels_sqm = (10000 / w_cm) / h_cm
  const adj = labels_sqm * (parseFloat(inputs.yield_pct) || 85) / 100
  const substrate = parseFloat(inputs.substrate_price) || 0
  const foil      = parseFloat(inputs.foil_cost) || 0
  const custom    = parseFloat(inputs.custom_cost) || 0
  return adj > 0 ? (substrate + foil) / adj + custom : 0
}

function CylinderDotDiagram({ around, across, color, label, teeth, labelW, labelH, paperSize, circumference }) {
  const REF_CIRC = 400
  const BODY_W   = Math.round(Math.min(240, Math.max(120, (240 * circumference) / REF_CIRC)))
  const ratio    = circumference > 0 ? paperSize / circumference : 0.7
  const BODY_H   = Math.round(Math.min(280, Math.max(60, BODY_W * ratio)))
  const CAP_RY   = Math.max(10, Math.round(BODY_W * 0.07))

  const PAD_T = 44, PAD_R = 60, PAD_B = 10, PAD_L = 8
  const SVG_W = PAD_L + BODY_W + PAD_R
  const SVG_H = PAD_T + CAP_RY + BODY_H + CAP_RY + PAD_B

  const BX = PAD_L
  const BY = PAD_T + CAP_RY
  const CX = BX + BODY_W / 2
  const RX = BODY_W / 2
  const VDX = BX + BODY_W + 14

  return (
    <div style={{
      flex: '1 1 0', minWidth: 280,
      background: 'var(--bg-raised)', border: `1px solid ${color}33`,
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      display: 'flex', flexDirection: 'column',
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
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', width: '100%', maxWidth: SVG_W, margin: '0 auto', flex: 1 }}
        aria-label={`Cylinder layout: ${around} labels around, ${across} across`}
      >
        <rect x={BX} y={BY} width={BODY_W} height={BODY_H}
          fill={color + '0d'} stroke={color + '44'} strokeWidth={1} />
        <ellipse cx={CX} cy={BY} rx={RX} ry={CAP_RY}
          fill={color + '22'} stroke={color} strokeWidth={1.8} />
        <ellipse cx={CX} cy={BY + BODY_H} rx={RX} ry={CAP_RY}
          fill={color + '18'} stroke={color + '55'} strokeWidth={1} />
        {Array.from({ length: around - 1 }, (_, i) => {
          const xFrac = (i + 1) / around
          const xPos  = BX + xFrac * BODY_W
          const dx    = xPos - CX
          const yTop  = BY - CAP_RY * Math.sqrt(Math.max(0, 1 - (dx * dx) / (RX * RX)))
          return (
            <line key={i} x1={xPos} y1={yTop} x2={xPos} y2={BY + 8}
              stroke={color} strokeWidth={0.8} strokeOpacity={0.45} strokeDasharray="3,2" />
          )
        })}
        <line x1={BX} y1={PAD_T - 8} x2={BX + BODY_W} y2={PAD_T - 8}
          stroke={color} strokeWidth={0.9} strokeOpacity={0.55} />
        <line x1={BX} y1={PAD_T - 13} x2={BX} y2={PAD_T - 3}
          stroke={color} strokeWidth={0.9} strokeOpacity={0.55} />
        <line x1={BX + BODY_W} y1={PAD_T - 13} x2={BX + BODY_W} y2={PAD_T - 3}
          stroke={color} strokeWidth={0.9} strokeOpacity={0.55} />
        <text x={CX} y={PAD_T - 18} textAnchor="middle" fontSize={10}
          fill={color} fillOpacity={0.92} fontFamily="Inter,sans-serif" fontWeight={600}>
          {around} labels around · ⌀ {fmt(circumference, 1)} mm
        </text>
        <line x1={VDX} y1={BY} x2={VDX} y2={BY + BODY_H}
          stroke={color} strokeWidth={0.9} strokeOpacity={0.55} />
        {Array.from({ length: across + 1 }, (_, j) => (
          <line key={j} x1={VDX - 5} y1={BY + (j / across) * BODY_H}
            x2={VDX + 5} y2={BY + (j / across) * BODY_H}
            stroke={color} strokeWidth={0.9} strokeOpacity={0.65} />
        ))}
        <text x={VDX + 15} y={BY + BODY_H / 2} textAnchor="middle" fontSize={10}
          fill={color} fillOpacity={0.92} fontFamily="Inter,sans-serif" fontWeight={600}
          transform={`rotate(-90, ${VDX + 15}, ${BY + BODY_H / 2})`}>
          {across} across · {fmt(paperSize, 0)} mm
        </text>
      </svg>
    </div>
  )
}

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

export default function CylinderTable({
  result, orderQty, selectedIdx, onApproveCylinder, approvingCyl,
  hasSavedCalc, inputWidth, inputHeight, inputs, readOnly,
}) {
  const [pendingIdx,    setPendingIdx]    = useState(null)
  const [showTechnical, setShowTechnical] = useState(true)

  if (!result) return null
  const { rows, matched } = result
  const { index: matchedIdx, best_paper_index: bestPaperIdx } = matched

  const qty = parseFloat(orderQty) || 0
  const eff = buildEfficiency(rows, matched, qty)
  const selIdx      = selectedIdx ?? matchedIdx
  const selectedRow = rows[selIdx]

  const pendingRow = pendingIdx !== null ? rows[pendingIdx] : null

  // Cost per label for the matched (baseline) row — for relative comparison
  const baseCost = getRowCostPerLabel(rows[matchedIdx], inputs)

  function confirmApprove() {
    onApproveCylinder?.(pendingIdx)
    setPendingIdx(null)
  }

  function rowClasses(i) {
    return [
      i === matchedIdx   ? 'matched'    : '',
      i === bestPaperIdx ? 'best-paper' : '',
      i === selIdx && i !== matchedIdx ? 'selected-cylinder' : '',
    ].join(' ').trim()
  }

  return (
    <section className="card table-card">
      <div className="card-header">
        <div className="card-icon-wrap">◈</div>
        <span className="card-title">Cylinder Calculation Matrix</span>
        <span className="card-number">SYS-02</span>
      </div>

      {/* ── Badges ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0 1.4rem', marginBottom: '0.75rem' }}>
        <div className="best-match-badge" style={{ margin: 0 }}>
          <span className="badge-dot" />
          <span className="badge-label">Best Match</span>
          <span className="badge-sep">·</span>
          <span className="badge-value">
            {fmt(matched.matched_width)} × {fmt(matched.matched_height)} mm
          </span>
          <span className="badge-sep">·</span>
          <span className="badge-label">Teeth {matched.matched_teeth}</span>
        </div>
        {selIdx !== matchedIdx && selectedRow && (
          <div className="best-match-badge" style={{ margin: 0, background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.45)' }}>
            <span className="badge-dot" style={{ background: '#6366f1', boxShadow: '0 0 7px rgba(99,102,241,0.60)' }} />
            <span className="badge-label" style={{ color: 'var(--text-muted)' }}>Selected</span>
            <span className="badge-sep">·</span>
            <span className="badge-value" style={{ color: '#4f46e5' }}>
              {fmt(selectedRow.label_width)} × {fmt(selectedRow.label_height)} mm
            </span>
            <span className="badge-sep">·</span>
            <span className="badge-label" style={{ color: 'var(--text-muted)' }}>Teeth {selectedRow.teeth}</span>
          </div>
        )}
      </div>

      {/* ── Cylinder Efficiency ── */}
      <div className="ceff-section">
        <div className="ceff-section-title">
          <span className="ceff-section-title-bar" />
          Cylinder Efficiency
        </div>

        <div className="ceff-grid">
          {/* Best Match */}
          <div className="ceff-block ceff-match" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ceff-block-head">
              <span className="ceff-block-title">Best Match</span>
              <span className="ceff-block-teeth">{eff.mRow.teeth} teeth</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Requested</span>
              <span className="ceff-val">{fmt(inputWidth)} × {fmt(inputHeight)} mm</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Actual Label</span>
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
                  <span className="ceff-label">Web Length</span>
                  <span className="ceff-val">{fmtN(eff.production.matched.meters, 1)} m</span>
                </div>
              </>
            )}
          </div>

          <div className="ceff-vs">VS</div>

          {/* Best Yield */}
          <div className="ceff-block ceff-paper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ceff-block-head">
              <span className="ceff-block-title">Best Yield ★</span>
              <span className="ceff-block-teeth">{eff.bRow.teeth} teeth</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Requested</span>
              <span className="ceff-val">{fmt(inputWidth)} × {fmt(inputHeight)} mm</span>
            </div>
            <div className="ceff-row">
              <span className="ceff-label">Actual Label</span>
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
                  <span className="ceff-label">Web Length</span>
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

        <div className="ceff-section-title" style={{ marginTop: '1.5rem' }}>
          <span className="ceff-section-title-bar" />
          Cylinder Layout
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <CylinderDotDiagram
            around={eff.mRow.around} across={eff.mRow.across}
            color="#f97316" label="Best Match" teeth={eff.mRow.teeth}
            labelW={eff.mRow.label_width} labelH={eff.mRow.label_height}
            paperSize={eff.mRow.paper_size} circumference={eff.mRow.circumference}
          />
          <CylinderDotDiagram
            around={eff.bRow.around} across={eff.bRow.across}
            color="#38bdf8"
            label={eff.isSame ? 'Best Yield (same as Best Match)' : 'Best Yield'}
            teeth={eff.bRow.teeth}
            labelW={eff.bRow.label_width} labelH={eff.bRow.label_height}
            paperSize={eff.bRow.paper_size} circumference={eff.bRow.circumference}
          />
        </div>
      </div>

      {/* ── Cylinder Table ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.4rem 0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
          All Cylinders
        </span>
        <button className="table-view-toggle" onClick={() => setShowTechnical(v => !v)}>
          {showTechnical ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              Simplified View
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              Technical Details
            </>
          )}
        </button>
      </div>

      <div className="table-wrapper">
        {!showTechnical ? (
          /* ── Simplified view ── */
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '110px', minWidth: '110px' }}>Use</th>
                <th>
                  Teeth
                  <span className="th-sub">cylinder</span>
                </th>
                <th>
                  Around × Across
                  <span className="th-sub">layout</span>
                </th>
                <th style={{ textAlign: 'center' }}>
                  Labels / Repeat
                  <span className="th-sub">efficiency</span>
                </th>
                <th>
                  Label Size <span className="th-unit">mm</span>
                  <span className="th-sub">actual produced</span>
                </th>
                {inputs && (
                  <th style={{ textAlign: 'right' }}>
                    ₹ / Label
                    <span className="th-sub">base cost</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const lpr     = r.around * r.across
                const rowCost = getRowCostPerLabel(r, inputs)
                const isCheaper = baseCost !== null && rowCost !== null && i !== matchedIdx && rowCost < baseCost - 0.0001
                const isPricier = baseCost !== null && rowCost !== null && i !== matchedIdx && rowCost > baseCost + 0.0001
                return (
                  <tr key={r.teeth} className={rowClasses(i)}>
                    <td style={{ textAlign: 'center', width: '110px', minWidth: '110px' }}>
                      {i === selIdx ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            width: '90px', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
                            borderRadius: 100, background: 'rgba(54,229,194,0.15)',
                            border: '1px solid var(--teal)', color: 'var(--teal)',
                          }}>
                            ✓ Selected
                          </span>
                          {i === matchedIdx && (
                            <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#f97316', letterSpacing: '0.02em' }}>
                              Best Match
                            </span>
                          )}
                          {i === bestPaperIdx && (
                            <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.02em' }}>
                              ★ Best Yield
                            </span>
                          )}
                        </div>
                      ) : readOnly && (i === matchedIdx || i === bestPaperIdx) ? (
                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                          {i === matchedIdx && (
                            <span style={{
                              fontSize: '0.60rem', fontWeight: 700, padding: '2px 7px',
                              borderRadius: 100, background: 'rgba(249,115,22,0.12)',
                              border: '1px solid rgba(249,115,22,0.55)', color: '#f97316',
                              whiteSpace: 'nowrap',
                            }}>
                              Best Match
                            </span>
                          )}
                          {i === bestPaperIdx && (
                            <span style={{
                              fontSize: '0.60rem', fontWeight: 700, padding: '2px 7px',
                              borderRadius: 100, background: 'rgba(56,189,248,0.12)',
                              border: '1px solid rgba(56,189,248,0.50)', color: '#38bdf8',
                              whiteSpace: 'nowrap',
                            }}>
                              ★ Best Yield
                            </span>
                          )}
                        </div>
                      ) : !readOnly ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => setPendingIdx(i)}
                            disabled={approvingCyl}
                            title={hasSavedCalc ? 'Select this cylinder' : 'Run calculation with a client & order first to save'}
                            style={{
                              width: '90px', padding: '3px 0', fontSize: '0.70rem', fontWeight: 600,
                              borderRadius: 100, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text-muted)',
                              cursor: approvingCyl ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
                              opacity: approvingCyl ? 0.5 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            Select
                          </button>
                          {i === matchedIdx && (
                            <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#f97316', letterSpacing: '0.02em' }}>
                              Best Match
                            </span>
                          )}
                          {i === bestPaperIdx && (
                            <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.02em' }}>
                              ★ Best Yield
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td><strong>{r.teeth}</strong></td>
                    <td>{r.around} × {r.across}</td>
                    <td className="lpr-cell">{lpr}</td>
                    <td className="size-cell">{fmt(r.label_width)} × {fmt(r.label_height)}</td>
                    {inputs && (
                      <td className={`cost-cell${isCheaper ? ' cost-cell-cheaper' : isPricier ? ' cost-cell-pricier' : ''}`}>
                        {rowCost !== null ? `₹ ${fmt(rowCost, 4)}` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          /* ── Technical view ── */
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '110px', minWidth: '110px' }}>Use</th>
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
              {rows.map((r, i) => (
                <tr key={r.teeth} className={rowClasses(i)}>
                  <td style={{ textAlign: 'center', width: '110px', minWidth: '110px' }}>
                    {i === selIdx ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          width: '90px', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px',
                          borderRadius: 100, background: 'rgba(54,229,194,0.15)',
                          border: '1px solid var(--teal)', color: 'var(--teal)',
                        }}>
                          ✓ Selected
                        </span>
                        {i === matchedIdx && (
                          <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#f97316', letterSpacing: '0.02em' }}>
                            Best Match
                          </span>
                        )}
                        {i === bestPaperIdx && (
                          <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.02em' }}>
                            ★ Best Yield
                          </span>
                        )}
                      </div>
                    ) : readOnly && (i === matchedIdx || i === bestPaperIdx) ? (
                      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                        {i === matchedIdx && (
                          <span style={{
                            fontSize: '0.60rem', fontWeight: 700, padding: '2px 7px',
                            borderRadius: 100, background: 'rgba(249,115,22,0.12)',
                            border: '1px solid rgba(249,115,22,0.55)', color: '#f97316',
                            whiteSpace: 'nowrap',
                          }}>
                            Best Match
                          </span>
                        )}
                        {i === bestPaperIdx && (
                          <span style={{
                            fontSize: '0.60rem', fontWeight: 700, padding: '2px 7px',
                            borderRadius: 100, background: 'rgba(56,189,248,0.12)',
                            border: '1px solid rgba(56,189,248,0.50)', color: '#38bdf8',
                            whiteSpace: 'nowrap',
                          }}>
                            ★ Best Yield
                          </span>
                        )}
                      </div>
                    ) : !readOnly ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => setPendingIdx(i)}
                          disabled={approvingCyl}
                          title={hasSavedCalc ? 'Select this cylinder' : 'Run calculation with a client & order first to save'}
                          style={{
                            width: '90px', padding: '3px 0', fontSize: '0.70rem', fontWeight: 600,
                            borderRadius: 100, border: '1px solid var(--border)',
                            background: 'transparent', color: 'var(--text-muted)',
                            cursor: approvingCyl ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
                            opacity: approvingCyl ? 0.5 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          Select
                        </button>
                        {i === matchedIdx && (
                          <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#f97316', letterSpacing: '0.02em' }}>
                            Best Match
                          </span>
                        )}
                        {i === bestPaperIdx && (
                          <span style={{ fontSize: '0.60rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.02em' }}>
                            ★ Best Yield
                          </span>
                        )}
                      </div>
                    ) : null}
                  </td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Approve confirmation modal ── */}
      {pendingRow && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setPendingIdx(null)}
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
              <span style={{ fontSize: '1.3rem' }}>◈</span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
                Select Cylinder
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Do you want to select this cylinder for the current order?
            </p>
            <div style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem',
              display: 'flex', flexDirection: 'column', gap: '0.4rem',
            }}>
              {[
                ['Teeth',          pendingRow.teeth],
                ['Label Size',     `${fmt(pendingRow.label_width)} × ${fmt(pendingRow.label_height)} mm`],
                ['Around × Across',`${pendingRow.around} × ${pendingRow.across}`],
                ['Labels / Repeat',pendingRow.around * pendingRow.across],
                ['Circumference',  `${fmt(pendingRow.circumference)} mm`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.3rem' }}>
              <button
                onClick={() => setPendingIdx(null)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={approvingCyl}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--teal)', background: 'rgba(54,229,194,0.12)',
                  color: 'var(--teal)', fontFamily: 'Inter, sans-serif',
                  fontSize: '0.85rem', fontWeight: 700, cursor: approvingCyl ? 'wait' : 'pointer',
                  opacity: approvingCyl ? 0.6 : 1, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!approvingCyl) e.currentTarget.style.background = 'rgba(54,229,194,0.22)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(54,229,194,0.12)' }}
              >
                {approvingCyl ? 'Saving…' : 'Select'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
