import React, { useEffect, useRef, useState } from 'react'
import { api } from './api'
import InputPanel from './components/InputPanel'
import CylinderTable from './components/CylinderTable'
import PricingPanel from './components/PricingPanel'

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

export default function App() {
  const [inputs, setInputs] = useState(DEFAULTS)
  const [substrates, setSubstrates] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)

  // Load reference data once.
  useEffect(() => {
    api.getSubstrates()
      .then(setSubstrates)
      .catch((e) => setError(e.message))
  }, [])

  // Recalculate (debounced) whenever inputs change.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const payload = {
        width: parseFloat(inputs.width) || 1,
        height: parseFloat(inputs.height) || 1,
        waste_pct: parseFloat(inputs.waste_pct) || 85,
        substrate_name: inputs.substrate_name,
        substrate_price: parseFloat(inputs.substrate_price) || 0,
        foil_cost: parseFloat(inputs.foil_cost) || 0,
        exchange_rate: parseFloat(inputs.exchange_rate) || 85,
        save: false,
      }
      api.calculate(payload)
        .then((data) => { setResult(data); setError(null) })
        .catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [inputs])

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
        <div className="header-content">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="url(#grad)" strokeWidth="2.5" />
              <ellipse cx="16" cy="16" rx="6" ry="14" stroke="url(#grad)" strokeWidth="2" />
              <line x1="2" y1="16" x2="30" y2="16" stroke="url(#grad)" strokeWidth="1.5" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <h1>Cylinder Calculator</h1>
          </div>
          <p className="subtitle">Label Costing Tool</p>
        </div>
      </header>

      <main>
        {error && <div className="error-banner">⚠️ {error}</div>}
        <InputPanel
          inputs={inputs}
          substrates={substrates}
          onChange={handleChange}
          onSubstrateSelect={handleSubstrateSelect}
        />
        <CylinderTable result={result} />
        <PricingPanel result={result} />
      </main>

      <footer>
        <p>Chroma Print India Pvt Ltd — Cylinder Calculation Tool</p>
      </footer>
    </>
  )
}
