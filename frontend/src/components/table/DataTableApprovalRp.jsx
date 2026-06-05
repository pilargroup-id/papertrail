import React, { useState } from 'react'
import ButtonDetailStatusRp from '../button/ButtonDetailStatusRp.jsx'

import { DataTableIdentity } from '../table/DataTable.jsx'


const STATUS_META = {
  waiting_manager: { label: 'Waiting Manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'Division Review', background: '#dbeafe', color: '#1d4ed8' },
  final_review: { label: 'Final Review', background: '#ede9fe', color: '#6d28d9' },
  approved: { label: 'Approved', background: '#bbf7d0', color: '#166534' },
  REJECTED: { label: 'Rejected', background: '#fecaca', color: '#991b1b' },
  CREATED_FRP: { label: 'Created FRP', background: '#cffafe', color: '#0e7490' },
}

function parseNumber(value) {
  return Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0
}

function formatCurrency(value) {
  return `IDR ${Math.round(parseNumber(value)).toLocaleString('id-ID')}`
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function renderStatus(status) {
  const meta = STATUS_META[status] || { label: status || '-', background: '#e2e8f0', color: '#475569' }
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: meta.background,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  )
}

const desktopHeaders = [
  { label: 'FRP Number & Date', key: 'date' },
  { label: 'Requestor & Vendor', key: 'creator' },
  { label: 'Division', key: 'division' },
  { label: 'Receiver PIC', key: 'receiverPic' },
  { label: 'Total', key: 'total' },
  { label: 'Status', key: 'status' },
  { label: 'Action', key: null },
]
const desktopColumnWidths = ['16%', '18%', '12%', '13%', '11%', '12%', '18%']

export default function DataTableRp({
  tab,
  loading,
  isMobile,
  paginated,
  filtered,
  safeCurrentPage,
  totalPages,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage,
  rangeStart,
  rangeEnd,
  sortConfig,
  requestSort,
  renderRowActions,
  setSelected,
  calcTotal,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const copyRpNo = async (id, rpNo) => {
    if (!rpNo) return
    try {
      await navigator.clipboard.writeText(rpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedId(prev => (prev === id ? null : id))
  }

  const renderSortIcon = (key) => {
    if (!key) return null
    if (sortConfig.key !== key) {
      return (
        <span
          className="material-icons-round"
          style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.3 }}
        >
          unfold_more
        </span>
      )
    }
    return sortConfig.direction === 'asc' ? (
      <span
        className="material-icons-round"
        style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}
      >
        arrow_upward
      </span>
    ) : (
      <span
        className="material-icons-round"
        style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}
      >
        arrow_downward
      </span>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: '#64748b',
          padding: '4rem 2rem',
        }}
      >
        Memuat data...
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: '#94a3b8',
          padding: '4rem 2rem',
        }}
      >
        <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>
          inventory_2
        </span>
        <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
      </div>
    )
  }

  /* ── Mobile card list ── */
  if (isMobile) {
    return (
      <>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {paginated.map((rp) => {
            const isOpen = expandedId === rp.id
            return (
              <div
                key={rp.id}
                style={{
                  background: 'white',
                  border: `1.5px solid ${isOpen ? '#bfdbfe' : '#e8edf4'}`,
                  borderRadius: '14px',
                  boxShadow: isOpen ? '0 4px 16px rgba(37,99,235,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Card header — klik untuk buka detail */}
                <div
                  style={{ padding: '14px', cursor: 'pointer' }}
                  onClick={() => setSelected(rp)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Chevron toggle */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(rp.id, e)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          border: '1.5px solid #dbe5f0',
                          background: isOpen ? '#eff6ff' : 'white',
                          color: isOpen ? '#2563eb' : '#94a3b8',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                        }}
                        aria-label={isOpen ? 'Tutup aksi' : 'Buka aksi'}
                      >
                        <span
                          className="material-icons-round"
                          style={{
                            fontSize: '16px',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          expand_more
                        </span>
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); copyRpNo(rp.id, rp.rpNo); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', marginBottom: '2px' }}>
                            {rp.rpNo || 'Draft'}
                          </span>
                          <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === rp.id ? '#15803d' : '#94a3b8' }}>
                            {copiedId === rp.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                        </div>
                      </div>
                    </div>
                    {renderStatus(rp.status)}
                  </div>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}
                  >
                    {[
                      ['Pemohon', rp.dibuatOleh || '-'],
                      ['Vendor', rp.vendorSuggestion || '-'],
                      ['Divisi & Proses', `${rp.divisi || '-'} (Process by ${rp.diprosesOleh || '-'})`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                            letterSpacing: '0.04em',
                            marginBottom: '2px',
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          letterSpacing: '0.04em',
                          marginBottom: '2px',
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          fontFamily: 'IBM Plex Mono, monospace',
                          color: '#0f172a',
                        }}
                      >
                        {formatCurrency(calcTotal(rp))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion aksi */}
                {isOpen && (
                  <div
                    style={{
                      borderTop: '1.5px solid #dbeafe',
                      background: 'linear-gradient(135deg, #f0f7ff 0%, #eff6ff 100%)',
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>receipt_long</span>
                        Detail Item
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {renderRowActions(rp, { 
                          showDetail: true, 
                          showPreview: tab === 'approved', 
                          showKeFrp: tab === 'approved', 
                          showActions: tab !== 'approved' 
                        })}
                      </div>
                    </div>

                    {rp.processChanges?.changes?.length > 0 && (
                      <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {rp.processChanges.changes.map((change, index) => (
                            <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                              <strong>{change.field}:</strong>{' '}
                              <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                              <span style={{ color: '#64748b' }}> -&gt; </span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                          Diubah oleh: {rp.processUpdatedBy || '-'} {rp.processUpdatedAt ? `(${formatDate(rp.processUpdatedAt)})` : ''}
                        </div>
                      </div>
                    )}

                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(215, 224, 234, 0.6)', background: 'white' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid rgba(215, 224, 234, 0.6)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '40px' }}>No</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>Item / Memo</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '50px' }}>Qty</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '120px' }}>Harga Satuan</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', width: '120px' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rp.items || []).length > 0 ? (
                            (rp.items || []).map((item, idx) => (
                              <tr key={item.id || idx} style={{ borderBottom: idx === rp.items.length - 1 ? 'none' : '1px solid rgba(241, 245, 249, 0.8)' }}>
                                <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.memo || item.description || '-'}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>{item.qty || 1}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>{formatCurrency(Number(item.price || item.estimatedValue) || 0)}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(Number(item.amount || (item.qty * item.estimatedValue)) || 0)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada item</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile pagination */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #e2e8f0',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            borderRadius: '0 0 16px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {rangeStart}-{rangeEnd} dari {filtered.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #dbe5f0',
                fontFamily: 'inherit',
                fontSize: '12px',
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                border: '1px solid #dbe5f0',
                background: safeCurrentPage === 1 ? '#e2e8f0' : 'white',
                color: '#475569',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{
                border: '1px solid #dbe5f0',
                background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white',
                color: '#475569',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ── Desktop table ── */
  return (
    <>
      <style>{`
        @keyframes accordionSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .accordion-row-actions {
          animation: accordionSlideDown 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .dashboard-main-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dashboard-main-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="dashboard-main-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
          <colgroup>
            {desktopColumnWidths.map((width, i) => (
              <col key={`desktop-col-${i}`} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {desktopHeaders.map((header) => (
                <th
                  key={header.label || `hdr-${header.key}`}
                  onClick={() => requestSort(header.key)}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 6,
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#7f7f7f', // var(--neutral-gray)
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontWeight: 600, // Matching the general look
                    fontSize: '0.76rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    background: 'rgba(24, 43, 88, 0.04)',
                    borderBottom: '1px solid rgba(26, 42, 87, 0.08)',
                    cursor: header.key ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {header.label}
                    {renderSortIcon(header.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((rp, index) => {
              const isOpen = expandedId === rp.id
              const absoluteIndex = (safeCurrentPage - 1) * rowsPerPage + index
              const rowBg = absoluteIndex % 2 === 0 ? 'white' : '#fafbfc'

              const td = {
                padding: '14px 16px',
                borderBottom: '1px solid #e8edf4',
                verticalAlign: 'middle',
                background: rowBg,
              }

              return (
                <React.Fragment key={rp.id}>
                  <tr
                    style={{ background: rowBg, transition: 'background 0.2s', cursor: 'pointer' }}
                    onClick={() => setExpandedId(prev => (prev === rp.id ? null : rp.id))}
                    onMouseEnter={(e) => {
                      const children = e.currentTarget.children
                      for (let i = 0; i < children.length; i++) {
                        children[i].style.background = '#eff6ff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      const children = e.currentTarget.children
                      for (let i = 0; i < children.length; i++) {
                        children[i].style.background = rowBg
                      }
                    }}
                  >
                    {/* Ringkasan */}
                    <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Accordion Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedId(prev => (prev === rp.id ? null : rp.id)); }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '1.5px solid rgba(30, 94, 77, 0.15)',
                              background: isOpen ? 'rgba(30, 94, 77, 0.15)' : 'rgba(30, 94, 77, 0.05)',
                              color: '#1e5e4d',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              padding: 0,
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(30, 94, 77, 0.15)'
                              e.currentTarget.style.borderColor = 'rgba(30, 94, 77, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              if (!isOpen) {
                                e.currentTarget.style.background = 'rgba(30, 94, 77, 0.05)'
                                e.currentTarget.style.borderColor = 'rgba(30, 94, 77, 0.15)'
                              }
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              expand_more
                            </span>
                          </button>

                          <div style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyRpNo(rp.id, rp.rpNo); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                            >
                              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem', marginBottom: '2px', wordBreak: 'break-word' }}>{rp.rpNo || 'Draft'}</span>
                              <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === rp.id ? '#15803d' : '#94a3b8' }}>
                                {copiedId === rp.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                              {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                            </div>
                          </div>
                        </div>
                    </td>
                    {/* Pemohon & Vendor */}
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                      <DataTableIdentity 
                        title={rp.dibuatOleh || '-'} 
                        subtitle={rp.vendorSuggestion || '-'} 
                      />
                    </td>
                    {/* Divisi & Proses */}
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                      <span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600, display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word', marginBottom: '4px' }}>
                        {rp.divisi || '-'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                        Process by {rp.diprosesOleh || '-'}
                      </div>
                    </td>
                    {/* PIC Penerima */}
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', color: '#334155', fontWeight: 500 }}>
                      <DataTableIdentity title={rp.receiverPic || rp.picPenerima || '-'} />
                    </td>
                    {/* Total */}
                    <td
                      style={{
                        ...td,
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontWeight: 700,
                        color: '#0f172a',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatCurrency(calcTotal(rp))}
                    </td>
                    {/* Status */}
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {renderStatus(rp.status)}
                      </div>
                    </td>
                    {/* Action Column */}
                    <td style={{ ...td, borderRight: 'none', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                      {renderRowActions(rp, { 
                        showDetail: true, 
                        showPreview: tab === 'approved', 
                        showKeFrp: tab === 'approved', 
                        showActions: tab !== 'approved', 
                        showRevert: true 
                      })}
                    </td>
                  </tr>

                  {/* Accordion row — detail items */}
                  {isOpen && (
                    <tr key={`${rp.id}-accordion`}>
                      <td
                        colSpan={desktopHeaders.length}
                        style={{
                          padding: '16px 20px',
                          background: '#f8fafc',
                          borderBottom: '1px solid #e8edf4'
                        }}
                      >
                        <div
                          style={{
                            border: '1.5px solid rgba(226, 232, 240, 0.6)',
                            borderRadius: '24px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(12px)',
                            padding: '24px',
                            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                            position: 'relative',
                            overflow: 'hidden',
                            animation: 'accordionSlideDown 0.2s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-round" style={{ fontSize: '16px', color: '#3b82f6' }}>receipt_long</span>
                                Detail Item &amp; Anggaran
                              </div>
                            </div>
                            
                            {rp.processChanges?.changes?.length > 0 && (
                              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                                <div style={{ display: 'grid', gap: '6px' }}>
                                  {rp.processChanges.changes.map((change, index) => (
                                    <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                                      <strong>{change.field}:</strong>{' '}
                                      <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                                      <span style={{ color: '#64748b' }}> -&gt; </span>
                                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                                  Diubah oleh: {rp.processUpdatedBy || '-'} {rp.processUpdatedAt ? `(${formatDate(rp.processUpdatedAt)})` : ''}
                                </div>
                              </div>
                            )}

                            <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(215, 224, 234, 0.6)', background: 'rgba(255, 255, 255, 0.6)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '950px' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid rgba(215, 224, 234, 0.6)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '50px', letterSpacing: '0.04em' }}>No</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Memo / Keterangan</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '130px', letterSpacing: '0.04em' }}>Budget ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nama Project</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '70px', letterSpacing: '0.04em' }}>Qty</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Harga Satuan</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(rp.items || []).length > 0 ? (
                                    (rp.items || []).map((item, idx) => (
                                      <tr key={item.id || idx} style={{ borderBottom: idx === rp.items.length - 1 ? 'none' : '1px solid rgba(241, 245, 249, 0.8)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '12px', color: '#1e293b', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.memo || item.description || '-'}</td>
                                        <td style={{ padding: '12px', color: '#475569', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>{item.budgetId || '-'}</td>
                                        <td style={{ padding: '12px', color: '#334155', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.projectName || '-'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>{item.qty || 1}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', fontWeight: 500 }}>{formatCurrency(Number(item.price || item.estimatedValue) || 0)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>{formatCurrency(Number(item.amount || (item.qty * item.estimatedValue)) || 0)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada item</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Desktop pagination */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #e2e8f0',
          padding: '12px 14px',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
        }}
      >
        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
          {rangeStart}-{rangeEnd} dari {filtered.length} data
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'nowrap',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #dbe5f0',
                fontFamily: 'inherit',
                fontSize: '12px',
                background: 'white',
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
            Page {safeCurrentPage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === 1 ? '#e2e8f0' : 'white',
              color: '#475569',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '12px',
            }}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white',
              color: '#475569',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '12px',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
