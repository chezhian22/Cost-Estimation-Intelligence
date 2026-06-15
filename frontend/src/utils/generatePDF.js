// Two PDF generators:
//   generateInvoicePDF  — client-facing invoice (no internal data)
//   generateQuotationPDF — internal comparison doc (includes costs, both cylinders)

const ind = (n, d = 2) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

// Shared pricing computation for any cylinder row + inputs
function computeRow(row, inputs) {
  if (!row?.label_width || !row?.label_height) {
    return { labels_sqm: 0, adj_labels: 0, rate_15: 0, rate_175: 0, rate_2: 0,
             price_inr_label: 0, price_inr_1000: 0, price_usd_label: 0, price_usd_1000: 0 }
  }
  const label_w_cm = row.label_width  / 10
  const label_h_cm = row.label_height / 10
  const labels_sqm = (10000 / label_w_cm) / label_h_cm
  const yld        = Number(inputs.yield_pct)       || 85
  const adj_labels = labels_sqm * yld / 100
  const sub        = Number(inputs.substrate_price) || 0
  const foil       = Number(inputs.foil_cost)       || 0
  const custom     = Number(inputs.custom_cost)     || 0
  const exch       = Number(inputs.exchange_rate)   || 85
  const cpp        = (adj_labels > 0 ? (sub + foil) / adj_labels : 0) + custom
  const rate_2     = cpp * 2000
  return {
    labels_sqm,
    adj_labels,
    rate_15:         cpp * 1500,
    rate_175:        cpp * 1750,
    rate_2,
    price_inr_label: rate_2 / 1000,
    price_inr_1000:  rate_2,
    price_usd_label: exch > 0 ? rate_2 / exch / 1000 : 0,
    price_usd_1000:  exch > 0 ? rate_2 / exch : 0,
  }
}

function openWindow(html) {
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow pop-ups to generate the PDF.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
}

