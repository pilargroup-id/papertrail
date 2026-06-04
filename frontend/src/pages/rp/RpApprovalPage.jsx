import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import BackgroundDialog from '../../components/template/BackgroundDialog'
import DataTableRp from './DataTableRp'
import ButtonApprove from '../../components/button/ButtonApprove.jsx'
import ButtonReject from '../../components/button/ButtonReject.jsx'
import ButtonRevert from '../../components/button/ButtonRevert.jsx'
import ButtonDetail from '../../components/button/ButtonDetail.jsx'
import ButtonPreview from '../../components/button/ButtonPreview.jsx'
import ButtonPrintPdf from '../../components/button/ButtonPrintPdf.jsx'
import ButtonCheckData from '../../components/button/ButtonCheckData.jsx'
import ButtonKeFrp from '../../components/button/ButtonKeFrp.jsx'
import FilterApprovalRp from './FilterApprovalRp.jsx'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const STATUS_META = {
  waiting_manager: { label: 'Menunggu Manager', background: '#fef3c7', color: '#92400e' },
  division_review: { label: 'Menunggu Proses', background: '#dbeafe', color: '#1d4ed8' },
  final_review: { label: 'Approval Proses', background: '#ede9fe', color: '#6d28d9' },
  approved: { label: 'Approved', background: '#bbf7d0', color: '#166534' },
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
    const interval = setInterval(() => loadData(tab), 30000) // auto-refresh setiap 30 detik
    return () => clearInterval(interval)
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
    let actualAction = action
    if (action === 'revert' && confirmAction?.rp) {
        if (confirmAction.rp.status === 'division_review') {
            actualAction = 'process-revert'
        } else if (confirmAction.rp.status === 'final_review') {
            actualAction = 'process-manager-revert'
        } else if (confirmAction.rp.status === 'approved') {
            actualAction = 'revert-approved'
        }
    }
    try {
      const response = await fetch(`/api/rp/${id}/${actualAction}`, {
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
      approve: { background: '#dcfce7', color: '#15803d', border: 'none', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' },
      reject: { background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' },
      neutral: { background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' },
      primary: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' },
      warning: { background: '#fef9c3', color: '#92400e', border: 'none', padding: '5px 10px', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' },
    }
    const currentVariant = variants[variant] || variants.neutral;
    return {
      cursor: actionLoading ? 'not-allowed' : 'pointer',
      opacity: actionLoading ? 0.7 : 1,
      ...currentVariant,
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
    const { showDetail = true, showPreview = true, showKeFrp = true, showActions = true, showRevert = true } = options
    const canManagerApprove =
      rp.status === 'waiting_manager' &&
      (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) && userDivision === rp.divisi))
    const canProcess = rp.status === 'division_review' && (isAdmin || isProcessDivision(rp.diprosesOleh))
    const canFinalApprove = rp.status === 'final_review' && (isAdmin || isProcessManager(rp.diprosesOleh))
    const canCreateFrp =
      rp.status === 'approved' &&
      (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

    const showDetailActionPill = showDetail && rp.status !== 'waiting_manager'
    const showRevertAction = showRevert && rp.canRevert

    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {showDetail && rp.status === 'waiting_manager' && (
          <ButtonDetail variant="approve" onClick={() => setSelected(rp)}>Detail</ButtonDetail>
        )}
        
        {(showDetailActionPill || showRevertAction) && (
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
            {showDetailActionPill && (
              <ButtonDetail variant="approve" onClick={() => setSelected(rp)}>Detail</ButtonDetail>
            )}
            {showRevertAction && (
              <ButtonRevert disabled={actionLoading} onClick={() => requestAction(rp, 'revert')}>Revert</ButtonRevert>
            )}
          </div>
        )}
        {showPreview && ['approved', 'CREATED_FRP'].includes(rp.status) && (
          <>
            <ButtonPreview onClick={() => window.open(`/api/rp/${rp.id}/preview`, '_blank')}>Preview</ButtonPreview>
            <ButtonPrintPdf onClick={() => window.open(`/api/rp/${rp.id}/pdf`, '_blank')}>Print PDF</ButtonPrintPdf>
          </>
        )}
        {showActions && canManagerApprove && (
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
            <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'manager-reject')}>Reject</ButtonReject>
            <ButtonApprove disabled={actionLoading} onClick={() => requestAction(rp, 'manager-approve')}>Approve</ButtonApprove>
          </div>
        )}
        {showActions && canProcess && (
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
            <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-reject')}>Reject</ButtonReject>
            <ButtonCheckData onClick={() => navigate(`/rp?process=${rp.id}`)}>Check Data</ButtonCheckData>
          </div>
        )}
        {showActions && canFinalApprove && (
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
            <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-reject')}>Reject</ButtonReject>
            <ButtonApprove disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-approve')}>Final Approve</ButtonApprove>
          </div>
        )}
        {canCreateFrp && showKeFrp && (
          <ButtonKeFrp onClick={() => navigate(`/frp?fromRp=${rp.id}`)}>Ke FRP</ButtonKeFrp>
        )}
      </div>
    )
  }

  const renderDetail = () => {
    if (!selected) return null
    const items = selected.items || []
    const total = calcTotal(selected)

    // Determine what actions should be rendered in the footer
    const canManagerApprove =
      selected.status === 'waiting_manager' &&
      (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user.selectedJobLevel) && userDivision === selected.divisi))
    const canProcess = selected.status === 'division_review' && (isAdmin || isProcessDivision(selected.diprosesOleh))
    const canFinalApprove = selected.status === 'final_review' && (isAdmin || isProcessManager(selected.diprosesOleh))
    const canCreateFrp =
      selected.status === 'approved' &&
      (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

    return (
      <div className="dashboard-popup-overlay" role="presentation" onClick={() => setSelected(null)}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          /* Modern premium styles for inputs and panels */
          .dialog-section-premium {
            transition: all 0.2s ease-in-out !important;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          }
          .dialog-section-premium:hover {
            border-color: #cbd5e1 !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04) !important;
          }

          /* Footer buttons styling */
          .btn-dialog {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            min-width: 120px !important;
            border-radius: 10px !important;
            padding: 8px 18px !important;
            font-weight: 600 !important;
            font-size: 0.8rem !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            border: none !important;
            outline: none !important;
            font-family: inherit !important;
            box-sizing: border-box !important;
          }
          .btn-dialog:hover {
            transform: translateY(-2px) !important;
          }
          .btn-dialog:active {
            transform: translateY(0) !important;
          }
          
          .btn-dialog-approve {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3) !important;
          }
          .btn-dialog-approve:hover {
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45) !important;
          }

          .btn-dialog-reject {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3) !important;
          }
          .btn-dialog-reject:hover {
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45) !important;
          }

          .btn-dialog-neutral {
            background: #ffffff !important;
            color: #334155 !important;
            border: 1.5px solid #cbd5e1 !important;
          }
          .btn-dialog-neutral:hover {
            background: #f8fafc !important;
            border-color: #94a3b8 !important;
            box-shadow: 0 4px 12px rgba(148, 163, 184, 0.15) !important;
          }

          .btn-dialog-primary {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important;
          }
          .btn-dialog-primary:hover {
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45) !important;
          }

          .btn-dialog-warning {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3) !important;
          }
          .btn-dialog-warning:hover {
            box-shadow: 0 6px 20px rgba(217, 119, 6, 0.45) !important;
          }

          .btn-dialog-close {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2) !important;
          }
          .btn-dialog-close:hover {
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.3) !important;
          }
        `}</style>
        <div
          className="dashboard-popup dashboard-popup--frp-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rp-detail-title"
          onClick={event => event.stopPropagation()}
          style={{ height: 'auto', maxHeight: '85vh', width: 'min(1180px, calc(100vw - 48px))', margin: 'auto', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        >
          <BackgroundDialog />
          <div className="dashboard-popup__header" style={{ padding: '14px 24px' }}>
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
          <div className="dashboard-popup__body dashboard-popup__body--frp-detail" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '16px 24px 8px 24px' }}>
            <div className="frp-detail-content hide-scrollbar" style={{
              padding: '4px 8px',
              overflowY: 'auto',
              maxHeight: 'calc(85vh - 160px)',
              scrollBehavior: 'smooth',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
            }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: '0.75rem' }}>
                  {[
                    ['Company', selected.companyName],
                    ['Divisi & Proses', <><div style={{ marginBottom: '2px', fontWeight: 600 }}>{selected.divisi || '-'}</div><div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Process by {selected.diprosesOleh || '-'}</div></>],
                    ['Class', selected.classClass || selected.class],
                    ['Dibuat Oleh', selected.dibuatOleh],
                    ['Kategori', selected.kategoriPembelian],
                    ['Tanggal Dibutuhkan', formatDate(selected.requiredDate || selected.tanggalDibutuhkan)],
                    ['Vendor Suggestion', selected.vendorSuggestion],
                    ['PIC Penerima', selected.receiverPic || selected.picPenerima],
                  ].map(([label, value]) => (
                    <div key={label} className="dialog-section-premium" style={{ marginBottom: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</div>
                      <div style={{ ...detailValueBox, border: 'none', background: 'transparent', padding: 0, minHeight: 'auto', boxShadow: 'none' }}>{value || '-'}</div>
                    </div>
                  ))}
                </div>

                <div className="dialog-section-premium">
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', marginBottom: '4px' }}>Deskripsi</div>
                  <div style={{ ...detailValueBox, border: 'none', background: 'transparent', padding: 0, minHeight: 'auto', boxShadow: 'none' }}>{selected.description || selected.deskripsi || '-'}</div>
                </div>

                {selected.processChanges?.changes?.length > 0 && (
                  <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em', marginBottom: '10px' }}>Perubahan Oleh Divisi Pemroses</div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {selected.processChanges.changes.map((change, index) => (
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

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: 'white' }} className="dialog-section-premium">
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em', marginBottom: '8px' }}>Detail Item</div>
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '760px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['No', 'Item Group', 'Memo', 'Link', 'Qty', 'Est. Value', 'Subtotal'].map(header => (
                            <th key={header} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const subtotal = parseNumber(item.qty) * parseNumber(item.estimatedValue)
                          return (
                            <tr key={`${item.budgetId}-${index}`}>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{index + 1}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#334155' }}>{item.budgetId || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{item.memo || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                {item.linkPembelian ? <a href={item.linkPembelian} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>Buka Link</a> : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#334155' }}>{item.qty || '-'}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#475569' }}>{formatCurrency(item.estimatedValue)}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(subtotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px', background: '#f8fafc', borderTop: '1.5px solid #e2e8f0', marginTop: '8px', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '3px' }}>Total Estimated</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'monospace' }}>{formatCurrency(total)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Real fixed dialog footer containing all action buttons */}
          <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['approved', 'CREATED_FRP'].includes(selected.status) && (
              <>
                <button type="button" onClick={() => window.open(`/api/rp/${selected.id}/preview`, '_blank')} className="btn-dialog btn-dialog-neutral">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
                  Preview
                </button>
                <button type="button" onClick={() => window.open(`/api/rp/${selected.id}/pdf`, '_blank')} className="btn-dialog btn-dialog-neutral">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>download</span>
                  Print PDF
                </button>
              </>
            )}

            {canManagerApprove && (
              <>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'manager-approve')} className="btn-dialog btn-dialog-approve">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>check_circle</span>
                  Approve
                </button>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'manager-reject')} className="btn-dialog btn-dialog-reject">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>cancel</span>
                  Reject
                </button>
              </>
            )}

            {canProcess && (
              <>
                <button type="button" onClick={() => navigate(`/rp?process=${selected.id}`)} className="btn-dialog btn-dialog-warning">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>fact_check</span>
                  Check Data
                </button>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'process-reject')} className="btn-dialog btn-dialog-reject">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>cancel</span>
                  Reject
                </button>
              </>
            )}

            {canFinalApprove && (
              <>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'process-manager-approve')} className="btn-dialog btn-dialog-approve">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>check_circle</span>
                  Final Approve
                </button>
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'process-manager-reject')} className="btn-dialog btn-dialog-reject">
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>cancel</span>
                  Reject
                </button>
              </>
            )}

            {canCreateFrp && (
              <button type="button" onClick={() => navigate(`/frp?fromRp=${selected.id}`)} className="btn-dialog btn-dialog-primary">
                <span className="material-icons-round" style={{ fontSize: '18px' }}>receipt_long</span>
                Ke FRP
              </button>
            )}

            {selected.canRevert && (
                <button type="button" disabled={actionLoading} onClick={() => requestAction(selected, 'revert')} className="btn-dialog btn-dialog-warning">
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>undo</span>
                    Revert
                </button>
            )}

            <button type="button" onClick={() => setSelected(null)} className="btn-dialog btn-dialog-close">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)', border: '1.5px solid #e8edf4', overflow: 'hidden' }}>
          <FilterApprovalRp
            filters={filters}
            setFilters={setFilters}
            creatorOptions={creatorOptions}
            statusOptions={statusOptions}
            divisionOptions={divisionOptions}
            processorOptions={processorOptions}
            isMobile={isMobile}
            filteredCount={filtered.length}
            onRefresh={() => loadData(tab)}
          />

          {/* TABS INSIDE CARD, BELOW FILTER, ABOVE TABLE */}
          <div style={{ padding: isMobile ? '0 12px 12px 12px' : '0 24px 16px 24px', background: 'white' }}>
            {isMobile ? (
              <div ref={tabDropdownRef} style={{ position: 'relative' }}>
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
              <div style={{ display: 'flex', background: '#f8fafc', padding: '6px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
                {tabs.map(item => {
                  const count = D.counts?.[item.key] ?? 0
                  const active = tab === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: active ? 'white' : 'transparent',
                        color: active ? '#1e40af' : '#64748b',
                        fontWeight: active ? 700 : 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: active ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = '#334155'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = '#64748b'
                        }
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '18px' }}>{item.icon}</span>
                      {item.label}
                      <span style={{
                        background: active ? '#1e40af' : '#e2e8f0',
                        color: active ? 'white' : '#64748b',
                        borderRadius: '20px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginLeft: '4px',
                        transition: 'all 0.2s'
                      }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <DataTableRp
            loading={loading}
            isMobile={isMobile}
            paginated={paginated}
            filtered={filtered}
            safeCurrentPage={safeCurrentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderRowActions={renderRowActions}
            setSelected={setSelected}
            calcTotal={calcTotal}
          />
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
