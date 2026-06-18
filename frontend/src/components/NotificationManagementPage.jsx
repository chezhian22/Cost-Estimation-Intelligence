import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('en-IN', {
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

export default function NotificationManagementPage({ currentUser }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(false)
  const [marking, setMarking]             = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.getAdminNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

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

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="nm-page">
      <div className="nm-header">
        <div className="nm-header-left">
          <div className="nm-title">Notification Management</div>
          <div className="nm-sub">Track and acknowledge unconfirmed quote alerts</div>
        </div>
        <div className="nm-header-right">
          {unreadCount > 0 && (
            <span className="nm-badge">{unreadCount} unread</span>
          )}
          <button className="nm-refresh-btn" onClick={load} disabled={loading} title="Refresh">
            <RefreshIcon />
            Refresh
          </button>
        </div>
      </div>

      {loading && notifications.length === 0 && (
        <div className="nm-empty">
          <div className="nm-spinner" />
          <span>Loading…</span>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="nm-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>No notifications yet</span>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="nm-list">
          {notifications.map(n => (
            <div key={n.id} className={`nm-card${n.is_read ? ' nm-card--read' : ''}`}>
              <div className="nm-card-top">
                <div className="nm-card-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="nm-card-title">{n.title}</div>
                {!n.is_read && <span className="nm-unread-dot" />}
                <div className="nm-card-date">{fmtDate(n.updated_at)}</div>
              </div>

              <div className="nm-card-msg">{n.message}</div>

              <div className="nm-card-meta">
                {n.client_name && (
                  <span className="nm-meta-tag nm-meta-tag--client">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {n.client_name}
                  </span>
                )}
                {n.order_name && (
                  <span className="nm-meta-tag nm-meta-tag--order">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {n.order_name}
                  </span>
                )}
              </div>

              <div className="nm-card-footer">
                <div className="nm-read-status">
                  {n.is_read ? (
                    <span className="nm-reader-chip">
                      <CheckIcon />
                      Read by {n.read_by_name}
                    </span>
                  ) : (
                    <span className="nm-not-read">Not read yet</span>
                  )}
                </div>

                {!n.is_read && (
                  <button
                    className="nm-mark-btn"
                    onClick={() => handleMarkRead(n.id)}
                    disabled={marking === n.id}
                  >
                    {marking === n.id
                      ? <><span className="nm-spinner nm-spinner--sm" /> Marking…</>
                      : <><CheckIcon /> Mark as Read</>
                    }
                  </button>
                )}
              </div>

              <div className="nm-card-note">
                Alerted {fmtDateTime(n.updated_at)}
                {n.is_read && n.read_at && ` · Read ${fmtDateTime(n.read_at)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
