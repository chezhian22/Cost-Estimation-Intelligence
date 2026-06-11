import React, { useEffect, useState } from 'react'
import { api, setToken } from './api'
import { generatePDF } from './utils/generatePDF'
import InputPanel from './components/InputPanel'
import CylinderTable from './components/CylinderTable'
import PricingPanel from './components/PricingPanel'
import ComparisonPanel from './components/ComparisonPanel'
import ComparisonPage from './components/ComparisonPage'
import QuoteHistory from './components/QuoteHistory'
import ManageCylinders from './components/ManageCylinders'
import ManageSubstrates from './components/ManageSubstrates'
import CustomerOrdersPage from './components/CustomerOrdersPage'
import LoginPage from './components/LoginPage'
import UserManagementPage from './components/UserManagementPage'
import SettingsPage from './components/SettingsPage'
import Dashboard from './pages/Dashboard/Dashboard'
import PDFPreview from './pages/Estimating/PDFPreview/PDFPreview'

const DEFAULTS = {
  width: 64.5,
  height: 136,
  yield_pct: 85,
  order_qty: '',
  substrateId: 'custom',
  substrate_name: null,
  substrate_price: 45,
  foil_cost: 0,
  custom_cost: 0,
  exchange_rate: 85,
}

function buildPayload(inputs, { save = false, clientId = null, orderId = null, selectedTeeth = null } = {}) {
  return {
    width: parseFloat(inputs.width) || 1,
    height: parseFloat(inputs.height) || 1,
    yield_pct: parseFloat(inputs.yield_pct) || 85,
    substrate_name: inputs.substrate_name,
    substrate_price: parseFloat(inputs.substrate_price) || 0,
    foil_cost: parseFloat(inputs.foil_cost) || 0,
    custom_cost: parseFloat(inputs.custom_cost) || 0,
    exchange_rate: parseFloat(inputs.exchange_rate) || 85,
    order_qty: inputs.order_qty ? parseInt(inputs.order_qty, 10) : null,
    save,
    client_id: clientId,
    order_id: orderId,
    selected_teeth: selectedTeeth,
  }
}

