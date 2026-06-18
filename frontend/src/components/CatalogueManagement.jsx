import React, { useState } from 'react'
import ManageCylinders from './ManageCylinders'
import ManageSubstrates from './ManageSubstrates'

const TABS = [
  {
    id: 'cylinders',
    label: 'Cylinders',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
  {
    id: 'substrates',
    label: 'Substrates',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M3 15h18M9 3v18"/>
      </svg>
    ),
  },
]

export default function CatalogueManagement({ isAdmin }) {
  const [activeTab, setActiveTab] = useState('cylinders')

  return (
    <div className="ctlg-page">
      {/* Page header */}
      <div className="ctlg-header">
        <div className="ctlg-header-left">
          <div className="ctlg-title">Catalogue Management</div>
          <div className="ctlg-sub">Manage cylinders and substrates used in estimates</div>
        </div>

        {/* Pill tab switcher */}
        <div className="ctlg-pill-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`ctlg-pill${activeTab === tab.id ? ' ctlg-pill--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="ctlg-content">
        {activeTab === 'cylinders'  && <ManageCylinders  isAdmin={isAdmin} />}
        {activeTab === 'substrates' && <ManageSubstrates isAdmin={isAdmin} />}
      </div>
    </div>
  )
}
