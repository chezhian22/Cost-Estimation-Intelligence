import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../../api'
import './Dashboard.css'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const KPI_ICONS = {
  clients: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  orders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  confirmed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
}

function TrendBadge({ trend, label }) {
  if (trend === null || trend === undefined) return null
  const up = trend > 0
  const zero = trend === 0
  if (zero) return <span className="db-trend-badge db-trend-up">→ {label}</span>
  return (
    <span className={`db-trend-badge ${up ? 'db-trend-up' : 'db-trend-down'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend)} {label}
    </span>
  )
}

function KpiCard({ icon, label, value, borderColor, trend, trendLabel, loading }) {
  return (
    <div className="db-kpi-card" style={{ borderLeftColor: borderColor }}>
      <div className="db-kpi-top">
        <span className="db-kpi-icon">{icon}</span>
        {!loading && <TrendBadge trend={trend} label={trendLabel} />}
      </div>
      <div className="db-kpi-value">{loading ? '—' : (value ?? 0)}</div>
      <div className="db-kpi-label">{label}</div>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{label}</div>
      <div className="db-tooltip-val">{payload[0].value} quotes</div>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{payload[0].name}</div>
      <div className="db-tooltip-val">{payload[0].value}</div>
    </div>
  )
}

function HorizTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{label}</div>
      <div className="db-tooltip-val">{payload[0].value} quotes</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [clients, setClients] = useState([])
  const [calcs,   setCalcs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getClients().catch(() => []),
      api.getHistory().catch(() => []),
    ]).then(([c, h]) => {
      setClients(c)
      setCalcs(h)
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const thisKey  = monthKey(now.toISOString())
    const lastKey  = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())

    const confirmed     = calcs.filter(c => c.status === 'confirmed').length
    const pending       = calcs.filter(c => c.status === 'pending').length
    const rejected      = calcs.filter(c => c.status === 'rejected').length

    const confirmedThisMonth = calcs.filter(c =>
      c.status === 'confirmed' && monthKey(c.updated_at || c.created_at) === thisKey
    ).length

    const calcsThisMonth = calcs.filter(c => monthKey(c.created_at) === thisKey).length
    const calcsLastMonth = calcs.filter(c => monthKey(c.created_at) === lastKey).length

    const clientsThisMonth = clients.filter(c => monthKey(c.created_at) === thisKey).length

    // Last 6 months for bar chart
    const ordersPerMonth = Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = monthKey(d.toISOString())
      return {
        month:  MONTH_LABELS[d.getMonth()],
        orders: calcs.filter(c => monthKey(c.created_at) === key).length,
      }
    })

    // Status pie
    const calcStatus = [
      { name: 'Confirmed', value: confirmed, color: '#1ABCAB' },
      { name: 'Pending',   value: pending,   color: '#f59e0b' },
      { name: 'Rejected',  value: rejected,  color: '#ef4444' },
    ]

    // Top 5 clients by quote count
    const clientCounts = {}
    calcs.forEach(c => {
      if (c.client_name) clientCounts[c.client_name] = (clientCounts[c.client_name] || 0) + 1
    })
    const topClients = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, orders]) => ({ name, orders }))

    // Recent activity — last 6 by updated_at or created_at
    const recentActivity = [...calcs]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 6)
      .map(c => ({
        id:     c.id,
        action: `${c.order_name || 'Quote #' + c.id} — ${c.status}`,
        client: c.client_name || 'No client',
        time:   relativeTime(c.updated_at || c.created_at),
        color:  c.status === 'confirmed' ? '#1ABCAB' : c.status === 'rejected' ? '#ef4444' : '#f59e0b',
      }))

    return {
      totalClients:       clients.length,
      totalCalcs:         calcs.length,
      pending,
      confirmedThisMonth,
      clientsThisMonth,
      calcsTrend:         calcsThisMonth - calcsLastMonth,
      ordersPerMonth,
      calcStatus,
      topClients,
      recentActivity,
    }
  }, [clients, calcs])

  const kpiData = [
    {
      label: 'Total Clients',        value: stats.totalClients,       icon: KPI_ICONS.clients,
      borderColor: '#1ABCAB', trend: stats.clientsThisMonth,  trendLabel: 'new this month',
    },
    {
      label: 'Total Quotes',         value: stats.totalCalcs,         icon: KPI_ICONS.orders,
      borderColor: '#0ea5e9', trend: stats.calcsTrend,        trendLabel: 'vs last month',
    },
    {
      label: 'Pending Quotes',       value: stats.pending,            icon: KPI_ICONS.pending,
      borderColor: '#f59e0b', trend: null,                    trendLabel: '',
    },
    {
      label: 'Confirmed This Month', value: stats.confirmedThisMonth, icon: KPI_ICONS.confirmed,
      borderColor: '#10b981', trend: null,                    trendLabel: '',
    },
  ]

  const chartSubLabel = (() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    return `${MONTH_LABELS[start.getMonth()]} – ${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`
  })()

  return (
    <div className="db-page">

      {/* Section 1 — KPI Cards */}
      <section className="db-section">
        <h2 className="db-section-title">Overview</h2>
        <div className="db-kpi-grid">
          {kpiData.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} loading={loading} />
          ))}
        </div>
      </section>

      {/* Section 2 — Charts */}
      <section className="db-section">
        <h2 className="db-section-title">Analytics</h2>
        <div className="db-charts-row">

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Quotes per Month</span>
              <span className="db-chart-sub">{chartSubLabel}</span>
            </div>
            <div className="db-chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.ordersPerMonth} barSize={28} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(26,188,171,0.08)' }} />
                  <Bar dataKey="orders" fill="#1ABCAB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Quote Status Breakdown</span>
              <span className="db-chart-sub">All time</span>
            </div>
            <div className="db-chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.calcStatus}
                    cx="50%"
                    cy="42%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.calcStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Top Clients + Activity */}
      <section className="db-section">
        <div className="db-dual-row">

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Top Clients by Quotes</span>
            </div>
            <div className="db-chart-body">
              {stats.topClients.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem 0', fontSize: '0.82rem' }}>
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stats.topClients}
                    layout="vertical"
                    barSize={16}
                    margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<HorizTooltip />} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
                    <Bar dataKey="orders" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Recent Activity</span>
            </div>
            {stats.recentActivity.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem 0', fontSize: '0.82rem' }}>
                No recent activity
              </div>
            ) : (
              <div className="db-activity-list">
                {stats.recentActivity.map(item => (
                  <div key={item.id} className="db-activity-item">
                    <div className="db-activity-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}55` }} />
                    <div className="db-activity-content">
                      <div className="db-activity-action">{item.action}</div>
                      <div className="db-activity-meta">
                        <span className="db-activity-client">{item.client}</span>
                        <span className="db-activity-sep">·</span>
                        <span className="db-activity-time">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 4 — Quick Actions */}
      <section className="db-section">
        <h2 className="db-section-title">Quick Actions</h2>
        <div className="db-actions-row">
          <button className="db-action-card db-action-card--wide" onClick={() => onNavigate?.('calculator')}>
            <span className="db-action-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
                <line x1="7" y1="8" x2="7" y2="12"/>
                <line x1="12" y1="6" x2="12" y2="12"/>
                <line x1="17" y1="10" x2="17" y2="12"/>
              </svg>
            </span>
            <span className="db-action-label">Open Calculator</span>
          </button>
          <button className="db-action-card" onClick={() => onNavigate?.('client-orders')}>
            <span className="db-action-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </span>
            <span className="db-action-label">Add Customer</span>
          </button>
          <button className="db-action-card" onClick={() => onNavigate?.('client-orders')}>
            <span className="db-action-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <span className="db-action-label">View Orders</span>
          </button>
        </div>
      </section>

    </div>
  )
}
