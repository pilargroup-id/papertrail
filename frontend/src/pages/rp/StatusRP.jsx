import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogDetailRP from '../../components/Dialog/DialogDetailRP'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import DialogFailAction from '../../components/Dialog/DialogFailAction'
import ButtonRevert from '../../components/button/ButtonRevert'
import Filteryear from '../../components/dropdown/filter/Year.jsx'

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
function getRpTotal(rp) {
  if (!rp || !Array.isArray(rp.items)) return 0;
  return rp.items.reduce((s, it) => s + (parseAmount(it.qty) || 1) * parseAmount(it.estimatedValue), 0);
}

const STATUS_CONFIG = {
  waiting_manager: { label: 'waiting_manager', bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: 'schedule' },
  division_review: { label: 'division_review', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: 'autorenew' },
  final_review:  { label: 'final_review', bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: 'gavel' },
  approved:        { label: 'approved', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: 'check_circle' },
  REJECTED:        { label: 'REJECTED', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: 'cancel' },
  CREATED_FRP:     { label: 'CREATED_FRP', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', icon: 'receipt_long' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: 'help' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4.5px 12px', borderRadius: '24px', fontSize: '11.5px',
      fontWeight: 600, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      whiteSpace: 'nowrap', letterSpacing: '0.01em'
    }}>
      <span className="material-icons-round" style={{ fontSize: '14px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
        return
      }
    } catch (_) { }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onClick={openPicker}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
      <div
        className="filter-input-element"
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
      </div>
    </div>
  )
}

