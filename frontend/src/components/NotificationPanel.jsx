import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function NotificationBell({ unreadCount, onOpenChange, onRead }) {
  const [open, setOpen]             = useState(false)
  const [notifications, setNotifs]  = useState([])
  const [loading, setLoading]       = useState(false)
  const [panelPos, setPanelPos]     = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)

  function toggle() {
    const next = !open
    setOpen(next)
    onOpenChange?.(next)
    if (next) {
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect) setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
      loadNotifications()
    }
  }

  function loadNotifications() {
    setLoading(true)
    api.getNotifications()
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function handleMarkRead(id) {
    api.markNotificationRead(id)
      .then(() => {
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        onRead?.()
      })
      .catch(() => {})
  }

  function handleMarkAllRead() {
    api.markAllNotificationsRead()
      .then(() => {
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
        onRead?.()
      })
      .catch(() => {})
  }

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        const panel = document.getElementById('notif-panel')
        if (panel && !panel.contains(e.target)) {
          setOpen(false)
          onOpenChange?.(false)
        }
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const hasUnread = unreadCount > 0

  return (
    <>
      <button
        ref={btnRef}
        className="notif-bell-btn"
        onClick={toggle}
        title="Notifications"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasUnread && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && createPortal(
        <div
          id="notif-panel"
          className="notif-panel"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {notifications.some(n => !n.is_read) && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-panel-body">
            {loading && (
              <div className="notif-empty">
                <div className="notif-spinner" />
                <span>Loading…</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="notif-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span>All caught up</span>
              </div>
            )}

            {!loading && notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item${n.is_read ? ' notif-item--read' : ''}`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className="notif-item-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-msg">{n.message}</div>
                  <div className="notif-item-meta">
                    {n.client_name && <span>{n.client_name}</span>}
                    {n.client_name && n.order_name && <span className="notif-meta-sep">·</span>}
                    {n.order_name && <span>{n.order_name}</span>}
                    <span className="notif-meta-sep">·</span>
                    <span>{timeAgo(n.updated_at)}</span>
                  </div>
                </div>
                {!n.is_read && <span className="notif-unread-dot" />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
