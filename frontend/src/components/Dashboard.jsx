import React, { useEffect, useState } from 'react'
import { api } from '../api'

function StatCard({ label, value, sub, color = 'var(--teal)' }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.4rem 1.6rem',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function QuickLink({ icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1.2rem 1.4rem',
      display: 'flex', alignItems: 'flex-start', gap: '1rem',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'border-color 0.15s, background 0.15s',
      fontFamily: 'inherit',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--teal-dim)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--teal-dim)', border: '1px solid var(--teal-mid)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--teal)', fontSize: '1.1rem',
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-bright)' }}>{label}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desc}</div>
      </div>
    </button>
  )
}

export default function Dashboard({ onNavigate, currentUser }) {
  const [stats, setStats] = useState({ clients: null, calcs: null, confirmed: null })

  useEffect(() => {
    Promise.all([
      api.getClients().catch(() => []),
      api.getHistory().catch(() => []),
    ]).then(([clients, calcs]) => {
      setStats({
        clients:   clients.length,
        calcs:     calcs.length,
        confirmed: calcs.filter(c => c.status === 'confirmed').length,
      })
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>

      {/* Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-raised) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.8rem 2rem',
        display: 'flex', alignItems: 'center', gap: '1.4rem',
        boxShadow: 'var(--shadow-card)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30,
          width: 160, height: 160, borderRadius: '50%',
          border: '1px solid rgba(54,229,194,0.12)', pointerEvents: 'none',
        }} />
        <div style={{
          width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
          background: 'var(--teal-dim)', border: '1px solid var(--teal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px var(--teal-glow)',
        }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#36E5C2" strokeWidth="2"/>
            <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke="#36E5C2" strokeWidth="1.5" strokeOpacity="0.7"/>
            <line x1="3" y1="16" x2="29" y2="16" stroke="#36E5C2" strokeWidth="1.2" strokeOpacity="0.6"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)' }}>
            Welcome, {currentUser?.username}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Chroma Print — Cost Estimation Intelligence
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ marginTop: '0.3rem' }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 100,
              background: currentUser?.role === 'admin' ? 'rgba(245,158,11,0.12)' : 'var(--teal-dim)',
              border: currentUser?.role === 'admin' ? '1px solid rgba(245,158,11,0.40)' : '1px solid var(--teal)',
              color: currentUser?.role === 'admin' ? '#f59e0b' : 'var(--teal)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {currentUser?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <StatCard label="Total Clients"     value={stats.clients}   sub="Registered clients" />
          <StatCard label="Saved Quotes"      value={stats.calcs}     sub="All time calculations" color="#818cf8" />
          <StatCard label="Confirmed Orders"  value={stats.confirmed} sub="Accepted quotes" color="#10b981" />
        </div>
      </div>

      {/* Quick links */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>Quick Access</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.9rem' }}>
          <QuickLink icon="◉" label="Pricing Calculator"  desc="Run a new cylinder cost estimate"           onClick={() => onNavigate('calculator')} />
          <QuickLink icon="⊞" label="Quote Comparison"    desc="Compare multiple saved quotes side by side"  onClick={() => onNavigate('comparison')} />
          <QuickLink icon="◈" label="Client & Orders"     desc="Manage clients and their orders"             onClick={() => onNavigate('client-orders')} />
          <QuickLink icon="▦" label="Quote History"       desc="Browse all saved calculations"               onClick={() => onNavigate('history')} />
        </div>
      </div>
    </div>
  )
}
