import React from 'react'

const fmt = (v, d = 2) => Number(v).toFixed(d)
const fmtC = (v) =>
  Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function CylinderTable({ result }) {
  if (!result) return null
  const { rows, matched } = result
  const { index: matchedIdx, best_paper_index: bestPaperIdx } = matched

  return (
    <section className="card table-card">
      <h2><span className="card-icon">📐</span> Cylinder Calculation Table</h2>

      <div className="matched-label">
        ✦ Best match:{' '}
        <strong>
          {fmt(matched.matched_width)} mm × {fmt(matched.matched_height)} mm
        </strong>{' '}
        (Teeth: {matched.matched_teeth})
      </div>

      <div className="table-wrapper">
        <table id="cylinder-table">
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
                i === matchedIdx ? 'matched' : '',
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
