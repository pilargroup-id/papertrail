import { useMemo } from 'react'
import ButtonDetail from '../../components/button/ButtonDetail.jsx'


const STATUS_META = {
  waiting_manager: { label: 'Menunggu Manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'Menunggu Proses', background: '#dbeafe', color: '#1d4ed8' },
  final_approved: { label: 'Approval Proses', background: '#ede9fe', color: '#6d28d9' },
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
  { label: 'Ringkasan', key: 'date' },
  { label: 'Pemohon', key: 'creator' },
  { label: 'Divisi', key: 'division' },
  { label: 'Proses', key: 'processor' },
  { label: 'Total', key: 'total' },
  { label: 'Status', key: 'status' },
  { label: 'Aksi', key: null },
  { label: 'Detail', key: null },
]
const desktopColumnWidths = ['14%', '14%', '9%', '11%', '12%', '13%', '18%', '9%']

export default function DataTableRp({
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
          {paginated.map((rp) => (
            <div
              key={rp.id}
              style={{
                background: 'white',
                border: '1px solid #e8edf4',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
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
                <div>
                  <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', marginBottom: '4px' }}>
                    {rp.rpNo || 'Draft'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                  </div>
                </div>
                {renderStatus(rp.status)}
              </div>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '12px' }}
              >
                {[
                  ['Pemohon', rp.dibuatOleh || '-'],
                  ['Divisi', rp.divisi || '-'],
                  ['Kategori', rp.kategoriPembelian || '-'],
                  ['Diproses', rp.diprosesOleh || '-'],
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
              {renderRowActions(rp)}
            </div>
          ))}
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Fixed header */}
        <table
          style={{
            width: '100%',
            maxWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '0.875rem',
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            {desktopColumnWidths.map((width, i) => (
              <col key={`desktop-head-col-${i}`} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {desktopHeaders.map((header) => (
                <th
                  key={header.label}
                  onClick={() => requestSort(header.key)}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
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

        {/* Scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <table
            style={{
              width: '100%',
              maxWidth: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '0.875rem',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              {desktopColumnWidths.map((width, i) => (
                <col key={`desktop-body-col-${i}`} style={{ width }} />
              ))}
            </colgroup>
            <tbody>
              {paginated.map((rp, index) => {
                const rowBg = index % 2 === 0 ? 'white' : '#fafbfc'
                const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
                return (
                  <tr
                    key={rp.id}
                    style={{ background: rowBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eff6ff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg
                    }}
                  >
                    <td style={td}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#1e40af',
                          fontSize: '0.82rem',
                          marginBottom: '4px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {rp.rpNo || 'Draft'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>
                        {formatDate(rp.createdAt || rp.tanggalDibutuhkan)}
                      </div>
                    </td>
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                        {rp.dibuatOleh || '-'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rp.kategoriPembelian || '-'}</div>
                    </td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <span
                        style={{
                          background: '#e0e7ef',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-block',
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        {rp.divisi || '-'}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {rp.diprosesOleh || '-'}
                    </td>
                    <td
                      style={{
                        ...td,
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontWeight: 800,
                        whiteSpace: 'normal',
                        color: '#0f172a',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatCurrency(calcTotal(rp))}
                    </td>
                    <td style={td}>{renderStatus(rp.status)}</td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      {renderRowActions(rp, { showDetail: false, showPreview: false })}
                    </td>
                    <td style={{ ...td, whiteSpace: 'normal' }}>
                      <ButtonDetail onClick={() => setSelected(rp)}>
                        Detail
                      </ButtonDetail>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
