import React from 'react'
import ClientOrderSelector from './ClientOrderSelector'

export default function InputPanel({
  inputs, substrates, onChange, onSubstrateSelect, onCalculate, loading,
  onClientChange, onOrderChange,
}) {
  return (
    <div className="sidebar-form">
      <ClientOrderSelector
        onClientChange={onClientChange}
        onOrderChange={onOrderChange}
      />

      <div className="sidebar-title">
        <span className="sidebar-title-bar" />
        Input Parameters
      </div>

      <div className="field-stack">
        <div className="field">
          <label className="field-label" htmlFor="input-width">↔ Width <span className="unit">(mm)</span></label>
          <input
            type="number" id="input-width" step="0.1" min="1" max="99999"
            value={inputs.width}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('width', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('width', num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num)
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-height">↕ Height <span className="unit">(mm)</span></label>
          <input
            type="number" id="input-height" step="0.1" min="1" max="99999"
            value={inputs.height}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('height', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('height', num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num)
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-waste">◎ Yield <span className="unit">(%)</span></label>
          <input
            type="number" id="input-waste" step="1" min="1" max="100"
            value={inputs.yield_pct}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('yield_pct', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('yield_pct', num < 0 ? Math.abs(num) : num > 100 ? 100 : num)
            }}
          />
        </div>

        <div className="field-divider" />

        <div className="field">
          <label className="field-label" htmlFor="input-substrate">▤ Substrate</label>
          <select
            id="input-substrate"
            value={inputs.substrateId}
            onChange={(e) => onSubstrateSelect(e.target.value)}
          >
            <option value="custom">— Custom —</option>
            {substrates.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.price}/m²)</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-substrate-price">₹ Substrate Price <span className="unit">(per sq. meter)</span></label>
          <input
            type="number" id="input-substrate-price" step="0.5" min="0"
            value={inputs.substrate_price}
            onChange={(e) => onChange('substrate_price', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-foil">✦ Foil Cost <span className="unit">(per sq. meter)</span></label>
          <input
            type="number" id="input-foil" step="0.5" min="0"
            value={inputs.foil_cost}
            onChange={(e) => onChange('foil_cost', e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-custom-cost">⊕ Custom Cost <span className="unit">(per label)</span></label>
          <input
            type="number" id="input-custom-cost" step="0.01" min="0"
            placeholder="e.g. 0.05"
            value={inputs.custom_cost}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('custom_cost', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('custom_cost', num < 0 ? Math.abs(num) : num)
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-exchange">⇄ Exchange Rate <span className="unit">(₹ / $)</span></label>
          <input
            type="number" id="input-exchange" step="0.5" min="1"
            value={inputs.exchange_rate}
            onChange={(e) => onChange('exchange_rate', e.target.value)}
          />
        </div>

        <div className="field-divider" />

        <div className="field">
          <label className="field-label" htmlFor="input-order-qty">⊞ Order Quantity <span className="unit">(labels)</span></label>
          <input
            type="number" id="input-order-qty" step="100" min="0"
            placeholder="e.g. 10000"
            value={inputs.order_qty}
            onChange={(e) => onChange('order_qty', e.target.value)}
          />
        </div>

      </div>

      <button
        className={`calc-btn${loading ? ' calc-btn--loading' : ''}`}
        onClick={onCalculate}
        disabled={loading}
      >
        {loading ? (
          <><span className="calc-btn-spinner" /> Calculating…</>
        ) : (
          <>Run Calculation</>
        )}
      </button>
    </div>
  )
}
