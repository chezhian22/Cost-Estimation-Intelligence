const TOAST_EVENT = 'app:toast'

export const toast = {
  success(msg, duration = 4000) {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { msg: String(msg), type: 'success', duration } }))
  },
  error(msg, duration = 5000) {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { msg: String(msg), type: 'error', duration } }))
  },
  warn(msg, duration = 4000) {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { msg: String(msg), type: 'warn', duration } }))
  },
}

export { TOAST_EVENT }
