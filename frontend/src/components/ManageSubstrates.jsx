import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function ManageSubstrates({ isAdmin = false }) {
  const [substrates, setSubstrates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [newName, setNewName]       = useState('')
  const [newPrice, setNewPrice]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')
  const [editPrice, setEditPrice]   = useState('')
  const [savingId, setSavingId]     = useState(null)
  const [editError, setEditError]   = useState(null)

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

  function startEdit(s) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditPrice(String(s.price))
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function handleSaveEdit(s) {
    const name  = editName.trim()
    const price = parseFloat(editPrice)
    if (!name || isNaN(price) || price < 0) { setEditError('Valid name and price required'); return }
    setSavingId(s.id)
    setEditError(null)
    try {
      const updated = await api.updateSubstrate(s.id, name, price)
      setSubstrates((prev) => prev.map((x) => x.id === updated.id ? updated : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingId(null)
    } catch (e) {
      setEditError(e.message)
    } finally {
      setSavingId(null)
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

      {isAdmin ? (
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
      ) : (
        <div className="admin-only-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Only admins can add or edit substrates.
        </div>
      )}

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
                {isAdmin && <th></th>}
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
                  const isEditing = editingId === s.id
                  return (
                    <tr key={s.id} className={!avail ? 'row-unavailable' : ''}>
                      <td style={{ textAlign: 'left' }}>{i + 1}</td>
                      <td style={{ textAlign: 'left' }}>
                        {isEditing
                          ? <input className="inline-edit-input" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                          : s.name}
                      </td>
                      <td>
                        {isEditing
                          ? <input className="inline-edit-input" type="number" min="0" step="0.5" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                          : Number(s.price).toFixed(2)}
                      </td>
                      <td>
                        {isAdmin ? (
                          <button
                            className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`}
                            onClick={() => !isEditing && handleToggleAvailability(s)}
                            disabled={togglingId === s.id || isEditing}
                            title="Click to toggle availability"
                          >
                            <span className="avail-dot" />
                            {togglingId === s.id ? '…' : avail ? 'Available' : 'Unavailable'}
                          </button>
                        ) : (
                          <span className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`} style={{ cursor: 'default' }}>
                            <span className="avail-dot" />
                            {avail ? 'Available' : 'Unavailable'}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right', paddingRight: '1rem', whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <span style={{ display: 'inline-flex', gap: '0.4rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button className="inline-save-btn" onClick={() => handleSaveEdit(s)} disabled={savingId === s.id}>
                                  {savingId === s.id ? '…' : 'Save'}
                                </button>
                                <button className="inline-cancel-btn" onClick={cancelEdit} disabled={savingId === s.id}>Cancel</button>
                              </span>
                              {editError && <span className="field-error">{editError}</span>}
                            </span>
                          ) : (
                            <button className="inline-edit-btn" onClick={() => startEdit(s)}>Edit</button>
                          )}
                        </td>
                      )}
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
