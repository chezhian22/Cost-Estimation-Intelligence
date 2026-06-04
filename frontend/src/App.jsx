import React, { useEffect, useState } from 'react'
import { api } from './api'
import InputPanel from './components/InputPanel'
import CylinderTable from './components/CylinderTable'
import PricingPanel from './components/PricingPanel'
import ComparisonPanel from './components/ComparisonPanel'

const DEFAULTS = {
  width: 64.5,
  height: 136,
  waste_pct: 85,
  substrateId: 'custom',
  substrate_name: null,
  substrate_price: 45,
  foil_cost: 0,
  exchange_rate: 85,
}

function buildPayload(inputs) {
  return {
    width: parseFloat(inputs.width) || 1,
    height: parseFloat(inputs.height) || 1,
    waste_pct: parseFloat(inputs.waste_pct) || 85,
    substrate_name: inputs.substrate_name,
    substrate_price: parseFloat(inputs.substrate_price) || 0,
    foil_cost: parseFloat(inputs.foil_cost) || 0,
    exchange_rate: parseFloat(inputs.exchange_rate) || 85,
    save: false,
  }
}

export default function App() {
  const [inputs, setInputs] = useState(DEFAULTS)
  const [substrates, setSubstrates] = useState([])
  const [result, setResult] = useState(null)
  const [resultB, setResultB] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch(() => {}) // substrate list is optional — don't surface this error

    const defB = { ...DEFAULTS, width: DEFAULTS.height, height: DEFAULTS.width }
    Promise.all([api.calculate(buildPayload(DEFAULTS)), api.calculate(buildPayload(defB))])
      .then(([a, b]) => { setResult(a); setResultB(b); setError(null) })
      .catch((e) => setError(e.message))
  }, [])

  const handleCalculate = () => {
    setLoading(true)
    const inputsB = { ...inputs, width: inputs.height, height: inputs.width }
    Promise.all([api.calculate(buildPayload(inputs)), api.calculate(buildPayload(inputsB))])
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
              <div className="logo-title">Cost <span className="accent">Intelligence</span></div>
              <div className="logo-sub">Chroma Print — Label Estimator</div>
            </div>
          </div>
          <div className="header-status">
            <span className="status-dot" />
            Live Calculation
          </div>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <InputPanel
            inputs={inputs}
            substrates={substrates}
            onChange={handleChange}
            onSubstrateSelect={handleSubstrateSelect}
            onCalculate={handleCalculate}
            loading={loading}
          />
        </aside>

        <div className="content-area">
          {error && <div className="error-banner">⚠ {error}</div>}
          <CylinderTable result={result} />
          <PricingPanel result={result} />
          <ComparisonPanel resultA={result} resultB={resultB} inputs={inputs} />
        </div>
      </div>

      <footer>
        <strong>Chroma Print India Pvt Ltd</strong> — Cylinder Cost Estimation System
      </footer>
    </>
  )
}
