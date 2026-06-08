import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogStatusFrp from '../../components/Dialog/DialogStatusFrp'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

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
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`
}

function parseAmount(amount) {
  return parseInt(String(amount || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  bg: '#fef9c3', color: '#854d0e', icon: 'schedule' },
  APPROVED: { label: 'Approved', bg: '#bbf7d0', color: '#166534', icon: 'check_circle' },
  REJECTED: { label: 'Rejected', bg: '#fecaca', color: '#991b1b', icon: 'cancel' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#e2e8f0', color: '#475569', icon: 'help' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: 700, background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      <span className="material-icons-round" style={{ fontSize: '13px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <span className="material-icons-round" style={{
        position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
        fontSize: '18px', color: '#94a3b8', pointerEvents: 'none',
      }}>search</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '9px 12px 9px 36px', borderRadius: '10px',
          border: '1.5px solid #dde3ed', fontSize: '13px',
          background: 'white', fontFamily: 'inherit', outline: 'none',
          color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          minHeight: '42px',
        }}
      />
    </div>
  )
}

export default function StatusFRP() {
  const navigate = useNavigate()
  const { setUser } = useUser()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [expandedId, setExpandedId]   = useState(null)
  const [copiedId, setCopiedId]       = useState(null)
  const [selectedFrpId, setSelectedFrpId] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window === 'undefined' ? 1280 : window.innerWidth)
  )

  useEffect(() => {
    fetch('/api/data/approval?view=all')
      .then(res => {
        if (!res.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return res.json()
      })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const calcTotal = req =>
    Array.isArray(req.items)
      ? req.items.reduce((sum, item) => sum + parseAmount(item.amount), 0)
      : 0

  const filtered = useMemo(() => {
    if (!data?.requests) return []
    return data.requests
      .filter(req => {
        const matchSearch =
          !search ||
          (req.frpNo || '').toLowerCase().includes(search.toLowerCase()) ||
          (req.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
          (req.keteranganFrp || '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !filterStatus || req.status === filterStatus
        return matchSearch && matchStatus
      })
      .sort((a, b) => {
        if (sortConfig.key === 'date') {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0
          return sortConfig.direction === 'asc' ? tA - tB : tB - tA
        }
        if (sortConfig.key === 'total') {
          const vA = calcTotal(a), vB = calcTotal(b)
          return sortConfig.direction === 'asc' ? vA - vB : vB - vA
        }
        const vA = String(a[sortConfig.key] || '').toLowerCase()
        const vB = String(b[sortConfig.key] || '').toLowerCase()
        if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1
        if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }, [data, search, filterStatus, sortConfig])

  const totalPages    = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage      = Math.min(currentPage, totalPages)
  const paginated     = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safePage])

  useEffect(() => { setCurrentPage(1) }, [search, filterStatus, rowsPerPage])

  const toggleSort = key => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    )
  }

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey)
      return <span className="material-icons-round" style={{ fontSize: '13px', opacity: 0.3, marginLeft: '3px', verticalAlign: 'middle' }}>unfold_more</span>
    return <span className="material-icons-round" style={{ fontSize: '13px', color: '#2563eb', marginLeft: '3px', verticalAlign: 'middle' }}>
      {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  }

  const copyFrpNo = async (id, frpNo) => {
    if (!frpNo) return
    try {
      await navigator.clipboard.writeText(frpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const th = {
    padding: '11px 14px', textAlign: 'left', background: '#f8fafc',
    fontWeight: 700, color: '#475569', fontSize: '11px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
    borderBottom: '2px solid #e2e8f0',
  }
  const td = {
    padding: '11px 14px', borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle', fontSize: '0.875rem', color: '#1e293b',
  }

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd   = Math.min(filtered.length, safePage * rowsPerPage)

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Filter Bar ── */}
      <div style={{
        background: '#f1f5f9', borderRadius: '14px',
        padding: isMobile ? '12px' : '16px 20px',
        marginBottom: '16px', border: '1px solid #e2e8f0',
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '2 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Search</label>
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari No FRP / Vendor / Keterangan..."
          />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: '10px',
              border: '1.5px solid #dde3ed', fontSize: '13px', background: 'white',
              fontFamily: 'inherit', outline: 'none', color: '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minHeight: '42px', cursor: 'pointer',
            }}
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        {(search || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
              background: 'white', color: '#64748b', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', minHeight: '42px',
              alignSelf: 'flex-end',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
            Reset
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', gap: '10px', padding: '4rem' }}>
          <span className="material-icons-round" style={{ fontSize: '32px', opacity: 0.4 }}>hourglass_empty</span>
          Memuat data...
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#ef4444', gap: '10px', padding: '4rem' }}>
          <span className="material-icons-round">error</span> {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
              <span className="material-icons-round" style={{ fontSize: '52px', marginBottom: '1rem', opacity: 0.4 }}>receipt_long</span>
              <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Tidak ada FRP yang cocok dengan filter saat ini</p>
            </div>
          ) : isMobile ? (
            /* ── Mobile Card View ── */
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginated.map(req => {
                  const total = calcTotal(req)
                  const isExpanded = expandedId === req.id
                  return (
                    <div key={req.id} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => copyFrpNo(req.id, req.frpNo)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.frpNo || `#${req.id}`}</span>
                          <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                            {copiedId === req.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        <StatusBadge status={req.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                        {[
                          { label: 'Tanggal', value: formatDate(req.tanggalFrp) },
                          { label: 'Vendor', value: req.vendor || '-' },
                          { label: 'Divisi', value: req.divisi || '-' },
                          { label: 'Total', value: formatCurrency(total) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {req.attachLink && (
                          <a
                            href={`/api/frp/${req.id}/attachment`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ flex: 1, textAlign: 'center', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px', boxSizing: 'border-box' }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>attach_file</span>
                            File
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedFrpId(req.id)}
                          style={{ flex: 2, width: '100%', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Pagination mobile */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}–{rangeEnd} dari {filtered.length}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                </div>
              </div>
            </>
          ) : (
            /* ── Desktop Table View ── */
            <>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {[
                        { label: 'No FRP', key: 'frpNo' },
                        { label: 'Tanggal', key: 'date' },
                        { label: 'Vendor', key: 'vendor' },
                        { label: 'Divisi', key: 'divisi' },
                        { label: 'Total', key: 'total' },
                        { label: 'Status', key: 'status' },
                        { label: 'Attach', key: null },
                        { label: 'Detail', key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          style={{ ...th, cursor: key ? 'pointer' : 'default' }}
                          onClick={() => key && toggleSort(key)}
                        >
                          {label}
                          {key && <SortIcon colKey={key} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(req => {
                      const total = calcTotal(req)
                      return (
                        <tr key={req.id} style={{ transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={td}>
                            <button
                              type="button"
                              onClick={() => copyFrpNo(req.id, req.frpNo)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.frpNo || `#${req.id}`}</span>
                              <span className="material-icons-round" style={{ fontSize: '13px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                                {copiedId === req.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </td>
                          <td style={{ ...td, color: '#475569', fontSize: '0.82rem' }}>{formatDate(req.tanggalFrp)}</td>
                          <td style={{ ...td, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.vendor}>{req.vendor || '-'}</td>
                          <td style={{ ...td, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={req.divisi}>{req.divisi || '-'}</td>
                          <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(total)}</td>
                          <td style={td}><StatusBadge status={req.status} /></td>
                          <td style={td}>
                            {req.attachLink ? (
                              <a
                                href={`/api/frp/${req.id}/attachment`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  background: '#f8fafc', color: '#475569',
                                  border: '1px solid #cbd5e1', padding: '6px 10px',
                                  borderRadius: '8px', cursor: 'pointer',
                                  fontWeight: 600, fontSize: '12px', textDecoration: 'none'
                                }}
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>attach_file</span>
                                File
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>-</span>
                            )}
                          </td>
                          <td style={td}>
                            <button
                              type="button"
                              onClick={() => setSelectedFrpId(req.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: '#eff6ff', color: '#1d4ed8',
                                border: '1px solid #bfdbfe', padding: '6px 10px',
                                borderRadius: '8px', cursor: 'pointer',
                                fontWeight: 600, fontSize: '12px', fontFamily: 'inherit',
                              }}
                            >
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>receipt_long</span>
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination desktop */}
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Menampilkan <strong>{rangeStart}–{rangeEnd}</strong> dari <strong>{filtered.length}</strong> FRP
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Baris/halaman</span>
                  <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={{ border: '1px solid #dbe5f0', background: safePage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Prev</button>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{safePage} / {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ border: '1px solid #dbe5f0', background: safePage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 12px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Next →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <DialogStatusFrp
        isOpen={!!selectedFrpId}
        frpId={selectedFrpId}
        onClose={() => setSelectedFrpId(null)}
      />
    </main>
  )
}
