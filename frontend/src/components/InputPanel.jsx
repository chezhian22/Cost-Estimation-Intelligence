import React from 'react'
import ClientOrderSelector from './ClientOrderSelector'

function blockNonNumeric(e) {
  const allowed = ['Backspace','Delete','Tab','Enter','Escape',
                   'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (e.key >= '0' && e.key <= '9') return
  if (e.key === '.') return
  e.preventDefault()
}

function pasteNumbersOnly(e) {
  const text = e.clipboardData.getData('text')
  if (!/^\d*\.?\d*$/.test(text)) e.preventDefault()
}

export default function InputPanel({
  inputs, substrates, onChange, onSubstrateSelect, onCalculate, loading,
  onClientChange, onOrderChange, fieldErrors = {},
}) {
  return (
    <div className="sidebar-form">
      <ClientOrderSelector
        onClientChange={onClientChange}
        onOrderChange={onOrderChange}
        fieldErrors={fieldErrors}
      />

      <div className="sidebar-title">
        <span className="sidebar-title-bar" />
        Input Parameters
      </div>

      <div className="field-stack">
        <div className="field">
          <label className="field-label" htmlFor="input-width">↔ Width <span className="unit">(mm)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-width" step="0.1" min="1" max="99999"
            className={fieldErrors.width ? 'input-error' : ''}
            value={inputs.width}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('width', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('width', num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num)
            }}
          />
          {fieldErrors.width && <span className="field-error">{fieldErrors.width}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-height">↕ Height <span className="unit">(mm)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-height" step="0.1" min="1" max="99999"
            className={fieldErrors.height ? 'input-error' : ''}
            value={inputs.height}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('height', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('height', num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num)
            }}
          />
          {fieldErrors.height && <span className="field-error">{fieldErrors.height}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-waste">◎ Yield <span className="unit">(%)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-waste" step="1" min="1" max="100"
            className={fieldErrors.yield_pct ? 'input-error' : ''}
            value={inputs.yield_pct}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { onChange('yield_pct', ''); return }
              const num = parseFloat(raw)
              if (isNaN(num)) return
              onChange('yield_pct', num < 0 ? Math.abs(num) : num > 100 ? 100 : num)
            }}
          />
          {fieldErrors.yield_pct && <span className="field-error">{fieldErrors.yield_pct}</span>}
        </div>

        <div className="field-divider" />

        <div className="field">
          <label className="field-label" htmlFor="input-substrate">▤ Substrate <span className="field-required">*</span></label>
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
          <label className="field-label" htmlFor="input-substrate-price">₹ Substrate Price <span className="unit">(per sq. meter)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-substrate-price" step="0.5" min="0"
            className={fieldErrors.substrate_price ? 'input-error' : ''}
            value={inputs.substrate_price}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => onChange('substrate_price', e.target.value)}
          />
          {fieldErrors.substrate_price && <span className="field-error">{fieldErrors.substrate_price}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-foil">✦ Foil Cost <span className="unit">(per sq. meter)</span></label>
          <input
            type="number" id="input-foil" step="0.5" min="0" max="99999"
            value={inputs.foil_cost}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '' || raw === '.') { onChange('foil_cost', raw); return }
              const num = parseFloat(raw)
              if (isNaN(num) || num < 0) return
              if (Math.floor(num).toString().length > 5) return
              onChange('foil_cost', raw)
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-custom-cost">⊕ Custom Cost <span className="unit">(per label)</span></label>
          <input
            type="number" id="input-custom-cost" step="0.01" min="0" max="99999"
            placeholder="e.g. 0.05"
            value={inputs.custom_cost}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '' || raw === '.') { onChange('custom_cost', raw); return }
              const num = parseFloat(raw)
              if (isNaN(num) || num < 0) return
              if (Math.floor(num).toString().length > 5) return
              onChange('custom_cost', raw)
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="input-exchange">⇄ Exchange Rate <span className="unit">(₹ / $)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-exchange" step="0.5" min="1" max="99999"
            className={fieldErrors.exchange_rate ? 'input-error' : ''}
            value={inputs.exchange_rate}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '' || raw === '.') { onChange('exchange_rate', raw); return }
              const num = parseFloat(raw)
              if (isNaN(num) || num < 0) return
              if (Math.floor(num).toString().length > 5) return
              onChange('exchange_rate', raw)
            }}
          />
          {fieldErrors.exchange_rate && <span className="field-error">{fieldErrors.exchange_rate}</span>}
        </div>

        <div className="field-divider" />

        <div className="field">
          <label className="field-label" htmlFor="input-order-qty">⊞ Order Quantity <span className="unit">(labels)</span> <span className="field-required">*</span></label>
          <input
            type="number" id="input-order-qty" step="100" min="1"
            placeholder="e.g. 10000"
            className={fieldErrors.order_qty ? 'input-error' : ''}
            value={inputs.order_qty}
            onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
            onChange={(e) => onChange('order_qty', e.target.value)}
          />
          {fieldErrors.order_qty && <span className="field-error">{fieldErrors.order_qty}</span>}
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
