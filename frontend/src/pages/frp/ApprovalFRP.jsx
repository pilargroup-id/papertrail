import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import DialogFrpDetail from '../../components/Dialog/DialogDetailFrp'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import { useUser } from '../../contexts/UserContext'
import FilterApprovalFrp from './FilterApprovalFrp'
import DataTableApprovalFrp from '../../components/table/DataTableApprovalFrp'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import DialogFailAction from '../../components/Dialog/DialogFailAction'

const MOBILE_BREAKPOINT = 768

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

export default function ApprovalFRP() {
  const { pathname } = useLocation()
  const isApprovedView = pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { setUser } = useUser()
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    requester: '',
    status: '',
    division: '',
    budgetId: '',
    attachment: 'all',
  })
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  const [confirmAction, setConfirmAction] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResultDialog, setActionResultDialog] = useState(null)

  const requestSort = (key) => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const loadData = () => {
    fetch(`/api/data/approval?view=${isApprovedView ? 'approved' : 'pending'}`)
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/'
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
      const matchBudget = !filters.budgetId || (request.items || []).some(item => item?.budgetId === filters.budgetId)
      const hasAttachment = Boolean(request.attachLink || request.attachmentLink)
      const matchAttachment =
        filters.attachment === 'all' ||
        (filters.attachment === 'with' && hasAttachment) ||
        (filters.attachment === 'without' && !hasAttachment)

      return matchSearch && matchDate && matchRequester && matchStatus && matchDivision && matchBudget && matchAttachment
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

  const doAction = async (request, action) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/frp/${request.id}/${action}`, { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setConfirmAction(null)
        setSelectedRequest(null)
        if (action === 'approve') {
          setActionResultDialog({
            action,
            kind: 'success',
            title: 'Approve berhasil',
            message: 'FRP berhasil disetujui.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else if (action === 'reject') {
          setActionResultDialog({
            action,
            kind: 'fail',
            title: 'Reject berhasil',
            message: 'FRP berhasil ditolak.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else if (action === 'revert') {
          setActionResultDialog({
            action,
            kind: 'success',
            title: 'Revert berhasil',
            message: 'Status FRP berhasil dikembalikan.',
            subMessage: request.frpNo ? `Nomor FRP: ${request.frpNo}` : undefined,
            rpNo: request.frpNo,
          })
        } else {
          loadData()
        }
      } else {
        window.alert(result.error || 'Gagal memproses data')
      }
    } catch (e) {
      window.alert(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const user = data?.user || {}
  const userJobLevelRank = Number(user?.jobLevelRank || 0)
  const canApprove = Boolean(data?.canApprove) && userJobLevelRank > 1
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
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

  const requesters = useMemo(
    () => (data?.requests ? [...new Set(data.requests.map((request) => request.dimintaOleh).filter(Boolean))].sort() : []),
    [data],
  )

  const budgetIds = useMemo(() => {
    if (!data?.requests) return []

    const collected = new Set()
    data.requests.forEach((request) => {
      (request.items || []).forEach((item) => {
        if (item?.budgetId) collected.add(item.budgetId)
      })
    })

    return [...collected].sort()
  }, [data])

  const requesterOptions = useMemo(
    () => requesters.map(requester => ({ value: requester, label: requester })),
    [requesters],
  )

  const budgetOptions = useMemo(
    () => budgetIds.map((budgetId) => ({ value: budgetId, label: budgetId })),
    [budgetIds],
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
          <FilterApprovalFrp
            isApprovedView={isApprovedView}
            isMobile={isMobile}
            filteredCount={filtered.length}
            filters={filters}
            setFilters={setFilters}
            requesterOptions={requesterOptions}
            budgetOptions={budgetOptions}
            divisionOptions={divisionOptions}
            statusOptions={statusOptions}
            filterInput={filterInput}
            onRefresh={loadData}
          />
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
            <DataTableApprovalFrp
              paginated={paginated}
              filtered={filtered}
              calcTotal={calcTotal}
              isApprovedView={isApprovedView}
              canApprove={canApprove}
              requestAction={requestAction}
              setSelectedRequest={setSelectedRequest}
              requestSort={requestSort}
              sortConfig={sortConfig}
              safeCurrentPage={safeCurrentPage}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              isMobile={isMobile}
            />
          </div>
        </div>
      </main>

      <DialogFrpDetail
        isOpen={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        canApprove={canApprove}
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
        onConfirm={() => confirmAction && doAction(confirmAction.request, confirmAction.action)}
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

      <DialogSuccesAction
        isOpen={actionResultDialog?.kind === 'success'}
        title={actionResultDialog?.title}
        message={actionResultDialog?.message}
        subMessage={actionResultDialog?.subMessage}
        rpNo={actionResultDialog?.rpNo}
        referenceLabel="Nomor FRP"
        icon={actionResultDialog?.action === 'revert' ? 'restart_alt' : 'check_circle'}
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
        referenceLabel="Nomor FRP"
        onConfirm={() => {
          setActionResultDialog(null)
          loadData()
        }}
        buttonText="Tutup"
      />
    </>
  )
}