function FilterField({ label, icon, children }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            left: '12px',
            background: 'white',
            padding: '0 6px',
            fontSize: '11px',
            fontWeight: '700',
            color: '#64748b',
            zIndex: 3,
            pointerEvents: 'none',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span
            className="material-icons-round"
            style={{
              position: 'absolute',
              left: '12px',
              color: '#64748b',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? { value: option, label: option, keywords: option }
      : {
        value: option.value,
        label: option.label,
        keywords: option.keywords || option.label || option.value,
      },
  )

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const handleOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1, width: '100%' }}>
      <button
        type="button"
        className="select-dropdown-btn"
        onClick={() => setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          minHeight: style?.minHeight || '42px',
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            flex: 1,
            color: value ? '#1e293b' : '#94a3b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '12px',
          }}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1.5px solid #dbe5f0',
            borderRadius: '12px',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Cari..."
              style={{ ...style, paddingLeft: '10px', fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }}
            />
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #f8fafc',
                  background: option.value === value ? '#eff6ff' : 'white',
                  color: option.value === value ? '#1f4e8c' : '#1e293b',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: option.value === value ? 700 : 500,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StatusRP() {
  const navigate = useNavigate()
  const { user, setUser } = useUser()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '', date: '', year: '', division: '' })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [expandedId, setExpandedId]   = useState(null)
  const [copiedId, setCopiedId]       = useState(null)
  const [detailRequest, setDetailRequest] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window === 'undefined' ? 1280 : window.innerWidth)
  )

  const [actionLoading, setActionLoading] = useState(false)
  const [confirmRevert, setConfirmRevert] = useState(null)
  const [actionResultDialog, setActionResultDialog] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch('/api/data/rp-approval?view=all')
      .then(res => {
        if (!res.ok) { window.location.href = '/'; throw new Error('Unauthorized') }
        return res.json()
      })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const processRevert = async () => {
    if (!confirmRevert) return
    setActionLoading(true)
    const currentRevert = confirmRevert
    let url = ''
    if (currentRevert.status === 'division_review') {
      url = `/api/rp/${currentRevert.id}/process-revert`
    } else if (currentRevert.status === 'final_review') {
      url = `/api/rp/${currentRevert.id}/process-manager-revert`
    } else {
      url = `/api/rp/${currentRevert.id}/revert`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        setConfirmRevert(null)
        setDetailRequest(null)
        setActionResultDialog({
          kind: 'success',
          action: 'revert',
          icon: 'restart_alt',
          title: 'Revert berhasil',
          message: 'Status RP berhasil dikembalikan.',
          subMessage: `Nomor RP: ${currentRevert?.rpNo || currentRevert?.rp?.rpNo || currentRevert?.id || '-'}`,
          rpNo: currentRevert?.rpNo || currentRevert?.rp?.rpNo,
        })
      } else {
        setConfirmRevert(null)
        setActionResultDialog({
          kind: 'fail',
          action: 'revert',
          icon: 'restart_alt',
          title: 'Gagal memproses data',
          message: result.error || 'Perubahan data tidak dapat disimpan.',
          subMessage: `Nomor RP: ${currentRevert?.rpNo || currentRevert?.rp?.rpNo || currentRevert?.id || '-'}`,
          rpNo: currentRevert?.rpNo || currentRevert?.rp?.rpNo,
        })
      }
    } catch (error) {
      setConfirmRevert(null)
      setActionResultDialog({
        kind: 'fail',
        action: 'revert',
        icon: 'restart_alt',
        title: 'Gagal memproses data',
        message: error.message || 'Terjadi kesalahan saat memproses data.',
        subMessage: `Nomor RP: ${currentRevert?.rpNo || currentRevert?.rp?.rpNo || currentRevert?.id || '-'}`,
        rpNo: currentRevert?.rpNo || currentRevert?.rp?.rpNo,
      })
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const calcTotal = req => getRpTotal(req)

  const divisions = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((req) => req.departmentName || req.departmentClass || '-'))].sort() : []),
    [data],
  )

  const divisionOptions = useMemo(
    () => divisions.map(division => ({ value: division, label: division })),
    [divisions],
  )

  const filtered = useMemo(() => {
    if (!data?.requests) return []
    return data.requests
      .filter(req => {
        const matchSearch =
          !filters.search ||
          (req.rpNo || '').toLowerCase().includes(filters.search.toLowerCase()) ||
          (req.vendorSuggestion || '').toLowerCase().includes(filters.search.toLowerCase()) ||
          (req.description || '').toLowerCase().includes(filters.search.toLowerCase())
        const matchStatus = !filters.status || req.status === filters.status
        
        const reqDate = req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : ''
        const matchDate = !filters.date || reqDate === filters.date
        const reqYear = req.createdAt ? String(new Date(req.createdAt).getFullYear()) : ''
        const matchYear = !filters.year || reqYear === filters.year

        const reqDiv = req.departmentName || req.departmentClass || '-'
        const matchDivision = !filters.division || reqDiv === filters.division
        
        return matchSearch && matchStatus && matchDate && matchYear && matchDivision
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
  }, [data, filters, sortConfig])

  const totalPages    = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage      = Math.min(currentPage, totalPages)
  const paginated     = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safePage])

  useEffect(() => { setCurrentPage(1) }, [filters, rowsPerPage])

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

  const copyRpNo = async (id, rpNo) => {
    if (!rpNo) return
    try {
      await navigator.clipboard.writeText(rpNo)
      setCopiedId(id)
      setTimeout(() => setCopiedId(c => c === id ? null : c), 1400)
    } catch (_) {}
  }

  const filterInput = {
    width: '100%',
    padding: '9px 12px 9px 36px',
    borderRadius: '12px',
    border: '1.5px solid #dbe5f0',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1e293b',
    minHeight: '42px',
  }

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const rangeEnd   = Math.min(filtered.length, safePage * rowsPerPage)

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          border-color: #1e4e8c !important;
          box-shadow: 0 0 0 3px rgba(30, 78, 140, 0.15) !important;
        }
        .select-dropdown-btn {
          transition: all 0.2s ease-in-out;
        }
        .select-dropdown-btn:focus, .select-dropdown-btn:hover {
          border-color: #1e4e8c !important;
          box-shadow: 0 0 0 3px rgba(30, 78, 140, 0.15) !important;
        }
      `}</style>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
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
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '16px',
            border: '1.5px solid #e8edf4',
            boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)',
            overflow: 'hidden',
          }}>
            {/* Top Filter Area (Integrated inside the card) */}
            <div
              style={{
                background: 'white',
                padding: isMobile ? '16px 12px' : '20px 24px',
                borderBottom: '1.5px solid #e8edf4',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#1e40af',
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '20px' }}>receipt_long</span>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                      Status RP
                    </h2>
                    <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                      {filtered.length} data sesuai filter aktif
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={loadData}
                    title="Segarkan data"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1.5px solid #dbe5f0',
                      background: 'white',
                      color: '#475569',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#dbe5f0'
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : `repeat(5, minmax(140px, 1fr))`,
                    gap: '12px',
                    flex: 1,
                    minWidth: isMobile ? '100%' : '600px',
                  }}
                >
                  {/* Search */}
                  <FilterField label="Cari" icon="search">
                    <input
                      className="filter-input-element"
                      style={filterInput}
                      placeholder="No RP / Vendor..."
                      value={filters.search}
                      onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                    />
                  </FilterField>

                  {/* Tanggal */}
                  <FilterField label="Tanggal" icon="calendar_month">
                    <DateField
                      value={filters.date}
                      onChange={(e) => setFilters((c) => ({ ...c, date: e.target.value }))}
                      style={filterInput}
                    />
                  </FilterField>
                  <FilterField label="Tahun" icon="calendar_month">
                    <Filteryear
                      value={filters.year}
                      onChange={(value) => setFilters((c) => ({ ...c, year: value }))}
                    />
                  </FilterField>

                  {/* Status */}
                  <FilterField label="Status" icon="rule">
                    <SearchableSelect
                      value={filters.status}
                      onChange={(v) => setFilters((c) => ({ ...c, status: v }))}
                      options={[
                        { value: 'waiting_manager', label: 'waiting_manager' },
                        { value: 'division_review', label: 'division_review' },
                        { value: 'final_review', label: 'final_review' },
                        { value: 'approved', label: 'approved' },
                        { value: 'REJECTED', label: 'REJECTED' },
                        { value: 'CREATED_FRP', label: 'CREATED_FRP' },
                      ]}
                      placeholder="Semua Status"
                      style={filterInput}
                    />
                  </FilterField>

                  {/* Divisi */}
                  <FilterField label="Divisi" icon="business">
                    <SearchableSelect
                      value={filters.division}
                      onChange={(v) => setFilters((c) => ({ ...c, division: v }))}
                      options={divisionOptions}
                      placeholder="Semua Divisi"
                      style={filterInput}
                    />
                  </FilterField>
                </div>

                {Object.values(filters).some(Boolean) && (
                  <button
                    onClick={() => setFilters({ search: '', status: '', date: '', year: '', division: '' })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '9px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                      background: 'white', color: '#64748b', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', minHeight: '42px',
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* ── Table Container ── */}
            <div style={{
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
              background: 'white', overflow: 'hidden',
            }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
              <span className="material-icons-round" style={{ fontSize: '52px', marginBottom: '1rem', opacity: 0.4 }}>receipt_long</span>
              <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Tidak ada RP yang cocok dengan filter saat ini</p>
            </div>
          ) : isMobile ? (
            /* ── Mobile Card View ── */
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginated.map(req => { 
                  const total = calcTotal(req)
                  const isExpanded = expandedId === req.id
                  return (
                    <div key={req.id} onClick={() => setDetailRequest(req)} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => copyRpNo(req.id, req.rpNo)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.rpNo || `#${req.id}`}</span>
                          <span className="material-icons-round" style={{ fontSize: '14px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                            {copiedId === req.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        <StatusBadge status={req.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '10px' }}>
                        {[
                          { label: 'Tanggal', value: formatDate(req.createdAt) },
                          { label: 'Vendor', value: req.vendorSuggestion || '-' },
                          { label: 'Divisi', value: req.departmentName || req.departmentClass || '-' },
                          { label: 'Total', value: formatCurrency(total) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setDetailRequest(req)}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}
                        >
                          <span className="material-icons-round" style={{ fontSize: '15px' }}>open_in_new</span>
                          Detail
                        </button>
                        {req.canRevert && user?.role === 'administrator' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setConfirmRevert(req)}
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', padding: '8px', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit', opacity: actionLoading ? 0.7 : 1 }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>
                            Revert
                          </button>
                        )}
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
              <div className="frp-items-scrollable" style={{ flex: 1, minHeight: 0, overflowX: 'hidden' }}>
                <table className="frp-table">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '17%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        { label: 'No RP', key: 'rpNo' },
                        { label: 'Tanggal', key: 'date' },
                        { label: 'Vendor', key: 'vendor' },
                        { label: 'Divisi', key: 'divisi' },
                        { label: 'Total', key: 'total' },
                        { label: 'Status', key: 'status' },
                        { label: 'Aksi', key: null },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          className="frp-th"
                          style={{ cursor: key ? 'pointer' : 'default', textAlign: label === 'Aksi' ? 'right' : 'left' }}
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
                        <tr key={req.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setDetailRequest(req)}
                        >
                          <td className="frp-td">
                            <button
                              type="button"
                              onClick={() => copyRpNo(req.id, req.rpNo)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>{req.rpNo || `#${req.id}`}</span>
                              <span className="material-icons-round" style={{ fontSize: '13px', color: copiedId === req.id ? '#15803d' : '#94a3b8' }}>
                                {copiedId === req.id ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </td>
                          <td className="frp-td" style={{ color: '#475569', fontSize: '0.82rem' }}>{formatDate(req.createdAt)}</td>
                          <td className="frp-td" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.vendorSuggestion}>{req.vendorSuggestion || '-'}</td>
                          <td className="frp-td" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={req.departmentName || req.departmentClass}>{req.departmentName || req.departmentClass || '-'}</td>
                          <td className="frp-td" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: '0.82rem' }}>{formatCurrency(total)}</td>
                          <td className="frp-td"><StatusBadge status={req.status} /></td>
                          <td className="frp-td" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '30px', padding: '3px', gap: '3px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                              <button
                                type="button"
                                onClick={() => setDetailRequest(req)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  background: '#eff6ff', color: '#1d4ed8',
                                  border: '1px solid #bfdbfe', padding: '5px 10px',
                                  borderRadius: '24px', cursor: 'pointer',
                                  fontWeight: 600, fontSize: '12px', fontFamily: 'inherit',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff' }}
                              >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                                Detail
                              </button>
                              {req.canRevert && user?.role === 'administrator' && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => setConfirmRevert(req)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    background: '#fef9c3', color: '#92400e',
                                    border: '1px solid #fde68a', padding: '5px 10px',
                                    borderRadius: '24px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: 600, fontSize: '12px', fontFamily: 'inherit',
                                    transition: 'all 0.2s', opacity: actionLoading ? 0.7 : 1,
                                  }}
                                  onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.background = '#fef08a' }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fef9c3' }}
                                >
                                  <span className="material-icons-round" style={{ fontSize: '14px' }}>restart_alt</span>
                                  Revert
                                </button>
                              )}
                            </div>
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
                  Menampilkan <strong>{rangeStart}–{rangeEnd}</strong> dari <strong>{filtered.length}</strong> RP
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
        </div>
      )}

      <DialogDetailRP
        isOpen={!!detailRequest}
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
        extraFooter={
          user?.role === 'administrator' && ['division_review', 'final_review'].includes(detailRequest?.status) ? (
            <ButtonRevert onClick={() => setConfirmRevert(detailRequest)}>
              Revert
            </ButtonRevert>
          ) : null
        }
      />

      <DialogConfirm
        isOpen={!!confirmRevert}
        title="Revert Request Purchase?"
        message={`Status RP akan dikembalikan ke ${confirmRevert?.status === 'division_review' ? 'Manager Approval' : 'Proses Divisi'}.`}
        confirmLabel="Ya, Revert"
        tone="warning"
        icon="restart_alt"
        onClose={() => setConfirmRevert(null)}
        onConfirm={processRevert}
        loading={actionLoading}
      />

      <DialogSuccesAction
        isOpen={actionResultDialog?.kind === 'success'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor RP"
        icon={actionResultDialog?.icon || 'restart_alt'}
        onConfirm={() => {
          setActionResultDialog(null)
          loadData()
        }}
        buttonText="Tutup"
      />

      <DialogFailAction
        isOpen={actionResultDialog?.kind === 'fail'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor RP"
        icon={actionResultDialog?.icon || 'restart_alt'}
        onConfirm={() => {
          setActionResultDialog(null)
        }}
        buttonText="Tutup"
      />
      </main>
    </>
  )
}
