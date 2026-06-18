import React, { useEffect, useState } from 'react'
import { api } from '../api'

const ROLE_COLORS = {
  admin: { bg: 'var(--role-admin-bg)', border: 'var(--role-admin-border)', color: 'var(--role-admin-text)' },
  user:  { bg: 'var(--teal-dim)',       border: 'var(--teal-mid)',           color: 'var(--teal-light)'     },
}

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || ROLE_COLORS.user
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 100,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {role}
    </span>
  )
}

const EMPTY_FORM = { username: '', email: '', password: '', role: 'user' }

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#!$'
  const all = upper + lower + digits + special
  const rand = (src) => src[Math.floor(Math.random() * src.length)]
  const base = [rand(upper), rand(lower), rand(digits), rand(special),
    ...Array.from({ length: 6 }, () => rand(all))]
  return base.sort(() => Math.random() - 0.5).join('')
}

function CredRow({ label, value, mono = false, highlight = false }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ width: 80, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        flex: 1, fontSize: mono ? '0.82rem' : '0.85rem',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: highlight ? 700 : 500,
        color: highlight ? 'var(--teal)' : 'var(--text-bright)',
        letterSpacing: mono ? '0.04em' : 0,
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
      <button
        onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
        style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--teal)', background: copied ? 'rgba(54,229,194,0.25)' : 'rgba(54,229,194,0.08)', color: 'var(--teal)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0 }}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  )
}

