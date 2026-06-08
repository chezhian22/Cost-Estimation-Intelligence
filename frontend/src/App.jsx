import React, { useEffect, useState } from 'react'
import { api } from './api'
import InputPanel from './components/InputPanel'
import CylinderTable from './components/CylinderTable'
import PricingPanel from './components/PricingPanel'
import ComparisonPanel from './components/ComparisonPanel'
import ComparisonPage from './components/ComparisonPage'
import QuoteHistory from './components/QuoteHistory'
import ManageCylinders from './components/ManageCylinders'
import ManageSubstrates from './components/ManageSubstrates'
import ClientOrderManagement from './components/ClientOrderManagement'

const DEFAULTS = {
  width: 64.5,
  height: 136,
  yield_pct: 85,
  order_qty: '',
  press_speed: 50,
  substrateId: 'custom',
  substrate_name: null,
  substrate_price: 45,
  foil_cost: 0,
  exchange_rate: 85,
}

function buildPayload(inputs, { save = false, clientId = null, orderId = null } = {}) {
  return {
    width: parseFloat(inputs.width) || 1,
    height: parseFloat(inputs.height) || 1,
    yield_pct: parseFloat(inputs.yield_pct) || 85,
    substrate_name: inputs.substrate_name,
    substrate_price: parseFloat(inputs.substrate_price) || 0,
    foil_cost: parseFloat(inputs.foil_cost) || 0,
    exchange_rate: parseFloat(inputs.exchange_rate) || 85,
    save,
    client_id: clientId,
    order_id: orderId,
  }
}

const NAV_LINKS = [
  { id: 'calculator',    label: 'Pricing Calculator' },
  { id: 'comparison',   label: 'Quote Comparison'},
  { id: 'history',      label: 'Quote History' },
  { id: 'client-orders',label: 'Client & Orders'},
]

const ADMIN_LINKS = [
  { id: 'cylinders',  label: 'Manage Cylinders'},
  { id: 'substrates', label: 'Manage Substrates' },
]

export default function App() {
  const [inputs, setInputs]         = useState(DEFAULTS)
  const [substrates, setSubstrates] = useState([])
  const [result, setResult]         = useState(null)
  const [resultB, setResultB]       = useState(null)
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [navOpen, setNavOpen]       = useState(true)
  const [activeView, setActiveView] = useState('calculator')
  const [clientId, setClientId]     = useState(null)
  const [orderId, setOrderId]       = useState(null)

  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch(() => {})

    const defB = { ...DEFAULTS, width: DEFAULTS.height, height: DEFAULTS.width }
    Promise.all([api.calculate(buildPayload(DEFAULTS)), api.calculate(buildPayload(defB))])
      .then(([a, b]) => { setResult(a); setResultB(b); setError(null) })
      .catch((e) => setError(e.message))
  }, [])

  const handleCalculate = () => {
    setLoading(true)
    const shouldSave = Boolean(orderId)
    const opts = { save: shouldSave, clientId, orderId }
    const inputsB = { ...inputs, width: inputs.height, height: inputs.width }
    Promise.all([
      api.calculate(buildPayload(inputs, opts)),
      api.calculate(buildPayload(inputsB, opts)),
    ])
      .then(([a, b]) => { setResult(a); setResultB(b); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
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
  }

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
                  <circle cx="16" cy="16" r="13" stroke="#f97316" strokeWidth="2" strokeOpacity="0.9"/>
                  <ellipse cx="16" cy="16" rx="5.5" ry="13" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.7"/>
                  <line x1="3" y1="16" x2="29" y2="16" stroke="#f97316" strokeWidth="1.2" strokeOpacity="0.6"/>
                </svg>
              </div>
              <div className="logo-text">
                <div className="logo-title">Cost <span className="accent">Estimation</span> Intelligence</div>
                <div className="logo-sub">Chroma Print — Label Estimator</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <nav className={`nav-sidebar${navOpen ? '' : ' nav-sidebar-closed'}`}>
          <div className="nav-section-label">Navigation</div>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              className={`nav-link${activeView === link.id ? ' active' : ''}`}
              onClick={() => setActiveView(link.id)}
            >
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-text">{link.label}</span>
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '1.2rem' }}>Admin</div>
          {ADMIN_LINKS.map((link) => (
            <button
              key={link.id}
              className={`nav-link${activeView === link.id ? ' active' : ''}`}
              onClick={() => setActiveView(link.id)}
            >
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-text">{link.label}</span>
            </button>
          ))}
        </nav>

        {activeView === 'calculator' && (
          <aside className="sidebar">
            <InputPanel
              inputs={inputs}
              substrates={substrates}
              onChange={handleChange}
              onSubstrateSelect={handleSubstrateSelect}
              onCalculate={handleCalculate}
              loading={loading}
              onClientChange={setClientId}
              onOrderChange={setOrderId}
            />
          </aside>
        )}

        <div className="content-area">
          {error && <div className="error-banner">⚠ {error}</div>}

          {activeView === 'calculator' && (
            <>
              <CylinderTable result={result} orderQty={inputs.order_qty} pressSpeed={inputs.press_speed} />
              <PricingPanel result={result} orderQty={inputs.order_qty} />
              <ComparisonPanel resultA={result} resultB={resultB} inputs={inputs} orderQty={inputs.order_qty} />
            </>
          )}

          {activeView === 'comparison' && <ComparisonPage />}

          {activeView === 'history'    && <QuoteHistory />}
          {activeView === 'cylinders'          && <ManageCylinders />}
          {activeView === 'substrates'         && <ManageSubstrates />}
          {activeView === 'client-orders' && <ClientOrderManagement />}
        </div>
      </div>

      <footer>
        <strong>Chroma Print India Pvt Ltd</strong> — Cylinder Cost Estimation System
      </footer>
    </>
  )
}
