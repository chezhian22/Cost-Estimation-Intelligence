// Client-facing quotation PDF — Elverve invoice style.
// NEVER include internal data: substrate cost, yield, waste, markup tiers, cost breakdown.

const ind = (n, d = 2) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

export function buildPDFHtml(
  { client = {}, order = {}, inputs = {}, approved_cylinder = {}, pricing = {} },
  companySettings = {}
) {
  const today   = new Date()
  const year    = today.getFullYear()
  const quoteNo = `QT-${year}-${Math.floor(1000 + Math.random() * 9000)}`
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
  const coLogo    = companySettings.logo         || null
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${quoteNo}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:Arial,Helvetica,sans-serif;
  font-size:12px;
  color:#1a1a2e;
  background:#f0f2f5;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}

/* ─── Print bar ─── */
.print-bar{
  position:fixed;top:14px;right:18px;
  display:flex;gap:8px;z-index:99;
}
.btn-print{
  background:#1abcab;color:#fff;border:none;
  border-radius:6px;padding:9px 22px;
  font-size:13px;font-weight:700;cursor:pointer;
  font-family:Arial,sans-serif;
}
.btn-print:hover{background:#14a093}
.btn-close{
  background:#e2e8f0;color:#475569;border:none;
  border-radius:6px;padding:9px 16px;
  font-size:13px;font-weight:700;cursor:pointer;
  font-family:Arial,sans-serif;
}
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
.co-logo{
  width:72px;height:72px;
  object-fit:cover;
  display:block;margin-bottom:8px;
  border-radius:50%;
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

/* ─── Bill to ─── */
.bill-section{
  padding:24px 36px 20px;
  border-bottom:1px solid #f1f5f9;
}
.bill-label{
  font-size:8px;font-weight:800;
  letter-spacing:0.14em;text-transform:uppercase;
  color:#94a3b8;margin-bottom:8px;
}
.bill-name{
  font-size:24px;font-weight:900;
  color:#1e293b;line-height:1;margin-bottom:4px;
}
.bill-detail{font-size:10.5px;color:#64748b;line-height:1.8}
.order-ref{
  margin-top:10px;padding-top:10px;
  border-top:1px dashed #e2e8f0;
  font-size:10px;color:#64748b;line-height:1.8;
}

/* ─── Items table ─── */
.items-wrap{padding:0 36px}
table.items{
  width:100%;border-collapse:collapse;
  margin:20px 0 0;
}
table.items thead tr{background:#1e293b}
table.items thead th{
  padding:11px 14px;
  font-size:10px;font-weight:700;
  letter-spacing:0.08em;text-transform:uppercase;
  color:#fff;text-align:left;
}
table.items thead th:not(:first-child){text-align:right}
table.items tbody tr:nth-child(even){background:#f8fafc}
table.items tbody td{
  padding:14px 14px;
  font-size:11px;
  vertical-align:top;
  border-bottom:1px solid #f1f5f9;
}
table.items tbody td:not(:first-child){text-align:right;font-weight:600}
.item-main{font-weight:700;color:#1e293b;font-size:12px;margin-bottom:4px}
.item-sub{font-size:10px;color:#94a3b8;line-height:1.5}

/* ─── Totals ─── */
.totals-wrap{
  display:flex;justify-content:flex-end;
  padding:16px 36px 0;
}
.totals-table{width:300px}
.tot-row{
  display:flex;justify-content:space-between;
  align-items:center;padding:7px 0;
  border-bottom:1px solid #f1f5f9;
  font-size:11.5px;
}
.tot-row:last-child{border-bottom:none}
.tot-lbl{color:#64748b}
.tot-val{font-weight:700;color:#1e293b}
.tot-final{
  background:#1e293b;
  border-radius:8px;
  padding:14px 16px !important;
  margin-top:10px;
  border:none !important;
}
.tot-final .tot-lbl{color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:0.04em}
.tot-final .tot-val{color:#fff;font-size:16px;font-weight:900;font-family:Arial,sans-serif}
.tot-usd{
  background:#eff6ff;border:1px solid #bfdbfe;
  border-radius:6px;padding:10px 16px !important;
  margin-top:8px;border-bottom:1px solid #bfdbfe !important;
}
.tot-usd .tot-lbl{color:#2563eb;font-weight:700}
.tot-usd .tot-val{color:#1d4ed8;font-size:14px;font-weight:900}
.gst-note{
  font-size:9px;color:#94a3b8;
  margin-top:6px;text-align:right;
}

/* ─── Footer ─── */
.inv-footer{
  display:flex;justify-content:space-between;
  align-items:flex-start;gap:20px;
  padding:18px 36px 22px;
  margin-top:24px;
  background:#f8fafc;
  border-top:1px solid #e2e8f0;
}
.footer-terms{font-size:9.5px;color:#64748b;line-height:1.8}
.footer-terms strong{color:#475569}
.footer-contact{text-align:right;font-size:9.5px;color:#64748b;line-height:1.8}
.footer-contact strong{color:#1abcab;display:block;font-size:10px;margin-bottom:2px}

@media print{
  body{background:#fff}
  .invoice{margin:0;box-shadow:none;border-radius:0}
  .print-bar{display:none}
}
</style>
</head>
<body>

<div class="print-bar">
  <button class="btn-print" onclick="window.print()">&#128424;&nbsp; Print / Save PDF</button>
  <button class="btn-close" onclick="window.close()">&#10005; Close</button>
</div>

<div class="invoice">

  <!-- Header -->
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
      <div class="doc-type">QUOTATION</div>
      <div class="quote-num"># ${quoteNo}</div>
      <div class="quote-date">Date: ${dateStr}</div>
      <div class="quote-valid">Valid: 30 days from issue</div>
    </div>
  </div>

  <hr class="divider">

  <!-- Bill To -->
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

  <!-- Items -->
  <div class="items-wrap">
    <table class="items">
      <thead>
        <tr>
          <th style="width:50%">Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
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

  <!-- Totals -->
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

  <!-- Footer -->
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

export function generatePDF(payload, companySettings = {}) {
  const html = buildPDFHtml(payload, companySettings)
  const win = window.open('', '_blank')
  if (!win) { alert('Please allow pop-ups to generate the PDF quote.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
}
