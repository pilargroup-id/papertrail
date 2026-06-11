import React, { useState } from 'react'
import ButtonActionApprovalFrp from '../button/ButtonActionApprovalFrp.jsx'
import { DataTableIdentity } from '../table/DataTable.jsx'

function parseAmount(amount) {
  return parseInt(String(amount || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
    : '-'
}

function formatCurrency(value) {
  return `IDR ${value.toLocaleString('id-ID')}`
}

const statusColors = {
  PENDING: { background: '#fef08a', color: '#854d0e' },
  APPROVED: { background: '#bbf7d0', color: '#166534' },
  REJECTED: { background: '#fecaca', color: '#991b1b' },
}

const desktopHeaders = [
  { label: 'FRP Number', key: 'date' },
  { label: 'Requestor & Vendor', key: 'requester' },
  { label: 'Division', key: 'division' },
  { label: 'Total', key: 'total' },
  { label: 'Status', key: 'status' },
  { label: 'Attachment', key: null },
  { label: 'Action', key: null },
]

const desktopColumnWidths = ['14%', '15%', '7%', '7%', '9%', '8%', '14%']

export default function DataTableApprovalFrp({
  paginated,
  filtered,
  calcTotal,
  isApprovedView,
  canApprove,
  requestAction,
  setSelectedRequest,
  requestSort,
  sortConfig,
  safeCurrentPage,
  rowsPerPage,
  setRowsPerPage,
  setCurrentPage,
  totalPages,
  rangeStart,
  rangeEnd,
  isMobile,
}) {
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [copiedFrpId, setCopiedFrpId] = useState(null)

  const copyFrpNo = async (requestId, frpNo) => {
    if (!frpNo) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(frpNo)
      } else {
        const tempInput = document.createElement('textarea')
        tempInput.value = frpNo
        tempInput.setAttribute('readonly', '')
        tempInput.style.position = 'fixed'
        tempInput.style.opacity = '0'
        tempInput.style.pointerEvents = 'none'
        document.body.appendChild(tempInput)
        tempInput.focus()
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }
      setCopiedFrpId(requestId)
      window.setTimeout(() => {
        setCopiedFrpId(current => (current === requestId ? null : current))
      }, 1400)
    } catch (_) { }
  }

  const renderSortIcon = (key) => {
    if (!key) return null
    if (sortConfig.key !== key) {
      return <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.3 }}>unfold_more</span>
    }
    return sortConfig.direction === 'asc'
      ? <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_upward</span>
      : <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_downward</span>
  }

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => setCurrentPage(i)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: i === safeCurrentPage ? 'none' : '1px solid #dbe5f0',
            background: i === safeCurrentPage ? '#1e5e4d' : 'white',
            color: i === safeCurrentPage ? 'white' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (i !== safeCurrentPage) {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }
          }}
          onMouseLeave={(e) => {
            if (i !== safeCurrentPage) {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = '#dbe5f0'
            }
          }}
        >
          {i}
        </button>
      )
    }
    return pages
  }

  const isEmpty = filtered.length === 0

  if (isEmpty && isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
        <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>task</span>
        <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {paginated.map((request) => {
            const total = calcTotal(request)
            const statusStyle = statusColors[request.status] || {}
            return (
              <div
                key={request.id}
                style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => copyFrpNo(request.id, request.frpNo)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{request.frpNo}</span>
                    <span className="material-icons-round" style={{ fontSize: '15px', color: copiedFrpId === request.id ? '#15803d' : '#94a3b8' }}>
                      {copiedFrpId === request.id ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...statusStyle }}>{request.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '12px' }}>
                  {[
                    { label: 'Tanggal', value: formatDate(request.tanggalFrp) },
                    { label: 'Pemohon', value: request.dimintaOleh || '-' },
                    { label: 'Vendor', value: request.vendor || '-' },
                    { label: 'Divisi', value: request.divisi || '-' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(total)}</div>
                  </div>
                  {/* {isApprovedView && request.approvedBy && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Approved By</div>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>{request.approvedBy}</div>
                    </div>
                  )} */}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {request.attachLink && (
                    <a
                      href={`/api/frp/${request.id}/attachment`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        width: '100%',
                        display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                        background: 'white', color: '#3b82f6',
                        border: '1px solid #bfdbfe', borderRadius: '24px', padding: '8px 12px',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff'
                        e.currentTarget.style.borderColor = '#93c5fd'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#bfdbfe'
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>description</span>
                      Lihat Dokumen
                    </a>
                  )}
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                    <ButtonActionApprovalFrp
                      request={request}
                      canApprove={canApprove}
                      isApprovedView={isApprovedView}
                      requestAction={requestAction}
                      setSelectedRequest={setSelectedRequest}
                    />
                  </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Pagination Mobile */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}-{rangeEnd} dari {filtered.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rows</span>
            <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Desktop Headers */}
        <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
          <colgroup>
            {desktopColumnWidths.map((width, index) => <col key={`desktop-head-col-${index}`} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              {desktopHeaders.map((header, idx) => (
                <th
                  key={header.label}
                  onClick={() => requestSort(header.key)}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 6,
                    padding: '1rem',
                    textAlign: 'left',
                    color: '#7f7f7f',
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontWeight: 600,
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
        </table>

        {/* Desktop Body */}
        <div className="dashboard-main-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
            <colgroup>
              {desktopColumnWidths.map((width, index) => <col key={`desktop-body-col-${index}`} style={{ width }} />)}
            </colgroup>
            <tbody>
              {paginated.length > 0 ? paginated.map((request, idx) => {
                const total = calcTotal(request)
                const statusStyle = statusColors[request.status] || {}
                const absoluteIndex = (safeCurrentPage - 1) * rowsPerPage + idx
                const rowBg = absoluteIndex % 2 === 0 ? 'white' : '#fafbfc'
                const isExpanded = expandedRowId === request.id

                const td = {
                  padding: '14px 16px',
                  borderBottom: '1px solid #e8edf4',
                  verticalAlign: 'middle',
                  background: rowBg,
                }

                return (
                  <React.Fragment key={request.id}>
                    <tr
                      style={{ background: rowBg, transition: 'background 0.2s', cursor: 'pointer' }}
                      onClick={() => setExpandedRowId(current => (current === request.id ? null : request.id))}
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
                      {/* 1. Ringkasan */}
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Accordion Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedRowId(current => (current === request.id ? null : request.id)); }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '1.5px solid rgba(30, 94, 77, 0.15)',
                              background: isExpanded ? 'rgba(30, 94, 77, 0.15)' : 'rgba(30, 94, 77, 0.05)',
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
                              if (!isExpanded) {
                                e.currentTarget.style.background = 'rgba(30, 94, 77, 0.05)'
                                e.currentTarget.style.borderColor = 'rgba(30, 94, 77, 0.15)'
                              }
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              expand_more
                            </span>
                          </button>

                          <div style={{ minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyFrpNo(request.id, request.frpNo); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                            >
                              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem', marginBottom: '2px', wordBreak: 'break-word' }}>{request.frpNo}</span>
                              <span className="material-icons-round" style={{ fontSize: '14px', color: copiedFrpId === request.id ? '#15803d' : '#94a3b8' }}>
                                {copiedFrpId === request.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{formatDate(request.tanggalFrp)}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Pemohon & Vendor */}
                      <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                        <DataTableIdentity 
                          title={request.dimintaOleh || '-'} 
                          subtitle={request.vendor || '-'} 
                        />
                      </td>

                      {/* 3. Divisi */}
                      <td style={{ ...td, whiteSpace: 'normal' }}>
                        <span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600, display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>
                          {request.divisi}
                        </span>
                      </td>

                      {/* 4. Total */}
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                        {formatCurrency(total)}
                      </td>

                      {/* 5. Status */}
                      <td style={td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', ...statusStyle }}>
                            {request.status}
                          </span>
                          {isApprovedView && request.approvedBy ? (
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, wordBreak: 'break-word' }}>
                              <span style={{ fontWeight: 700, color: '#475569' }}>By:</span> {request.approvedBy}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* 6. Attach */}
                      <td style={td}>
                        {request.attachLink ? (
                          <a
                            href={`/api/frp/${request.id}/attachment`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              background: 'white', color: '#3b82f6',
                              border: '1px solid #bfdbfe', padding: '6px 10px',
                              borderRadius: '24px', cursor: 'pointer',
                              fontWeight: 600, fontSize: '11px', textDecoration: 'none',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#eff6ff'
                              e.currentTarget.style.borderColor = '#93c5fd'
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(59,130,246,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white'
                              e.currentTarget.style.borderColor = '#bfdbfe'
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>description</span>
                            Dokumen
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>-</span>
                        )}
                      </td>

                      {/* 7. Action */}
                      <td style={{ ...td, borderRight: 'none' }}>
                        {((canApprove && !isApprovedView) || request.canRevert) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                            <ButtonActionApprovalFrp
                              request={request}
                              canApprove={canApprove}
                              isApprovedView={isApprovedView}
                              requestAction={requestAction}
                              setSelectedRequest={setSelectedRequest}
                            />
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>-</div>
                        )}
                      </td>
                    </tr>

                    {/* Expand Row Details Card */}
                    {isExpanded && (
                      <tr key={`${request.id}-expanded`}>
                        <td colSpan={desktopHeaders.length} style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e8edf4' }}>
                          <div
                            style={{
                              border: '1.5px solid rgba(226, 232, 240, 0.6)',
                              borderRadius: '24px',
                              background: 'rgba(255, 255, 255, 0.4)',
                              backdropFilter: 'blur(12px)',
                              padding: '24px',
                              boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-icons-round" style={{ fontSize: '16px', color: '#3b82f6' }}>receipt_long</span>
                                    Item and Budget Details
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                  </div>
                                </div>
                                <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(215, 224, 234, 0.6)', background: 'rgba(255, 255, 255, 0.6)' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '950px' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid rgba(215, 224, 234, 0.6)' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '50px', letterSpacing: '0.04em' }}>No</th>
                                        <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Memo / Description</th>
                                        <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '130px', letterSpacing: '0.04em' }}>Budget ID</th>
                                        <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget Name</th>
                                        <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '70px', letterSpacing: '0.04em' }}>Qty</th>
                                        <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Unit price</th>
                                        <th style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', width: '220px', letterSpacing: '0.04em' }}>Total Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(request.items || []).length > 0 ? (
                                        (request.items || []).map((item, idx) => (
                                          <tr key={item.id || idx} style={{ borderBottom: idx === request.items.length - 1 ? 'none' : '1px solid rgba(241, 245, 249, 0.8)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                            <td style={{ padding: '12px', color: '#1e293b', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.memo || '-'}</td>
                                            <td style={{ padding: '12px', color: '#475569', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>{item.budgetId || '-'}</td>
                                            <td style={{ padding: '12px', color: '#334155', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.projectName || '-'}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: 600 }}>{item.qty || 1}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#334155', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', fontWeight: 500 }}>{formatCurrency(Number(item.price) || 0)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>{formatCurrency(Number(item.amount) || 0)}</td>
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
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              }) : (
                <tr>
                  <td
                    colSpan={desktopHeaders.length}
                    style={{
                      padding: '28px 16px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontStyle: 'italic',
                      background: 'white',
                      borderBottom: '1px solid #e8edf4',
                    }}
                  >
                    Belum ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Pagination */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          borderRadius: '0 0 16px 16px',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: '16px',
        }}
      >
        {/* Left: Row Selector & Data Range info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1.5px solid #dbe5f0',
                background: 'white',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} data
          </span>
        </div>

        {/* Right: Pagination buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === 1 ? '#f1f5f9' : 'white',
              color: safeCurrentPage === 1 ? '#94a3b8' : '#475569',
              borderRadius: '8px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (safeCurrentPage !== 1) {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.borderColor = '#cbd5e1'
              }
            }}
            onMouseLeave={(e) => {
              if (safeCurrentPage !== 1) {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = '#dbe5f0'
              }
            }}
          >
            Previous
          </button>

          {renderPageNumbers()}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            style={{
              border: '1px solid #dbe5f0',
              background: safeCurrentPage === totalPages ? '#f1f5f9' : 'white',
              color: safeCurrentPage === totalPages ? '#94a3b8' : '#475569',
              borderRadius: '8px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (safeCurrentPage !== totalPages) {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.borderColor = '#cbd5e1'
              }
            }}
            onMouseLeave={(e) => {
              if (safeCurrentPage !== totalPages) {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = '#dbe5f0'
              }
            }}
          >
            Next
          </button>
        </div>
      </div>
    </>
  )
}
