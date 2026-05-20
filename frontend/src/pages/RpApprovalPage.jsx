import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import DialogConfirm from '../components/Dialog/DialogConfirm'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const STATUS_META = {
  PENDING_MANAGER: { label: 'Menunggu Manager', background: '#fef3c7', color: '#92400e' },
  PENDING_PROCESS: { label: 'Menunggu Proses', background: '#dbeafe', color: '#1d4ed8' },
  PENDING_PROCESS_APPROVAL: { label: 'Approval Proses', background: '#ede9fe', color: '#6d28d9' },
  APPROVED: { label: 'Approved', background: '#bbf7d0', color: '#166534' },
  REJECTED: { label: 'Rejected', background: '#fecaca', color: '#991b1b' },
  CREATED_FRP: { label: 'Created FRP', background: '#cffafe', color: '#0e7490' },
}

const ACTION_META = {
  'manager-approve': {
    eyebrow: 'Konfirmasi Approval',
    title: 'Approve Request Purchase?',
    message: 'Request Purchase akan lanjut ke divisi pemroses.',
    confirmLabel: 'Ya, Approve',
    icon: 'check_circle',
    tone: 'approve',
  },
  'manager-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Request Purchase?',
    message: 'Request Purchase akan ditolak dari tahap manager.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  'process-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Dari Proses Divisi?',
    message: 'Request Purchase akan ditolak dari tahap divisi pemroses.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  'process-manager-approve': {
    eyebrow: 'Konfirmasi Final Approval',
    title: 'Final Approve Request Purchase?',
    message: 'Request Purchase akan masuk ke status approved.',
    confirmLabel: 'Ya, Final Approve',
    icon: 'verified',
    tone: 'approve',
  },
  'process-manager-reject': {
    eyebrow: 'Konfirmasi Reject',
    title: 'Reject Final Approval?',
    message: 'Request Purchase akan ditolak dari tahap final approval.',
    confirmLabel: 'Ya, Reject',
    icon: 'cancel',
    tone: 'reject',
  },
  revert: {
    eyebrow: 'Konfirmasi Revert',
    title: 'Revert Request Purchase?',
    message: 'Status RP akan dikembalikan ke pending manager.',
    confirmLabel: 'Ya, Revert',
    icon: 'restart_alt',
    tone: 'warning',
  },
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

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
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
    } catch (_) {}
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div style={{ position: 'relative' }} onClick={openPicker}>
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
        style={{
          ...style,
          paddingRight: '48px',
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
        <button
          type="button"
          onClick={openPicker}
          aria-label="Buka kalender"
          style={{
            position: 'absolute',
            top: '50%',
            right: '8px',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            border: 'none',
            background: '#e2e8f0',
            color: '#475569',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            pointerEvents: 'none',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>calendar_month</span>
        </button>
      </div>
    </div>
  )
}

function SearchableSelect({ value, onChange, options, placeholder = 'Pilih...', style }) {
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
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1 }}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          minHeight: style?.minHeight || '42px',
          boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)',
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
              style={{ ...style, fontSize: '0.875rem', padding: '8px 10px', minHeight: 'unset' }}
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

