import React, { useEffect, useRef, useState } from 'react'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement } from 'chart.js'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, RadarController, RadialLinearScale, PointElement, LineElement)

const LABELS      = ['A', 'B', 'C', 'D']
const SLOT_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa']

const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d) : '—'

const METRICS = [
  { key: 'adj_labels',     label: 'Adj. Labels / m²', better: 'max', short: 'Yield',    unit: ''   },
  { key: 'price_inr_1000', label: '₹ / 1000 Labels',  better: 'min', short: '₹/1000',  unit: '₹'  },
  { key: 'price_usd_1000', label: '$ / 1000 Labels',  better: 'min', short: '$/1000',  unit: '$'  },
  { key: 'rate_15',        label: 'Rate 1:1.5',        better: 'min', short: 'R 1:1.5', unit: '₹'  },
  { key: 'rate_175',       label: 'Rate 1:1.75',       better: 'min', short: 'R 1:1.75',unit: '₹'  },
  { key: 'rate_2',         label: 'Rate 1:2',          better: 'min', short: 'R 1:2',   unit: '₹'  },
]

function winnerIndex(metricKey, results) {
  const m = METRICS.find(x => x.key === metricKey)
  if (!m) return -1
  const vals = results.map(r => r?.pricing?.[metricKey])
  const valid = vals.filter(v => v != null)
  if (valid.length < 2) return -1
  const best = m.better === 'max' ? Math.max(...valid) : Math.min(...valid)
  return vals.findIndex(v => v === best)
}

