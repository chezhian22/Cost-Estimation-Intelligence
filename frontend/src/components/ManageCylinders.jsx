import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

function blockNonNumeric(e) {
  const nav = ['Backspace','Delete','Tab','Enter','Escape','ArrowLeft','ArrowRight','Home','End']
  if (nav.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (e.key >= '0' && e.key <= '9') return
  e.preventDefault()
}

function EditModal({ cylinder, onClose, onSaved }) {
  const [teeth, setTeeth]   = useState(String(cylinder.teeth))
  const [paper, setPaper]   = useState(String(cylinder.paper_size))
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    const t = parseInt(teeth, 10)
    const p = parseInt(paper, 10)
    if (!t || !p) { setError('Both fields are required'); return }
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateTooth(cylinder.id, t, p)
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
                autoFocus
                required
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
            {error && <div className="selector-error">⚠ {error}</div>}
          </div>
          <div className="edit-modal-footer">
            <button type="button" className="edit-modal-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
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
  const [cylinders, setCylinders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const [newTeeth, setNewTeeth]     = useState('')
  const [newPaper, setNewPaper]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [addError, setAddError]     = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

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
      setCylinders((prev) => [...prev, created].sort((a, b) => a.teeth - b.teeth))
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

  async function handleToggleAvailability(c) {
    setTogglingId(c.id)
    try {
      const updated = await api.setCylinderAvailability(c.id, !c.available)
      setCylinders((prev) => prev.map((x) => x.id === updated.id ? updated : x))
    } catch (e) {
      setError(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  function handleSaved(updated) {
    setCylinders((prev) =>
      prev.map((x) => x.id === updated.id ? updated : x).sort((a, b) => a.teeth - b.teeth)
    )
    setEditTarget(null)
  }

  return (
    <section className="card">
      <div className="card-header">
        <div className="card-icon-wrap">⚙</div>
        <span className="card-title">Manage Cylinders</span>
        <span className="card-number">SYS-06</span>
      </div>

      {isAdmin ? (
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
                onKeyDown={blockNonNumeric}
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
                onKeyDown={blockNonNumeric}
                required
              />
            </div>
            <button type="submit" className="cyl-add-btn" disabled={adding || !newTeeth || !newPaper}>
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
          Only admins can add or edit cylinders.
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
                <th style={{ textAlign: 'left' }}>#</th>
                <th>Teeth</th>
                <th>Circumference <span className="th-unit">mm</span></th>
                <th>Paper Size <span className="th-unit">mm</span></th>
                <th>Paper +20% <span className="th-unit">mm</span></th>
                <th>Availability</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {cylinders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                    No cylinders yet.
                  </td>
                </tr>
              ) : (
                cylinders.map((c, i) => {
                  const circ   = +(c.teeth * 3.175).toFixed(3)
                  const plus20 = Math.round(c.paper_size * 1.2)
                  const avail  = c.available !== false
                  return (
                    <tr key={c.id} className={!avail ? 'row-unavailable' : ''}>
                      <td style={{ textAlign: 'left' }}>{i + 1}</td>
                      <td>{c.teeth}</td>
                      <td>{circ}</td>
                      <td>{c.paper_size}</td>
                      <td>{plus20}</td>
                      <td>
                        {isAdmin ? (
                          <button
                            className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`}
                            onClick={() => handleToggleAvailability(c)}
                            disabled={togglingId === c.id}
                            title="Click to toggle availability"
                          >
                            <span className="avail-dot" />
                            {togglingId === c.id ? '…' : avail ? 'Available' : 'Unavailable'}
                          </button>
                        ) : (
                          <span className={`avail-badge ${avail ? 'avail-yes' : 'avail-no'}`} style={{ cursor: 'default' }}>
                            <span className="avail-dot" />
                            {avail ? 'Available' : 'Unavailable'}
                          </span>
                        )}
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

      {editTarget && (
        <EditModal
          cylinder={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  )
}
