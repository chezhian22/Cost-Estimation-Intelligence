import React, { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../api'

const AUTO_REFRESH_MS = 2 * 60 * 1000  // re-poll every 2 min for auto-detected bounces

function fmtDateTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }) {
  const sent = status === 'sent'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.04em', padding: '0.2rem 0.55rem', borderRadius: 4,
      background: sent ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color:      sent ? '#4ade80'              : '#f87171',
      border:    `1px solid ${sent ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: sent ? '#4ade80' : '#f87171', flexShrink: 0,
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
      (log.sent_by_name || '').toLowerCase().includes(q)
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
            History of all invoice emails · Bounces are auto-detected from your Gmail inbox every 5 min
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
        fontSize: '0.75rem', color: 'var(--text-dim)',
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 6, padding: '0.45rem 0.75rem', marginBottom: '0.75rem',
      }}>
        <span style={{ color: '#4ade80', fontSize: '0.85rem' }}>●</span>
        <span>
          <strong style={{ color: 'var(--text)' }}>Bounce Monitor Active</strong>
          {' '}— the server checks your Gmail inbox every 5 minutes for undelivered emails and
          automatically marks them as <span style={{ color: '#f87171', fontWeight: 600 }}>Failed</span> with the bounce reason.
        </span>
        {lastChecked && (
          <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Last refreshed: {lastChecked.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Toolbar ── */}
      {!loading && logs.length > 0 && (
        <div className="cop-toolbar" style={{ gap: '0.75rem' }}>
          <input
            className="cop-search"
            type="text"
            placeholder="Search by client, order, email, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['all', 'sent', 'failed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: 5, border: '1px solid',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                  background: statusFilter === s
                    ? (s === 'sent' ? 'rgba(34,197,94,0.15)' : s === 'failed' ? 'rgba(239,68,68,0.15)' : 'var(--teal-dim)')
                    : 'var(--bg-raised)',
                  color: statusFilter === s
                    ? (s === 'sent' ? '#4ade80' : s === 'failed' ? '#f87171' : 'var(--teal)')
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
          <div className="cop-empty-icon">✉</div>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: 'var(--text)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Order', 'To Email', 'Date & Time', 'Sent By', 'Status', 'Remarks'].map((h) => (
                  <th key={h} style={{
                    padding: '0.55rem 0.75rem', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
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
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    {log.client_name || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-dim)' }}>
                    {log.order_name || '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <a href={`mailto:${log.to_email}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                      {log.to_email}
                    </a>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
                    {fmtDateTime(log.sent_at)}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      background: 'var(--teal-dim)', color: 'var(--teal)',
                      border: '1px solid var(--teal-mid)',
                      borderRadius: 4, padding: '0.1rem 0.4rem',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {log.sent_by_name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <StatusBadge status={log.status} />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', maxWidth: 300 }}>
                    {log.remarks ? (
                      expandedRemark === log.id ? (
                        <span
                          style={{ color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', lineHeight: 1.5 }}
                          onClick={() => setExpandedRemark(null)}
                        >
                          {log.remarks}
                          <span style={{ marginLeft: '0.4rem', opacity: 0.6, fontSize: '0.72rem' }}>[less]</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            color: '#f87171', fontSize: '0.78rem',
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
                      <span style={{ color: 'var(--text-dim)', opacity: 0.5 }}>—</span>
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
