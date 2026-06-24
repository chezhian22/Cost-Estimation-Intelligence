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

export function NotificationBell({ unreadCount, onOpenChange, onRead, newNotifPopup = [], onDismissPopup }) {
  const [open, setOpen]             = useState(false)
  const [notifications, setNotifs]  = useState([])
  const [loading, setLoading]       = useState(false)
  const [panelPos, setPanelPos]     = useState({ top: 0, right: 0 })
  const [popupVisible, setPopupVisible] = useState(false)
  const [popupPos, setPopupPos]     = useState({ top: 0, right: 0 })
  const [popupKey, setPopupKey]     = useState(0)
  const btnRef   = useRef(null)
  const timerRef = useRef(null)

  function toggle() {
    const next = !open
    setOpen(next)
    onOpenChange?.(next)
    if (next) {
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect) setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
      loadNotifications()
      if (popupVisible) dismissPopup()
    }
  }

  function loadNotifications() {
    setLoading(true)
    api.getNotifications()
      .then(all => setNotifs(all.filter(n => !n.is_read)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function handleMarkRead(id) {
    api.markNotificationRead(id)
      .then(() => {
        setNotifs(prev => prev.filter(n => n.id !== id))
        onRead?.()
      })
      .catch(() => {})
  }

  function handleMarkAllRead() {
    api.markAllNotificationsRead()
      .then(() => {
        setNotifs([])
        onRead?.()
      })
      .catch(() => {})
  }

  function dismissPopup() {
    setPopupVisible(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    onDismissPopup?.()
  }

  // Click outside to close panel
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

  // Show popup toast when new notifications arrive
  useEffect(() => {
    if (!newNotifPopup || newNotifPopup.length === 0) {
      setPopupVisible(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPopupPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right })
    setPopupVisible(true)
    setPopupKey(k => k + 1)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setPopupVisible(false)
      onDismissPopup?.()
    }, 30_000)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [newNotifPopup])

  const hasUnread = unreadCount > 0
  const first     = newNotifPopup[0]
  const extraCount = newNotifPopup.length - 1

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

      {/* Popup toast anchored below the bell */}
      {popupVisible && first && createPortal(
        <div
          key={popupKey}
          className="notif-popup"
          style={{ top: popupPos.top, right: popupPos.right }}
        >
          <div className="notif-popup-header">
            <span className="notif-popup-label">New Alert</span>
            {extraCount > 0 && (
              <span className="notif-popup-extra">+{extraCount} more</span>
            )}
            <button className="notif-popup-close" onClick={dismissPopup} aria-label="Dismiss notification">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="notif-popup-title">{first.title}</div>
          <div className="notif-popup-msg">{first.message}</div>

          {(first.client_name || first.order_name) && (
            <div className="notif-popup-meta">
              {first.client_name && <span className="notif-popup-tag">{first.client_name}</span>}
              {first.order_name  && <span className="notif-popup-tag">{first.order_name}</span>}
            </div>
          )}

          <div className="notif-popup-progress">
            <div key={popupKey} className="notif-popup-progress-bar" />
          </div>
        </div>,
        document.body
      )}

      {/* Dropdown panel */}
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
                className="notif-item"
                onClick={() => handleMarkRead(n.id)}
              >
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
                <span className="notif-unread-dot" />
              </div>
            ))}
          </div>

          {!loading && notifications.length > 0 && (
            <div className="notif-panel-footer">
              {notifications.length} unread alert{notifications.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
