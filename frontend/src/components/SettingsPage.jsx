import React, { useEffect, useState } from 'react'
import { api } from '../api'

const NAV = ['Backspace','Delete','Tab','Enter','Escape','ArrowLeft','ArrowRight','Home','End']

const RESTRICT = {
  // digits, +, -, space  — phone numbers
  phone: {
    key:   (e) => { if (NAV.includes(e.key) || e.ctrlKey || e.metaKey) return; if (/[0-9+\- ]/.test(e.key)) return; e.preventDefault() },
    paste: (e) => { if (!/^[0-9+\- ]*$/.test(e.clipboardData.getData('text'))) e.preventDefault() },
  },
  // letters, spaces, hyphens, dots, apostrophes — city / state / country
  alpha: {
    key:   (e) => { if (NAV.includes(e.key) || e.ctrlKey || e.metaKey) return; if (/[a-zA-Z '.,-]/.test(e.key)) return; e.preventDefault() },
    paste: (e) => { if (!/^[a-zA-Z '.,-]*$/.test(e.clipboardData.getData('text'))) e.preventDefault() },
  },
  // alphanumeric only — GST number (auto-uppercased on change)
  gst: {
    key:   (e) => { if (NAV.includes(e.key) || e.ctrlKey || e.metaKey) return; if (/[a-zA-Z0-9]/.test(e.key)) return; e.preventDefault() },
    paste: (e) => { if (!/^[a-zA-Z0-9]*$/.test(e.clipboardData.getData('text'))) e.preventDefault() },
  },
  // digits + decimal only — percentage fields
  percent: {
    key:   (e) => { if (NAV.includes(e.key) || e.ctrlKey || e.metaKey) return; if (/[0-9.]/.test(e.key)) return; e.preventDefault() },
    paste: (e) => { if (!/^\d*\.?\d*$/.test(e.clipboardData.getData('text'))) e.preventDefault() },
  },
}

const FIELDS = [
  {
    section: 'Company Identity',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
    rows: [
      { key: 'company_name', label: 'Company Name', placeholder: 'Chromaprint India',         required: true, maxLength: 100 },
      { key: 'tagline',      label: 'Tagline',       placeholder: 'Quality Labels & Packaging',               maxLength: 150 },
      { key: 'industry',     label: 'Industry',      placeholder: 'Label Printing & Packaging',               maxLength: 100 },
    ],
  },
  {
    section: 'Contact Details',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.62 16.92z"/>
      </svg>
    ),
    rows: [
      { key: 'email',   label: 'Email Address', placeholder: 'sales@chromaprintindia.com', type: 'email', maxLength: 200 },
      { key: 'phone',   label: 'Phone Number',  placeholder: '+91 422 264 2738', restrict: 'phone', maxLength: 15 },
      { key: 'website', label: 'Website',        placeholder: 'https://chromaprintindia.com', type: 'url', maxLength: 300 },
    ],
  },
  {
    section: 'Location',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    rows: [
      { key: 'address',  label: 'Street Address', placeholder: 'SF No. 215/2, Mettupalayam Road', wide: true, maxLength: 200 },
      { key: 'location', label: 'City',  placeholder: 'Coimbatore', restrict: 'alpha', maxLength: 100 },
      { key: 'state',    label: 'State', placeholder: 'Tamil Nadu',  restrict: 'alpha', maxLength: 100 },
      { key: 'country',  label: 'Country', placeholder: 'India',     restrict: 'alpha', maxLength: 100 },
    ],
  },
  {
    section: 'Business Details',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    rows: [
      { key: 'gst_number', label: 'GST Number', placeholder: '33AAACB0000A1Z5', restrict: 'gst', maxLength: 15 },
      { key: 'cgst_pct',   label: 'CGST %', placeholder: 'e.g. 9', type: 'number', min: 0, max: 100, step: 'any', restrict: 'percent' },
      { key: 'sgst_pct',   label: 'SGST %', placeholder: 'e.g. 9', type: 'number', min: 0, max: 100, step: 'any', restrict: 'percent' },
    ],
    hint: 'CGST + SGST = Total GST. Set by admin as per applicable tax rate.',
  },
]

export default function SettingsPage() {
  const [form, setForm]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [saved, setSaved]           = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]   = useState(null)

  useEffect(() => {
    api.getCompanySettings()
      .then(data => { setForm(data); setLogoPreview(data.logo || null); setLoading(false) })
      .catch(e  => { setError(e.message); setLoading(false) })
  }, [])

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    setLogoUploading(true)
    try {
      const updated = await api.uploadCompanyLogo(file)
      setLogoPreview(updated.logo)
      setForm(prev => ({ ...prev, logo: updated.logo }))
    } catch (err) {
      setLogoError(err.message)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  async function handleLogoRemove() {
    setLogoError(null)
    setLogoUploading(true)
    try {
      await api.deleteCompanyLogo()
      setLogoPreview(null)
      setForm(prev => ({ ...prev, logo: null }))
    } catch (err) {
      setLogoError(err.message)
    } finally {
      setLogoUploading(false)
    }
  }

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name?.trim()) {
      setError('Company name is required.')
      return
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api.updateCompanySettings(form)
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="sp-page">
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '2rem 0' }}>Loading settings…</div>
      </div>
    )
  }

  return (
    <div className="sp-page">
      <div className="sp-header">
        <div>
          <h1 className="sp-title">Company Settings</h1>
          <p className="sp-sub">This information appears on PDF quotes and documents.</p>
        </div>
        <div className="sp-header-actions">
          {saved && (
            <span className="sp-saved-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Saved
            </span>
          )}
          <button className="sp-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="cop-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Saving…</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>⚠ {error}</div>
      )}

      <form className="sp-form" onSubmit={handleSave}>

        {/* ── Company Logo ── */}
        <div className="sp-section">
          <div className="sp-section-head">
            <span className="sp-section-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </span>
            Company Logo
          </div>
          <div className="sp-logo-row">
            <div className="sp-logo-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="sp-logo-img" />
              ) : (
                <div className="sp-logo-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>No logo</span>
                </div>
              )}
            </div>
            <div className="sp-logo-actions">
              <p className="sp-logo-hint">
                Upload your company logo. Recommended size: <strong>400 × 120 px</strong>, PNG or SVG with transparent background. Max 2 MB.
              </p>
              {logoError && (
                <p style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>⚠ {logoError}</p>
              )}
              <div className="sp-logo-btns">
                <label className={`sp-logo-upload-btn${logoUploading ? ' sp-logo-upload-btn--loading' : ''}`}>
                  {logoUploading ? (
                    <><span className="cop-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Uploading…</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    disabled={logoUploading}
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />
                </label>
                {logoPreview && !logoUploading && (
                  <button type="button" className="sp-logo-remove-btn" onClick={handleLogoRemove}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {FIELDS.map(({ section, icon, rows, hint }) => (
          <div key={section} className="sp-section">
            <div className="sp-section-head">
              <span className="sp-section-icon">{icon}</span>
              {section}
            </div>
            <div className="sp-grid">
              {rows.map(({ key, label, placeholder, required, type, wide, min, max, step, maxLength, restrict }) => {
                const r = restrict ? RESTRICT[restrict] : null
                return (
                <div key={key} className={`sp-field${wide ? ' sp-field--wide' : ''}`}>
                  <label className="sp-label">
                    {label}
                    {required && <span className="field-required"> *</span>}
                  </label>
                  <input
                    className="sp-input"
                    type={type || 'text'}
                    value={form[key] ?? ''}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    step={step}
                    maxLength={maxLength}
                    onKeyDown={r?.key}
                    onPaste={r?.paste}
                    onChange={e => {
                      let val = e.target.value
                      if (restrict === 'gst') val = val.toUpperCase()
                      handleChange(key, val === '' ? null : (type === 'number' ? parseFloat(val) : val))
                    }}
                  />
                </div>
                )
              })}
            </div>
            {hint && (
              <p style={{ marginTop: '0.55rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {hint}
              </p>
            )}
          </div>
        ))}
      </form>

      {form.updated_at && (
        <p className="sp-last-updated">
          Last updated: {new Date(form.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  )
}
