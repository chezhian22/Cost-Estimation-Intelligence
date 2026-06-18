import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../api'
import { toast } from '../utils/toast'

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


const LABELS      = ['A', 'B', 'C', 'D']
const SLOT_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa']

const fmt  = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'
const fmtN = (v)        => v != null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'

function makeSlot(i) {
  return {
    label: '',
    width: '', height: '',
    yield_pct: 85,
    substrate_name: '',
    substrate_price: 45,
    foil_cost: 0,
    exchange_rate: 85,
    quoteResult: null,
    quoteId: null,
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
function QuoteLoader({ onLoaded, takenIds = [] }) {
  const [clients, setClients]   = useState([])
  const [orders, setOrders]     = useState([])
  const [calcs, setCalcs]       = useState([])
  const [clientId, setClientId] = useState('')
  const [orderId, setOrderId]   = useState('')
  const [fetching, setFetching] = useState(false)

  useEffect(() => { api.getClients().then(setClients).catch((e) => toast.error(e.message || 'Failed to load clients')) }, [])

  async function handleClient(id) {
    setClientId(id); setOrderId(''); setOrders([]); setCalcs([])
    if (!id) return
    const os = await api.getOrders(parseInt(id, 10)).catch((e) => { toast.error(e.message || 'Failed to load orders'); return [] })
    setOrders(os)
  }

  async function handleOrder(id) {
    setOrderId(id); setCalcs([])
    if (!id) return
    const cs = await api.getOrderCalculations(parseInt(id, 10)).catch((e) => { toast.error(e.message || 'Failed to load quotes'); return [] })
    setCalcs(cs)
  }

  async function handleCalc(id) {
    if (!id) return
    setFetching(true)
    try {
      const full = await api.getCalculation(parseInt(id, 10))
      onLoaded(full)
    } catch (e) { toast.error(e.message || 'Failed to load quote') }
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
            {[...calcs].reverse().map((c, i) => {
              const taken = takenIds.includes(c.id)
              return (
                <option key={c.id} value={c.id} disabled={taken}>
                  {taken ? '✕ ' : ''}
                  {c.ref_code || `Quote ${i + 1}`}
                  {c.substrate_name ? ` · ${c.substrate_name}` : ''}
                  {c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString('en-IN')}` : ''}
                  {taken ? ' (already selected)' : ''}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {fetching && <div className="cmp-loading-note">Loading quote data…</div>}
    </div>
  )
}

// ── Single slot card ──────────────────────────────────────────────────────────
function SlotCard({ index, slot, color, onChange, takenIds }) {
  const [mode, setMode] = useState('manual')

  function switchMode(m) {
    setMode(m)
    if (m === 'manual') onChange({ quoteResult: null, quoteId: null })
  }

  function onQuoteLoaded(full) {
    onChange({
      label:           full.ref_code || full.order_name || '',
      width:           full.width,
      height:          full.height,
      yield_pct:       full.yield_pct,
      substrate_name:  full.substrate_name ?? '',
      substrate_price: full.substrate_price,
      foil_cost:       full.foil_cost,
      exchange_rate:   full.exchange_rate,
      quoteResult:     full.result ?? null,
      quoteId:         full.id ?? null,
    })
  }

  return (
    <div className="cmp-slot" style={{ '--slot-color': color }}>
      {/* slot header */}
      <div className="cmp-slot-header">
        <span className="cmp-slot-badge" style={{ background: color + '22', borderColor: color + '55', color }}>
          {slot.label || `Quote ${LABELS[index]}`}
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
            value={slot.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>

        {mode === 'quote' ? (
          <QuoteLoader onLoaded={onQuoteLoaded} takenIds={takenIds} />
        ) : (
          <div className="field-stack">
            <div className="field">
              <label className="field-label">↔ Width <span className="unit">(mm)</span></label>
              <input type="number" min="1" max="99999" step="0.1" value={slot.width}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') { onChange({ width: '' }); return }
                  const num = parseFloat(raw)
                  if (isNaN(num)) return
                  onChange({ width: num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num })
                }} />
            </div>
            <div className="field">
              <label className="field-label">↕ Height <span className="unit">(mm)</span></label>
              <input type="number" min="1" max="99999" step="0.1" value={slot.height}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') { onChange({ height: '' }); return }
                  const num = parseFloat(raw)
                  if (isNaN(num)) return
                  onChange({ height: num < 0 ? Math.abs(num) : num > 99999 ? 99999 : num })
                }} />
            </div>
            <div className="field">
              <label className="field-label">◎ Yield <span className="unit">(%)</span></label>
              <input type="number" min="1" max="100" step="1" value={slot.yield_pct}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') { onChange({ yield_pct: '' }); return }
                  const num = parseFloat(raw)
                  if (isNaN(num)) return
                  onChange({ yield_pct: num < 0 ? Math.abs(num) : num > 100 ? 100 : num })
                }} />
            </div>
            <div className="field">
              <label className="field-label">▤ Substrate</label>
              <input type="text" placeholder="e.g. PP Gloss" value={slot.substrate_name}
                onChange={(e) => onChange({ substrate_name: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">₹ Substrate Price <span className="unit">(/m²)</span></label>
              <input type="number" min="0" max="99999" step="0.5" value={slot.substrate_price}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => onChange({ substrate_price: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label">✦ Foil Cost</label>
              <input type="number" min="0" max="99999" step="0.5" value={slot.foil_cost}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '' || raw === '.') { onChange({ foil_cost: raw }); return }
                  const num = parseFloat(raw)
                  if (isNaN(num) || num < 0) return
                  if (Math.floor(num).toString().length > 5) return
                  onChange({ foil_cost: raw })
                }} />
            </div>
            <div className="field">
              <label className="field-label">⇄ Exchange Rate <span className="unit">(₹/$)</span></label>
              <input type="number" min="1" max="99999" step="0.5" value={slot.exchange_rate}
                onKeyDown={blockNonNumeric} onPaste={pasteNumbersOnly}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '' || raw === '.') { onChange({ exchange_rate: raw }); return }
                  const num = parseFloat(raw)
                  if (isNaN(num) || num < 0) return
                  if (Math.floor(num).toString().length > 5) return
                  onChange({ exchange_rate: raw })
                }} />
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
function ResultsTable({ slots, results }) {
  const mRows = results.map((r) => (r ? r.rows[r.matched.index] : null))

  const pricingRows = [
    { label: 'Labels / m²',            vals: results.map((r) => r?.pricing?.labels_sqm),       display: (v) => fmt(v) },
    { label: 'Adj. Labels / m²',       vals: results.map((r) => r?.pricing?.adj_labels),        display: (v) => fmt(v) },
    { label: 'Selling Rate 1 : 1.5',   vals: results.map((r) => r?.pricing?.rate_15),           display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 1.75',  vals: results.map((r) => r?.pricing?.rate_175),          display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 2',     vals: results.map((r) => r?.pricing?.rate_2),            display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 2 ($)', vals: results.map((r) => r?.pricing?.price_usd_1000),   display: (v) => `$ ${fmt(v, 3)}` },
  ]

  return (
    <section className="card cmp-results-card">
      <div className="card-header">
        <div className="card-icon-wrap">⇄</div>
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

            {/* ── Inputs ── */}
            <tr className="cmp-section-row"><td colSpan={slots.length + 1}>Inputs</td></tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Label Size (mm)</td>
              {slots.map((s, i) => <td key={i}>{fmt(s.width,1)} × {fmt(s.height,1)}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Substrate</td>
              {slots.map((s, i) => <td key={i}>{s.substrate_name || '—'}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Yield %</td>
              {slots.map((s, i) => <td key={i}>{s.yield_pct ?? 85}%</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Substrate Price (₹/m²)</td>
              {slots.map((s, i) => <td key={i}>₹ {fmt(s.substrate_price)}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Foil Cost (₹)</td>
              {slots.map((s, i) => <td key={i}>₹ {fmt(s.foil_cost)}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Exchange Rate (₹/$)</td>
              {slots.map((s, i) => <td key={i}>₹ {fmt(s.exchange_rate, 0)}</td>)}
            </tr>

            {/* ── Cylinder Match ── */}
            <tr className="cmp-section-row"><td colSpan={slots.length + 1}>Cylinder Match</td></tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Teeth</td>
              {results.map((r, i) => <td key={i}>{r?.matched?.matched_teeth ?? '—'}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Matched Size (mm)</td>
              {results.map((r, i) => (
                <td key={i}>
                  {r?.matched ? `${fmt(r.matched.matched_width,1)} × ${fmt(r.matched.matched_height,1)}` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Around × Across</td>
              {mRows.map((mr, i) => (
                <td key={i}>{mr ? `${mr.around} × ${mr.across}` : '—'}</td>
              ))}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Labels / Repeat</td>
              {mRows.map((mr, i) => (
                <td key={i}>{mr ? mr.around * mr.across : '—'}</td>
              ))}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Circumference (mm)</td>
              {mRows.map((mr, i) => <td key={i}>{mr ? fmt(mr.circumference) : '—'}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Paper Size (mm)</td>
              {mRows.map((mr, i) => <td key={i}>{mr ? mr.paper_size : '—'}</td>)}
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Paper +20 (mm)</td>
              {mRows.map((mr, i) => <td key={i}>{mr ? mr.paper_plus_20 : '—'}</td>)}
            </tr>

            {/* ── Pricing ── */}
            <tr className="cmp-section-row"><td colSpan={slots.length + 1}>Efficiency · Selling Rates</td></tr>
            {pricingRows.map((row) => (
              <tr key={row.label}>
                <td style={{ textAlign: 'left' }}>{row.label}</td>
                {row.vals.map((v, i) => (
                  <td key={i}>{v != null ? row.display(v) : '—'}</td>
                ))}
              </tr>
            ))}

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
          yield_pct:       parseFloat(slot.yield_pct)       || 85,
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

  function exportToExcel() {
    if (!results) return
    const headers = ['Metric', ...slots.map((s, i) => s.label || `Quote ${LABELS[i]}`)]
    const mRows   = results.map((r) => (r ? r.rows[r.matched.index] : null))

    const section = (title) => [title, ...slots.map(() => '')]

    const rows = [
      headers,
      section('── Inputs ──'),
      ['Label Size (mm)',        ...slots.map((s) => `${fmt(s.width,1)} × ${fmt(s.height,1)}`)],
      ['Substrate',              ...slots.map((s) => s.substrate_name || '—')],
      ['Yield %',                ...slots.map((s) => `${s.yield_pct ?? 85}%`)],
      ['Substrate Price (₹/m²)', ...slots.map((s) => `₹ ${fmt(s.substrate_price)}`)],
      ['Foil Cost (₹)',          ...slots.map((s) => `₹ ${fmt(s.foil_cost)}`)],
      ['Exchange Rate (₹/$)',    ...slots.map((s) => `₹ ${fmt(s.exchange_rate, 0)}`)],
      section('── Cylinder Match ──'),
      ['Teeth',                  ...results.map((r) => r?.matched?.matched_teeth ?? '—')],
      ['Matched Size (mm)',      ...results.map((r) => r?.matched ? `${fmt(r.matched.matched_width,1)} × ${fmt(r.matched.matched_height,1)}` : '—')],
      ['Around × Across',        ...mRows.map((mr) => mr ? `${mr.around} × ${mr.across}` : '—')],
      ['Labels / Repeat',        ...mRows.map((mr) => mr ? mr.around * mr.across : '—')],
      ['Circumference (mm)',     ...mRows.map((mr) => mr ? fmt(mr.circumference) : '—')],
      ['Paper Size (mm)',        ...mRows.map((mr) => mr ? mr.paper_size : '—')],
      ['Paper +20 (mm)',         ...mRows.map((mr) => mr ? mr.paper_plus_20 : '—')],
      section('── Efficiency · Selling Rates ──'),
      ['Labels / m²',            ...results.map((r) => r?.pricing?.labels_sqm != null ? fmt(r.pricing.labels_sqm) : '—')],
      ['Adj. Labels / m²',       ...results.map((r) => r?.pricing?.adj_labels  != null ? fmt(r.pricing.adj_labels)  : '—')],
      ['Selling Rate 1:1.5',     ...results.map((r) => r?.pricing?.rate_15     != null ? `₹ ${fmt(r.pricing.rate_15)}`   : '—')],
      ['Selling Rate 1:1.75',    ...results.map((r) => r?.pricing?.rate_175    != null ? `₹ ${fmt(r.pricing.rate_175)}`  : '—')],
      ['Selling Rate 1:2',       ...results.map((r) => r?.pricing?.rate_2      != null ? `₹ ${fmt(r.pricing.rate_2)}`    : '—')],
      ['Selling Rate 1:2 ($)',   ...results.map((r) => r?.pricing?.price_usd_1000 != null ? `$ ${fmt(r.pricing.price_usd_1000, 3)}` : '—')],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Column widths
    ws['!cols'] = [
      { wch: 26 },
      ...slots.map(() => ({ wch: 20 })),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Quote Comparison')
    XLSX.writeFile(wb, `quote-comparison-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

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
            takenIds={slots.filter((_, idx) => idx !== i).map(s => s.quoteId).filter(Boolean)}
          />
        ))}
      </div>

      {/* compare + export buttons */}
      <div className="cmp-compare-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {error && <div className="error-banner">⚠ {error}</div>}
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
        {results && (
          <button className="cmp-export-btn" onClick={exportToExcel} title="Download comparison as Excel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Excel
          </button>
        )}
      </div>

      {/* results */}
      {results && (
        <ResultsTable slots={slots} results={results} />
      )}
    </div>
  )
}