// ─────────────────────────────────────────────────────────────────────────────
// buildPDFHtml — builds client-facing invoice HTML string (no window open)
// Used by PDFPreview for iframe rendering, and by generateInvoicePDF / generatePDF
// ─────────────────────────────────────────────────────────────────────────────
export function buildPDFHtml(
  { client = {}, order = {}, inputs = {}, approved_cylinder = {}, pricing = {} },
  companySettings = {}
) {
  const today   = new Date()
  const year    = today.getFullYear()
  const invNo   = `INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const cyl = approved_cylinder
  const qty = Number(inputs.total_qty) || 0
  const ratePerLabel = Number(pricing.selling_price_per_label || 0)
  const subtotal     = Number(pricing.total_cost_inr || (qty * ratePerLabel) || 0)
  const totalUsd     = Number(pricing.total_cost_usd || 0)

  // ── Tax calculation ──
  const cgstPct = (companySettings.cgst_pct != null && companySettings.cgst_pct !== '')
    ? Number(companySettings.cgst_pct) : null
  const sgstPct = (companySettings.sgst_pct != null && companySettings.sgst_pct !== '')
    ? Number(companySettings.sgst_pct) : null
  const hasTax = cgstPct !== null && sgstPct !== null && !isNaN(cgstPct) && !isNaN(sgstPct)

  const cgstAmt  = hasTax ? subtotal * cgstPct / 100 : 0
  const sgstAmt  = hasTax ? subtotal * sgstPct / 100 : 0
  const totalInr = hasTax ? subtotal + cgstAmt + sgstAmt : subtotal

  const subLine = [
    inputs.substrate,
    inputs.label_width_mm && inputs.label_height_mm
      ? `${Number(inputs.label_width_mm).toFixed(1)} × ${Number(inputs.label_height_mm).toFixed(1)} mm`
      : null,
    cyl.teeth   ? `Cyl. ${cyl.teeth}T`                              : null,
    cyl.across && cyl.around ? `Layout ${cyl.across}×${cyl.around}` : null,
  ].filter(Boolean).join(' · ')

  // ── Company info from settings ──
  const coName    = companySettings.company_name || 'CHROMAPRINT'
  const coTagline = companySettings.tagline      || 'India Private Limited'
  const coPhone   = companySettings.phone        || '+91-422-2642738'
  const coEmail   = companySettings.email        || 'sales@chromaprintindia.com'
  const coWebsite = companySettings.website      || ''
  const coGst     = companySettings.gst_number   || ''
  const coAddrParts = [
    companySettings.address,
    companySettings.location,
    companySettings.state,
    companySettings.country,
  ].filter(Boolean)
  const coAddr = coAddrParts.length ? coAddrParts.join(', ') : 'Coimbatore – 641 022, India'
  const coMetaLines = [coAddr, [coPhone, coEmail].filter(Boolean).join(' | ')].filter(Boolean)
  if (coGst) coMetaLines.push(`GSTIN: ${coGst}`)
  const coLogo = companySettings.logo_url || ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${invNo}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a2e;background:#f0f2f5;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.print-bar{position:fixed;top:14px;right:18px;display:flex;gap:8px;z-index:99}
.btn-print{background:#1abcab;color:#fff;border:none;border-radius:6px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}
.btn-print:hover{background:#14a093}
.btn-close{background:#e2e8f0;color:#475569;border:none;border-radius:6px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}
.btn-close:hover{background:#cbd5e1}

/* ─── Invoice card ─── */
.invoice{
  width:760px;
  margin:28px auto;
  background:#fff;
  border-radius:6px;
  box-shadow:0 4px 30px rgba(0,0,0,0.14);
  overflow:hidden;
}

/* ─── Header ─── */
.inv-header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  padding:32px 36px 26px;
  gap:20px;
}
.co-name{
  font-size:24px;font-weight:900;
  color:#1abcab;letter-spacing:-0.02em;line-height:1;
}
.co-sub{
  font-size:9px;font-weight:700;
  letter-spacing:0.12em;text-transform:uppercase;
  color:#94a3b8;margin-top:3px;
}
.co-meta{
  font-size:10px;color:#64748b;
  margin-top:10px;line-height:1.8;
}

/* Right block — all right-aligned */
.hdr-right{
  text-align:right;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:0;
}
.doc-type{
  font-size:30px;font-weight:900;
  color:#1e293b;letter-spacing:-0.03em;
  line-height:1;
}
.quote-num{
  font-size:13px;font-weight:700;
  color:#1abcab;
  margin-top:6px;
}
.quote-date{
  font-size:10px;color:#64748b;
  margin-top:3px;
}
.quote-valid{
  font-size:10px;color:#64748b;
  margin-top:2px;
}

/* ─── Teal divider ─── */
.divider{border:none;height:3px;background:#1abcab;margin:0 36px}
.bill-section{padding:24px 36px 20px;border-bottom:1px solid #f1f5f9}
.bill-label{font-size:8px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
.bill-name{font-size:24px;font-weight:900;color:#1e293b;line-height:1;margin-bottom:4px}
.bill-detail{font-size:10.5px;color:#64748b;line-height:1.8}
.order-ref{margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;font-size:10px;color:#64748b;line-height:1.8}
.items-wrap{padding:0 36px}
table.items{width:100%;border-collapse:collapse;margin:20px 0 0}
table.items thead tr{background:#1e293b}
table.items thead th{padding:11px 14px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fff;text-align:left}
table.items thead th:not(:first-child){text-align:right}
table.items tbody tr:nth-child(even){background:#f8fafc}
table.items tbody td{padding:14px 14px;font-size:11px;vertical-align:top;border-bottom:1px solid #f1f5f9}
table.items tbody td:not(:first-child){text-align:right;font-weight:600}
.item-main{font-weight:700;color:#1e293b;font-size:12px;margin-bottom:4px}
.item-sub{font-size:10px;color:#94a3b8;line-height:1.5}
.totals-wrap{display:flex;justify-content:flex-end;padding:16px 36px 0}
.totals-table{width:300px}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:11.5px}
.tot-row:last-child{border-bottom:none}
.tot-lbl{color:#64748b}
.tot-val{font-weight:700;color:#1e293b}
.tot-final{background:#1e293b;border-radius:8px;padding:14px 16px !important;margin-top:10px;border:none !important}
.tot-final .tot-lbl{color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:0.04em}
.tot-final .tot-val{color:#fff;font-size:16px;font-weight:900;font-family:Arial,sans-serif}
.tot-usd{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 16px !important;margin-top:8px;border-bottom:1px solid #bfdbfe !important}
.tot-usd .tot-lbl{color:#2563eb;font-weight:700}
.tot-usd .tot-val{color:#1d4ed8;font-size:14px;font-weight:900}
.gst-note{font-size:9px;color:#94a3b8;margin-top:6px;text-align:right}
.inv-footer{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:18px 36px 22px;margin-top:24px;background:#f8fafc;border-top:1px solid #e2e8f0}
.footer-terms{font-size:9.5px;color:#64748b;line-height:1.8}
.footer-terms strong{color:#475569}
.footer-contact{text-align:right;font-size:9.5px;color:#64748b;line-height:1.8}
.footer-contact strong{color:#1abcab;display:block;font-size:10px;margin-bottom:2px}
@media print{body{background:#fff}.invoice{margin:0;box-shadow:none;border-radius:0}.print-bar{display:none}}
</style>
</head>
<body>
<div class="print-bar">
  <button class="btn-print" onclick="window.print()">&#128424;&nbsp; Print / Save PDF</button>
  <button class="btn-close" onclick="window.close()">&#10005; Close</button>
</div>
<div class="invoice">
  <div class="inv-header">
    <div>
      ${coLogo ? `<img src="${coLogo}" alt="${coName}" class="co-logo">` : ''}
      <div class="co-name">${coName}</div>
      ${coTagline ? `<div class="co-sub">${coTagline}</div>` : ''}
      <div class="co-meta">
        ${coMetaLines.join('<br>')}
      </div>
    </div>
    <div class="hdr-right">
      <div class="doc-type">INVOICE</div>
      <div class="doc-num"># ${invNo}</div>
      <div class="doc-date">Date: ${dateStr}</div>
      <div class="doc-valid">Valid: 30 days from issue</div>
    </div>
  </div>
  <hr class="divider">
  <div class="bill-section">
    <div class="bill-label">Bill To</div>
    <div class="bill-name">${client.name || '—'}</div>
    <div class="bill-detail">
      ${[client.location, client.email, client.phone].filter(Boolean).join('<br>')}
    </div>
    ${order.label || order.order_id ? `
    <div class="order-ref">
      ${order.label    ? `<strong>Order:</strong> ${order.label}<br>` : ''}
      ${order.order_id ? `<strong>Ref:</strong>&nbsp; ${order.order_id}` : ''}
    </div>` : ''}
  </div>
  <div class="items-wrap">
    <table class="items">
      <thead>
        <tr>
          <th style="width:50%">Item</th><th>Qty</th><th>Rate</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-main">Pressure Sensitive Labels</div>
            ${subLine ? `<div class="item-sub">${subLine}</div>` : ''}
          </td>
          <td>${qty > 0 ? qty.toLocaleString('en-IN') + ' labels' : '—'}</td>
          <td>&#8377;&nbsp;${ratePerLabel.toFixed(4)}&nbsp;/ label</td>
          <td>&#8377;&nbsp;${ind(subtotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="totals-wrap">
    <div class="totals-table">
      <div class="tot-row">
        <span class="tot-lbl">Subtotal</span>
        <span class="tot-val">&#8377;&nbsp;${ind(subtotal)}</span>
      </div>
      ${hasTax ? `
      <div class="tot-row">
        <span class="tot-lbl">CGST @ ${cgstPct}%</span>
        <span class="tot-val">&#8377;&nbsp;${ind(cgstAmt)}</span>
      </div>
      <div class="tot-row">
        <span class="tot-lbl">SGST @ ${sgstPct}%</span>
        <span class="tot-val">&#8377;&nbsp;${ind(sgstAmt)}</span>
      </div>
      ` : `
      <div class="tot-row">
        <span class="tot-lbl">GST</span>
        <span class="tot-val" style="color:#94a3b8;font-weight:500">As applicable</span>
      </div>
      `}
      <div class="tot-row tot-final">
        <span class="tot-lbl">TOTAL (INR)</span>
        <span class="tot-val">&#8377;&nbsp;${ind(totalInr)}</span>
      </div>
      ${totalUsd > 0 ? `
      <div class="tot-row tot-usd">
        <span class="tot-lbl">Total (USD)</span>
        <span class="tot-val">$&nbsp;${Number(totalUsd).toFixed(2)}</span>
      </div>` : ''}
      ${!hasTax ? `<p class="gst-note">* GST will be charged as applicable</p>` : ''}
    </div>
  </div>
  <div class="inv-footer">
    <div class="footer-terms">
      <strong>Terms &amp; Conditions</strong><br>
      Valid 30 days &nbsp;&middot;&nbsp; GST applicable as per government norms &nbsp;&middot;&nbsp;
      50% advance required before production<br>
      Subject to substrate availability &nbsp;&middot;&nbsp; Prices subject to change without notice
    </div>
    <div class="footer-contact">
      <strong>${coName}</strong>
      ${[coEmail, coPhone, coWebsite].filter(Boolean).join('<br>')}
    </div>
  </div>
</div>
</body>
</html>`

  return html
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 1 — Client-facing Invoice
// NEVER show internal data: substrate cost, yield, waste, markup tiers, costs.
// ─────────────────────────────────────────────────────────────────────────────
export function generateInvoicePDF(payload, companySettings = {}) {
  openWindow(buildPDFHtml(payload, companySettings))
}

export function generatePDF(payload, companySettings = {}) {
  openWindow(buildPDFHtml(payload, companySettings))
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT 2 — Internal Quotation Comparison
// FOR MANAGER REVIEW ONLY — includes substrate cost, yield, both cylinders.
// ─────────────────────────────────────────────────────────────────────────────
export function generateQuotationPDF(
  { client = {}, order = {}, inputs = {}, result = {}, preparedBy = '' },
  companySettings = {}
) {
  const today     = new Date()
  const year      = today.getFullYear()
  const quoteNo   = `QT-${year}-${Math.floor(1000 + Math.random() * 9000)}`
  const dateStr   = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const validDate = new Date(today.getTime() + 30 * 24 * 3600 * 1000)
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const coName  = (companySettings.company_name || 'CHROMAPRINT').toUpperCase()
  const coAddr  = [companySettings.address, companySettings.location, companySettings.state]
    .filter(Boolean).join(', ') || 'Coimbatore – 641 022, India'
  const coPhone = companySettings.phone || '+91-422-2642738'
  const coEmail = companySettings.email || 'sales@chromaprintindia.com'
  const coGst   = companySettings.gst_number || ''

  const rows    = result.rows    || []
  const matched = result.matched || {}
  const mRow    = rows[matched.index]            || {}
  const bRow    = rows[matched.best_paper_index] || {}
  const isSame  = matched.index === matched.best_paper_index

  const exch = Number(inputs.exchange_rate) || 85
  const qty  = Number(inputs.order_qty)     || 0

  const mP = computeRow(mRow, inputs)
  const bP = isSame ? mP : computeRow(bRow, inputs)

  // ── Cylinder detail rows ──
  function cylRows(row, p) {
    const f = (v, d) => (v != null && !isNaN(v) ? Number(v).toFixed(d ?? 2) : '—')
    return `
      <div class="cr"><span class="cl">Teeth</span><span class="cv">${row.teeth ?? '—'}</span></div>
      <div class="cr"><span class="cl">Circumference</span><span class="cv">${row.circumference ? f(row.circumference, 1) + ' mm' : '—'}</span></div>
      <div class="cr"><span class="cl">Actual Label Size</span><span class="cv">${row.label_width ? f(row.label_width) + ' \xd7 ' + f(row.label_height) + ' mm' : '—'}</span></div>
      <div class="cr"><span class="cl">Around \xd7 Across</span><span class="cv">${row.around && row.across ? row.around + ' \xd7 ' + row.across : '—'}</span></div>
      <div class="cr"><span class="cl">Labels / Repeat</span><span class="cv fv">${row.around && row.across ? row.around * row.across : '—'}</span></div>
      <div class="cr"><span class="cl">Paper Size</span><span class="cv">${row.paper_size ? f(row.paper_size, 0) + ' mm' : '—'}</span></div>
      <div class="cr"><span class="cl">Labels / m\xb2</span><span class="cv">${p.labels_sqm ? f(p.labels_sqm) : '—'}</span></div>
      <div class="cr"><span class="cl">Adj. Labels / m\xb2</span><span class="cv">${p.adj_labels ? f(p.adj_labels) : '—'}</span></div>
      <div class="cr"><span class="cl">Prod. Cost / 1000 (&#8377;)</span><span class="cv">&#8377; ${ind(p.rate_2)}</span></div>
      <div class="cr last"><span class="cl">Prod. Cost / label (&#8377;)</span><span class="cv fv">&#8377; ${f(p.price_inr_label, 4)}</span></div>`
  }

  const cylCompHtml = isSame ? `
    <div class="same-note">&#9733; Best Size Match and Best Yield are the same cylinder — ${mRow.teeth ?? '?'} teeth</div>
    <div class="cmp-single">
      <div class="cmp-col">
        <div class="cmp-head cmp-head--match">&#9733; BEST SIZE MATCH = &#9650; BEST YIELD (${mRow.teeth ?? '?'} teeth)</div>
        <div class="cmp-body">${cylRows(mRow, mP)}</div>
      </div>
    </div>` : `
    <div class="cmp-grid">
      <div class="cmp-col">
        <div class="cmp-head cmp-head--match">&#9733; BEST SIZE MATCH (${mRow.teeth ?? '?'} teeth)</div>
        <div class="cmp-body">${cylRows(mRow, mP)}</div>
      </div>
      <div class="cmp-col">
        <div class="cmp-head cmp-head--yield">&#9650; BEST YIELD (${bRow.teeth ?? '?'} teeth)</div>
        <div class="cmp-body">${cylRows(bRow, bP)}</div>
      </div>
    </div>`

  // ── Rate tier table for one cylinder ──
  function rateTbl(p, title, color) {
    const tiers = [
      { label: '1 : 1.5',  rate: p.rate_15,  rec: false },
      { label: '1 : 1.75', rate: p.rate_175, rec: false },
      { label: '1 : 2',    rate: p.rate_2,   rec: true  },
    ]
    return `
    <div class="rate-col">
      <div class="rate-col-head" style="background:${color}">${title}</div>
      <table class="rate-tbl">
        <thead>
          <tr>
            <th>Tier</th><th>&#8377; / 1000</th><th>$ / 1000</th><th>&#8377; / label</th><th>$ / label</th>
          </tr>
        </thead>
        <tbody>
          ${tiers.map(t => `
          <tr class="${t.rec ? 'rate-rec' : ''}">
            <td>${t.label}${t.rec ? ' <span class="rec-tag">&#9733; REC.</span>' : ''}</td>
            <td>&#8377; ${ind(t.rate)}</td>
            <td>$ ${Number(exch > 0 ? t.rate / exch : 0).toFixed(2)}</td>
            <td>&#8377; ${Number(t.rate / 1000).toFixed(4)}</td>
            <td>$ ${Number(exch > 0 ? t.rate / exch / 1000 : 0).toFixed(5)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
  }

  const rateTiersHtml = isSame
    ? `<div class="rate-single">${rateTbl(mP, `&#9733; BEST SIZE MATCH = &#9650; BEST YIELD (${mRow.teeth ?? '?'} teeth)`, '#1abcab')}</div>`
    : `<div class="rate-grid-2">
        ${rateTbl(mP, `&#9733; BEST SIZE MATCH (${mRow.teeth ?? '?'} teeth)`, '#1abcab')}
        ${rateTbl(bP, `&#9650; BEST YIELD (${bRow.teeth ?? '?'} teeth)`, '#f59e0b')}
       </div>`

  // ── Order analytics ──
  let analyticsHtml = ''
  if (qty > 0) {
    const mSqm     = mP.adj_labels > 0 ? qty / mP.adj_labels : 0
    const mMeters  = mRow.paper_size  > 0 ? mSqm / (mRow.paper_size  / 1000) : 0
    const mTotalInr = qty * mP.price_inr_label
    const mTotalUsd = qty * mP.price_usd_label

    const bSqm     = bP.adj_labels > 0 ? qty / bP.adj_labels : 0
    const bMeters  = bRow.paper_size  > 0 ? bSqm / (bRow.paper_size  / 1000) : 0
    const bTotalInr = qty * bP.price_inr_label
    const bTotalUsd = qty * bP.price_usd_label

    const mCheaper = mTotalInr <= bTotalInr
    const savings   = Math.abs(mTotalInr - bTotalInr)
    const savingNote = (!isSame && savings > 0.01)
      ? `<div class="savings-note">${mCheaper ? '&#9733; Best Size Match' : '&#9650; Best Yield'} saves &#8377; ${ind(savings, 0)} total vs ${mCheaper ? '&#9650; Best Yield' : '&#9733; Best Size Match'}</div>`
      : ''

    analyticsHtml = `
    <div class="section">
      <div class="sec-title">Order Analytics — ${qty.toLocaleString('en-IN')} Labels</div>
      ${isSame ? `
      <div class="analytics-single">
        <table class="oa-tbl">
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Substrate Area</td><td>${ind(mSqm)} m\xb2</td></tr>
            <tr><td>Linear Meters</td><td>${ind(mMeters)} m</td></tr>
            <tr><td>Total Cost (INR)</td><td>&#8377; ${ind(mTotalInr, 0)}</td></tr>
            <tr><td>Total Cost (USD)</td><td>$ ${Number(mTotalUsd).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>` : `
      <div class="oa-grid">
        <div class="oa-col oa-match">
          <div class="oa-col-head">&#9733; Best Size Match (${mRow.teeth} teeth)</div>
          <div class="oa-row"><span>Substrate Area</span><span>${ind(mSqm)} m\xb2</span></div>
          <div class="oa-row"><span>Linear Meters</span><span>${ind(mMeters)} m</span></div>
          <div class="oa-row oa-hl"><span>Total Cost (INR)</span><span>&#8377; ${ind(mTotalInr, 0)}</span></div>
          <div class="oa-row"><span>Total Cost (USD)</span><span>$ ${Number(mTotalUsd).toFixed(2)}</span></div>
        </div>
        <div class="oa-col oa-yield">
          <div class="oa-col-head">&#9650; Best Yield (${bRow.teeth} teeth)</div>
          <div class="oa-row"><span>Substrate Area</span><span>${ind(bSqm)} m\xb2</span></div>
          <div class="oa-row"><span>Linear Meters</span><span>${ind(bMeters)} m</span></div>
          <div class="oa-row oa-hl"><span>Total Cost (INR)</span><span>&#8377; ${ind(bTotalInr, 0)}</span></div>
          <div class="oa-row"><span>Total Cost (USD)</span><span>$ ${Number(bTotalUsd).toFixed(2)}</span></div>
        </div>
      </div>
      ${savingNote}`}
    </div>`
  }

  // ── Recommendation ──
  const mIsBetter = isSame || mP.price_inr_label <= bP.price_inr_label
  const recValue  = isSame
    ? `&#9733; Best Size Match = &#9650; Best Yield (same cylinder — ${mRow.teeth ?? '?'} teeth)`
    : (mIsBetter
        ? `&#9733; Best Size Match (${mRow.teeth ?? '?'} teeth) — lowest total cost for this order`
        : `&#9650; Best Yield (${bRow.teeth ?? '?'} teeth) — lowest total cost for this order`)
  const recNote   = isSame
    ? 'Both options are identical for this label size.'
    : (mIsBetter
        ? `Best Yield (${bRow.teeth ?? '?'} teeth) gives more labels per repeat but costs more per label.`
        : `Best Size Match (${mRow.teeth ?? '?'} teeth) is closest to the requested dimensions.`)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${quoteNo} — Internal Quotation</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a2e;background:#f0f2f5;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.print-bar{position:fixed;top:14px;right:18px;display:flex;gap:8px;z-index:99}
.btn-print{background:#1abcab;color:#fff;border:none;border-radius:6px;padding:9px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}
.btn-print:hover{background:#14a093}
.btn-close{background:#e2e8f0;color:#475569;border:none;border-radius:6px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}
.btn-close:hover{background:#cbd5e1}
.doc{width:820px;margin:28px auto;background:#fff;border-radius:6px;box-shadow:0 4px 30px rgba(0,0,0,.14);overflow:hidden}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:30px 36px 24px;gap:20px}
.co-name{font-size:22px;font-weight:900;color:#1abcab;letter-spacing:-.02em;line-height:1}
.co-sub{font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin-top:3px}
.co-meta{font-size:10px;color:#64748b;margin-top:8px;line-height:1.8}
.co-gst{font-size:9px;color:#94a3b8;margin-top:2px}
.hdr-right{text-align:right;display:flex;flex-direction:column;align-items:flex-end}
.doc-type{font-size:28px;font-weight:900;color:#1e293b;letter-spacing:-.03em;line-height:1}
.int-badge{display:inline-block;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;
  font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
  border-radius:4px;padding:2px 8px;margin-top:6px}
.doc-num{font-size:13px;font-weight:700;color:#1abcab;margin-top:5px}
.doc-meta{font-size:10px;color:#64748b;margin-top:3px;line-height:1.7}
.divider{border:none;height:3px;background:#1abcab;margin:0 36px}
.meta-section{display:flex;border-bottom:1px solid #f1f5f9}
.meta-col{flex:1;padding:18px 36px 16px}
.meta-col+.meta-col{border-left:1px solid #f1f5f9}
.meta-head{font-size:7.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px}
.client-name{font-size:15px;font-weight:800;color:#1e293b;margin-bottom:3px}
.client-detail{font-size:10px;color:#64748b;line-height:1.7}
.order-ref{margin-top:7px;padding-top:7px;border-top:1px dashed #e2e8f0;font-size:10px;color:#64748b;line-height:1.7}
.qd-row{display:flex;justify-content:space-between;font-size:10.5px;padding:4px 0;border-bottom:1px solid #f8fafc}
.qd-row:last-child{border-bottom:none}
.qd-lbl{color:#94a3b8}
.qd-val{font-weight:700;color:#1e293b}
.section{padding:18px 36px}
.section+.section{border-top:1px solid #f1f5f9}
.sec-title{font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:#64748b;margin-bottom:13px;display:flex;align-items:center;gap:8px}
.sec-title::before{content:'';display:block;width:3px;height:12px;background:#1abcab;border-radius:2px;flex-shrink:0}
.spec-tbl{width:100%;border-collapse:collapse}
.spec-tbl td{padding:6px 10px;font-size:11px;border:1px solid #f1f5f9}
.s-lbl{background:#f8fafc;color:#64748b;font-weight:600;width:17%}
.s-val{color:#1e293b;font-weight:700;width:16%}
.same-note{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:9px 14px;font-size:11px;color:#166534;font-weight:600;margin-bottom:12px}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cmp-single .cmp-col{max-width:480px}
.cmp-col{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.cmp-head{padding:10px 14px;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff}
.cmp-head--match{background:#1abcab}
.cmp-head--yield{background:#f59e0b}
.cmp-body{padding:8px 12px}
.cr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f8fafc;font-size:11px}
.cr.last{border-bottom:none}
.cl{color:#64748b}
.cv{font-weight:700;color:#1e293b}
.fv{color:#1abcab}
.rate-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rate-single .rate-col{max-width:500px}
.rate-col{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.rate-col-head{padding:9px 14px;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff}
.rate-tbl{width:100%;border-collapse:collapse}
.rate-tbl th{padding:7px 10px;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  background:#f8fafc;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0}
.rate-tbl th:first-child{text-align:left}
.rate-tbl td{padding:7px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;text-align:right;color:#1e293b;font-weight:600}
.rate-tbl td:first-child{text-align:left;color:#64748b;font-weight:500}
.rate-tbl tr:last-child td{border-bottom:none}
.rate-rec{background:#f0fdfa}
.rate-rec td,.rate-rec td:first-child{color:#0d9488 !important;font-weight:700 !important}
.rec-tag{font-size:8px;font-weight:800;background:#ccfbf1;color:#0d9488;border-radius:3px;padding:1px 5px;letter-spacing:.04em;margin-left:3px}
.oa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.oa-col{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.oa-col-head{padding:9px 14px;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff}
.oa-match .oa-col-head{background:#1abcab}
.oa-yield .oa-col-head{background:#f59e0b}
.oa-row{display:flex;justify-content:space-between;padding:7px 14px;font-size:11px;border-bottom:1px solid #f1f5f9}
.oa-row:last-child{border-bottom:none}
.oa-row span:first-child{color:#64748b}
.oa-row span:last-child{font-weight:700;color:#1e293b}
.oa-hl span:last-child{color:#1abcab !important}
.analytics-single{max-width:420px}
.oa-tbl{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.oa-tbl th{background:#1e293b;color:#fff;padding:8px 12px;font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:left}
.oa-tbl td{padding:7px 12px;font-size:11.5px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b}
.oa-tbl td:first-child{color:#64748b;font-weight:400}
.oa-tbl tr:last-child td{border-bottom:none}
.savings-note{margin-top:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:9px 14px;font-size:11px;color:#166534;font-weight:600}
.rec-box{margin:0 36px 20px;background:#0f172a;border-radius:8px;padding:16px 20px;display:flex;align-items:flex-start;gap:14px}
.rec-star{font-size:20px;line-height:1;flex-shrink:0;margin-top:3px}
.rec-label{font-size:8.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
.rec-value{font-size:13px;font-weight:800;color:#1abcab;margin-top:3px;line-height:1.4}
.rec-note{font-size:10px;color:#64748b;margin-top:4px}
.doc-footer{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:16px 36px 22px;background:#f8fafc;border-top:1px solid #e2e8f0}
.footer-left{font-size:9.5px;color:#64748b;line-height:1.8}
.footer-left strong{color:#475569}
.int-label{display:inline-block;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;
  font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
  border-radius:4px;padding:2px 7px;margin-bottom:4px}
.footer-right{text-align:right;font-size:9.5px;color:#64748b;line-height:1.8}
.footer-right strong{color:#1abcab;display:block;font-size:10px;margin-bottom:2px}
.sig-line{margin-top:22px;border-top:1px dashed #cbd5e1;padding-top:5px;font-size:9px;color:#94a3b8;text-align:center}
@media print{body{background:#fff}.doc{margin:0;box-shadow:none;border-radius:0}.print-bar{display:none}}
</style>
</head>
<body>
<div class="print-bar">
  <button class="btn-print" onclick="window.print()">&#128424;&nbsp; Print / Save PDF</button>
  <button class="btn-close" onclick="window.close()">&#10005; Close</button>
</div>
<div class="doc">

  <!-- Header -->
  <div class="hdr">
    <div>
      <div class="co-name">${coName}</div>
      <div class="co-sub">Label Printing &amp; Packaging</div>
      <div class="co-meta">${coAddr}<br>${coPhone} &nbsp;|&nbsp; ${coEmail}</div>
      ${coGst ? `<div class="co-gst">GSTIN: ${coGst}</div>` : ''}
    </div>
    <div class="hdr-right">
      <div class="doc-type">QUOTATION</div>
      <div class="int-badge">INTERNAL — NOT FOR CLIENT</div>
      <div class="doc-num"># ${quoteNo}</div>
      <div class="doc-meta">Date: ${dateStr}<br>Valid Until: ${validDate}</div>
    </div>
  </div>

  <hr class="divider">

  <!-- Bill To + Quote Details -->
  <div class="meta-section">
    <div class="meta-col">
      <div class="meta-head">Bill To</div>
      <div class="client-name">${client.name || 'N/A'}</div>
      ${client.location ? `<div class="client-detail">${client.location}</div>` : ''}
      ${client.email ? `<div class="client-detail">&#9993; ${client.email}</div>` : ''}
      ${client.phone ? `<div class="client-detail">&#128222; ${client.phone}</div>` : ''}
      ${order.label || order.order_id || order.ref ? `
      <div class="order-ref">
        ${order.label    ? `<strong>Order:</strong> ${order.label}<br>` : ''}
        ${order.order_id ? `<strong>Ref:</strong> ${order.order_id}<br>` : ''}
        ${order.ref      ? `<strong>Version:</strong> ${order.ref}` : ''}
      </div>` : ''}
    </div>
    <div class="meta-col">
      <div class="meta-head">Quote Details</div>
      <div class="qd-row"><span class="qd-lbl">Quote No.</span><span class="qd-val">${quoteNo}</span></div>
      <div class="qd-row"><span class="qd-lbl">Date Issued</span><span class="qd-val">${dateStr}</span></div>
      <div class="qd-row"><span class="qd-lbl">Valid Until</span><span class="qd-val">${validDate}</span></div>
      ${preparedBy ? `<div class="qd-row"><span class="qd-lbl">Prepared By</span><span class="qd-val">${preparedBy}</span></div>` : ''}
    </div>
  </div>

  <!-- Input Specification -->
  <div class="section">
    <div class="sec-title">Input Specification</div>
    <table class="spec-tbl">
      <tbody>
        <tr>
          <td class="s-lbl">Label Width</td><td class="s-val">${Number(inputs.label_width_mm || 0).toFixed(1)} mm</td>
          <td class="s-lbl">Label Height</td><td class="s-val">${Number(inputs.label_height_mm || 0).toFixed(1)} mm</td>
          <td class="s-lbl">Yield %</td><td class="s-val">${inputs.yield_pct || 85}%</td>
        </tr>
        <tr>
          <td class="s-lbl">Substrate</td><td class="s-val">${inputs.substrate_name || 'Custom'}</td>
          <td class="s-lbl">Substrate Cost</td><td class="s-val">&#8377; ${Number(inputs.substrate_price || 0).toFixed(2)} / m\xb2</td>
          <td class="s-lbl">Exchange Rate</td><td class="s-val">&#8377; ${Number(inputs.exchange_rate || 85).toFixed(0)} / $</td>
        </tr>
        <tr>
          <td class="s-lbl">Foil Cost</td><td class="s-val">&#8377; ${Number(inputs.foil_cost || 0).toFixed(2)} / m\xb2</td>
          <td class="s-lbl">Custom Cost</td><td class="s-val">&#8377; ${Number(inputs.custom_cost || 0).toFixed(3)} / label</td>
          <td class="s-lbl">Order Qty</td><td class="s-val">${qty > 0 ? qty.toLocaleString('en-IN') + ' labels' : 'N/A'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Cylinder Comparison -->
  <div class="section">
    <div class="sec-title">Cylinder Comparison</div>
    ${cylCompHtml}
  </div>

  <!-- Rate Tier Pricing -->
  <div class="section">
    <div class="sec-title">Rate Tier Pricing (1:1.5 &nbsp;|&nbsp; 1:1.75 &nbsp;|&nbsp; 1:2)</div>
    ${rateTiersHtml}
  </div>

  <!-- Order Analytics (only if qty provided) -->
  ${analyticsHtml}

  <!-- Recommendation -->
  <div class="rec-box">
    <div class="rec-star">&#9733;</div>
    <div>
      <div class="rec-label">Recommendation</div>
      <div class="rec-value">${recValue}</div>
      <div class="rec-note">${recNote}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <div class="footer-left">
      <div class="int-label">Internal Document</div>
      <strong>Terms &amp; Conditions</strong><br>
      Valid 30 days from issue &nbsp;&middot;&nbsp; GST applicable as per government norms<br>
      50% advance required before production &nbsp;&middot;&nbsp; Subject to substrate availability<br>
      Prices subject to change without notice &nbsp;&middot;&nbsp; Generated: ${dateStr}
    </div>
    <div class="footer-right">
      <strong>${coName}</strong>
      ${coEmail}<br>
      ${coPhone}
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

</div>
</body>
</html>`

  openWindow(html)
}