// ── Bar chart (single metric) ─────────────────────────────────────────────────
function BarChart({ slots, results, metricKey }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const m    = METRICS.find(x => x.key === metricKey)
    const vals = results.map(r => r?.pricing?.[metricKey] ?? 0)
    const wi   = winnerIndex(metricKey, results)

    const bgColors = SLOT_COLORS.slice(0, slots.length).map((c, i) =>
      i === wi ? c : c + '44'
    )
    const borderColors = SLOT_COLORS.slice(0, slots.length)

    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: slots.map((s, i) => s.label || `Quote ${LABELS[i]}`),
        datasets: [{
          data: vals,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${m.unit}${Number(ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { size: 12 } },
            border: { color: 'rgba(128,128,128,0.15)' },
          },
          y: {
            grid: { color: 'rgba(128,128,128,0.08)' },
            ticks: {
              color: '#888',
              font: { size: 11 },
              callback: v => m.unit + Number(v).toFixed(1),
            },
            border: { display: false },
          },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [metricKey, results, slots])

  return (
    <div style={{ position: 'relative', width: '100%', height: 260 }}>
      <canvas ref={canvasRef}
        role="img"
        aria-label={`Bar chart comparing ${METRICS.find(m => m.key === metricKey)?.label} across quotes`}
      />
    </div>
  )
}

// ── Grouped bar chart (all metrics) ──────────────────────────────────────────
function GroupedBarChart({ slots, results }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    // Normalize each metric to 0–100 so they're comparable on one axis
    const datasets = slots.map((slot, i) => {
      const data = METRICS.map(m => {
        const allVals = results.map(r => r?.pricing?.[m.key] ?? 0)
        const val     = results[i]?.pricing?.[m.key] ?? 0
        const max     = Math.max(...allVals) || 1
        const min     = Math.min(...allVals) || 0
        // For "min is better" metrics, invert so taller = better
        if (m.better === 'min') return max === min ? 100 : ((max - val) / (max - min)) * 100
        return max === min ? 100 : (val / max) * 100
      })
      return {
        label: slot.label || `Quote ${LABELS[i]}`,
        data,
        backgroundColor: SLOT_COLORS[i] + 'bb',
        borderColor: SLOT_COLORS[i],
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      }
    })

    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: METRICS.map(m => m.short),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(0)}% (relative score)`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { size: 11 } },
            border: { color: 'rgba(128,128,128,0.15)' },
          },
          y: {
            min: 0, max: 100,
            grid: { color: 'rgba(128,128,128,0.08)' },
            ticks: {
              color: '#888',
              font: { size: 11 },
              callback: v => v + '%',
            },
            border: { display: false },
          },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [results, slots])

  return (
    <div style={{ position: 'relative', width: '100%', height: 280 }}>
      <canvas ref={canvasRef}
        role="img"
        aria-label="Grouped bar chart showing normalized scores across all metrics for each quote"
      />
    </div>
  )
}

// ── Radar chart ───────────────────────────────────────────────────────────────
function RadarChart({ slots, results }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const datasets = slots.map((slot, i) => {
      const data = METRICS.map(m => {
        const allVals = results.map(r => r?.pricing?.[m.key] ?? 0)
        const val     = results[i]?.pricing?.[m.key] ?? 0
        const max     = Math.max(...allVals) || 1
        const min     = Math.min(...allVals) || 0
        if (m.better === 'min') return max === min ? 100 : ((max - val) / (max - min)) * 100
        return max === min ? 100 : (val / max) * 100
      })
      return {
        label: slot.label || `Quote ${LABELS[i]}`,
        data,
        backgroundColor: SLOT_COLORS[i] + '22',
        borderColor: SLOT_COLORS[i],
        borderWidth: 2,
        pointBackgroundColor: SLOT_COLORS[i],
        pointRadius: 4,
      }
    })

    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels: METRICS.map(m => m.short),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false },
            grid:  { color: 'rgba(128,128,128,0.15)' },
            pointLabels: { color: '#888', font: { size: 11 } },
            angleLines: { color: 'rgba(128,128,128,0.15)' },
          },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [results, slots])

  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }}>
      <canvas ref={canvasRef}
        role="img"
        aria-label="Radar chart showing relative performance across all metrics for each quote"
      />
    </div>
  )
}

// ── Winner summary strip ──────────────────────────────────────────────────────
function WinnerStrip({ slots, results }) {
  const wins = Array(slots.length).fill(0)
  METRICS.forEach(m => {
    const wi = winnerIndex(m.key, results)
    if (wi >= 0) wins[wi]++
  })
  const topWinner = wins.indexOf(Math.max(...wins))

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
      {slots.map((slot, i) => (
        <div key={i} style={{
          flex: '1 1 120px',
          background: i === topWinner ? SLOT_COLORS[i] + '18' : 'var(--color-background-secondary)',
          border: `0.5px solid ${i === topWinner ? SLOT_COLORS[i] + '66' : 'var(--color-border-tertiary)'}`,
          borderRadius: 'var(--border-radius-md)',
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: 11, color: SLOT_COLORS[i], fontWeight: 500, marginBottom: 2 }}>
            {slot.label || `Quote ${LABELS[i]}`}
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {wins[i]}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            metric{wins[i] !== 1 ? 's' : ''} won
            {i === topWinner ? ' ★' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ChartView ─────────────────────────────────────────────────────────────
export default function ChartView({ slots, results }) {
  const [chartType, setChartType]   = useState('bar')      // 'bar' | 'grouped' | 'radar'
  const [activeMetric, setMetric]   = useState('price_inr_1000')

  if (!slots || !results) return null

  const chartTypes = [
    { key: 'bar',     label: 'Single metric' },
    { key: 'grouped', label: 'All metrics'   },
    { key: 'radar',   label: 'Radar'         },
  ]

  return (
    <section className="card cmp-results-card" style={{ marginTop: '1.25rem' }}>
      {/* header */}
      <div className="card-header">
        <div className="card-icon-wrap">◈</div>
        <span className="card-title">Chart View</span>
      </div>

      {/* winner strip */}
      <WinnerStrip slots={slots} results={results} />

      {/* chart type tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        {chartTypes.map(ct => (
          <button
            key={ct.key}
            onClick={() => setChartType(ct.key)}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              borderRadius: 'var(--border-radius-md)',
              border: `0.5px solid ${chartType === ct.key ? 'var(--color-border-primary)' : 'var(--color-border-secondary)'}`,
              background: chartType === ct.key ? 'var(--color-background-secondary)' : 'transparent',
              color: chartType === ct.key ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            {ct.label}
          </button>
        ))}

        {/* metric picker — only for single-metric bar */}
        {chartType === 'bar' && (
          <select
            value={activeMetric}
            onChange={e => setMetric(e.target.value)}
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              padding: '5px 10px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
            }}
          >
            {METRICS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {slots.map((s, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SLOT_COLORS[i], flexShrink: 0 }} />
            {s.label || `Quote ${LABELS[i]}`}
            {s.width && s.height ? ` · ${fmt(s.width, 1)} × ${fmt(s.height, 1)} mm` : ''}
          </span>
        ))}
      </div>

      {/* charts */}
      {chartType === 'bar'     && <BarChart     slots={slots} results={results} metricKey={activeMetric} />}
      {chartType === 'grouped' && <GroupedBarChart slots={slots} results={results} />}
      {chartType === 'radar'   && <RadarChart   slots={slots} results={results} />}

      {/* note for normalized charts */}
      {(chartType === 'grouped' || chartType === 'radar') && (
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10, marginBottom: 0 }}>
          Scores are normalized 0–100. For cost metrics, higher = cheaper (inverted so taller always means better).
        </p>
      )}
    </section>
  )
}