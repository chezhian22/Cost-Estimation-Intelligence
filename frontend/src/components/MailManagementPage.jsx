import React, { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../api'

const AUTO_REFRESH_MS = 2 * 60 * 1000  // re-poll every 2 min for auto-detected bounces

function parseUTC(dt) {
  if (!dt) return null
  // If the string has no timezone indicator, treat it as UTC (backend stores utcnow without Z)
  const s = /[Zz]$|[+-]\d{2}:\d{2}$/.test(dt) ? dt : dt + 'Z'
  return new Date(s)
}
function fmtDate(dt) {
  const d = parseUTC(dt)
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(dt) {
  const d = parseUTC(dt)
  if (!d) return ''
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function StatusBadge({ status }) {
  const sent = status === 'sent'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.04em', padding: '0.25rem 0.65rem', borderRadius: 4,
      background: sent ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color:      sent ? '#22c55e'              : '#ef4444',
      border:    `1px solid ${sent ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
    }}>
      <span aria-hidden="true" style={{
        width: 6, height: 6, borderRadius: '50%',
        background: sent ? '#22c55e' : '#ef4444', flexShrink: 0,
      }} />
      {sent ? 'Sent' : 'Failed'}
    </span>
  )
}

export default function MailManagementPage() {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastChecked, setLastChecked] = useState(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedRemark, setExpandedRemark] = useState(null)
  const timerRef = useRef(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await api.getEmailLogs()
      setLogs(data)
      setLastChecked(new Date())
    } catch (e) {
      setError(e.message || 'Failed to load email logs')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load + auto-refresh
  useEffect(() => {
    load()
    timerRef.current = setInterval(() => load(true), AUTO_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [load])

  const filtered = logs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (log.client_name  || '').toLowerCase().includes(q) ||
      (log.order_name   || '').toLowerCase().includes(q) ||
      (log.to_email     || '').toLowerCase().includes(q) ||
      (log.sent_by_name || '').toLowerCase().includes(q) ||
      (log.quote_ref    || '').toLowerCase().includes(q)
    )
  })

  const sentCount   = logs.filter((l) => l.status === 'sent').length
  const failedCount = logs.filter((l) => l.status === 'failed').length

  return (
    <div className="cop-page">
      {/* ── Header ── */}
      <div className="cop-page-header">
        <div className="cop-page-title-wrap">
          <div className="cop-page-title">Mail Management</div>
          <div className="cop-page-sub">
            History of all invoice emails
          </div>
        </div>
        <div className="cop-header-right">
          <div className="cop-stats-row">
            <div className="cop-stat">
              <span className="cop-stat-val">{logs.length}</span>
              <span className="cop-stat-label">Total</span>
            </div>
            <div className="cop-stat-divider" />
            <div className="cop-stat">
              <span className="cop-stat-val" style={{ color: '#4ade80' }}>{sentCount}</span>
              <span className="cop-stat-label">Sent</span>
            </div>
            <div className="cop-stat-divider" />
            <div className="cop-stat">
              <span className="cop-stat-val" style={{ color: failedCount > 0 ? '#f87171' : undefined }}>
                {failedCount}
              </span>
              <span className="cop-stat-label">Failed</span>
            </div>
          </div>
          <button className="cop-new-customer-btn" onClick={() => load()} title="Refresh now">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Auto-monitor notice ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: 1.5,
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 6, padding: '0.5rem 0.85rem', marginBottom: '0.75rem',
      }}>
        <span style={{ color: '#4ade80', fontSize: '0.85rem' }}>●</span>
        <span>
          <strong style={{ color: 'var(--text)' }}>Bounce Monitor Active</strong>
          {' '}— the server checks your Gmail inbox every 5 minutes for undelivered emails and
          automatically marks them as <span style={{ color: '#f87171', fontWeight: 600 }}>Failed</span> with the bounce reason.
        </span>
        {lastChecked && (
          <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.8rem' }}>
            Last refreshed: {lastChecked.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        )}
      </div>

      {/* ── Toolbar ── */}
      {!loading && logs.length > 0 && (
        <div className="cop-toolbar" style={{ gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="cop-search"
              type="text"
              placeholder="Search by client, order, email, or user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.2rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['all', 'sent', 'failed'].map((s) => (
              <button
                key={s}
                className="mail-filter-tab"
                onClick={() => setStatusFilter(s)}
                style={{
                  background: statusFilter === s
                    ? (s === 'sent' ? 'rgba(34,197,94,0.15)' : s === 'failed' ? 'rgba(239,68,68,0.15)' : 'var(--teal-dim)')
                    : 'var(--bg-raised)',
                  color: statusFilter === s
                    ? (s === 'sent' ? '#22c55e' : s === 'failed' ? '#ef4444' : 'var(--teal)')
                    : 'var(--text-dim)',
                  borderColor: statusFilter === s
                    ? (s === 'sent' ? 'rgba(34,197,94,0.4)' : s === 'failed' ? 'rgba(239,68,68,0.4)' : 'var(--teal-mid)')
                    : 'var(--border)',
                }}
              >
                {s === 'all' ? 'All' : s === 'sent' ? `Sent (${sentCount})` : `Failed (${failedCount})`}
              </button>
            ))}
          </div>
          <span className="cop-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div className="cop-state">
          <span className="cop-spinner" /><span>Loading email history…</span>
        </div>
      )}
      {error && <div className="error-banner" style={{ margin: '1rem 0' }}>⚠ {error}</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="cop-state cop-state--empty">
          <div className="cop-empty-icon">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div className="cop-empty-title">No emails sent yet</div>
          <div className="cop-empty-sub">Email history will appear here after invoices are sent to clients.</div>
        </div>
      )}
      {!loading && !error && logs.length > 0 && filtered.length === 0 && (
        <div className="cop-state"><span>No records match your search.</span></div>
      )}

      {/* ── Table ── */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', color: 'var(--text)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Order', 'Cost Estimate', 'To Email', 'Date & Time', 'Sent By', 'Status', 'Remarks'].map((h) => (
                  <th key={h} style={{
                    padding: '0.6rem 0.75rem', textAlign: 'center',
                    fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--text-dim)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: log.status === 'failed' ? 'rgba(239,68,68,0.04)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = log.status === 'failed' ? 'rgba(239,68,68,0.04)' : 'transparent'}
                >
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                    {log.client_name || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    {log.order_name || '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {log.quote_ref
                      ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600 }}>{log.quote_ref}</span>
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                    <a href={`mailto:${log.to_email}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                      {log.to_email}
                    </a>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtDate(log.sent_at)}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 2 }}>{fmtTime(log.sent_at)}</div>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{
                      background: 'var(--teal-dim)', color: 'var(--teal)',
                      border: '1px solid var(--teal-mid)',
                      borderRadius: 4, padding: '0.2rem 0.5rem',
                      fontSize: '0.8rem', fontWeight: 600,
                    }}>
                      {log.sent_by_name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                    <StatusBadge status={log.status} />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', maxWidth: 300 }}>
                    {log.remarks ? (
                      expandedRemark === log.id ? (
                        <span
                          style={{ color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', lineHeight: 1.5 }}
                          onClick={() => setExpandedRemark(null)}
                        >
                          {log.remarks}
                          <span style={{ marginLeft: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>[less]</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            color: '#ef4444', fontSize: '0.8rem',
                            display: 'block', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 280, cursor: 'pointer',
                          }}
                          title={log.remarks}
                          onClick={() => setExpandedRemark(log.id)}
                        >
                          {log.remarks}
                        </span>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

