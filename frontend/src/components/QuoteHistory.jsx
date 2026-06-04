import React, { useEffect, useState } from 'react'
import { api } from '../api'

const fmt = (v, d = 2) => (v != null ? Number(v).toFixed(d) : '—')

export default function QuoteHistory() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getHistory()
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">🕘</div>
        <span className="card-title">Quote History</span>
        <span className="card-number">SYS-05</span>
      </div>

      {loading && (
        <div className="history-state">
          <div className="history-spinner" />
          <span>Loading history…</span>
        </div>
      )}

      {error && (
        <div className="history-state error-banner" style={{ margin: '1.4rem' }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="history-state">
          <span className="history-empty-icon">📋</span>
          <span>No saved quotes yet. Run a calculation to create one.</span>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Substrate</th>
                <th>Size <span className="th-unit">mm</span></th>
                <th>Waste%</th>
                <th>Labels/m²</th>
                <th>₹ / 1000</th>
                <th>$ / 1000</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const p = r.pricing ?? r
                const m = r.matched ?? {}
                const w = r.width ?? m.matched_width ?? '—'
                const h = r.height ?? m.matched_height ?? '—'
                const date = r.created_at
                  ? new Date(r.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'
                return (
                  <tr key={r.id ?? i}>
                    <td>{records.length - i}</td>
                    <td style={{ textAlign: 'left' }}>{r.substrate_name ?? 'Custom'}</td>
                    <td>{fmt(w, 1)} × {fmt(h, 1)}</td>
                    <td>{r.waste_pct != null ? `${r.waste_pct}%` : '—'}</td>
                    <td>{fmt(p.adj_labels)}</td>
                    <td>{fmt(p.price_inr_1000)}</td>
                    <td>{fmt(p.price_usd_1000, 3)}</td>
                    <td>{date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
