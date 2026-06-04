import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function ManageCylinders() {
  const [cylinders, setCylinders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const [newTeeth, setNewTeeth]         = useState('')
  const [newPaper, setNewPaper]         = useState('')
  const [adding, setAdding]             = useState(false)
  const [addError, setAddError]         = useState(null)
  const [deletingId, setDeletingId]     = useState(null)

  useEffect(() => {
    api.getTeeth()
      .then(setCylinders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const teeth      = parseInt(newTeeth, 10)
    const paper_size = parseInt(newPaper, 10)
    if (!teeth || !paper_size) return
    setAdding(true)
    setAddError(null)
    try {
      const created = await api.createTooth(teeth, paper_size)
      setCylinders((prev) =>
        [...prev, created].sort((a, b) => a.teeth - b.teeth)
      )
      setNewTeeth('')
      setNewPaper('')
    } catch (e) {
      setAddError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await api.deleteTooth(id)
      setCylinders((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">⚙</div>
        <span className="card-title">Manage Cylinders</span>
        <span className="card-number">SYS-06</span>
      </div>

      {/* ── Add form ── */}
      <div className="cyl-add-form">
        <div className="cyl-add-title">Add New Cylinder</div>
        <form className="cyl-form-row" onSubmit={handleAdd}>
          <div className="cyl-field">
            <label className="field-label">Teeth Count</label>
            <input
              type="number" min="1" step="1"
              placeholder="e.g. 64"
              value={newTeeth}
              onChange={(e) => setNewTeeth(e.target.value)}
              required
            />
          </div>
          <div className="cyl-field">
            <label className="field-label">Paper Size <span className="unit">(mm)</span></label>
            <input
              type="number" min="1" step="1"
              placeholder="e.g. 520"
              value={newPaper}
              onChange={(e) => setNewPaper(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="cyl-add-btn"
            disabled={adding || !newTeeth || !newPaper}
          >
            {adding ? 'Adding…' : '＋ Add'}
          </button>
        </form>
        {addError && <div className="selector-error" style={{ marginTop: '0.5rem' }}>{addError}</div>}
      </div>

      {/* ── Table ── */}
      {loading && (
        <div className="history-state">
          <div className="history-spinner" />
          <span>Loading cylinders…</span>
        </div>
      )}

      {error && (
        <div className="history-state error-banner" style={{ margin: '1.4rem' }}>⚠ {error}</div>
      )}

      {!loading && !error && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>#</th>
                <th>Teeth</th>
                <th>Circumference <span className="th-unit">mm</span></th>
                <th>Paper Size <span className="th-unit">mm</span></th>
                <th>Paper +20% <span className="th-unit">mm</span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cylinders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No cylinders yet.
                  </td>
                </tr>
              ) : (
                cylinders.map((c, i) => {
                  const circ     = +(c.teeth * 3.175).toFixed(3)
                  const plus20   = Math.round(c.paper_size * 1.2)
                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'left' }}>{i + 1}</td>
                      <td>{c.teeth}</td>
                      <td>{circ}</td>
                      <td>{c.paper_size}</td>
                      <td>{plus20}</td>
                      <td style={{ textAlign: 'right', paddingRight: '1.4rem' }}>
                        <button
                          className="cyl-delete-btn"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          title="Delete cylinder"
                        >
                          {deletingId === c.id ? '…' : '✕'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
