import React, { useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useLocation } from 'react-router-dom'

import DialogFrpDetail from '../../components/Dialog/DialogDetailFrp'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import { useUser } from '../../contexts/UserContext'
import FilterApprovalFrp from './FilterApprovalFrp'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

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

export default function ApprovalFRP() {
  const { pathname } = useLocation()
  const isApprovedView = pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { setUser } = useUser()
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [copiedFrpId, setCopiedFrpId] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    requester: '',
    status: '',
    division: '',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const requestSort = (key) => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
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

  const loadData = () => {
    fetch(`/api/data/approval?view=${isApprovedView ? 'approved' : 'pending'}`)
      .then((response) => {
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
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // auto-refresh setiap 30 detik
    return () => clearInterval(interval)
  }, [isApprovedView])

  useEffect(() => {
    const handler = (event) => {
      if (event.data === 'refresh') {
        loadData()
      }
    }

    window.addEventListener('message', handler)

    return () => window.removeEventListener('message', handler)
  }, [isApprovedView])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const calcTotal = (request) => {
    if (!request.items) {
      return 0
    }

    return request.items.reduce((sum, item) => sum + parseAmount(item.amount), 0)
  }

  const divisions = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((request) => request.divisi))].sort() : []),
    [data],
  )

  const filtered = useMemo(() => {
    if (!data?.requests) {
      return []
    }

    const filteredList = data.requests.filter((request) => {
      const searchLower = (filters.search || '').toLowerCase()
      const matchSearch =
        !searchLower ||
        (request.frpNo || '').toLowerCase().includes(searchLower) ||
        (request.vendor || '').toLowerCase().includes(searchLower) ||
        (request.dimintaOleh || '').toLowerCase().includes(searchLower) ||
        (request.divisi || '').toLowerCase().includes(searchLower) ||
        (request.status || '').toLowerCase().includes(searchLower) ||
        (request.approvedBy || '').toLowerCase().includes(searchLower) ||
        (request.items || []).some(item => 
          (item.memo || '').toLowerCase().includes(searchLower) ||
          (item.budgetId || '').toLowerCase().includes(searchLower) ||
          (item.projectName || '').toLowerCase().includes(searchLower)
        )
      const matchDate = !filters.date || request.tanggalFrp === filters.date
      const matchRequester =
        !filters.requester ||
        (request.dimintaOleh || '').toLowerCase().includes(filters.requester.toLowerCase())
      const matchStatus = !filters.status || request.status === filters.status
      const matchDivision = !filters.division || request.divisi === filters.division

      return matchSearch && matchDate && matchRequester && matchStatus && matchDivision
    })

    return filteredList.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'date') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (parseInt(a.id) || 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (parseInt(b.id) || 0);
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      } else if (sortConfig.key === 'requester') {
        valA = (a.dimintaOleh || '').toLowerCase();
        valB = (b.dimintaOleh || '').toLowerCase();
      } else if (sortConfig.key === 'division') {
        valA = (a.divisi || '').toLowerCase();
        valB = (b.divisi || '').toLowerCase();
      } else if (sortConfig.key === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      } else if (sortConfig.key === 'total') {
        valA = calcTotal(a);
        valB = calcTotal(b);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, filters, sortConfig])

  const confirmActionMeta = {
    approve: {
      eyebrow: 'Konfirmasi Approval',
      title: 'Approve FRP?',
      message: 'FRP akan disetujui.',
      confirmLabel: 'Ya, Approve',
      icon: 'check_circle',
      tone: 'approve',
    },
    reject: {
      eyebrow: 'Konfirmasi Reject',
      title: 'Reject FRP?',
      message: 'FRP akan ditolak.',
      confirmLabel: 'Ya, Reject',
      icon: 'cancel',
      tone: 'reject',
    },
    revert: {
      eyebrow: 'Konfirmasi Revert',
      title: 'Revert Status?',
      message: 'Status FRP akan dikembalikan ke draft/pending.',
      confirmLabel: 'Ya, Revert',
      icon: 'restart_alt',
      tone: 'warning',
    }
  }

  const requestAction = (request, action) => {
    setConfirmAction({ request, action })
  }

  const doAction = async (id, action) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/frp/${id}/${action}`, { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setConfirmAction(null)
        setSelectedRequest(null)
        loadData()
      } else {
        window.alert(result.error || 'Gagal memproses data')
      }
    } catch (e) {
      window.alert(e.message)
    } finally {
      setActionLoading(false)
    }
  }

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

  const user = data?.user || {}
  const canApprove = data?.canApprove
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const statusColors = {
    PENDING: { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
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
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
  }

  const requesters = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((request) => request.dimintaOleh).filter(Boolean))].sort() : []),
    [data],
  )

  const requesterOptions = useMemo(
    () => requesters.map(requester => ({ value: requester, label: requester })),
    [requesters],
  )

  const divisionOptions = useMemo(
    () => divisions.map(division => ({ value: division, label: division })),
    [divisions],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'APPROVED', label: 'APPROVED' },
      { value: 'REJECTED', label: 'REJECTED' },
    ],
    [],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, isApprovedView, rowsPerPage])

  const desktopHeaders = [
    { label: 'Ringkasan', key: 'date' },
    { label: 'Pemohon & Vendor', key: 'requester' },
    { label: 'Divisi', key: 'division' },
    { label: 'Total', key: 'total' },
    { label: 'Status', key: 'status' },
    { label: 'Action', key: null },
  ]

  const desktopColumnWidths = ['15%', '17%', '7%', '7%', '9%', '15%']
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, rowsPerPage, safeCurrentPage])

  const rangeStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage + 1
  const rangeEnd = Math.min(filtered.length, safeCurrentPage * rowsPerPage)

  const exportToCSV = () => {
    if (!filtered || filtered.length === 0) return
    const headers = ['No FRP', 'Tanggal FRP', 'Pemohon', 'Vendor', 'Divisi', 'Total', 'Status']
    const rows = filtered.map(req => [
      req.frpNo || '',
      formatDate(req.tanggalFrp),
      req.dimintaOleh || '',
      req.vendor || '',
      req.divisi || '',
      calcTotal(req),
      req.status || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `FRP_${isApprovedView ? 'History' : 'Pending'}_Export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          border-color: #1e5e4d !important;
          box-shadow: 0 0 0 3px rgba(30, 94, 77, 0.15) !important;
        }
        .select-dropdown-btn {
          transition: all 0.2s ease-in-out;
        }
        .select-dropdown-btn:focus, .select-dropdown-btn:hover {
          border-color: #1e5e4d !important;
          box-shadow: 0 0 0 3px rgba(30, 94, 77, 0.15) !important;
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

      <main
        className="dashboard-main"
        style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
      >
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b' }}>
            Memuat data...
          </div>
        )}

        {/* Unified Table & Filter Card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            borderRadius: '16px',
            border: '1.5px solid #e8edf4',
            boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)',
            overflow: 'hidden',
          }}
        >
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
                  background: '#e6f2f0',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#1e5e4d',
                }}>
                  <span className="material-icons-round" style={{ fontSize: '20px' }}>filter_alt</span>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                    Approval FRP
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
                    : `repeat(${isApprovedView ? 5 : 4}, minmax(140px, 1fr))`,
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
                    placeholder="No FRP / Vendor..."
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

                {/* Pemohon */}
                <FilterField label="Request By" icon="person">
                  <SearchableSelect
                    value={filters.requester}
                    onChange={(v) => setFilters((c) => ({ ...c, requester: v }))}
                    options={requesterOptions}
                    placeholder="Semua Pemohon"
                    style={filterInput}
                  />
                </FilterField>

                {/* Status (only if approved view) */}
                {isApprovedView && (
                  <FilterField label="Status" icon="rule">
                    <SearchableSelect
                      value={filters.status}
                      onChange={(v) => setFilters((c) => ({ ...c, status: v }))}
                      options={statusOptions}
                      placeholder="Semua Status"
                      style={filterInput}
                    />
                  </FilterField>
                )}

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

            </div>
          </div>
          {/* Table Container */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              overflow: 'hidden',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '4rem 2rem' }}>
                <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>task</span>
                <h3 style={{ margin: '0 0 0.5rem', color: '#64748b', fontWeight: 600 }}>Belum Ada Data</h3>
              </div>
            ) : isMobile ? (
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
                          {isApprovedView && request.approvedBy && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Approved By</div>
                              <div style={{ fontSize: '13px', color: '#1e293b' }}>{request.approvedBy}</div>
                            </div>
                          )}
                          {request.attachLink && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '2px' }}>Attach Link</div>
                              <div style={{ fontSize: '13px' }}><a href={request.attachLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Buka Link</a></div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {canApprove && !isApprovedView && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              borderRadius: '30px',
                              padding: '4px',
                              gap: '4px',
                              width: '100%',
                            }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); requestAction(request, 'reject'); }}
                                style={{
                                  flex: 1,
                                  display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                                  background: 'white',
                                  color: '#ef4444', 
                                  border: '1px solid transparent', 
                                  borderRadius: '24px',
                                  padding: '5px 10px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); requestAction(request, 'approve'); }}
                                style={{
                                  flex: 1,
                                  display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '24px',
                                  padding: '5px 10px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span>
                                Approve
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(request)}
                            style={{
                              width: '100%',
                              display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px',
                              background: 'white',
                              color: '#3b82f6', 
                              border: '1px solid transparent', 
                              borderRadius: '24px',
                              padding: '5px 10px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#eff6ff'
                              e.currentTarget.style.color = '#2563eb'
                              e.currentTarget.style.borderColor = '#93c5fd'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white'
                              e.currentTarget.style.color = '#3b82f6'
                              e.currentTarget.style.borderColor = 'transparent'
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                            Detail
                          </button>
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
            ) : (
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
                              padding: '14px 16px',
                              textAlign: 'left',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              whiteSpace: 'nowrap',
                              background: '#f8fafc',
                              borderBottom: '1.5px solid #e2e8f0',
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
                        {paginated.map((request, idx) => {
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
                                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>{request.dimintaOleh || '-'}</div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>{request.vendor || '-'}</div>
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

                                {/* 6. Action */}
                                <td style={{ ...td, borderRight: 'none' }}>
                                  {((canApprove && !isApprovedView) || request.canRevert) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                                      {canApprove && !isApprovedView && (
                                        <div style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: '#f1f5f9',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '30px',
                                          padding: '4px',
                                          gap: '4px',
                                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); requestAction(request, 'reject'); }}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                                              background: 'white',
                                              color: '#ef4444', 
                                              border: '1px solid transparent', 
                                              borderRadius: '24px',
                                              padding: '4px 10px', 
                                              fontSize: '11px', 
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.background = '#fee2e2'
                                              e.currentTarget.style.color = '#dc2626'
                                              e.currentTarget.style.borderColor = '#fca5a5'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.background = 'white'
                                              e.currentTarget.style.color = '#ef4444'
                                              e.currentTarget.style.borderColor = 'transparent'
                                            }}
                                          >
                                            <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
                                            Reject
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); requestAction(request, 'approve'); }}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                              color: 'white', 
                                              border: 'none', 
                                              borderRadius: '24px',
                                              padding: '4px 12px', 
                                              fontSize: '11px', 
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.transform = 'translateY(-1px)'
                                              e.currentTarget.style.boxShadow = '0 4px 10px rgba(16,185,129,0.4)'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.transform = 'translateY(0)'
                                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(16,185,129,0.3)'
                                            }}
                                          >
                                            <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span>
                                            Approve
                                          </button>
                                        </div>
                                      )}
                                      {request.canRevert && isApprovedView && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); requestAction(request, 'revert'); }}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            color: '#d97706', border: '1.5px solid rgba(245, 158, 11, 0.4)', borderRadius: '20px',
                                            padding: '6px 12px', fontSize: '11px', fontWeight: 700,
                                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(217,119,6,0.05)',
                                            transition: 'all 0.2s',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'
                                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)'
                                            e.currentTarget.style.transform = 'translateY(-1px)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'
                                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'
                                            e.currentTarget.style.transform = 'translateY(0)'
                                          }}
                                        >
                                          <span className="material-icons-round" style={{ fontSize: '14px' }}>restart_alt</span>
                                          Revert
                                        </button>
                                      )}
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
                                              Detail Item & Anggaran
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                              {isApprovedView && request.approvedBy && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Approved By</div>
                                                  <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '8px', background: 'rgba(248, 250, 252, 0.7)', border: '1.5px solid rgba(226, 232, 240, 0.6)', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                                    {request.approvedBy || '-'}
                                                  </div>
                                                </div>
                                              )}

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }}
                                                  style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    background: 'white',
                                                    color: '#3b82f6', 
                                                    border: '1px solid transparent', 
                                                    borderRadius: '24px',
                                                    padding: '4px 10px', 
                                                    fontSize: '11px', 
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#eff6ff'
                                                    e.currentTarget.style.color = '#2563eb'
                                                    e.currentTarget.style.borderColor = '#93c5fd'
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'white'
                                                    e.currentTarget.style.color = '#3b82f6'
                                                    e.currentTarget.style.borderColor = 'transparent'
                                                  }}
                                                >
                                                  <span className="material-icons-round" style={{ fontSize: '14px' }}>open_in_new</span>
                                                  Detail
                                                </button>
                                              </div>
                                            </div>
                                          </div>
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
                        })}
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
            )}
          </div>
        </div>
      </main>

      <DialogFrpDetail
        isOpen={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        canApprove={data?.canApprove}
        isApprovedView={isApprovedView}
        userRole={user.role}
        onApprove={(req) => setConfirmAction({ request: req, action: 'approve' })}
        onReject={(req) => setConfirmAction({ request: req, action: 'reject' })}
        onRevert={(req) => setConfirmAction({ request: req, action: 'revert' })}
      />

      <DialogConfirm
        isOpen={!!confirmAction}
        eyebrow={confirmAction ? confirmActionMeta[confirmAction.action]?.eyebrow : ''}
        title={confirmAction ? confirmActionMeta[confirmAction.action]?.title : ''}
        message={confirmAction ? confirmActionMeta[confirmAction.action]?.message : ''}
        confirmLabel={confirmAction ? confirmActionMeta[confirmAction.action]?.confirmLabel : ''}
        icon={confirmAction ? confirmActionMeta[confirmAction.action]?.icon : ''}
        tone={confirmAction ? confirmActionMeta[confirmAction.action]?.tone : 'primary'}
        isLoading={actionLoading}
        onClose={() => { if (!actionLoading) setConfirmAction(null) }}
        onConfirm={() => confirmAction && doAction(confirmAction.request.id, confirmAction.action)}
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
            <strong style={{ color: '#1e293b' }}>{confirmAction.request.frpNo || 'Draft FRP'}</strong>
            <span style={{ color: '#64748b' }}> dari </span>
            <strong style={{ color: '#1e293b' }}>{confirmAction.request.dimintaOleh || '-'}</strong>
          </div>
        )}
      </DialogConfirm>
    </>
  )
}
