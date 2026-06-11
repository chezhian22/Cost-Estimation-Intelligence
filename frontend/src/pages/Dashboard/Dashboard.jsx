import React from 'react'
import './Dashboard.css'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const ORDERS_PER_MONTH = [
  { month: 'Jan', orders: 8  },
  { month: 'Feb', orders: 12 },
  { month: 'Mar', orders: 15 },
  { month: 'Apr', orders: 11 },
  { month: 'May', orders: 18 },
  { month: 'Jun', orders: 23 },
]

const CALC_STATUS = [
  { name: 'Confirmed', value: 21, color: '#1ABCAB' },
  { name: 'Pending',   value: 13, color: '#f59e0b' },
  { name: 'Rejected',  value: 4,  color: '#ef4444' },
]

const TOP_CLIENTS = [
  { name: 'Kingfisher',     orders: 12 },
  { name: 'Tata',           orders: 8  },
  { name: 'Diageo',         orders: 6  },
  { name: 'Heineken',       orders: 4  },
  { name: 'Anheuser-Busch', orders: 3  },
]

const ACTIVITY = [
  { id: 1, action: 'KF-2026-001 confirmed',            client: 'Kingfisher',     time: '2 min ago',  color: '#1ABCAB' },
  { id: 2, action: 'New order created',                client: 'Tata Consumer',  time: '18 min ago', color: '#1ABCAB' },
  { id: 3, action: 'DG-2026-001 calculation updated',  client: 'Diageo',         time: '1 hr ago',   color: '#f59e0b' },
  { id: 4, action: 'New client added',                 client: 'Heineken',       time: '3 hrs ago',  color: '#1ABCAB' },
  { id: 5, action: 'HK-2026-003 rejected',             client: 'Heineken',       time: '5 hrs ago',  color: '#ef4444' },
  { id: 6, action: 'AB-2026-001 pending review',       client: 'Anheuser-Busch', time: 'Yesterday',  color: '#f59e0b' },
]

const KPI_DATA = [
  { label: 'Total Clients',        value: 24, icon: '👥', borderColor: '#1ABCAB', trend: +3, trendLabel: 'this month'     },
  { label: 'Total Orders',         value: 87, icon: '📋', borderColor: '#0ea5e9', trend: +7, trendLabel: 'this month'     },
  { label: 'Pending Calculations', value: 12, icon: '⏳', borderColor: '#f59e0b', trend: -2, trendLabel: 'from last month' },
  { label: 'Confirmed This Month', value: 8,  icon: '✅', borderColor: '#10b981', trend: +2, trendLabel: 'from last month' },
]

function TrendBadge({ trend, label }) {
  const up = trend > 0
  return (
    <span className={`db-trend-badge ${up ? 'db-trend-up' : 'db-trend-down'}`}>
      {up ? '↑' : '↓'} {Math.abs(trend)} {label}
    </span>
  )
}

function KpiCard({ icon, label, value, borderColor, trend, trendLabel }) {
  return (
    <div className="db-kpi-card" style={{ borderLeftColor: borderColor }}>
      <div className="db-kpi-top">
        <span className="db-kpi-icon">{icon}</span>
        <TrendBadge trend={trend} label={trendLabel} />
      </div>
      <div className="db-kpi-value">{value}</div>
      <div className="db-kpi-label">{label}</div>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{label}</div>
      <div className="db-tooltip-val">{payload[0].value} orders</div>
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
      <div className="db-tooltip-val">{payload[0].value} orders</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  return (
    <div className="db-page">

      {/* Section 1 — KPI Cards */}
      <section className="db-section">
        <h2 className="db-section-title">Overview</h2>
        <div className="db-kpi-grid">
          {KPI_DATA.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      {/* Section 2 — Charts */}
      <section className="db-section">
        <h2 className="db-section-title">Analytics</h2>
        <div className="db-charts-row">

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Orders per Month</span>
              <span className="db-chart-sub">Jan – Jun 2026</span>
            </div>
            <div className="db-chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ORDERS_PER_MONTH} barSize={28} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(26,188,171,0.08)' }} />
                  <Bar dataKey="orders" fill="#1ABCAB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Order Status Breakdown</span>
              <span className="db-chart-sub">All time</span>
            </div>
            <div className="db-chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={CALC_STATUS}
                    cx="50%"
                    cy="42%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {CALC_STATUS.map((entry, i) => (
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
              <span className="db-chart-title">Top 5 Clients by Orders</span>
            </div>
            <div className="db-chart-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={TOP_CLIENTS}
                  layout="vertical"
                  barSize={16}
                  margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<HorizTooltip />} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
                  <Bar dataKey="orders" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="db-chart-card">
            <div className="db-chart-header">
              <span className="db-chart-title">Recent Activity</span>
            </div>
            <div className="db-activity-list">
              {ACTIVITY.map(item => (
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
          </div>
        </div>
      </section>

      {/* Section 4 — Quick Actions */}
      <section className="db-section">
        <h2 className="db-section-title">Quick Actions</h2>
        <div className="db-actions-row">
          <button className="db-action-card" onClick={() => onNavigate?.('calculator')}>
            <span className="db-action-icon">🧮</span>
            <span className="db-action-label">Open Calculator</span>
          </button>
          <button className="db-action-card" onClick={() => onNavigate?.('client-orders')}>
            <span className="db-action-icon">👥</span>
            <span className="db-action-label">Add Customer</span>
          </button>
          <button className="db-action-card" onClick={() => onNavigate?.('client-orders')}>
            <span className="db-action-icon">📋</span>
            <span className="db-action-label">View Orders</span>
          </button>
        </div>
      </section>

    </div>
  )
}
