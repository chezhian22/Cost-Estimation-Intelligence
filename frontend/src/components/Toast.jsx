import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TOAST_EVENT } from '../utils/toast'

let _nextId = 0

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function onToast(e) {
      const { msg, type, duration } = e.detail
      const id = ++_nextId
      setToasts((prev) => [...prev, { id, msg, type }])
      setTimeout(() => dismiss(id), duration)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (!toasts.length) return null

  return createPortal(
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-msg">{t.msg}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>,
    document.body
  )
}
