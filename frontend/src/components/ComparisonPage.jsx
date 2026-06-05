import React, { useEffect, useState } from 'react'
import { api } from '../api'

const LABELS      = ['A', 'B', 'C', 'D']
const SLOT_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa']

const fmt  = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'
const fmtN = (v)        => v != null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'

function makeSlot(i) {
  return {
    label: '',
    width: '', height: '',
    waste_pct: 85,
    substrate_name: '',
    substrate_price: 45,
    foil_cost: 0,
    exchange_rate: 85,
    quoteResult: null,   // set when loaded from a saved calc
  }
}

// ── Inline count picker strip ─────────────────────────────────────────────────
function CountPicker({ count, onChange }) {
  return (
    <div className="cmp-count-strip">
      <span className="cmp-count-strip-label">Compare</span>
      {[2, 3, 4].map((n) => (
        <button
          key={n}
          className={`cmp-count-chip${count === n ? ' active' : ''}`}
          onClick={() => onChange(n)}
        >
          {n} Quotes
        </button>
      ))}
    </div>
  )
}

// ── Quote loader (client → order → saved calc) ────────────────────────────────
function QuoteLoader({ onLoaded }) {
  const [clients, setClients]   = useState([])
  const [orders, setOrders]     = useState([])
  const [calcs, setCalcs]       = useState([])
  const [clientId, setClientId] = useState('')
  const [orderId, setOrderId]   = useState('')
  const [fetching, setFetching] = useState(false)

  useEffect(() => { api.getClients().then(setClients).catch(() => {}) }, [])

  async function handleClient(id) {
    setClientId(id); setOrderId(''); setOrders([]); setCalcs([])
    if (!id) return
    const os = await api.getOrders(parseInt(id, 10)).catch(() => [])
    setOrders(os)
  }

  async function handleOrder(id) {
    setOrderId(id); setCalcs([])
    if (!id) return
    const cs = await api.getOrderCalculations(parseInt(id, 10)).catch(() => [])
    setCalcs(cs)
  }

  async function handleCalc(id) {
    if (!id) return
    setFetching(true)
    try {
      const full = await api.getCalculation(parseInt(id, 10))
      onLoaded(full)
    } catch { /* ignore */ }
    finally { setFetching(false) }
  }

  return (
    <div className="quote-loader">
      <div className="field">
        <label className="field-label">◉ Client</label>
        <select value={clientId} onChange={(e) => handleClient(e.target.value)}>
          <option value="">— Select client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {orders.length > 0 && (
        <div className="field">
          <label className="field-label">◈ Order</label>
          <select value={orderId} onChange={(e) => handleOrder(e.target.value)}>
            <option value="">— Select order —</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {calcs.length > 0 && (
        <div className="field">
          <label className="field-label">◎ Quote</label>
          <select onChange={(e) => handleCalc(e.target.value)} defaultValue="">
            <option value="">— Select quote —</option>
            {calcs.map((c) => (
              <option key={c.id} value={c.id}>
                {fmt(c.width, 1)} × {fmt(c.height, 1)} mm
                {c.substrate_name ? ` · ${c.substrate_name}` : ''}
                {' · '}
                {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {fetching && <div className="cmp-loading-note">Loading quote data…</div>}
    </div>
  )
}

// ── Single slot card ──────────────────────────────────────────────────────────
function SlotCard({ index, slot, color, onChange }) {
  const [mode, setMode] = useState('manual')

  const f = (key) => (e) => onChange({ [key]: e.target.value })

  function switchMode(m) {
    setMode(m)
    if (m === 'manual') onChange({ quoteResult: null })
  }

  function onQuoteLoaded(full) {
    // full = { id, width, height, waste_pct, substrate_name, substrate_price,
    //           foil_cost, exchange_rate, result: { rows, matched, pricing } }
    onChange({
      width:           full.width,
      height:          full.height,
      waste_pct:       full.waste_pct,
      substrate_name:  full.substrate_name ?? '',
      substrate_price: full.substrate_price,
      foil_cost:       full.foil_cost,
      exchange_rate:   full.exchange_rate,
      quoteResult:     full.result ?? null,
    })
  }

  return (
    <div className="cmp-slot" style={{ '--slot-color': color }}>
      {/* slot header */}
      <div className="cmp-slot-header">
        <span className="cmp-slot-badge" style={{ background: color + '22', borderColor: color + '55', color }}>
          Quote {LABELS[index]}
        </span>
        <div className="cmp-slot-tabs">
          <button className={`cmp-tab${mode === 'manual' ? ' active' : ''}`} onClick={() => switchMode('manual')}>
            Manual
          </button>
          <button className={`cmp-tab${mode === 'quote'  ? ' active' : ''}`} onClick={() => switchMode('quote')}>
            From Quote
          </button>
        </div>
      </div>

      <div className="cmp-slot-body">
        {/* optional display name */}
        <div className="field" style={{ marginBottom: '0.6rem' }}>
          <label className="field-label">Label <span className="unit">(optional)</span></label>
          <input type="text" placeholder={`Quote ${LABELS[index]}`}
            value={slot.label} onChange={f('label')} />
        </div>

        {mode === 'quote' ? (
          <QuoteLoader onLoaded={onQuoteLoaded} />
        ) : (
          <div className="field-stack">
            <div className="field">
              <label className="field-label">↔ Width <span className="unit">(mm)</span></label>
              <input type="number" min="1" step="0.1" value={slot.width} onChange={f('width')} />
            </div>
            <div className="field">
              <label className="field-label">↕ Height <span className="unit">(mm)</span></label>
              <input type="number" min="1" step="0.1" value={slot.height} onChange={f('height')} />
            </div>
            <div className="field">
              <label className="field-label">◎ Waste <span className="unit">(%)</span></label>
              <input type="number" min="1" max="100" step="1" value={slot.waste_pct} onChange={f('waste_pct')} />
            </div>
            <div className="field">
              <label className="field-label">▤ Substrate</label>
              <input type="text" placeholder="e.g. PP Gloss" value={slot.substrate_name} onChange={f('substrate_name')} />
            </div>
            <div className="field">
              <label className="field-label">₹ Substrate Price <span className="unit">(/m²)</span></label>
              <input type="number" min="0" step="0.5" value={slot.substrate_price} onChange={f('substrate_price')} />
            </div>
            <div className="field">
              <label className="field-label">✦ Foil Cost</label>
              <input type="number" min="0" step="0.5" value={slot.foil_cost} onChange={f('foil_cost')} />
            </div>
            <div className="field">
              <label className="field-label">⇄ Exchange Rate <span className="unit">(₹/$)</span></label>
              <input type="number" min="1" step="0.5" value={slot.exchange_rate} onChange={f('exchange_rate')} />
            </div>
          </div>
        )}

        {slot.quoteResult && (
          <div className="cmp-loaded-badge">
            ✓ {fmt(slot.width, 1)} × {fmt(slot.height, 1)} mm loaded
          </div>
        )}
      </div>
    </div>
  )
}

// ── Comparison results table ──────────────────────────────────────────────────
const METRICS = [
  { key: 'adj_labels',     label: 'Adj. Labels / m²', better: 'max', fmt: (v) => fmt(v)        },
  { key: 'price_inr_1000', label: '₹ / 1000 Labels',  better: 'min', fmt: (v) => `₹ ${fmt(v)}` },
  { key: 'price_usd_1000', label: '$ / 1000 Labels',  better: 'min', fmt: (v) => `$ ${fmt(v, 3)}` },
  { key: 'rate_15',        label: 'Rate  1 : 1.5',    better: 'min', fmt: (v) => `₹ ${fmt(v)}` },
  { key: 'rate_175',       label: 'Rate  1 : 1.75',   better: 'min', fmt: (v) => `₹ ${fmt(v)}` },
  { key: 'rate_2',         label: 'Rate  1 : 2',      better: 'min', fmt: (v) => `₹ ${fmt(v)}` },
]

function ResultsTable({ slots, results }) {
  function getBest(metricKey, better) {
    const vals = results.map((r) => r?.pricing?.[metricKey]).filter((v) => v != null)
    if (vals.length < 2) return null
    return better === 'max' ? Math.max(...vals) : Math.min(...vals)
  }

  return (
    <section className="card cmp-results-card">
      <div className="card-header">
        <div className="card-icon-wrap">★</div>
        <span className="card-title">Comparison Results</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Metric</th>
              {slots.map((s, i) => (
                <th key={i} style={{ color: SLOT_COLORS[i] }}>
                  {s.label || `Quote ${LABELS[i]}`}
                  <div className="cmp-col-sub">
                    {s.width && s.height ? `${fmt(s.width, 1)} × ${fmt(s.height, 1)} mm` : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* info rows */}
            <tr className="cmp-section-row">
              <td colSpan={slots.length + 1}>Inputs</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Size (mm)</td>
              {slots.map((s, i) => <td key={i}>{fmt(s.width,1)} × {fmt(s.height,1)}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Substrate</td>
              {slots.map((s, i) => <td key={i}>{s.substrate_name || '—'}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Waste %</td>
              {slots.map((s, i) => <td key={i}>{s.waste_pct}%</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Substrate Price</td>
              {slots.map((s, i) => <td key={i}>₹ {fmt(s.substrate_price)}</td>)}
            </tr>

            {/* matched cylinder */}
            <tr className="cmp-section-row">
              <td colSpan={slots.length + 1}>Best Match</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Cylinder (Teeth)</td>
              {results.map((r, i) => (
                <td key={i}>{r?.matched?.matched_teeth ?? '—'} teeth</td>
              ))}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Matched Size (mm)</td>
              {results.map((r, i) => (
                <td key={i}>
                  {r?.matched ? `${fmt(r.matched.matched_width,1)} × ${fmt(r.matched.matched_height,1)}` : '—'}
                </td>
              ))}
            </tr>

            {/* pricing metrics */}
            <tr className="cmp-section-row">
              <td colSpan={slots.length + 1}>Pricing</td>
            </tr>
            {METRICS.map((m) => {
              const best = getBest(m.key, m.better)
              return (
                <tr key={m.key}>
                  <td style={{ textAlign: 'left' }}>{m.label}</td>
                  {results.map((r, i) => {
                    const val = r?.pricing?.[m.key]
                    const isBest = val != null && val === best
                    return (
                      <td key={i} className={isBest ? 'cmp-best-cell' : ''}>
                        {val != null ? m.fmt(val) : '—'}
                        {isBest && <span className="cmp-best-star"> ★</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComparisonPage() {
  const [count, setCount]         = useState(2)
  const [slots, setSlots]         = useState(() => Array.from({ length: 2 }, (_, i) => makeSlot(i)))
  const [results, setResults]     = useState(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError]         = useState(null)

  function handleCountChange(n) {
    setCount(n)
    setSlots((prev) => {
      if (n > prev.length) {
        // append new empty slots
        return [...prev, ...Array.from({ length: n - prev.length }, (_, i) => makeSlot(prev.length + i))]
      }
      // trim slots (keep existing data for lower indices)
      return prev.slice(0, n)
    })
    setResults(null)
    setError(null)
  }

  function updateSlot(i, patch) {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
    setResults(null)
  }

  async function handleCompare() {
    setComparing(true)
    setError(null)
    try {
      const res = await Promise.all(slots.map((slot) => {
        if (slot.quoteResult) return Promise.resolve(slot.quoteResult)
        return api.calculate({
          width:           parseFloat(slot.width)           || 1,
          height:          parseFloat(slot.height)          || 1,
          waste_pct:       parseFloat(slot.waste_pct)       || 85,
          substrate_name:  slot.substrate_name || null,
          substrate_price: parseFloat(slot.substrate_price) || 0,
          foil_cost:       parseFloat(slot.foil_cost)       || 0,
          exchange_rate:   parseFloat(slot.exchange_rate)   || 85,
          save: false,
        })
      }))
      setResults(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setComparing(false)
    }
  }

  const canCompare = slots.every((s) =>
    s.quoteResult || (parseFloat(s.width) > 0 && parseFloat(s.height) > 0)
  )

  return (
    <div className="cmp-page">
      {/* count picker at top */}
      <section className="card cmp-header-card">
        <div className="card-header">
          <div className="card-icon-wrap">⇄</div>
          <span className="card-title">Quote Comparison</span>
          <span className="card-number">SYS-04</span>
        </div>
        <div className="cmp-header-body">
          <CountPicker count={count} onChange={handleCountChange} />
        </div>
      </section>

      {/* slot grid */}
      <div className={`cmp-slots-grid cmp-slots-${count}`}>
        {slots.map((slot, i) => (
          <SlotCard
            key={i}
            index={i}
            slot={slot}
            color={SLOT_COLORS[i]}
            onChange={(patch) => updateSlot(i, patch)}
          />
        ))}
      </div>

      {/* compare button */}
      <div className="cmp-compare-row">
        {error && <div className="error-banner" style={{ flex: 1 }}>⚠ {error}</div>}
        <button
          className="calc-btn cmp-compare-btn"
          onClick={handleCompare}
          disabled={comparing || !canCompare}
        >
          {comparing
            ? <><span className="calc-btn-spinner" /> Comparing…</>
            : <>⇄ Compare {count} Quotes</>}
        </button>
      </div>

      {/* results */}
      {results && <ResultsTable slots={slots} results={results} />}
    </div>
  )
}