const NAV_SECTIONS = [
  {
    section: null,
    icon: null,
    links: [
      {
        id: 'dashboard', label: 'Dashboard',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Calculation',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    links: [
      { id: 'calculator',   label: 'Pricing Calculator' },
      { id: 'comparison',   label: 'Quote Comparison'   },
      { id: 'history',      label: 'Quote History'      },
      { id: 'pdf-preview',  label: 'PDF Quote Preview'  },
    ],
  },
  {
    section: 'Customers',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    links: [
      { id: 'client-orders', label: 'Client & Orders' },
    ],
  },
  {
    section: 'Product Master',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    links: [
      { id: 'cylinders',  label: 'Cylinder Management'  },
      { id: 'substrates', label: 'Substrate Management' },
    ],
  },
]

const ADMIN_SECTION = {
  section: 'Admin',
  icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  links: [
    { id: 'user-management', label: 'User Management' },
    { id: 'settings',        label: 'Company Settings' },
  ],
}

export default function App() {
  const [currentUser, setCurrentUser]     = useState(null)
  const [authLoading, setAuthLoading]     = useState(true)

  const [inputs, setInputs]               = useState(DEFAULTS)
  const [substrates, setSubstrates]       = useState([])
  const [result, setResult]               = useState(null)
  const [selectedCylIdx, setSelectedCylIdx] = useState(null)
  const [approvingCyl, setApprovingCyl] = useState(false)
  const [error, setError]                 = useState(null)
  const [loading, setLoading]             = useState(false)
  const [navOpen, setNavOpen]             = useState(true)
  const [formOpen, setFormOpen]           = useState(true)
  const [activeView, setActiveView]       = useState('dashboard')
  const [clientId, setClientId]           = useState(null)
  const [clientName, setClientName]       = useState(null)
  const [orderId, setOrderId]             = useState(null)
  const [orderName, setOrderName]         = useState(null)
  const [theme, setTheme]                 = useState(() => localStorage.getItem('cp-theme') || 'dark')
  const [editingCalc, setEditingCalc]     = useState(null) // { id, client_name, order_name }
  const [pendingConfirm, setPendingConfirm] = useState(null) // { type: 'calc'|'version', id }
  const [confirmingQuote, setConfirmingQuote] = useState(false)
  const [quoteConfirmed, setQuoteConfirmed] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [hasCalculated, setHasCalculated] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cp-theme', theme)
  }, [theme])

  // Restore session from stored token
  useEffect(() => {
    api.getMe()
      .then(user => setCurrentUser(user))
      .catch(() => { setToken(null) })
      .finally(() => setAuthLoading(false))
  }, [])

  function handleLogout() {
    setToken(null)
    setCurrentUser(null)
  }

  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch(() => {})
  }, [])

  // After recalculation, preserve the previously selected cylinder by teeth count
  function applyResult(a, prevTeeth) {
    setResult(a)
    setError(null)
    if (prevTeeth != null) {
      const idx = a.rows.findIndex(r => r.teeth === prevTeeth)
      setSelectedCylIdx(idx >= 0 ? idx : a.matched.index)
    } else {
      setSelectedCylIdx(a.matched.index)
    }
  }

  const handleEditCalc = (calc) => {
    const matchingSub = calc.substrate_name
      ? substrates.find((s) => s.name === calc.substrate_name)
      : null
    setInputs({
      width:           calc.width           ?? DEFAULTS.width,
      height:          calc.height          ?? DEFAULTS.height,
      yield_pct:       calc.yield_pct       ?? DEFAULTS.yield_pct,
      order_qty:       calc.order_qty ? String(calc.order_qty) : '',
      substrateId:     matchingSub ? String(matchingSub.id) : 'custom',
      substrate_name:  calc.substrate_name  ?? null,
      substrate_price: calc.substrate_price ?? DEFAULTS.substrate_price,
      foil_cost:       calc.foil_cost       ?? 0,
      custom_cost:     calc.custom_cost     ?? 0,
      exchange_rate:   calc.exchange_rate   ?? DEFAULTS.exchange_rate,
    })
    setEditingCalc({ id: calc.id, client_name: calc.client_name, order_name: calc.order_name })
    setActiveView('calculator')
    setFormOpen(true)
  }

  function validateInputs(inp) {
    const errs = {}
    if (!editingCalc) {
      if (!clientId) errs.client = 'Required — select a client before calculating'
      if (!orderId)  errs.order  = 'Required — select an order before calculating'
    }
    if (!inp.width  || parseFloat(inp.width)  <= 0) errs.width  = 'Required'
    if (!inp.height || parseFloat(inp.height) <= 0) errs.height = 'Required'
    if (!inp.yield_pct  || parseFloat(inp.yield_pct)  <= 0) errs.yield_pct  = 'Required'
    if (!inp.substrate_price && inp.substrate_price !== 0 || parseFloat(inp.substrate_price) <= 0) errs.substrate_price = 'Required'
    if (!inp.exchange_rate || parseFloat(inp.exchange_rate) < 1) errs.exchange_rate = 'Required'
    if (!inp.order_qty || parseInt(inp.order_qty, 10) <= 0) errs.order_qty = 'Required'
    return errs
  }

  const handleCalculate = () => {
    setLoading(true)
    setPendingConfirm(null)
    setQuoteConfirmed(false)
    setHasCalculated(false)
    const prevTeeth = result?.rows[selectedCylIdx]?.teeth ?? null
    if (editingCalc) {
      const payload = buildPayload(inputs, { selectedTeeth: prevTeeth })
      api.createVersion(editingCalc.id, payload)
        .then((a) => {
          applyResult(a, prevTeeth)
          setHasCalculated(true)
          if (a.version_id) setPendingConfirm({ type: 'version', id: a.version_id })
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    } else {
      const shouldSave = Boolean(orderId)
      const opts = { save: shouldSave, clientId, orderId, selectedTeeth: prevTeeth }
      api.calculate(buildPayload(inputs, opts))
        .then((a) => {
          applyResult(a, prevTeeth)
          setHasCalculated(true)
          if (a.calculation_id) setPendingConfirm({ type: 'calc', id: a.calculation_id })
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }

  const handleConfirmQuote = async () => {
    if (!pendingConfirm) return
    setConfirmingQuote(true)
    try {
      if (pendingConfirm.type === 'calc') {
        await api.updateQuoteStatus(pendingConfirm.id, 'confirmed')
      } else {
        await api.updateVersionStatus(pendingConfirm.id, 'confirmed')
      }
      setPendingConfirm(null)
      setQuoteConfirmed(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmingQuote(false)
    }
  }

  const handleApproveCylinder = (rowIdx) => {
    const teeth = result?.rows[rowIdx]?.teeth
    if (!teeth) return
    setSelectedCylIdx(rowIdx)
    if (!result?.calculation_id) return   // not yet saved, selection is local only
    setApprovingCyl(true)
    api.updateSelectedCylinder(result.calculation_id, teeth)
      .catch((e) => setError(e.message))
      .finally(() => setApprovingCyl(false))
  }

  const handleDownloadPDF = async () => {
    if (!result) return
    const selIdx = selectedCylIdx ?? result.matched.index
    const selRow = result.rows[selIdx]
    const p      = result.pricing
    const qty    = parseFloat(inputs.order_qty) || 0

    // Recompute pricing when a non-matched cylinder is selected (mirrors PricingPanel)
    const isCustomSel = selIdx !== result.matched.index
    const effectiveP  = (isCustomSel && selRow) ? (() => {
      const label_w_cm = selRow.label_width  / 10
      const label_h_cm = selRow.label_height / 10
      const labels_sqm = (10000 / label_w_cm) / label_h_cm
      const adj_labels = labels_sqm * (parseFloat(inputs.yield_pct) || 85) / 100
      const sub        = parseFloat(inputs.substrate_price) || 0
      const foil       = parseFloat(inputs.foil_cost)       || 0
      const custom     = parseFloat(inputs.custom_cost)     || 0
      const exch       = parseFloat(inputs.exchange_rate)   || 85
      const cpp        = (adj_labels > 0 ? (sub + foil) / adj_labels : 0) + custom
      const r2         = cpp * 2000
      return {
        price_inr_label: r2 / 1000,
        price_usd_label: exch > 0 ? r2 / exch / 1000 : 0,
      }
    })() : { price_inr_label: p.price_inr_label, price_usd_label: p.price_usd_label }

    const pricePerLabel = effectiveP.price_inr_label || 0
    const subtotal      = qty > 0 ? qty * pricePerLabel : 0
    const totalUsd      = qty > 0 ? qty * (effectiveP.price_usd_label || 0) : 0

    // Fetch company settings for CGST/SGST — admin only endpoint, non-admins fall back gracefully
    let companySettings = {}
    try {
      companySettings = await api.getCompanySettings()
    } catch (_) {
      // non-admin or network error — PDF will show "GST: As applicable"
    }

    generatePDF({
      client: { name: clientName || '', location: '', email: '', phone: '' },
      order:  {
        order_id: result.calculation_id ? `CALC-${result.calculation_id}` : '',
        label:    orderName || '',
      },
      inputs: {
        label_width_mm:  parseFloat(inputs.width),
        label_height_mm: parseFloat(inputs.height),
        substrate:       inputs.substrate_name || 'Custom',
        total_qty:       qty,
      },
      approved_cylinder: {
        teeth:  selRow?.teeth,
        around: selRow?.around,
        across: selRow?.across,
      },
      pricing: {
        selling_price_per_label: pricePerLabel,
        total_cost_inr:          subtotal,
        total_cost_usd:          totalUsd,
      },
    }, companySettings)
  }

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  const handleSubstrateSelect = (id) => {
    if (id === 'custom') {
      setInputs((prev) => ({ ...prev, substrateId: 'custom', substrate_name: null }))
      return
    }
    const sub = substrates.find((s) => String(s.id) === String(id))
    setInputs((prev) => ({
      ...prev,
      substrateId: id,
      substrate_name: sub ? sub.name : null,
      substrate_price: sub ? sub.price : prev.substrate_price,
    }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next.substrate_price; return next })
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ color: 'var(--teal)', fontSize: '0.9rem' }}>Loading…</div>
    </div>
  )

  if (!currentUser) return <LoginPage onLogin={setCurrentUser} />

  const isAdmin = currentUser.role === 'admin'

  return (
    <>
      <header>
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="nav-toggle"
              onClick={() => setNavOpen((v) => !v)}
              title={navOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect y="2"  width="18" height="2" rx="1"/>
                <rect y="8"  width="18" height="2" rx="1"/>
                <rect y="14" width="18" height="2" rx="1"/>
              </svg>
            </button>

            <div className="logo">
              <div className="logo-mark">
                <div className="logo-ring" />
                <div className="logo-ring-inner" />
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="13" stroke="#1abcab" strokeWidth="2" strokeOpacity="0.9"/>
                  <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke="#1abcab" strokeWidth="1.5" strokeOpacity="0.7"/>
                  <line x1="3" y1="16" x2="29" y2="16" stroke="#1abcab" strokeWidth="1.2" strokeOpacity="0.6"/>
                </svg>
              </div>
              <div className="logo-text">
                <div className="logo-title">Cost <span className="accent">Estimation</span> Intelligence</div>
                <div className="logo-sub">Chroma Print — Label Estimator</div>
              </div>
            </div>
          </div>

          <div className="header-controls">
            <div className="header-status">
              <span className="status-dot" />
              {currentUser.username}
              {isAdmin && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.04em' }}>ADMIN</span>
              )}
            </div>
            <button
              className="theme-toggle"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1"  x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36"  x2="19.78" y2="19.78"/>
                  <line x1="1"  y1="12" x2="3"  y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64"   x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            <button
              className="theme-toggle"
              onClick={handleLogout}
              title="Sign out"
              style={{ marginLeft: '0.3rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <nav className={`nav-sidebar${navOpen ? '' : ' nav-sidebar-closed'}`}>
          {NAV_SECTIONS.map(({ section, icon, links }) => (
            <div key={section || '__top'}>
              {section && (
                <div className="nav-section-label" style={{ marginTop: '1.1rem' }}>
                  {icon && <span className="nav-section-icon">{icon}</span>}
                  {section}
                </div>
              )}
              {section ? (
                <div className="nav-link-group">
                  {links.map(link => (
                    <button
                      key={link.id}
                      className={`nav-link nav-link--sub${activeView === link.id ? ' active' : ''}`}
                      onClick={() => setActiveView(link.id)}
                    >
                      <span className="nav-link-dot" />
                      <span className="nav-link-text">{link.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                links.map(link => (
                  <button
                    key={link.id}
                    className={`nav-link${activeView === link.id ? ' active' : ''}`}
                    onClick={() => setActiveView(link.id)}
                  >
                    {link.icon
                      ? <span className="nav-section-icon" style={{ opacity: 1 }}>{link.icon}</span>
                      : <span className="nav-link-dot" />
                    }
                    <span className="nav-link-text">{link.label}</span>
                  </button>
                ))
              )}
            </div>
          ))}

          {isAdmin && (
            <div>
              <div className="nav-section-label" style={{ marginTop: '1.1rem' }}>
                <span className="nav-section-icon">{ADMIN_SECTION.icon}</span>
                {ADMIN_SECTION.section}
              </div>
              <div className="nav-link-group">
                {ADMIN_SECTION.links.map(link => (
                  <button
                    key={link.id}
                    className={`nav-link nav-link--sub${activeView === link.id ? ' active' : ''}`}
                    onClick={() => setActiveView(link.id)}
                  >
                    <span className="nav-link-dot" />
                    <span className="nav-link-text">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </nav>

        {activeView === 'calculator' && formOpen && (
          <aside className="sidebar">
            <InputPanel
              inputs={inputs}
              substrates={substrates}
              onChange={handleChange}
              onSubstrateSelect={handleSubstrateSelect}
              fieldErrors={fieldErrors}
              onCalculate={() => {
                const errs = validateInputs(inputs)
                if (Object.keys(errs).length) { setFieldErrors(errs); return }
                setFieldErrors({})
                handleCalculate()
                setFormOpen(false)
              }}
              loading={loading}
              onClientChange={(id, name) => {
                setClientId(id); setClientName(name)
                setFieldErrors((prev) => { const n = { ...prev }; delete n.client; delete n.order; return n })
              }}
              onOrderChange={(id, name) => {
                setOrderId(id); setOrderName(name)
                setFieldErrors((prev) => { const n = { ...prev }; delete n.order; return n })
              }}
            />
          </aside>
        )}

        <div className="content-area">
          {error && <div className="error-banner">⚠ {error}</div>}

          {activeView === 'calculator' && !hasCalculated && !loading && (
            <div className="calc-empty-state">
              <div className="calc-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                  <line x1="7" y1="8" x2="7" y2="12"/>
                  <line x1="12" y1="6" x2="12" y2="12"/>
                  <line x1="17" y1="10" x2="17" y2="12"/>
                </svg>
              </div>
              <div className="calc-empty-title">No results yet</div>
              <div className="calc-empty-sub">
                Select a client &amp; order, fill in the label dimensions and costs,<br />
                then click <strong>Run Calculation</strong> to see the cylinder match and pricing.
              </div>
            </div>
          )}

          {activeView === 'calculator' && (
            <>
              {editingCalc && (
                <div className="edit-mode-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>
                    Editing: <strong>{editingCalc.client_name || 'Unknown client'}</strong>
                    {editingCalc.order_name && <> / {editingCalc.order_name}</>}
                    {' '}— running calculation will save as a new version
                  </span>
                  <button
                    className="edit-mode-exit"
                    onClick={() => setEditingCalc(null)}
                  >
                    Exit Edit Mode
                  </button>
                </div>
              )}
              <div className="calc-toolbar">
                <button
                  className={`calc-toggle-btn${formOpen ? ' calc-toggle-btn--active' : ''}`}
                  onClick={() => setFormOpen((v) => !v)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: formOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>

                {result && quoteConfirmed && (
                  <button className="btn-download-pdf" onClick={handleDownloadPDF} title="Download PDF quote for client">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </button>
                )}
              </div>
              {hasCalculated && (
              <>
              <CylinderTable
                result={result}
                orderQty={inputs.order_qty}
                selectedIdx={selectedCylIdx}
                onApproveCylinder={handleApproveCylinder}
                approvingCyl={approvingCyl}
                hasSavedCalc={Boolean(result?.calculation_id)}
                inputWidth={parseFloat(inputs.width) || 0}
                inputHeight={parseFloat(inputs.height) || 0}
              />
              <PricingPanel
                result={result}
                orderQty={inputs.order_qty}
                selectedIdx={selectedCylIdx}
                inputs={inputs}
              />
              </>
              )}

              {quoteConfirmed && (
                <div className="confirm-quote-banner confirm-quote-banner--success">
                  <div className="confirm-quote-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="confirm-quote-text">
                    <div className="confirm-quote-title">Quotation confirmed</div>
                    <div className="confirm-quote-sub">You can now download the PDF quote for the client.</div>
                  </div>
                  <div className="confirm-quote-actions">
                    <button className="btn-download-pdf" onClick={handleDownloadPDF}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download PDF
                    </button>
                  </div>
                </div>
              )}

              {pendingConfirm && (
                <div className="confirm-quote-banner">
                  <div className="confirm-quote-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <div className="confirm-quote-text">
                    <div className="confirm-quote-title">Quotation saved successfully</div>
                    <div className="confirm-quote-sub">
                      {pendingConfirm.type === 'version' ? 'New version created. ' : ''}
                      Do you want to confirm this quotation for the client?
                    </div>
                  </div>
                  <div className="confirm-quote-actions">
                    <button
                      className="confirm-quote-btn confirm-quote-btn--primary"
                      onClick={handleConfirmQuote}
                      disabled={confirmingQuote}
                    >
                      {confirmingQuote ? (
                        <><span className="cop-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Confirming…</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                          Confirm Quotation
                        </>
                      )}
                    </button>
                    <button
                      className="confirm-quote-btn"
                      onClick={() => setPendingConfirm(null)}
                      disabled={confirmingQuote}
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              )}
            </>
          )}


          {activeView === 'dashboard'        && <Dashboard onNavigate={setActiveView} currentUser={currentUser} />}
          {activeView === 'pdf-preview'     && <PDFPreview />}
          {activeView === 'comparison'      && <ComparisonPage />}
          {activeView === 'history'         && <QuoteHistory onEditCalc={handleEditCalc} />}
          {activeView === 'cylinders'       && <ManageCylinders isAdmin={isAdmin} />}
          {activeView === 'substrates'      && <ManageSubstrates isAdmin={isAdmin} />}
          {activeView === 'client-orders'   && <CustomerOrdersPage />}
          {activeView === 'user-management' && isAdmin && <UserManagementPage currentUser={currentUser} />}
          {activeView === 'settings'        && isAdmin && <SettingsPage />}
        </div>
      </div>

      <footer>
        <strong>Chroma Print</strong> · Cost Estimation Intelligence · Label Estimator
      </footer>
    </>
  )
}