export default function RpApprovalPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isApprovedView = pathname === '/rp-approved'
  const { setUser } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [tab, setTab] = useState(isApprovedView ? 'approved' : 'pending')
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    creator: '',
    status: '',
    division: '',
    processor: '',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false)
  const tabDropdownRef = useRef(null)

  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const tabs = [
    { key: 'pending', label: 'Manager Approval', icon: 'hourglass_top' },
    { key: 'process', label: 'Proses Divisi', icon: 'engineering' },
    { key: 'process-approval', label: 'Approval Proses', icon: 'verified' },
    { key: 'approved', label: 'Selesai', icon: 'done_all' },
  ]

  const loadData = (view = tab) => {
    setLoading(true)
    fetch(`/api/data/rp-approval?view=${view}`)
      .then(response => {
        if (!response.ok) {
          window.location.href = '/login'
          throw new Error('Unauthorized')
        }
        return response.json()
      })
      .then(d => {
        setData(d)
        setUser(d?.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const nextTab = isApprovedView ? 'approved' : 'pending'
    setTab(nextTab)
  }, [isApprovedView])

  useEffect(() => {
    loadData(tab)
  }, [tab])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, rowsPerPage, tab])

  useEffect(() => {
    if (!confirmAction) return undefined

    const handleKeyDown = event => {
      if (event.key === 'Escape' && !actionLoading) {
        setConfirmAction(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmAction, actionLoading])

  useEffect(() => {
    if (!tabDropdownOpen) return undefined
    const handleOutside = e => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(e.target)) setTabDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [tabDropdownOpen])

  const requestSort = key => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const renderSortIcon = key => {
    if (!key) return null
    if (sortConfig.key !== key) {
      return <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.3 }}>unfold_more</span>
    }
    return sortConfig.direction === 'asc'
      ? <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_upward</span>
      : <span className="material-icons-round" style={{ fontSize: '14px', marginLeft: '4px', verticalAlign: 'middle', color: '#2563eb' }}>arrow_downward</span>
  }

  const calcTotal = rp =>
    (rp.items || []).reduce((sum, item) => sum + parseNumber(item.qty) * parseNumber(item.estimatedValue), 0)

  const requestAction = (rp, action, body = {}) => {
    setConfirmAction({ rp, action, body })
  }

  const doAction = async (id, action, body = {}) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/rp/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (result.success) {
        setConfirmAction(null)
        setSelected(null)
        loadData(tab)
      } else {
        window.alert(result.error || 'Gagal memproses data')
      }
    } catch (error) {
      window.alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const D = data || {}
  const requests = D.requests || []
  const user = D.user || {}
  const isAdmin = user.role === 'administrator'
  const userDivision = user.selectedDivision || ''
  const isProcessDivision = division => ['IT', 'HCGA', 'Product'].includes(userDivision) && userDivision === division
  const isProcessManager = division =>
    ['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) &&
    ['IT', 'HCGA', 'Product'].includes(userDivision) &&
    userDivision === division

  const divisions = useMemo(
    () => [...new Set(requests.map(request => request.divisi).filter(Boolean))].sort(),
    [requests],
  )
  const processors = useMemo(
    () => [...new Set(requests.map(request => request.diprosesOleh).filter(Boolean))].sort(),
    [requests],
  )
  const creators = useMemo(
    () => [...new Set(requests.map(request => request.dibuatOleh).filter(Boolean))].sort(),
    [requests],
  )

  const filtered = useMemo(() => {
    const list = requests.filter(request => {
      const search = filters.search.toLowerCase()
      const matchSearch =
        !search ||
        (request.rpNo || '').toLowerCase().includes(search) ||
        (request.vendorSuggestion || '').toLowerCase().includes(search) ||
        (request.kategoriPembelian || '').toLowerCase().includes(search)
      const requestDate = (request.createdAt || request.tanggalDibutuhkan || '').slice(0, 10)
      const matchDate = !filters.date || requestDate === filters.date || request.tanggalDibutuhkan === filters.date
      const matchCreator = !filters.creator || request.dibuatOleh === filters.creator
      const matchStatus = !filters.status || request.status === filters.status
      const matchDivision = !filters.division || request.divisi === filters.division
      const matchProcessor = !filters.processor || request.diprosesOleh === filters.processor

      return matchSearch && matchDate && matchCreator && matchStatus && matchDivision && matchProcessor
    })

    return list.sort((a, b) => {
      let valA
      let valB
      if (sortConfig.key === 'date') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id, 10) || 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id, 10) || 0
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA
      }
      if (sortConfig.key === 'rpNo') {
        valA = (a.rpNo || '').toLowerCase()
        valB = (b.rpNo || '').toLowerCase()
      } else if (sortConfig.key === 'creator') {
        valA = (a.dibuatOleh || '').toLowerCase()
        valB = (b.dibuatOleh || '').toLowerCase()
      } else if (sortConfig.key === 'division') {
        valA = (a.divisi || '').toLowerCase()
        valB = (b.divisi || '').toLowerCase()
      } else if (sortConfig.key === 'processor') {
        valA = (a.diprosesOleh || '').toLowerCase()
        valB = (b.diprosesOleh || '').toLowerCase()
      } else if (sortConfig.key === 'status') {
        valA = (a.status || '').toLowerCase()
        valB = (b.status || '').toLowerCase()
      } else if (sortConfig.key === 'total') {
        valA = calcTotal(a)
        valB = calcTotal(b)
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [requests, filters, sortConfig])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safeCurrentPage])
  const rangeStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safeCurrentPage * rowsPerPage)

  const creatorOptions = useMemo(() => creators.map(value => ({ value, label: value })), [creators])
  const divisionOptions = useMemo(() => divisions.map(value => ({ value, label: value })), [divisions])
  const processorOptions = useMemo(() => processors.map(value => ({ value, label: value })), [processors])
  const statusOptions = useMemo(
    () => Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
    [],
  )

  const filterInput = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1.5px solid #dde3ed',
    fontSize: '13px',
    background: 'white',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    minHeight: '42px',
  }
  const detailValueBox = {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1.5px solid #d7e0ea',
    background: '#f8fafc',
    color: '#334155',
    lineHeight: 1.5,
    minHeight: '42px',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
  }
  const filterGridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : getGridColumns(6, false, isTablet),
      gap: isMobile ? '10px' : '15px',
      alignItems: 'flex-end',
    }),
    [isMobile, isTablet],
  )
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

  const actionButtonStyle = variant => {
    const variants = {
      approve: { background: '#dcfce7', color: '#15803d', border: 'none' },
      reject: { background: '#fee2e2', color: '#dc2626', border: 'none' },
      neutral: { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' },
      primary: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
      warning: { background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' },
    }
    return {
      padding: '8px',
      borderRadius: '8px',
      cursor: actionLoading ? 'not-allowed' : 'pointer',
      fontWeight: 700,
      fontSize: '13px',
      fontFamily: 'inherit',
      opacity: actionLoading ? 0.7 : 1,
      ...variants[variant],
    }
  }

  const renderStatus = status => {
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

  const renderRowActions = (rp, options = {}) => {
    const { showDetail = true, showPreview = true, showKeFrp = true } = options
    const canManagerApprove =
      rp.status === 'PENDING_MANAGER' &&
      (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) && userDivision === rp.divisi))
    const canProcess = rp.status === 'PENDING_PROCESS' && (isAdmin || isProcessDivision(rp.diprosesOleh))
    const canFinalApprove = rp.status === 'PENDING_PROCESS_APPROVAL' && (isAdmin || isProcessManager(rp.diprosesOleh))
    const canCreateFrp =
      rp.status === 'APPROVED' &&
      (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {showDetail && (
          <button type="button" onClick={() => setSelected(rp)} style={actionButtonStyle('primary')}>Detail</button>
        )}
        {showPreview && (
          <button type="button" onClick={() => window.open(`/api/rp/${rp.id}/preview`, '_blank')} style={actionButtonStyle('neutral')}>Preview</button>
        )}
        {canManagerApprove && (
          <>
            <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'manager-approve')} style={actionButtonStyle('approve')}>Approve</button>
            <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'manager-reject')} style={actionButtonStyle('reject')}>Reject</button>
          </>
        )}
        {canProcess && (
          <>
            <button type="button" onClick={() => navigate(`/rp?process=${rp.id}`)} style={actionButtonStyle('warning')}>Check Data</button>
            <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'process-reject')} style={actionButtonStyle('reject')}>Reject</button>
          </>
        )}
        {canFinalApprove && (
          <>
            <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-approve')} style={actionButtonStyle('approve')}>Final Approve</button>
            <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-reject')} style={actionButtonStyle('reject')}>Reject</button>
          </>
        )}
        {canCreateFrp && showKeFrp && (
          <button type="button" onClick={() => navigate(`/frp?fromRp=${rp.id}`)} style={actionButtonStyle('primary')}>Ke FRP</button>
        )}
        {isAdmin && rp.status !== 'PENDING_MANAGER' && (
          <button type="button" disabled={actionLoading} onClick={() => requestAction(rp, 'revert')} style={actionButtonStyle('warning')}>Revert</button>
        )}
      </div>
    )
  }

  // renderConfirmDialog has been replaced with DialogConfirm component

  const renderDetail = () => {
    if (!selected) return null
    const items = selected.items || []
    const total = calcTotal(selected)

    return (
      <div className="dashboard-popup-overlay" role="presentation" onClick={() => setSelected(null)}>
        <div
          className="dashboard-popup dashboard-popup--frp-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rp-detail-title"
          onClick={event => event.stopPropagation()}
        >
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{tab === 'approved' ? 'Completed Request' : 'Request Purchase'}</p>
              <h2 className="dashboard-popup__title" id="rp-detail-title">{selected.rpNo || 'Draft RP'}</h2>
            </div>
            <div className="frp-detail-header-actions">
              <button type="button" className="dashboard-popup__close" aria-label="Tutup dialog" onClick={() => setSelected(null)}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          </div>
          <div className="dashboard-popup__body dashboard-popup__body--frp-detail" style={{ overflowY: 'auto' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: '1rem' }}>
                {[
                  ['Company', selected.companyName],
                  ['Divisi', selected.divisi],
                  ['Class', selected.class],
                  ['Dibuat Oleh', selected.dibuatOleh],
                  ['Kategori', selected.kategoriPembelian],
                  ['Diproses Oleh', selected.diprosesOleh],
                  ['Tanggal Dibutuhkan', formatDate(selected.tanggalDibutuhkan)],
                  ['Vendor Suggestion', selected.vendorSuggestion],
                  ['PIC Penerima', selected.picPenerima],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</div>
                    <div style={detailValueBox}>{value || '-'}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '4px' }}>Deskripsi</div>
                <div style={detailValueBox}>{selected.deskripsi || '-'}</div>
              </div>

              {selected.processChanges?.length > 0 && (
                <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {selected.processChanges.map((change, index) => (
                      <div key={`${change.field}-${index}`} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.45 }}>
                        <strong>{change.field}:</strong>{' '}
                        <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{change.oldValue || '(kosong)'}</span>
                        <span style={{ color: '#64748b' }}> -&gt; </span>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>{change.newValue || '(kosong)'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '8px' }}>
                    Diubah oleh: {selected.processUpdatedBy || '-'} {selected.processUpdatedAt ? `(${formatDate(selected.processUpdatedAt)})` : ''}
                  </div>
                </div>
              )}

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: 'white' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', minWidth: '760px' }}>
                    <thead>
                      <tr>
                        {['No', 'Item Group', 'Memo', 'Link', 'Qty', 'Est. Value', 'Subtotal'].map(header => (
                          <th key={header} style={{ padding: '10px 12px', textAlign: 'left', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const subtotal = parseNumber(item.qty) * parseNumber(item.estimatedValue)
                        return (
                          <tr key={`${item.budgetId}-${index}`}>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{index + 1}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{item.budgetId || '-'}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{item.memo || '-'}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                              {item.linkPembelian ? <a href={item.linkPembelian} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>Buka Link</a> : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{item.qty || '-'}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{formatCurrency(item.estimatedValue)}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>{formatCurrency(subtotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>Total Estimated</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f4e8c', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(total)}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => window.open(`/api/rp/${selected.id}/preview`, '_blank')} style={actionButtonStyle('neutral')}>Preview</button>
                <button type="button" onClick={() => window.open(`/api/rp/${selected.id}/pdf`, '_blank')} style={actionButtonStyle('neutral')}>Print PDF</button>
                {renderRowActions(selected, { showDetail: false, showPreview: false, showKeFrp: false })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {isMobile ? (
          <div ref={tabDropdownRef} style={{ position: 'relative', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => setTabDropdownOpen(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', border: '2px solid #1f4e8c', background: '#eff6ff', color: '#1f4e8c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>{tabs.find(t => t.key === tab)?.icon}</span>
                {tabs.find(t => t.key === tab)?.label}
                <span style={{ background: '#1f4e8c', color: 'white', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '1px 8px', lineHeight: 1.6 }}>{D.counts?.[tab] ?? 0}</span>
              </span>
              <span className="material-icons-round" style={{ fontSize: '20px' }}>{tabDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {tabDropdownOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', border: '1.5px solid #dbe5f0', borderRadius: '12px', boxShadow: '0 14px 30px rgba(15,23,42,0.14)', zIndex: 50, overflow: 'hidden' }}>
                {tabs.map(item => {
                  const active = tab === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => { setTab(item.key); setTabDropdownOpen(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', border: 'none', borderTop: '1px solid #f1f5f9', background: active ? '#eff6ff' : 'white', color: active ? '#1f4e8c' : '#334155', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', textAlign: 'left' }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <span style={{ background: active ? '#1f4e8c' : '#e2e8f0', color: active ? 'white' : '#475569', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '1px 8px', lineHeight: 1.6 }}>{D.counts?.[item.key] ?? 0}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {tabs.map(item => {
              const count = D.counts?.[item.key] ?? 0
              const active = tab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: active ? '2px solid #1f4e8c' : '1.5px solid #e2e8f0', background: active ? '#eff6ff' : 'white', color: active ? '#1f4e8c' : '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>{item.icon}</span>
                  {item.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        <div style={{ background: '#f1f5f9', borderRadius: '16px', padding: isMobile ? '10px 12px' : '20px', marginBottom: isMobile ? '12px' : '20px', border: '1px solid #e2e8f0' }}>
          {isMobile && (
            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: '2px 0', marginBottom: filtersOpen ? '10px' : 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '17px' }}>tune</span>
                Filter & Pencarian
                {Object.values(filters).some(Boolean) && (
                  <span style={{ background: '#2563eb', color: 'white', borderRadius: '999px', fontSize: '10px', fontWeight: 700, padding: '1px 7px', lineHeight: 1.6 }}>
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </span>
              <span className="material-icons-round" style={{ fontSize: '20px', color: '#94a3b8' }}>
                {filtersOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
          {(!isMobile || filtersOpen) && (
          <div style={filterGridStyle}>
            {[
              {
                label: 'Search',
                content: <input style={filterInput} placeholder="Cari No RP / Vendor / Kategori..." value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} />,
              },
              {
                label: 'Tanggal',
                content: <DateField value={filters.date} onChange={event => setFilters(current => ({ ...current, date: event.target.value }))} style={filterInput} />,
              },
              {
                label: 'Pemohon',
                content: <SearchableSelect value={filters.creator} onChange={value => setFilters(current => ({ ...current, creator: value }))} options={creatorOptions} placeholder="Semua Pemohon" style={filterInput} />,
              },
              {
                label: 'Status',
                content: <SearchableSelect value={filters.status} onChange={value => setFilters(current => ({ ...current, status: value }))} options={statusOptions} placeholder="Semua Status" style={filterInput} />,
              },
              {
                label: 'Divisi',
                content: <SearchableSelect value={filters.division} onChange={value => setFilters(current => ({ ...current, division: value }))} options={divisionOptions} placeholder="Semua Divisi" style={filterInput} />,
              },
              {
                label: 'Diproses',
                content: <SearchableSelect value={filters.processor} onChange={value => setFilters(current => ({ ...current, processor: value }))} options={processorOptions} placeholder="Semua Proses" style={filterInput} />,
              },
            ].map(({ label, content }, index) => (
              <div key={label} style={{ gridColumn: isMobile && index === 0 ? '1 / -1' : undefined }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  {label}
                </label>
                {content}
              </div>
            ))}
          </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', padding: '4rem 2rem' }}>Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
              <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>inventory_2</span>
              <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
            </div>
          ) : isMobile ? (
            <>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginated.map(rp => (
                  <div key={rp.id} style={{ background: 'white', border: '1px solid #e8edf4', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.9rem', marginBottom: '4px' }}>{rp.rpNo || 'Draft'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(rp.createdAt || rp.tanggalDibutuhkan)}</div>
                      </div>
                      {renderStatus(rp.status)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '12px' }}>
                      {[
                        ['Pemohon', rp.dibuatOleh || '-'],
                        ['Divisi', rp.divisi || '-'],
                        ['Kategori', rp.kategoriPembelian || '-'],
                        ['Diproses', rp.diprosesOleh || '-'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{value}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Total</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: '#0f172a' }}>{formatCurrency(calcTotal(rp))}</div>
                      </div>
                    </div>
                    {renderRowActions(rp)}
                  </div>
                ))}
              </div>
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{rangeStart}-{rangeEnd} dari {filtered.length}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Rows</span>
                  <select value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px' }}>
                    {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                  <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Prev</button>
                  <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Next</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                  <colgroup>
                    {desktopColumnWidths.map((width, index) => <col key={`desktop-head-col-${index}`} style={{ width }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      {desktopHeaders.map(header => (
                        <th key={header.label} onClick={() => requestSort(header.key)} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)', cursor: header.key ? 'pointer' : 'default', userSelect: 'none' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {header.label}
                            {renderSortIcon(header.key)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                  <table style={{ width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' }}>
                    <colgroup>
                      {desktopColumnWidths.map((width, index) => <col key={`desktop-body-col-${index}`} style={{ width }} />)}
                    </colgroup>
                    <tbody>
                      {paginated.map((rp, index) => {
                        const rowBg = index % 2 === 0 ? 'white' : '#fafbfc'
                        const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }
                        return (
                          <tr
                            key={rp.id}
                            style={{ background: rowBg }}
                            onMouseEnter={event => { event.currentTarget.style.background = '#eff6ff' }}
                            onMouseLeave={event => { event.currentTarget.style.background = rowBg }}
                          >
                              <td style={td}>
                                <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.82rem', marginBottom: '4px', wordBreak: 'break-word' }}>{rp.rpNo || 'Draft'}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>{formatDate(rp.createdAt || rp.tanggalDibutuhkan)}</div>
                              </td>
                              <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.45 }}>
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{rp.dibuatOleh || '-'}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{rp.kategoriPembelian || '-'}</div>
                              </td>
                              <td style={{ ...td, whiteSpace: 'normal' }}><span style={{ background: '#e0e7ef', color: '#334155', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, display: 'inline-block', maxWidth: '100%', wordBreak: 'break-word' }}>{rp.divisi || '-'}</span></td>
                              <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>{rp.diprosesOleh || '-'}</td>
                              <td style={{ ...td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, whiteSpace: 'normal', color: '#0f172a', wordBreak: 'break-word' }}>{formatCurrency(calcTotal(rp))}</td>
                              <td style={td}>{renderStatus(rp.status)}</td>
                              <td style={{ ...td, whiteSpace: 'normal' }}>
                                {renderRowActions(rp, { showDetail: false, showPreview: false })}
                              </td>
                              <td style={{ ...td, whiteSpace: 'normal' }}>
                                <button type="button" onClick={() => setSelected(rp)} style={actionButtonStyle('primary')}>Detail</button>
                              </td>
                            </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexWrap: 'nowrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{rangeStart}-{rangeEnd} dari {filtered.length} data</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
                    <select value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dbe5f0', fontFamily: 'inherit', fontSize: '12px', background: 'white' }}>
                      {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Page {safeCurrentPage} / {totalPages}</div>
                  <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === 1 ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Prev</button>
                  <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} style={{ border: '1px solid #dbe5f0', background: safeCurrentPage === totalPages ? '#e2e8f0' : 'white', color: '#475569', borderRadius: '8px', padding: '6px 10px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      {renderDetail()}
      <DialogConfirm
        isOpen={!!confirmAction}
        eyebrow={confirmAction ? (ACTION_META[confirmAction.action]?.eyebrow || 'Konfirmasi') : ''}
        title={confirmAction ? (ACTION_META[confirmAction.action]?.title || 'Lanjutkan Aksi?') : ''}
        message={confirmAction ? (ACTION_META[confirmAction.action]?.message || 'Aksi ini akan diproses untuk Request Purchase terpilih.') : ''}
        confirmLabel={confirmAction ? (ACTION_META[confirmAction.action]?.confirmLabel || 'Ya, Lanjutkan') : ''}
        icon={confirmAction ? (ACTION_META[confirmAction.action]?.icon || 'help') : ''}
        tone={confirmAction ? (ACTION_META[confirmAction.action]?.tone || 'primary') : 'primary'}
        isLoading={actionLoading}
        onClose={() => { if (!actionLoading) setConfirmAction(null) }}
        onConfirm={() => confirmAction && doAction(confirmAction.rp.id, confirmAction.action, confirmAction.body)}
      >
        {confirmAction && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#1e293b' }}>{confirmAction.rp.rpNo || 'Draft RP'}</strong>
            <span style={{ color: '#64748b' }}> dari </span>
            <strong style={{ color: '#1e293b' }}>{confirmAction.rp.dibuatOleh || '-'}</strong>
          </div>
        )}
      </DialogConfirm>
    </>
  )
}
