import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

function toUTC(dt) {
  if (!dt) return null
  const s = dt.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dt) ? dt : dt + 'Z'
  return new Date(s)
}

function fmtDate(dt) {
  const d = toUTC(dt)
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(dt) {
  const d = toUTC(dt)
  if (!d) return ''
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}

const UNIT_OPTIONS = [
  { label: 'min',    seconds: 60 },
  { label: 'hr',     seconds: 3600 },
  { label: 'day',    seconds: 86400 },
  { label: 'week',   seconds: 604800 },
  { label: 'month',  seconds: 2592000 },
  { label: 'year',   seconds: 31536000 },
]

function secondsToUnit(total) {
  const units = [...UNIT_OPTIONS].reverse()
  for (const u of units) {
    if (total >= u.seconds && total % u.seconds === 0)
      return { value: total / u.seconds, unit: u.seconds }
  }
  return { value: Math.max(1, Math.round(total / 60)), unit: 60 }
}

export default function NotificationManagementPage({ currentUser }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(false)
  const [marking, setMarking]             = useState(null)
  const [intervalNum, setIntervalNum]     = useState(1)
  const [intervalUnit, setIntervalUnit]   = useState(60)
  const [savingInterval, setSavingInterval] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.getAdminNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api.getMonitorInterval().then(d => {
      const { value, unit } = secondsToUnit(d.interval_seconds)
      setIntervalNum(value)
      setIntervalUnit(unit)
    }).catch(() => {})
  }, [])

  async function saveInterval(num, unit) {
    const seconds = Math.max(30, Number(num) * Number(unit))
    setSavingInterval(true)
    try { await api.setMonitorInterval(seconds) } catch (_) {}
    setSavingInterval(false)
  }

  async function handleMarkRead(id) {
    setMarking(id)
    try {
      await api.markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? { ...n, is_read: true, read_by_name: currentUser?.username, read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (_) {}
    setMarking(null)
  }

  const [markingAll, setMarkingAll] = useState(false)
  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      const now = new Date().toISOString()
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_by_name: currentUser?.username, read_at: now }))
      )
    } catch (_) {}
    setMarkingAll(false)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const readCount   = notifications.filter(n => n.is_read).length

  const [filter, setFilter] = useState('all')
  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read')   return n.is_read
    return true
  })

  return (
    <div className="nm-page">
      <div className="nm-header">
        <div className="nm-header-left">
          <div className="nm-title">Notification Management</div>
          <div className="nm-sub">Track and acknowledge unconfirmed quote alerts</div>
        </div>
        <div className="nm-header-right">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '0.3rem 0.65rem',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--teal)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', fontWeight: 500 }}>
              Check interval
            </span>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1px solid rgba(54,229,194,0.3)', borderRadius: 6, overflow: 'hidden',
              background: 'var(--bg-input)',
            }}>
              <input
                type="number"
                min="1"
                value={intervalNum}
                onChange={e => setIntervalNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveInterval(intervalNum, intervalUnit)}
                disabled={savingInterval}
                style={{
                  width: 44, border: 'none', background: 'transparent',
                  color: 'var(--text-bright)', fontSize: '0.8rem', fontWeight: 600,
                  padding: '0.25rem 0.4rem', outline: 'none', textAlign: 'center',
                }}
              />
              <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(54,229,194,0.25)' }} />
              <select
                value={intervalUnit}
                onChange={e => setIntervalUnit(e.target.value)}
                disabled={savingInterval}
                className="nm-interval-select"
                style={{
                  border: 'none', background: 'var(--bg-input)', color: 'var(--text)',
                  fontSize: '0.78rem', padding: '0.25rem 0.35rem',
                  cursor: 'pointer', outline: 'none', fontWeight: 500,
                }}
              >
                {UNIT_OPTIONS.map(o => (
                  <option key={o.seconds} value={o.seconds}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => saveInterval(intervalNum, intervalUnit)}
              disabled={savingInterval}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit',
                color: 'var(--teal)', background: 'rgba(54,229,194,0.1)',
                border: '1px solid rgba(54,229,194,0.35)', borderRadius: 5,
                padding: '0.22rem 0.6rem', cursor: 'pointer', transition: 'all 0.13s',
                whiteSpace: 'nowrap',
              }}
            >
              {savingInterval
                ? <><span className="nm-spinner nm-spinner--sm" /> Saving…</>
                : <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save
                  </>
              }
            </button>
          </div>
          <button className="nm-refresh-btn" onClick={load} disabled={loading} title="Refresh">
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="nm-stats-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {unreadCount > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                All acknowledged
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="nm-mark-all-btn"
              >
                {markingAll ? 'Marking…' : 'Mark all as read'}
              </button>
            )}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
            {[
              { key: 'all',    label: `All (${notifications.length})` },
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'read',   label: `Acknowledged (${readCount})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`nm-filter-tab${filter === key ? ' nm-filter-tab--active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && notifications.length === 0 && (
        <div className="nm-empty">
          <div className="nm-spinner" />
          <span>Loading notifications…</span>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="nm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div className="nm-empty-title">All clear</div>
          <div className="nm-empty-sub">No unconfirmed quote alerts at this time.</div>
        </div>
      )}

      {notifications.length > 0 && filtered.length === 0 && (
        <div className="nm-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div className="nm-empty-title">
            {filter === 'unread' ? 'No unread notifications' : 'No acknowledged notifications'}
          </div>
          <div className="nm-empty-sub">
            {filter === 'unread' ? 'All notifications have been acknowledged.' : 'No notifications have been acknowledged yet.'}
          </div>
        </div>
      )}

      {notifications.length > 0 && filtered.length > 0 && (
        <div className="nm-list">
          {filtered.map(n => (
            <div key={n.id} className={`nm-card${n.is_read ? ' nm-card--read' : ''}`}>
              <div className="nm-card-top">
                <div className="nm-card-title">{n.title}</div>
                {!n.is_read && <span className="nm-unread-dot" role="img" aria-label="Unread" title="Unread" />}
                <div className="nm-card-date">{fmtDate(n.updated_at)}</div>
              </div>

              <div className="nm-card-msg">{n.message}</div>

              <div className="nm-card-meta">
                {n.client_name && (
                  <span className="nm-meta-tag nm-meta-tag--client">{n.client_name}</span>
                )}
                {n.order_name && (
                  <span className="nm-meta-tag nm-meta-tag--order">{n.order_name}</span>
                )}
              </div>

              <div className="nm-card-footer">
                <div className="nm-read-status">
                  {n.is_read ? (
                    <span className="nm-reader-chip">Acknowledged by {n.read_by_name}</span>
                  ) : (
                    <span className="nm-not-read">Pending acknowledgement</span>
                  )}
                  <span className="nm-card-timestamps">
                    Alerted {fmtDateTime(n.updated_at)}
                    {n.is_read && n.read_at && ` · Read ${fmtDateTime(n.read_at)}`}
                  </span>
                </div>

                {!n.is_read && (
                  <button
                    className="nm-mark-btn"
                    onClick={() => handleMarkRead(n.id)}
                    disabled={marking === n.id}
                  >
                    {marking === n.id ? 'Marking…' : 'Acknowledge'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
