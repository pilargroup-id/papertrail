import React from 'react'
import CreateButton from '../button/CreateButton.jsx'


const COLUMN_WIDTHS = ['4%', '10%', '13%', '10%', '7%', '7%', '22%', '18%', '9%']
const COLUMNS = ['No', 'Budget ID', 'Company', 'Dept', 'Class', 'Type', 'Deskripsi', 'Total Amount', 'Aksi']
const DEFAULT_COMPANY = 'PT PILAR NIAGA MAKMUR'

const formatCurrency = value => {
  const normalized = Number(String(value || 0).replace(/[^0-9.-]/g, ''))
  return `IDR ${Number.isNaN(normalized) ? 0 : normalized.toLocaleString('id-ID')}`
}

const matchesSearch = (item, search) => {
  if (!search) return true
  const q = search.toLowerCase()
  return (
    (item.id || '').toLowerCase().includes(q) ||
    (item.department || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  )
}

function buildStyles() {
  return {
    tableContain: { display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 360px)' },
    scrollBody: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' },
    th: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '10px 14px',
      textAlign: 'left',
      borderBottom: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
      background: '#f8fafc',
      fontWeight: 700,
      color: '#475569',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '11px 14px',
      textAlign: 'left',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '0.9rem',
      verticalAlign: 'top',
      color: '#334155',
    },
    mobileItemCard: {
      padding: '1rem',
      borderBottom: '1px solid #eef2f7',
      background: 'white',
    },
    mobileMetaGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.8rem',
      marginTop: '0.95rem',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    badgeSoft: { background: '#e2e8f0', color: '#334155' },
    badgeCode: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
  }
}

export default function DataTableBudgets({
  listData = [],
  onEdit,
  onDelete,
  companyFilter = '',
  search = '',
  companyNames = [],
  isMobile = false,
}) {
  const styles = buildStyles()
  const defaultCompany = companyNames[0] || DEFAULT_COMPANY

  const filtered = listData.filter(item => {
    if (companyFilter) {
      if ((item.company || defaultCompany) !== companyFilter) return false
    }
    return matchesSearch(item, search)
  })

  if (isMobile) {
    return (
      <div>
        {filtered.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data</div>
        ) : (
          filtered.map((item, idx) => (

          <div key={item.originalIndex ?? idx} style={styles.mobileItemCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.id}</div>
                <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.company || defaultCompany}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                </CreateButton>
                <CreateButton
                  variant="accordion"
                  tone="danger"
                  onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                </CreateButton>
              </div>
            </div>

            <div style={styles.mobileMetaGrid}>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Dept</div>
                <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Type</div>
                <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Limit Tahunan</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.totalAmount || 0)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
    )
  }

  return (
    <div style={styles.tableContain}>
      <table style={styles.table}>
        <colgroup>
          {COLUMN_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th key={col} style={styles.th}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <div style={styles.scrollBody}>
        <table style={styles.table}>
          <colgroup>
            {COLUMN_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  Tidak ada data
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const rowBg = idx % 2 === 0 ? 'white' : '#fafbfc'
                return (
                  <tr
                    key={item.originalIndex ?? idx}
                    style={{ background: rowBg }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#eff6ff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = rowBg
                    }}
                  >
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <strong style={{ color: '#1e293b' }}>{item.id}</strong>
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.82rem', fontWeight: 700 }}>
                      {item.company || defaultCompany}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span>
                    </td>
                    <td style={styles.td}>{item.class}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>{item.description}</td>
                    <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
                      {formatCurrency(item.totalAmount || 0)}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}>
                          <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                        </CreateButton>
                        <CreateButton
                          variant="accordion"
                          tone="danger"
                          onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}
                        >
                          <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                        </CreateButton>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
