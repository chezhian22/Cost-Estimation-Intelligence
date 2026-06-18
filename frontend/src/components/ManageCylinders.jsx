import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

function blockNonNumeric(e) {
  const nav = ['Backspace','Delete','Tab','Enter','Escape','ArrowLeft','ArrowRight','Home','End']
  if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (e.key >= '0' && e.key <= '9') return
  e.preventDefault()
}

function AddModal({ onClose, onAdded }) {
  const [teeth,   setTeeth]   = useState('')
  const [paper,   setPaper]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    const t = parseInt(teeth, 10)
    const p = parseInt(paper, 10)
    if (!t || !p) { setError('Both fields are required'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await api.createTooth(t, p)
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
          <span className="edit-modal-header-icon">⚙</span>
          <span className="edit-modal-header-title">Add Cylinder</span>
          <button type="button" className="edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="edit-modal-body">
            <div className="field">
              <label className="field-label">Teeth Count</label>
              <input
                type="number" min="1" step="1"
                placeholder="e.g. 64"
                value={teeth}
                onChange={(e) => setTeeth(e.target.value)}
                onKeyDown={blockNonNumeric}
                autoFocus
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Paper Size <span className="unit">(mm)</span></label>
              <input
                type="number" min="1" step="1"
                placeholder="e.g. 520"
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
                onKeyDown={blockNonNumeric}
                required
              />
            </div>
            {error && <div className="selector-error">⚠ {error}</div>}
          </div>
          <div className="edit-modal-footer">
            <button type="button" className="edit-modal-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="edit-modal-btn edit-modal-btn--primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Cylinder'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function EditModal({ cylinder, onClose, onSaved }) {
  const [teeth,     setTeeth]     = useState(String(cylinder.teeth))
  const [paper,     setPaper]     = useState(String(cylinder.paper_size))
  const [available, setAvailable] = useState(cylinder.available !== false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    const t = parseInt(teeth, 10)
    const p = parseInt(paper, 10)
    if (!t || !p) { setError('Both fields are required'); return }
    setSaving(true)
    setError(null)
    try {
      let updated = await api.updateTooth(cylinder.id, t, p)
      if (available !== (cylinder.available !== false)) {
        const withAvail = await api.setCylinderAvailability(cylinder.id, available)
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
          <span className="edit-modal-header-icon">⚙</span>
          <span className="edit-modal-header-title">Edit Cylinder</span>
          <button type="button" className="edit-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="edit-modal-body">
            <div className="field">
              <label className="field-label">Teeth Count</label>
              <input
                type="number" min="1" step="1"
                value={teeth}
                onChange={(e) => setTeeth(e.target.value)}
                onKeyDown={blockNonNumeric}
                autoFocus required
              />
            </div>
            <div className="field">
              <label className="field-label">Paper Size <span className="unit">(mm)</span></label>
              <input
                type="number" min="1" step="1"
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
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

export default function ManageCylinders({ isAdmin = false }) {
  const [cylinders,  setCylinders]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  useEffect(() => {
    api.getTeeth()
      .then(setCylinders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleAdded(created) {
    setCylinders((prev) => [...prev, created].sort((a, b) => a.teeth - b.teeth))
    setShowAdd(false)
  }

  function handleSaved(updated) {
    setCylinders((prev) =>
      prev.map((x) => x.id === updated.id ? updated : x).sort((a, b) => a.teeth - b.teeth)
    )
    setEditTarget(null)
  }

  const totalCount     = cylinders.length
  const availableCount = cylinders.filter((c) => c.available !== false).length
  const unavailCount   = totalCount - availableCount

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">⚙</div>
        <span className="card-title">Cylinders</span>
        <div className="card-header-right">
          <span className="card-number">SYS-06</span>
          {isAdmin && (
            <button className="section-add-btn" onClick={() => setShowAdd(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Cylinder
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
                <th style={{ textAlign: 'left', width: 40 }}>#</th>
                <th>Teeth</th>
                <th>Circumference <span className="th-unit">mm</span></th>
                <th>Paper Size <span className="th-unit">mm</span></th>
                <th>Paper +20% <span className="th-unit">mm</span></th>
                <th>Status</th>
                {isAdmin && <th style={{ width: 72 }}></th>}
              </tr>
            </thead>
            <tbody>
              {cylinders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="manage-empty-cell">
                    <div className="manage-empty-state">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>No cylinders added yet.</span>
                      {isAdmin && <button className="section-add-btn" onClick={() => setShowAdd(true)}>Add your first cylinder</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                cylinders.map((c, i) => {
                  const circ   = +(c.teeth * 3.175).toFixed(3)
                  const plus20 = Math.round(c.paper_size * 1.2)
                  const avail  = c.available !== false
                  return (
                    <tr key={c.id} className={!avail ? 'row-unavailable' : ''}>
                      <td style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td><strong>{c.teeth}</strong></td>
                      <td>{circ}</td>
                      <td>{c.paper_size}</td>
                      <td>{plus20}</td>
                      <td>
                        <span className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`} style={{ cursor: 'default' }}>
                          <span className="avail-dot" />
                          {avail ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                          <button className="inline-edit-btn" onClick={() => setEditTarget(c)}>Edit</button>
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
        <EditModal cylinder={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}
    </section>
  )
}
