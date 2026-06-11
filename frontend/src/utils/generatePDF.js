import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt  = (v, d = 2) => Number(v).toFixed(d)
const fmtN = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

const TEAL   = [54, 229, 194]
const BLACK  = [10, 10, 10]
const GRAY   = [100, 110, 120]
const LGRAY  = [220, 225, 230]
const WHITE  = [255, 255, 255]
const TEAL_BG = [235, 252, 248]

function section(doc, y, title) {
  doc.setFillColor(...TEAL)
  doc.rect(14, y, 182, 6.5, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), 17, y + 4.3)
  doc.setTextColor(...BLACK)
  return y + 10
}

function row(doc, y, label, value, highlight = false) {
  if (highlight) {
    doc.setFillColor(...TEAL_BG)
    doc.rect(14, y - 3.5, 182, 6.5, 'F')
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(label, 17, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text(String(value), 90, y)
  return y + 6.5
}

function twoCol(doc, y, pairs) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  pairs.forEach(([lbl, val], i) => {
    const x = i % 2 === 0 ? 17 : 110
    const ry = y + Math.floor(i / 2) * 6.5
    doc.setTextColor(...GRAY)
    doc.text(lbl, x, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(String(val), x + 38, ry)
    doc.setFont('helvetica', 'normal')
  })
  return y + Math.ceil(pairs.length / 2) * 6.5
}

export function generateQuotePDF({ result, inputs, selectedIdx, clientName, orderName }) {
  if (!result) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const selIdx  = selectedIdx ?? result.matched.index
  const selRow  = result.rows[selIdx]
  const p       = result.pricing
  const qty     = parseFloat(inputs.order_qty) || 0
  const today   = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // ── Header bar ──
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 210, 22, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('CHROMA PRINT', 14, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Label Cost Estimation Report', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Date: ${dateStr}`, 196, 9, { align: 'right' })
  if (result.calculation_id) {
    doc.text(`Quote #${result.calculation_id}`, 196, 15, { align: 'right' })
  }
  doc.setTextColor(...BLACK)

  let y = 30

  // ── Client & Order ──
  if (clientName || orderName) {
    y = section(doc, y, 'Client Information')
    if (clientName) y = row(doc, y, 'Client', clientName)
    if (orderName)  y = row(doc, y, 'Order',  orderName)
    y += 4
  }

  // ── Label Specifications ──
  y = section(doc, y, 'Label Specifications')
  y = twoCol(doc, y, [
    ['Input Width',    `${fmt(inputs.width)} mm`],
    ['Input Height',   `${fmt(inputs.height)} mm`],
    ['Yield',          `${inputs.yield_pct}%`],
    ['Order Quantity', qty > 0 ? `${fmtN(qty, 0)} labels` : '—'],
    ['Substrate',      inputs.substrate_name || 'Custom'],
    ['Substrate Cost', `₹${fmt(inputs.substrate_price)} / m²`],
    ['Foil Cost',      `₹${fmt(inputs.foil_cost)} / m²`],
    ['Custom Cost',    `₹${fmt(inputs.custom_cost)} / label`],
    ['Exchange Rate',  `₹${inputs.exchange_rate} per $1`],
  ])
  y += 4

  // ── Selected Cylinder ──
  y = section(doc, y, 'Selected Cylinder')
  y = twoCol(doc, y, [
    ['Teeth',          selRow.teeth],
    ['Circumference',  `${fmt(selRow.circumference)} mm`],
    ['Label Width',    `${fmt(selRow.label_width)} mm`],
    ['Label Height',   `${fmt(selRow.label_height)} mm`],
    ['Around',         selRow.around],
    ['Across',         selRow.across],
    ['Labels / Repeat', selRow.around * selRow.across],
    ['Paper Size',     `${selRow.paper_size} mm`],
  ])
  y += 4

  // ── Pricing Table ──
  y = section(doc, y, 'Pricing Summary')
  y += 2

  const costPerLabel = p.rate_2 / 2000
  const usdRatio     = p.rate_2 > 0 ? p.price_usd_1000 / p.rate_2 : 0

  const tierRows = [
    ['1 : 1.5',  fmtN(p.rate_15),  fmtN(p.rate_15  * usdRatio, 2), fmt(p.rate_15  / 1000, 3), fmt(p.rate_15  * usdRatio / 1000, 4)],
    ['1 : 1.75', fmtN(p.rate_175), fmtN(p.rate_175 * usdRatio, 2), fmt(p.rate_175 / 1000, 3), fmt(p.rate_175 * usdRatio / 1000, 4)],
    ['1 : 2',    fmtN(p.rate_2),   fmtN(p.price_usd_1000, 2),      fmt(p.rate_2   / 1000, 3), fmt(p.price_usd_label, 4)],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Tier', '₹ / 1000 labels', '$ / 1000 labels', '₹ / label', '$ / label']],
    body: tierRows,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: [30, 35, 50],
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: { fontSize: 9, halign: 'center', textColor: BLACK },
    alternateRowStyles: { fillColor: TEAL_BG },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
  })

  y = doc.lastAutoTable.finalY + 6

  // ── Order Summary ──
  if (qty > 0) {
    y = section(doc, y, 'Order Summary')

    const totalInr  = qty * (p.rate_2 / 2000)
    const totalUsd  = totalInr / (parseFloat(inputs.exchange_rate) || 85)
    const sqm       = qty / p.adj_labels
    const meters    = sqm / (selRow.paper_size / 1000)

    y = twoCol(doc, y, [
      ['Total Labels',  fmtN(qty, 0)],
      ['Web Area',      `${fmtN(sqm, 2)} m²`],
      ['Web Length',    `${fmtN(meters, 1)} m`],
      ['Total Cost (₹)', `₹ ${fmtN(totalInr, 2)}`],
      ['Total Cost ($)', `$ ${fmtN(totalUsd, 2)}`],
    ])
    y += 4
  }

  // ── Cylinder Comparison note ──
  const matchedRow = result.rows[result.matched.index]
  if (selIdx !== result.matched.index) {
    y = section(doc, y, 'Note')
    y = row(doc, y, 'Best Match Cylinder', `${matchedRow.teeth} teeth — ${fmt(matchedRow.label_width)} × ${fmt(matchedRow.label_height)} mm`)
    y = row(doc, y, 'Selected Cylinder',   `${selRow.teeth} teeth — ${fmt(selRow.label_width)} × ${fmt(selRow.label_height)} mm`, true)
    y += 4
  }

  // ── Footer ──
  const pageH = doc.internal.pageSize.height
  doc.setFillColor(...TEAL)
  doc.rect(0, pageH - 12, 210, 12, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Chroma Print  •  Label Cost Estimation Intelligence', 14, pageH - 4.5)
  doc.text(`Generated ${dateStr} ${timeStr}`, 196, pageH - 4.5, { align: 'right' })

  const filename = clientName
    ? `ChromaPrint_Quote_${clientName.replace(/\s+/g, '_')}_${today.toISOString().split('T')[0]}.pdf`
    : `ChromaPrint_Quote_${today.toISOString().split('T')[0]}.pdf`

  doc.save(filename)
}