export default function UserManagementPage({ currentUser }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [showForm,  setShowForm]  = useState(false)
  const [editUser,  setEditUser]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null) // { email, username, password, emailSent }

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const [toggleTarget, setToggleTarget] = useState(null)
  const [toggling,     setToggling]     = useState(false)

  const [resetTarget,  setResetTarget]  = useState(null)
  const [resetting,    setResetting]    = useState(false)
  const [resetResult,  setResetResult]  = useState(null) // { username, email, emailSent }

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try { setUsers(await api.getUsers()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(u) {
    setEditUser(u)
    setForm({ username: u.username, email: u.email, password: '', role: u.role })
    setFormError(null); setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.email.trim()) {
      setFormError('Username and email are required'); return
    }
    setSaving(true); setFormError(null)
    try {
      if (editUser) {
        const payload = { username: form.username, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await api.updateUser(editUser.id, payload)
        setShowForm(false)
        await fetchUsers()
      } else {
        const result = await api.createUser({ username: form.username, email: form.email, role: form.role })
        setCreatedCreds({
          email:     form.email,
          username:  form.username,
          emailSent: result?.email_sent ?? false,
        })
        setShowForm(false)
        await fetchUsers()
      }
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await api.updateUser(toggleTarget.id, { is_active: !toggleTarget.is_active })
      setToggleTarget(null)
      await fetchUsers()
    } catch (e) { setError(e.message) }
    finally { setToggling(false) }
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setResetting(true)
    try {
      const result = await api.resetUserPassword(resetTarget.id)
      setResetTarget(null)
      setResetResult({ username: resetTarget.username, email: resetTarget.email, emailSent: result?.email_sent ?? false })
    } catch (e) { setError(e.message) }
    finally { setResetting(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      await fetchUsers()
    } catch (e) { setError(e.message) }
    finally { setDeleting(false) }
  }

  return (
    <section className="card" style={{ padding: '1.6rem' }}>
      <div className="card-header" style={{ marginBottom: '1.4rem' }}>
        <div className="card-icon-wrap">◈</div>
        <span className="card-title">User Management</span>
        <span className="card-number">ADMIN</span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)',
          borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem',
          color: '#f87171', fontSize: '0.83rem', marginBottom: '1rem',
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.2rem' }}>
        <button className="btn-download-pdf" onClick={openCreate}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New User
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--teal)', fontWeight: 700 }}>(you)</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                      background: u.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                      border: u.is_active ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(100,116,139,0.30)',
                      color: u.is_active ? '#10b981' : '#94a3b8',
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        onClick={() => openEdit(u)}
                        title="Edit user"
                        style={{ ...actionBtn(), minWidth: 52, justifyContent: 'center' }}
                        onMouseEnter={e => Object.assign(e.currentTarget.style, { ...actionBtnHover(), minWidth: 52, justifyContent: 'center' })}
                        onMouseLeave={e => Object.assign(e.currentTarget.style, { ...actionBtn(), minWidth: 52, justifyContent: 'center' })}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        title="Reset password"
                        style={{ ...actionBtn('#a78bfa', 'rgba(167,139,250,0.10)'), minWidth: 72, justifyContent: 'center' }}
                        onMouseEnter={e => Object.assign(e.currentTarget.style, { ...actionBtnHover('#a78bfa', 'rgba(167,139,250,0.20)'), minWidth: 72, justifyContent: 'center' })}
                        onMouseLeave={e => Object.assign(e.currentTarget.style, { ...actionBtn('#a78bfa', 'rgba(167,139,250,0.10)'), minWidth: 72, justifyContent: 'center' })}
                      >
                        Reset Pwd
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showForm && createPortal(
        <div style={overlayStyle()} onClick={() => setShowForm(false)}>
          <div style={modalStyle()} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)', marginBottom: '1.4rem' }}>
              {editUser ? `Edit — ${editUser.username}` : 'Create New User'}
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="field">
                <label className="field-label">Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="johndoe" />
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
              </div>
              {!editUser && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(54,229,194,0.06)', border: '1px solid rgba(54,229,194,0.18)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem' }}>
                  A secure password will be auto-generated and emailed to the user.
                </div>
              )}
              <div className="field">
                <label className="field-label">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#f87171' }}>
                  {formError}
                </div>
              )}

              {editUser && editUser.id !== currentUser?.id && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setToggleTarget(editUser) }}
                    style={{
                      ...actionBtn(editUser.is_active ? '#f59e0b' : '#10b981', editUser.is_active ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)'),
                      width: '100%', justifyContent: 'center', padding: '0.4rem',
                    }}
                  >
                    {editUser.is_active ? 'Deactivate User' : 'Activate User'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.4rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle()}>Cancel</button>
                <button type="submit" disabled={saving} style={confirmBtnStyle(saving)}>
                  {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Toggle Active Confirm Modal ── */}
      {toggleTarget && createPortal(
        <div style={overlayStyle()} onClick={() => setToggleTarget(null)}>
          <div style={modalStyle()} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)', marginBottom: '0.8rem' }}>
              {toggleTarget.is_active ? 'Deactivate User' : 'Activate User'}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
              Are you sure you want to {toggleTarget.is_active ? 'deactivate' : 'activate'}{' '}
              <strong style={{ color: 'var(--text-bright)' }}>{toggleTarget.username}</strong>?
              {toggleTarget.is_active
                ? ' They will be temporarily blocked from signing in.'
                : ' They will be able to sign in again.'}
            </p>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <button type="button" onClick={() => setToggleTarget(null)} style={cancelBtnStyle()}>Cancel</button>
              <button
                onClick={handleToggleActive} disabled={toggling}
                style={{ ...confirmBtnStyle(toggling), border: `1px solid ${toggleTarget.is_active ? '#f59e0b' : '#10b981'}`, background: toggleTarget.is_active ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: toggleTarget.is_active ? '#f59e0b' : '#10b981' }}
              >
                {toggling ? '…' : toggleTarget.is_active ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Created Credentials Modal ── */}
      {createdCreds && createPortal(
        <div style={overlayStyle()} onClick={() => setCreatedCreds(null)}>
          <div style={{ ...modalStyle(), width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.4rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1, marginTop: 2 }}>✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text-bright)' }}>
                  User Created
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 3 }}>
                  <strong style={{ color: 'var(--text-bright)' }}>{createdCreds.username}</strong>
                  {' · '}
                  {createdCreds.emailSent
                    ? `Login credentials emailed to ${createdCreds.email}`
                    : `SMTP not configured — share credentials manually with ${createdCreds.email}`}
                </div>
              </div>
            </div>

            {!createdCreds.emailSent && (
              <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.2rem' }}>
                <CredRow label="Username" value={createdCreds.username} />
                <CredRow label="Login URL" value={window.location.origin} mono />
              </div>
            )}

            <button
              onClick={() => setCreatedCreds(null)}
              style={{ ...confirmBtnStyle(false), flex: 'none', width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Reset Password Confirm Modal ── */}
      {resetTarget && createPortal(
        <div style={overlayStyle()} onClick={() => setResetTarget(null)}>
          <div style={modalStyle()} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)', marginBottom: '0.8rem' }}>
              Reset Password
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              A new password will be automatically generated and sent to{' '}
              <strong style={{ color: 'var(--text-bright)' }}>{resetTarget.username}</strong>'s email address{' '}
              (<span style={{ color: 'var(--teal)' }}>{resetTarget.email}</span>).
              <br />Do you want to proceed?
            </p>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <button type="button" onClick={() => setResetTarget(null)} style={cancelBtnStyle()}>Cancel</button>
              <button
                onClick={handleResetPassword} disabled={resetting}
                style={{ ...confirmBtnStyle(resetting), border: '1px solid #a78bfa', background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}
              >
                {resetting ? 'Sending…' : 'Yes, Reset Password'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Reset Password Success Modal ── */}
      {resetResult && createPortal(
        <div style={overlayStyle()} onClick={() => setResetResult(null)}>
          <div style={{ ...modalStyle(), width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>{resetResult.emailSent ? '✓' : '⚠'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>Password Reset</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 2 }}>
                  {resetResult.emailSent
                    ? `New password sent to ${resetResult.email}`
                    : 'Password updated but email could not be sent — SMTP not configured'}
                </div>
              </div>
              {resetResult.emailSent
                ? <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>Email Sent ✓</span>
                : <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>Email Failed</span>
              }
            </div>
            <button onClick={() => setResetResult(null)} style={{ ...confirmBtnStyle(false), width: '100%' }}>
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && createPortal(
        <div style={overlayStyle()} onClick={() => setDeleteTarget(null)}>
          <div style={modalStyle()} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)', marginBottom: '0.8rem' }}>Delete User</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-bright)' }}>{deleteTarget.username}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={cancelBtnStyle()}>Cancel</button>
              <button
                onClick={handleDelete} disabled={deleting}
                style={{ ...confirmBtnStyle(deleting), border: '1px solid #ef4444', background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}

import { createPortal } from 'react-dom'

const actionBtn = (color = 'var(--teal)', bg = 'var(--teal-dim)') => ({
  display: 'inline-flex', alignItems: 'center', gap: 3,
  padding: '3px 9px', fontSize: '0.70rem', fontWeight: 600,
  borderRadius: 100, border: `1px solid ${color}44`,
  background: bg, color, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  transition: 'all 0.15s', whiteSpace: 'nowrap',
})
const actionBtnHover = (color = 'var(--teal)', bg = 'rgba(54,229,194,0.20)') => ({
  ...actionBtn(color, bg),
  border: `1px solid ${color}`,
})
const overlayStyle = () => ({
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const modalStyle = () => ({
  background: 'var(--bg-card)', border: '1px solid var(--teal)',
  borderRadius: 'var(--radius)', padding: '2rem 2.2rem', width: 420,
  boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
})
const cancelBtnStyle = () => ({
  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
})
const confirmBtnStyle = (disabled) => ({
  flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--teal)', background: 'rgba(54,229,194,0.12)',
  color: 'var(--teal)', fontFamily: 'Inter, sans-serif',
  fontSize: '0.85rem', fontWeight: 700,
  cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
})
