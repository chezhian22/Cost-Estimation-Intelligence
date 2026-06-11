const ind  = (n, d = 2) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
const inr  = (n, d = 2) => `&#8377;&nbsp;${ind(n, d)}`
const usd  = (n, d = 4) => `$&nbsp;${Number(n || 0).toFixed(d)}`
const usd2 = (n)        => `$&nbsp;${Number(n || 0).toFixed(2)}`
const f2   = (n)        => Number(n || 0).toFixed(2)
const f3   = (n)        => Number(n || 0).toFixed(3)

export function generatePDF({
  client = 'N/A',
  order  = 'N/A',
  quoteNo,
  inputs = {},
  cylinder = {},
  pricing = {},
  order_analytics = null,
}) {
  const today   = new Date()
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const valid   = new Date(today); valid.setDate(valid.getDate() + 30)
  const validStr = valid.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const p   = pricing
  const cyl = cylinder
  const inp = inputs

  const usdRatio = (p.rate_2 && p.price_usd_1000) ? p.price_usd_1000 / p.rate_2 : 0

  // Cost breakdown per label
  const adjLabels   = p.adj_labels  || 1
  const subCostLbl  = (p.substrate_price + (p.foil_cost || 0)) / adjLabels
  const customLbl   = p.custom_cost || inp.custom_cost || 0
  const baseCostLbl = subCostLbl + customLbl

  // Tier rows
  const tiers = [
    { label: '1 : 1.5',  inr1000: p.rate_15,  usd1000: p.rate_15  * usdRatio, inrLbl: p.rate_15  / 1000, usdLbl: p.rate_15  * usdRatio / 1000 },
    { label: '1 : 1.75', inr1000: p.rate_175, usd1000: p.rate_175 * usdRatio, inrLbl: p.rate_175 / 1000, usdLbl: p.rate_175 * usdRatio / 1000 },
    { label: '1 : 2',    inr1000: p.rate_2,   usd1000: p.price_usd_1000,      inrLbl: p.rate_2   / 1000, usdLbl: p.price_usd_label,             highlight: true },
  ]

  const specRows = [
    ['Label Width',    `${f2(inp.width)} mm`],
    ['Label Height',   `${f2(inp.height)} mm`],
    ['Yield',          `${inp.yield_pct}%`],
    ['Substrate',      inp.substrate_name || 'Custom'],
    ['Substrate Cost', `&#8377; ${f2(inp.substrate_price)} / m²`],
    ['Foil Cost',      `&#8377; ${f2(inp.foil_cost)} / m²`],
    ['Custom Cost',    `&#8377; ${f3(inp.custom_cost)} / label`],
    ['Exchange Rate',  `&#8377; ${inp.exchange_rate} per $1`],
  ]

  const cylRows = [
    ['Cylinder Teeth', cyl.teeth],
    ['Circumference',  `${f2(cyl.circumference)} mm`],
    ['Label Width (Cyl)', `${f2(cyl.label_width)} mm`],
    ['Label Height (Cyl)', `${f2(cyl.label_height)} mm`],
    ['Around × Across', `${cyl.around} × ${cyl.across}`],
    ['Labels / Repeat', (cyl.around || 0) * (cyl.across || 0)],
    ['Paper Size',     `${cyl.paper_size} mm`],
    ['Efficiency',     `${f2(cyl.efficiency)}%`],
  ]

  const pricingRows = [
    ['Label Size (cm)',   `${f2(p.label_w_cm)} × ${f2(p.label_h_cm)} cm`],
    ['Labels / m²',       f2(p.labels_sqm)],
    ['Adj. Labels / m²',  f2(p.adj_labels)],
    ['Substrate Cost / label', `&#8377; ${f3(subCostLbl)}`],
    ['Foil + Custom / label',  `&#8377; ${f3(customLbl)}`],
    ['Base Cost / label (Total)', `&#8377; ${f3(baseCostLbl)}`, true],
  ]

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quote ${quoteNo} — ${client}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    background: #f0f2f5;
  }

  .page {
    width: 794px;
    min-height: 1123px;
    margin: 24px auto;
    background: #fff;
    box-shadow: 0 4px 32px rgba(0,0,0,0.14);
    border-radius: 4px;
    overflow: hidden;
  }

  /* ── Header ── */
  .hdr {
    background: linear-gradient(135deg, #0d7377 0%, #14a085 60%, #1abcab 100%);
    padding: 22px 28px 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
  }
  .hdr::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 8px, transparent 8px, transparent 16px);
  }
  .hdr-left h1 {
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .hdr-left h1 span { color: #b3f5ef; font-weight: 400; }
  .hdr-left p {
    font-size: 9.5px;
    color: rgba(255,255,255,0.82);
    margin-top: 4px;
    line-height: 1.5;
  }
  .hdr-right {
    text-align: right;
  }
  .hdr-right .badge {
    display: inline-block;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.30);
    border-radius: 4px;
    padding: 5px 12px;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .hdr-right .qno {
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.01em;
  }
  .hdr-right .qdate {
    font-size: 9px;
    color: rgba(255,255,255,0.75);
    margin-top: 3px;
  }

  /* ── Body ── */
  .body { padding: 20px 28px 24px; }

  /* ── 2-col bill row ── */
  .bill-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 18px;
  }
  .bill-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
    background: #f8fafc;
  }
  .bill-card h3 {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  .bill-card .bill-name {
    font-size: 13px;
    font-weight: 700;
    color: #0d7377;
    line-height: 1.3;
  }
  .bill-card .bill-sub {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
  }
  .bill-card .qmeta-row {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    margin-top: 4px;
    color: #475569;
  }
  .bill-card .qmeta-row span:last-child { font-weight: 600; color: #1e293b; }

  /* ── Section heading ── */
  .sec-head {
    background: #0d7377;
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 3px;
    margin: 16px 0 8px;
  }

  /* ── 2-col spec grid ── */
  .spec-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }
  .spec-cell {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    border-bottom: 1px solid #f1f5f9;
    gap: 8px;
  }
  .spec-cell:nth-child(odd)  { background: #fff; }
  .spec-cell:nth-child(even) { background: #f8fafc; }
  .spec-cell:last-child, .spec-cell:nth-last-child(2):nth-child(odd) { border-bottom: none; }
  .spec-lbl { color: #64748b; font-size: 9.5px; }
  .spec-val { font-weight: 600; color: #1e293b; font-size: 9.5px; text-align: right; }
  .spec-val.hl { color: #0d7377; font-weight: 700; }

  /* ── Pricing table ── */
  .price-table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  .price-table thead tr {
    background: #1e293b;
    color: #fff;
  }
  .price-table thead th {
    padding: 7px 10px;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
  }
  .price-table thead th:first-child { text-align: left; }
  .price-table tbody tr td {
    padding: 7px 10px;
    font-size: 9.5px;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
  }
  .price-table tbody tr td:first-child { text-align: left; font-weight: 700; color: #0d7377; }
  .price-table tbody tr:nth-child(odd)  { background: #fff; }
  .price-table tbody tr:nth-child(even) { background: #f0fffe; }
  .price-table tbody tr.hl-row {
    background: #e6faf8 !important;
    border-left: 3px solid #0d7377;
  }
  .price-table tbody tr.hl-row td { font-weight: 700; color: #0d7377; }

  /* ── Tier boxes ── */
  .tier-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 8px;
  }
  .tier-box {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
    background: #f8fafc;
  }
  .tier-box.hl {
    border-color: #0d7377;
    background: #e6faf8;
    box-shadow: 0 2px 12px rgba(13,115,119,0.15);
  }
  .tier-box .t-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 6px;
  }
  .tier-box.hl .t-label { color: #0d7377; }
  .tier-box .t-ratio {
    font-size: 15px;
    font-weight: 800;
    color: #1e293b;
    line-height: 1;
    margin-bottom: 8px;
  }
  .tier-box.hl .t-ratio { color: #0d7377; }
  .tier-box .t-inr {
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
  }
  .tier-box.hl .t-inr { color: #0d7377; }
  .tier-box .t-sub { font-size: 8.5px; color: #64748b; margin-top: 4px; }
  .tier-box .t-usd { font-size: 10px; font-weight: 600; color: #475569; margin-top: 3px; }
  .tier-box.hl .t-usd { color: #0d7377; }
  .tier-box .rec-badge {
    display: inline-block;
    background: #0d7377;
    color: #fff;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 100px;
    margin-bottom: 6px;
  }

  /* ── Order Analytics ── */
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 8px;
  }
  .an-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    background: #f8fafc;
    text-align: center;
  }
  .an-card.inr { border-color: #86efac; background: #f0fdf4; }
  .an-card.usd { border-color: #93c5fd; background: #eff6ff; }
  .an-lbl { font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .an-val { font-size: 12px; font-weight: 800; color: #1e293b; line-height: 1.1; }
  .an-card.inr .an-val { color: #16a34a; }
  .an-card.usd .an-val { color: #2563eb; }

  /* ── Footer ── */
  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-left { font-size: 8.5px; color: #64748b; line-height: 1.6; }
  .footer-right { text-align: right; font-size: 8px; color: #94a3b8; }
  .footer-right .sig { font-size: 9px; font-weight: 700; color: #0d7377; margin-bottom: 2px; }

  /* ── Print button ── */
  .print-wrap {
    position: fixed;
    top: 16px; right: 20px;
    display: flex;
    gap: 8px;
    z-index: 99;
  }
  .btn-print {
    background: #0d7377;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 9px 20px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(13,115,119,0.35);
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  .btn-print:hover { background: #0a5c60; }
  .btn-close {
    background: #e2e8f0;
    color: #475569;
    border: none;
    border-radius: 6px;
    padding: 9px 16px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  .btn-close:hover { background: #cbd5e1; }

  @media print {
    body { background: #fff; }
    .page { margin: 0; box-shadow: none; border-radius: 0; }
    .print-wrap { display: none; }
  }
</style>
</head>
<body>

<div class="print-wrap">
  <button class="btn-print" onclick="window.print()">&#128424; Print / Save PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-left">
      <h1>CHROMAPRINT <span>INDIA</span></h1>
      <p>
        SF No. 215/2, Mettupalayam Road, Coimbatore &ndash; 641 022<br>
        +91-422-2642738 &nbsp;&middot;&nbsp; sales@chromaprintindia.com
      </p>
    </div>
    <div class="hdr-right">
      <div class="badge">Price Quotation</div>
      <div class="qno">${quoteNo}</div>
      <div class="qdate">Date: ${dateStr}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Bill To + Quote Details -->
    <div class="bill-row">
      <div class="bill-card">
        <h3>Bill To</h3>
        <div class="bill-name">${client}</div>
        <div class="bill-sub">Order: ${order}</div>
      </div>
      <div class="bill-card">
        <h3>Quote Details</h3>
        <div class="qmeta-row"><span>Quote Number</span><span>${quoteNo}</span></div>
        <div class="qmeta-row"><span>Date Issued</span><span>${dateStr}</span></div>
        <div class="qmeta-row"><span>Valid Until</span><span>${validStr}</span></div>
        <div class="qmeta-row"><span>Prepared By</span><span>Chromaprint India Pvt. Ltd.</span></div>
      </div>
    </div>

    <!-- Label + Cylinder Specification -->
    <div class="sec-head">Label &amp; Cylinder Specification</div>
    <div class="spec-grid">
      ${specRows.map(([l, v]) => `
      <div class="spec-cell">
        <span class="spec-lbl">${l}</span>
        <span class="spec-val">${v}</span>
      </div>`).join('')}
      ${cylRows.map(([l, v]) => `
      <div class="spec-cell">
        <span class="spec-lbl">${l}</span>
        <span class="spec-val">${v}</span>
      </div>`).join('')}
    </div>

    <!-- Cost Analysis -->
    <div class="sec-head">Cost Analysis per Label</div>
    <div class="spec-grid">
      ${pricingRows.map(([l, v, hl]) => `
      <div class="spec-cell">
        <span class="spec-lbl">${l}</span>
        <span class="spec-val${hl ? ' hl' : ''}">${v}</span>
      </div>`).join('')}
    </div>

    <!-- Pricing Table -->
    <div class="sec-head">Rate Tier Pricing</div>
    <table class="price-table">
      <thead>
        <tr>
          <th>Tier</th>
          <th>&#8377; / 1000 Labels</th>
          <th>$ / 1000 Labels</th>
          <th>&#8377; / Label</th>
          <th>$ / Label</th>
        </tr>
      </thead>
      <tbody>
        ${tiers.map(t => `
        <tr${t.highlight ? ' class="hl-row"' : ''}>
          <td>${t.label}</td>
          <td>${ind(t.inr1000)}</td>
          <td>${usd2(t.usd1000)}</td>
          <td>${ind(t.inrLbl, 3)}</td>
          <td>${usd(t.usdLbl)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <!-- Tier Visual Boxes -->
    <div class="tier-row">
      ${tiers.map(t => `
      <div class="tier-box${t.highlight ? ' hl' : ''}">
        ${t.highlight ? '<div class="rec-badge">Recommended</div>' : ''}
        <div class="t-label">Ratio</div>
        <div class="t-ratio">${t.label}</div>
        <div class="t-inr">&#8377;&nbsp;${ind(t.inr1000)}</div>
        <div class="t-sub">per 1000 labels</div>
        <div class="t-usd">$&nbsp;${Number(t.usd1000 || 0).toFixed(2)} / 1000 labels</div>
      </div>`).join('')}
    </div>

    ${order_analytics ? `
    <!-- Order Analytics -->
    <div class="sec-head">Order Analytics &mdash; ${Number(order_analytics.qty).toLocaleString('en-IN')} Labels</div>
    <div class="analytics-grid">
      <div class="an-card">
        <div class="an-lbl">Substrate Area</div>
        <div class="an-val">${ind(order_analytics.sqm_needed)} m&sup2;</div>
      </div>
      <div class="an-card">
        <div class="an-lbl">Linear Meters</div>
        <div class="an-val">${ind(order_analytics.linear_meters)} m</div>
      </div>
      <div class="an-card inr">
        <div class="an-lbl">Total Cost (INR)</div>
        <div class="an-val">&#8377;&nbsp;${ind(order_analytics.total_inr_2, 0)}</div>
      </div>
      <div class="an-card usd">
        <div class="an-lbl">Total Cost (USD)</div>
        <div class="an-val">$&nbsp;${Number(order_analytics.total_usd_2 || 0).toFixed(2)}</div>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <strong>Chromaprint India Private Limited</strong><br>
        SF No. 215/2, Mettupalayam Road, Coimbatore &ndash; 641 022, Tamil Nadu<br>
        Tel: +91-422-2642738 &nbsp;&middot;&nbsp; Email: sales@chromaprintindia.com
      </div>
      <div class="footer-right">
        <div class="sig">Authorised Signatory</div>
        <div>Chromaprint India Pvt. Ltd.</div>
        <div style="margin-top:6px;color:#cbd5e1">Generated: ${dateStr}</div>
      </div>
    </div>

  </div><!-- /body -->
</div><!-- /page -->
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups for this site to generate the PDF quote.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
}
