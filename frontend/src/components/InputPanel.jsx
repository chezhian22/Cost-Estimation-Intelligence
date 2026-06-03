import React from 'react'

export default function InputPanel({ inputs, substrates, onChange, onSubstrateSelect }) {
  return (
    <section className="card inputs-card">
      <h2><span className="card-icon">⚙️</span> Input Parameters</h2>
      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="input-width">Width <span className="unit">(mm)</span></label>
          <input
            type="number" id="input-width" step="0.1" min="1"
            value={inputs.width}
            onChange={(e) => onChange('width', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="input-height">Height <span className="unit">(mm)</span></label>
          <input
            type="number" id="input-height" step="0.1" min="1"
            value={inputs.height}
            onChange={(e) => onChange('height', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="input-waste">Waste <span className="unit">(%)</span></label>
          <input
            type="number" id="input-waste" step="1" min="1" max="100"
            value={inputs.waste_pct}
            onChange={(e) => onChange('waste_pct', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="input-substrate">Substrate</label>
          <select
            id="input-substrate"
            value={inputs.substrateId}
            onChange={(e) => onSubstrateSelect(e.target.value)}
          >
            <option value="custom">— Custom —</option>
            {substrates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.price}/m²)
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="input-substrate-price">Substrate Price <span className="unit">(per m²)</span></label>
          <input
            type="number" id="input-substrate-price" step="0.5" min="0"
            value={inputs.substrate_price}
            onChange={(e) => onChange('substrate_price', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="input-foil">Foil Cost</label>
          <input
            type="number" id="input-foil" step="0.5" min="0"
            value={inputs.foil_cost}
            onChange={(e) => onChange('foil_cost', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="input-exchange">Exchange Rate <span className="unit">(₹ / $)</span></label>
          <input
            type="number" id="input-exchange" step="0.5" min="1"
            value={inputs.exchange_rate}
            onChange={(e) => onChange('exchange_rate', e.target.value)}
          />
        </div>
      </div>
    </section>
  )
}
