import React, { useState } from 'react'
import { api } from '../api'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'change-password'

  return mode === 'change-password'
    ? <ChangePasswordView onBack={() => setMode('login')} />
    : <LoginView onLogin={onLogin} onChangePassword={() => setMode('change-password')} />
}

function LoginView({ onLogin, onChangePassword }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError(null)
    try {
      const res = await api.login(email.trim(), password)
      onLogin(res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0d1117',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Left branding panel ── */}
      <div style={{
        flex: '0 0 46%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 4rem',
        background: 'linear-gradient(145deg, #0d2b25 0%, #0a1f1c 50%, #0d1117 100%)',
        borderRight: '1px solid rgba(54,229,194,0.14)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: 320, height: 320, borderRadius: '50%',
          border: '1px solid rgba(54,229,194,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: 200, height: 200, borderRadius: '50%',
          border: '1px solid rgba(54,229,194,0.12)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: 260, height: 260, borderRadius: '50%',
          border: '1px solid rgba(54,229,194,0.07)',
          pointerEvents: 'none',
        }} />

        {/* Logo mark */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: '2px solid #36E5C2',
          background: 'rgba(54,229,194,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 0 40px rgba(54,229,194,0.20)',
        }}>
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#36E5C2" strokeWidth="2"/>
            <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke="#36E5C2" strokeWidth="1.5" strokeOpacity="0.75"/>
            <line x1="3" y1="16" x2="29" y2="16" stroke="#36E5C2" strokeWidth="1.3" strokeOpacity="0.6"/>
          </svg>
        </div>

        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          Chroma Print
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 500, color: '#36E5C2', marginTop: '0.4rem', letterSpacing: '0.01em' }}>
          Cost Estimation Intelligence
        </div>
        <div style={{ width: 48, height: 3, background: '#36E5C2', borderRadius: 2, margin: '1.6rem 0' }} />
        <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 280 }}>
          Precision label costing for every cylinder, substrate, and production run — all in one place.
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '3rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.60)' }}>
          © 2026 Chroma Print India Pvt. Ltd.
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#111827',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: '2.4rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Welcome back
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.4rem' }}>
              Sign in to your account to continue
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                style={{
                  background: '#1c2433',
                  border: '1.5px solid rgba(255,255,255,0.10)',
                  borderRadius: 10,
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  width: '100%',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#36E5C2'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    background: '#1c2433',
                    border: '1.5px solid rgba(255,255,255,0.10)',
                    borderRadius: 10,
                    padding: '0.75rem 2.8rem 0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#36E5C2'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', padding: 0, lineHeight: 0,
                  }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.40)',
                borderRadius: 10, padding: '0.7rem 1rem',
                fontSize: '0.83rem', color: '#fca5a5',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.4rem',
                width: '100%', padding: '0.82rem',
                background: loading ? 'rgba(54,229,194,0.5)' : '#36E5C2',
                border: 'none',
                borderRadius: 10,
                color: '#0a1a17',
                fontFamily: 'inherit',
                fontSize: '0.95rem', fontWeight: 800,
                letterSpacing: '0.02em',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'background 0.18s, box-shadow 0.18s, transform 0.1s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(54,229,194,0.30)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#4aecd0'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(54,229,194,0.5)' : '#36E5C2'; e.currentTarget.style.transform = 'none' }}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: '1.6rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onChangePassword}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem',
                cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#36E5C2'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PW_RULES = [
  { id: 'len',     label: 'At least 8 characters',          test: p => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',      test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',      test: p => /[a-z]/.test(p) },
  { id: 'digit',   label: 'One number (0–9)',                test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',   test: p => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ password }) {
  if (!password) return null
  const passed = PW_RULES.filter(r => r.test(password)).length
  const pct = (passed / PW_RULES.length) * 100
  const color = pct <= 40 ? '#ef4444' : pct <= 60 ? '#f59e0b' : pct <= 80 ? '#3b82f6' : '#10b981'
  const label = pct <= 40 ? 'Weak' : pct <= 60 ? 'Fair' : pct <= 80 ? 'Good' : 'Strong'
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>Password strength</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: color, transition: 'width 0.25s, background 0.25s' }} />
      </div>
      <div style={{ marginTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {PW_RULES.map(r => {
          const ok = r.test(password)
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: ok ? '#6ee7b7' : 'rgba(255,255,255,0.35)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
              </svg>
              {r.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChangePasswordView({ onBack }) {
  const [email,       setEmail]       = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error,       setError]       = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)

  const allRulesPassed = PW_RULES.every(r => r.test(newPassword))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !oldPassword || !newPassword) { setError('All fields are required'); return }
    if (!allRulesPassed) { setError('New password does not meet the requirements below'); return }
    setLoading(true); setError(null)
    try {
      await api.changePassword(email.trim(), oldPassword, newPassword)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#0d1117', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Left branding panel — same as login */}
      <div style={{
        flex: '0 0 46%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem 4rem',
        background: 'linear-gradient(145deg, #0d2b25 0%, #0a1f1c 50%, #0d1117 100%)',
        borderRight: '1px solid rgba(54,229,194,0.14)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(54,229,194,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(54,229,194,0.12)', pointerEvents: 'none' }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid #36E5C2', background: 'rgba(54,229,194,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: '0 0 40px rgba(54,229,194,0.20)' }}>
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#36E5C2" strokeWidth="2"/>
            <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke="#36E5C2" strokeWidth="1.5" strokeOpacity="0.75"/>
            <line x1="3" y1="16" x2="29" y2="16" stroke="#36E5C2" strokeWidth="1.3" strokeOpacity="0.6"/>
          </svg>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>Chroma Print</div>
        <div style={{ fontSize: '1rem', fontWeight: 500, color: '#36E5C2', marginTop: '0.4rem' }}>Cost Estimation Intelligence</div>
        <div style={{ width: 48, height: 3, background: '#36E5C2', borderRadius: 2, margin: '1.6rem 0' }} />
        <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 280 }}>
          Precision label costing for every cylinder, substrate, and production run — all in one place.
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '3rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.60)' }}>
          © 2026 Chroma Print India Pvt. Ltd.
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#111827' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: '2.4rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Change Password
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.4rem' }}>
              Enter your email and current password to set a new one
            </div>
          </div>

          {done ? (
            <div>
              <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 10, padding: '1rem 1.2rem', color: '#6ee7b7', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
                Password changed successfully! You can now sign in with your new password.
              </div>
              <button
                onClick={onBack}
                style={{ width: '100%', padding: '0.82rem', background: '#36E5C2', border: 'none', borderRadius: 10, color: '#0a1a17', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {[
                { label: 'Email address',    value: email,       setValue: setEmail,       type: 'email',    placeholder: 'you@example.com' },
                { label: 'Current Password', value: oldPassword, setValue: setOldPassword, type: 'password', placeholder: '••••••••' },
              ].map(({ label, value, setValue, type, placeholder }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>{label}</label>
                  <input
                    type={type} value={value} onChange={e => setValue(e.target.value)}
                    placeholder={placeholder} autoComplete="off"
                    style={{ background: '#1c2433', border: '1.5px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem 1rem', color: '#ffffff', fontSize: '0.92rem', outline: 'none', width: '100%', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#36E5C2'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>New Password</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="min 8 characters" autoComplete="new-password"
                  style={{ background: '#1c2433', border: `1.5px solid ${newPassword && !allRulesPassed ? 'rgba(239,68,68,0.50)' : newPassword && allRulesPassed ? 'rgba(16,185,129,0.50)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 10, padding: '0.75rem 1rem', color: '#ffffff', fontSize: '0.92rem', outline: 'none', width: '100%', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onFocus={e => { if (!newPassword) e.target.style.borderColor = '#36E5C2' }}
                  onBlur={e => { if (!newPassword) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }}
                />
                <PasswordStrength password={newPassword} />
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.40)', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.83rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ marginTop: '0.4rem', width: '100%', padding: '0.82rem', background: loading ? 'rgba(54,229,194,0.5)' : '#36E5C2', border: 'none', borderRadius: 10, color: '#0a1a17', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 800, cursor: loading ? 'wait' : 'pointer', transition: 'background 0.18s' }}
              >
                {loading ? 'Updating…' : 'Update Password →'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.40)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#36E5C2'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.40)'}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
