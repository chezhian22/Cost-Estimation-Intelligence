import React, { useEffect, useRef, useState } from 'react'
import './PDFPreview.css'
<<<<<<< HEAD
import { generateInvoicePDF } from '../../../utils/generatePDF'
=======
import { buildPDFHtml, generatePDF } from '../../../utils/generatePDF'
import { api } from '../../../api'
>>>>>>> 2e4c72e5189ae91d8f0ec97f1f4410a1690df393

const SAMPLE = {
  client: {
    name:     'Kingfisher Breweries Ltd.',
    location: 'Bengaluru, Karnataka, India',
    email:    'procurement@kingfisher.com',
    phone:    '+91-80-2345-6789',
  },
  order: {
    order_id: 'CALC-108',
    label:    'KF-2026-Premium-Label',
  },
  inputs: {
    label_width_mm:  64.5,
    label_height_mm: 136.0,
    substrate:       'BOPP Gloss 40µ',
    total_qty:       100000,
  },
  approved_cylinder: {
    teeth:  336,
    around: 1,
    across: 5,
  },
  pricing: {
    selling_price_per_label: 1.1566,
    total_cost_inr:          115658,
    total_cost_usd:          1360.68,
  },
}

export default function PDFPreview() {
  const [companySettings, setCompanySettings] = useState({})
  const iframeRef = useRef(null)

  useEffect(() => {
    api.getCompanySettings().then(setCompanySettings).catch(() => {})
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const html = buildPDFHtml(SAMPLE, companySettings)
    // Strip the print-bar buttons so the preview is clean
    const previewHtml = html.replace(/<div class="print-bar">[\s\S]*?<\/div>/, '')
    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(previewHtml)
    doc.close()
    // Fit iframe height to its content once rendered
    const resize = () => {
      try {
        iframe.style.height = doc.documentElement.scrollHeight + 'px'
      } catch (_) {}
    }
    iframe.onload = resize
    setTimeout(resize, 120)
  }, [companySettings])

  return (
    <div className="pp-page">
      <div className="pp-page-header">
        <div>
          <h1 className="pp-title">PDF Quote Preview</h1>
          <p className="pp-sub">Sample client quotation — no internal cost details shown</p>
        </div>
        <button className="pp-btn-generate" onClick={() => generatePDF(SAMPLE, companySettings)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Generate Sample PDF
        </button>
      </div>

      <div className="pp-iframe-wrap">
        <iframe
          ref={iframeRef}
          className="pp-iframe"
          title="PDF Preview"
          scrolling="no"
        />
      </div>
    </div>
  )
}
