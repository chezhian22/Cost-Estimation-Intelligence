import React from 'react'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtC = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function CylinderTable({ result }) {
  if (!result) return null
  const { rows, matched } = result
  const { index: matchedIdx, best_paper_index: bestPaperIdx } = matched

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
    </section>
  )
}
