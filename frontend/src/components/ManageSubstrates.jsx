import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

function blockNonNumeric(e) {
  const nav = ['Backspace','Delete','Tab','Enter','Escape','ArrowLeft','ArrowRight','Home','End']
  if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (e.key >= '0' && e.key <= '9') return
  if (e.key === '.') return
  e.preventDefault()
}

function AddModal({ onClose, onAdded }) {
  const [name,   setName]   = useState('')
  const [price,  setPrice]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    const n = name.trim()
    const p = parseFloat(price)
    if (!n || isNaN(p) || p < 0) { setError('Valid name and price required'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await api.createSubstrate(n, p)
      onAdded(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <span className="edit-modal-header-icon">▤</span>
          <span className="edit-modal-header-title">Add Substrate</span>
          <button type="button" className="edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="edit-modal-body">
            <div className="field">
              <label className="field-label">Substrate Name</label>
              <input
                type="text"
                placeholder="e.g. PP Gloss"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus required maxLength={120}
              />
            </div>
            <div className="field">
              <label className="field-label">Price <span className="unit">(₹ / m²)</span></label>
              <input
                type="number" min="0" step="0.5"
                placeholder="e.g. 45"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={blockNonNumeric}
                required
              />
            </div>
            {error && <div className="selector-error">⚠ {error}</div>}
          </div>
          <div className="edit-modal-footer">
            <button type="button" className="edit-modal-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="edit-modal-btn edit-modal-btn--primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Substrate'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function EditModal({ substrate, onClose, onSaved }) {
  const [name,      setName]      = useState(substrate.name)
  const [price,     setPrice]     = useState(String(substrate.price))
  const [available, setAvailable] = useState(substrate.available !== false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    const n = name.trim()
    const p = parseFloat(price)
    if (!n || isNaN(p) || p < 0) { setError('Valid name and price required'); return }
    setSaving(true)
    setError(null)
    try {
      let updated = await api.updateSubstrate(substrate.id, n, p)
      if (available !== (substrate.available !== false)) {
        const withAvail = await api.setSubstrateAvailability(substrate.id, available)
        updated = { ...updated, available: withAvail.available }
      }
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <span className="edit-modal-header-icon">▤</span>
          <span className="edit-modal-header-title">Edit Substrate</span>
          <button type="button" className="edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="edit-modal-body">
            <div className="field">
              <label className="field-label">Substrate Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus required maxLength={120}
              />
            </div>
            <div className="field">
              <label className="field-label">Price <span className="unit">(₹ / m²)</span></label>
              <input
                type="number" min="0" step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={blockNonNumeric}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Availability</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  value={available ? 'yes' : 'no'}
                  onChange={(e) => setAvailable(e.target.value === 'yes')}
                  style={{ flex: 1 }}
                >
                  <option value="yes">Available</option>
                  <option value="no">Unavailable</option>
                </select>
                <span className={`avail-badge ${available ? 'avail-yes' : 'avail-no'}`} style={{ cursor: 'default', flexShrink: 0 }}>
                  <span className="avail-dot" />
                  {available ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            {error && <div className="selector-error">⚠ {error}</div>}
          </div>
          <div className="edit-modal-footer">
            <button type="button" className="edit-modal-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="edit-modal-btn edit-modal-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default function ManageSubstrates({ isAdmin = false }) {
  const [substrates, setSubstrates] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleAdded(created) {
    setSubstrates((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setShowAdd(false)
  }

  function handleSaved(updated) {
    setSubstrates((prev) =>
      prev.map((x) => x.id === updated.id ? updated : x).sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditTarget(null)
  }

  const totalCount     = substrates.length
  const availableCount = substrates.filter((s) => s.available !== false).length
  const unavailCount   = totalCount - availableCount

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">▤</div>
        <span className="card-title">Substrates</span>
        <div className="card-header-right">
          <span className="card-number">SYS-07</span>
          {isAdmin && (
            <button className="section-add-btn" onClick={() => setShowAdd(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Substrate
            </button>
          )}
        </div>
      </div>

      {!loading && !error && (
        <div className="manage-stats-bar">
          <div className="manage-stat">
            <span className="manage-stat-value">{totalCount}</span>
            <span className="manage-stat-label">Total</span>
          </div>
          <div className="manage-stat-divider" />
          <div className="manage-stat">
            <span className="manage-stat-value manage-stat-value--avail">{availableCount}</span>
            <span className="manage-stat-label">Available</span>
          </div>
          <div className="manage-stat-divider" />
          <div className="manage-stat">
            <span className="manage-stat-value manage-stat-value--unavail">{unavailCount}</span>
            <span className="manage-stat-label">Unavailable</span>
          </div>
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
                <th style={{ textAlign: 'left', width: 40 }}>#</th>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Price <span className="th-unit">₹ / m²</span></th>
                <th>Status</th>
                {isAdmin && <th style={{ width: 72 }}></th>}
              </tr>
            </thead>
            <tbody>
              {substrates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="manage-empty-cell">
                    <div className="manage-empty-state">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>No substrates added yet.</span>
                      {isAdmin && <button className="section-add-btn" onClick={() => setShowAdd(true)}>Add your first substrate</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                substrates.map((s, i) => {
                  const avail = s.available !== false
                  return (
                    <tr key={s.id} className={!avail ? 'row-unavailable' : ''}>
                      <td style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td style={{ textAlign: 'left' }}><strong>{s.name}</strong></td>
                      <td>₹ {Number(s.price).toFixed(2)}</td>
                      <td>
                        <span className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`} style={{ cursor: 'default' }}>
                          <span className="avail-dot" />
                          {avail ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                          <button className="inline-edit-btn" onClick={() => setEditTarget(s)}>Edit</button>
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

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {editTarget && (
        <EditModal substrate={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}
    </section>
  )
}
