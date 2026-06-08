import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function ManageSubstrates() {
  const [substrates, setSubstrates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [newName, setNewName]       = useState('')
  const [newPrice, setNewPrice]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const name  = newName.trim()
    const price = parseFloat(newPrice)
    if (!name || isNaN(price) || price < 0) return
    setAdding(true)
    setAddError(null)
    try {
      const created = await api.createSubstrate(name, price)
      setSubstrates((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewPrice('')
    } catch (e) {
      setAddError(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await api.deleteSubstrate(id)
      setSubstrates((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleAvailability(s) {
    setTogglingId(s.id)
    try {
      const updated = await api.setSubstrateAvailability(s.id, !s.available)
      setSubstrates((prev) => prev.map((x) => x.id === updated.id ? updated : x))
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">▤</div>
        <span className="card-title">Manage Substrates</span>
        <span className="card-number">SYS-07</span>
      </div>

      <div className="cyl-add-form">
        <div className="cyl-add-title">Add New Substrate</div>
        <form className="cyl-form-row" onSubmit={handleAdd}>
          <div className="cyl-field" style={{ flex: 2 }}>
            <label className="field-label">Substrate Name</label>
            <input
              type="text"
              placeholder="e.g. PP Gloss"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="cyl-field">
            <label className="field-label">Price <span className="unit">(₹ / m²)</span></label>
            <input
              type="number" min="0" step="0.5"
              placeholder="e.g. 45"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="cyl-add-btn" disabled={adding || !newName.trim() || !newPrice}>
            {adding ? 'Adding…' : '＋ Add'}
          </button>
        </form>
        {addError && <div className="selector-error" style={{ marginTop: '0.5rem' }}>{addError}</div>}
      </div>

      {loading && (
        <div className="history-state">
          <div className="history-spinner" />
          <span>Loading substrates…</span>
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
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Price <span className="th-unit">₹ / m²</span></th>
                <th>Availability</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {substrates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No substrates yet.
                  </td>
                </tr>
              ) : (
                substrates.map((s, i) => {
                  const avail = s.available !== false
                  return (
                    <tr key={s.id} className={!avail ? 'row-unavailable' : ''}>
                      <td style={{ textAlign: 'left' }}>{i + 1}</td>
                      <td style={{ textAlign: 'left' }}>{s.name}</td>
                      <td>{Number(s.price).toFixed(2)}</td>
                      <td>
                        <button
                          className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`}
                          onClick={() => handleToggleAvailability(s)}
                          disabled={togglingId === s.id}
                          title="Click to toggle availability"
                        >
                          <span className="avail-dot" />
                          {togglingId === s.id ? '…' : avail ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      {/* <td style={{ textAlign: 'right', paddingRight: '1.4rem' }}>
                        <button
                          className="cyl-delete-btn"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          title="Delete substrate"
                        >
                          {deletingId === s.id ? '…' : '✕'}
                        </button>
                      </td> */}
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
