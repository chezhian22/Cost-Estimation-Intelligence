import React, { useEffect, useState } from 'react'
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

  function switchMode(m) {
    setMode(m)
    if (m === 'manual') onChange({ quoteResult: null })
  }

  function onQuoteLoaded(full) {
    // full = { id, width, height, yield_pct, substrate_name, substrate_price,
    //           foil_cost, exchange_rate, result: { rows, matched, pricing } }
    onChange({
      width:           full.width,
      height:          full.height,
      yield_pct:       full.yield_pct,
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
            value={slot.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>

        {mode === 'quote' ? (
          <QuoteLoader onLoaded={onQuoteLoaded} />
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

// ── Profit bar chart (SVG) ────────────────────────────────────────────────────
const PROFIT_RATES = [
  { key: 'rate_15',  label: '1 : 1.5'  },
  { key: 'rate_175', label: '1 : 1.75' },
  { key: 'rate_2',   label: '1 : 2'    },
]

function niceAxisMax(rawMax) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) {
    const candidate = Math.ceil(rawMax / (magnitude * s)) * magnitude * s
    if (candidate >= rawMax) return candidate
  }
  return Math.ceil(rawMax / magnitude) * magnitude
}

function ProfitBarChart({ slots, results }) {
  const n = slots.length
  const W = 620, H = 280
  const PL = 54, PR = 14, PT = 44, PB = 38
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const costs = results.map((r) => (r?.pricing?.rate_2 ?? 0) / 2)

  const groups = PROFIT_RATES.map(({ key, label }) => ({
    label,
    bars: results.map((r, qi) => {
      const sell   = r?.pricing?.[key] ?? 0
      const cost   = costs[qi]
      const profit = Math.max(0, sell - cost)
      const margin = sell > 0 ? Math.round((profit / sell) * 100) : 0
      return { sell, cost, profit, margin }
    }),
  }))

  const rawMax  = Math.max(...groups.flatMap((g) => g.bars.map((b) => b.profit)), 1)
  const axisMax = niceAxisMax(rawMax)

  const Y_TICKS = 4
  const yTicks  = Array.from({ length: Y_TICKS + 1 }, (_, k) => (axisMax / Y_TICKS) * k)

  const groupW   = chartW / groups.length
  const barGap   = 8
  const barW     = Math.min(46, (groupW - 20 - barGap * (n - 1)) / n)
  const barsSpan = barW * n + barGap * (n - 1)

  const bx  = (gi, qi) => PL + gi * groupW + (groupW - barsSpan) / 2 + qi * (barW + barGap)
  const toY = (val)    => PT + chartH - (val / axisMax) * chartH

  return (
    <section className="card cmp-results-card">
      <div className="card-header">
        <div className="card-icon-wrap">₹</div>
        <span className="card-title">Profit per 1000 Labels — by Rate</span>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', padding: '8px 1.4rem 4px' }}>
        {slots.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#bbb' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: SLOT_COLORS[i] }} />
            <span style={{ color: SLOT_COLORS[i], fontWeight: 600 }}>{s.label || `Quote ${LABELS[i]}`}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#555' }}>profit = sell − production cost</span>
      </div>

      {/* bar chart */}
      <div style={{ padding: '2px 1.4rem 0', display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 640, display: 'block' }}>

          {yTicks.map((val, k) => {
            const y = toY(val)
            return (
              <g key={k}>
                <line x1={PL} y1={y} x2={W - PR} y2={y}
                  stroke={k === 0 ? 'rgba(128,128,128,0.3)' : 'rgba(128,128,128,0.08)'}
                  strokeWidth={0.8} strokeDasharray={k === 0 ? 'none' : '3 3'} />
                <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize={11} fill="#666"
                  fontFamily="JetBrains Mono,monospace">
                  {val === 0 ? '0' : `₹${Math.round(val)}`}
                </text>
              </g>
            )
          })}

          {groups.map((group, gi) => (
            <g key={gi}>
              <text x={PL + gi * groupW + groupW / 2} y={H - 10}
                textAnchor="middle" fontSize={12} fill="#888" fontFamily="Inter,sans-serif">
                {group.label}
              </text>

              {group.bars.map(({ profit, margin }, qi) => {
                const color    = SLOT_COLORS[qi]
                const x        = bx(gi, qi)
                const profitH  = (profit / axisMax) * chartH
                const baseline = PT + chartH

                return (
                  <g key={qi}>
                    <rect x={x} y={baseline - profitH} width={barW} height={profitH}
                      fill={color} stroke={color} strokeWidth={0.7} rx={2} />
                    {/* profit value above bar */}
                    <text x={x + barW / 2} y={baseline - profitH - 14}
                      textAnchor="middle" fontSize={11} fill={color}
                      fontFamily="JetBrains Mono,monospace" fontWeight="700">
                      ₹{Math.round(profit)}
                    </text>
                    {/* margin % below profit value */}
                    <text x={x + barW / 2} y={baseline - profitH - 4}
                      textAnchor="middle" fontSize={9.5} fill={color} opacity={0.7}
                      fontFamily="Inter,sans-serif">
                      {margin}%
                    </text>
                  </g>
                )
              })}
            </g>
          ))}

        </svg>
      </div>

      {/* calculation breakdown */}
      <div style={{ padding: '0.5rem 1.4rem 1rem', overflowX: 'auto' }}>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
          Profit = Selling Price − Production Cost &nbsp;(per 1000 labels)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#555', fontWeight: 500 }}>Rate</th>
              {slots.map((s, i) => (
                <th key={i} colSpan={4} style={{ textAlign: 'center', padding: '4px 8px', color: SLOT_COLORS[i], fontWeight: 600 }}>
                  {s.label || `Quote ${LABELS[i]}`}
                </th>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th />
              {slots.map((_, i) => (
                <React.Fragment key={i}>
                  <th style={{ textAlign: 'right', padding: '2px 5px', color: '#555', fontWeight: 400, fontSize: 10 }}>Sell ₹</th>
                  <th style={{ textAlign: 'center', padding: '2px 2px', color: '#444', fontWeight: 400, fontSize: 10 }}>−</th>
                  <th style={{ textAlign: 'right', padding: '2px 5px', color: '#555', fontWeight: 400, fontSize: 10 }}>Cost ₹</th>
                  <th style={{ textAlign: 'right', padding: '2px 5px', color: '#555', fontWeight: 400, fontSize: 10 }}>= Profit ₹</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <tr key={gi} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '5px 8px', color: '#777', whiteSpace: 'nowrap' }}>{group.label}</td>
                {group.bars.map(({ sell, cost, profit, margin }, qi) => (
                  <React.Fragment key={qi}>
                    <td style={{ textAlign: 'right', padding: '5px 5px', color: '#aaa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(sell)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '5px 2px', color: '#444' }}>−</td>
                    <td style={{ textAlign: 'right', padding: '5px 5px', color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round(cost)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 5px', fontFamily: 'JetBrains Mono, monospace',
                      color: profit > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                      {Math.round(profit)}
                      <span style={{ color: '#555', fontSize: 9, marginLeft: 3, fontWeight: 400 }}>({margin}%)</span>
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Comparison results table ──────────────────────────────────────────────────
function ResultsTable({ slots, results }) {
  const mRows = results.map((r) => (r ? r.rows[r.matched.index] : null))

  function bestOf(vals, better) {
    const clean = vals.filter((v) => v != null)
    if (clean.length < 2) return null
    return better === 'max' ? Math.max(...clean) : Math.min(...clean)
  }

  function NumCell({ vals, i, better, display }) {
    const best = bestOf(vals, better)
    const v    = vals[i]
    const star = v != null && v === best
    return (
      <td className={star ? 'cmp-best-cell' : ''}>
        {v != null ? display(v) : '—'}
        {star && <span className="cmp-best-star"> ★</span>}
      </td>
    )
  }

  const pricingRows = [
    // ── Efficiency ──
    { label: 'Labels / m²',             vals: results.map((r) => r?.pricing?.labels_sqm),                    better: 'max', display: (v) => fmt(v) },
    { label: 'Adj. Labels / m²',        vals: results.map((r) => r?.pricing?.adj_labels),                    better: 'max', display: (v) => fmt(v) },
    // ── Production cost (substrate cost per 1000 labels) ──
    { label: 'Production Cost / 1000',  vals: results.map((r) => (r?.pricing?.rate_2 ?? 0) / 2),             better: 'min', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Production Cost / Label', vals: results.map((r) => (r?.pricing?.rate_2 ?? 0) / 2000),          better: 'min', display: (v) => `₹ ${fmt(v, 4)}` },
    // ── Selling rates ──
    { label: 'Selling Rate 1 : 1.5',    vals: results.map((r) => r?.pricing?.rate_15),                       better: 'min', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 1.75',   vals: results.map((r) => r?.pricing?.rate_175),                      better: 'min', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 2',      vals: results.map((r) => r?.pricing?.rate_2),                        better: 'min', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Selling Rate 1 : 2 ($)',  vals: results.map((r) => r?.pricing?.price_usd_1000),                better: 'min', display: (v) => `$ ${fmt(v, 3)}` },
    // ── Profit per 1000 labels at each rate ──
    { label: 'Profit at 1 : 1.5',       vals: results.map((r) => (r?.pricing?.rate_15  ?? 0) - (r?.pricing?.rate_2 ?? 0) / 2), better: 'max', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Profit at 1 : 1.75',      vals: results.map((r) => (r?.pricing?.rate_175 ?? 0) - (r?.pricing?.rate_2 ?? 0) / 2), better: 'max', display: (v) => `₹ ${fmt(v)}` },
    { label: 'Profit at 1 : 2',         vals: results.map((r) => (r?.pricing?.rate_2   ?? 0) / 2),           better: 'max', display: (v) => `₹ ${fmt(v)}` },
  ]

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
            <tr className="cmp-section-row"><td colSpan={slots.length + 1}>Efficiency · Cost · Selling Rates · Profit</td></tr>
            {pricingRows.map((row) => (
              <tr key={row.label}>
                <td style={{ textAlign: 'left' }}>{row.label}</td>
                {row.vals.map((v, i) => (
                  <NumCell key={i} vals={row.vals} i={i} better={row.better} display={row.display} />
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
      {results && (
        <>
          <ProfitBarChart slots={slots} results={results} />
          <ResultsTable  slots={slots} results={results} />
        </>
      )}
    </div>
  )
}
