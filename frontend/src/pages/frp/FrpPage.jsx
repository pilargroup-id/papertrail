import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableFrp from '../../components/table/frp/DataTableFrp.jsx';

// Button Frp
import Switch from '../../components/forms/Switch.jsx';
import ButtonCreateFrp from '../../components/button/button-frp/ButtonCreateFrp.jsx'

// Dialog Frp
import DialogEditFrp from '../../components/Dialog/dialog-frp/DialogEditFrp.jsx'
import DialogApproveFrp from '../../components/Dialog/dialog-frp/DialogApproveFrp.jsx'
import DialogRejectFrp from '../../components/Dialog/dialog-frp/DialogRejectFrp.jsx'

function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  return []
}

function getVendorFromResponse(response) {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ]

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      ('id' in candidate || 'is_active' in candidate),
  ) ?? null
}

function getFrpFromResponse(response) {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ]

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      ('id' in candidate || 'status' in candidate),
  ) ?? null
}

function getFrpEditLabel(frp) {
  return frp?.frp_number ?? frp?.id ?? 'FRP ini'
}

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null)

  if (!matchedKey) {
    return fallback
  }

  return source[matchedKey]
}

function getFrpStatusValue(frp) {
  return String(frp?.status ?? '').trim().toUpperCase()
}

function getCurrentUserId(user) {
  return getFirstValue(user, ['id', 'user_id', 'userId'], '')
}

function getFrpRequesterId(frp) {
  return getFirstValue(
    frp,
    ['requested_by_user_id', 'requested_by_id', 'created_by_user_id', 'created_by'],
    '',
  )
}

function getUserDepartmentIds(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const departmentIds = departments
    .map((department) => getFirstValue(department, ['id', 'department_id', 'departmentId'], ''))
    .filter((departmentId) => departmentId !== '')

  const primaryDepartmentId = getFirstValue(user, ['department_id', 'departmentId'], '')

  return primaryDepartmentId === '' ? departmentIds : [primaryDepartmentId, ...departmentIds]
}

function isManagerUser(user) {
  const explicitManagerFlag = getFirstValue(user, ['is_manager', 'isManager'], null)

  if (explicitManagerFlag !== null) {
    return ['1', 'true', 'yes'].includes(String(explicitManagerFlag).trim().toLowerCase())
  }

  const roleText = [
    user?.job_position,
    user?.jobPosition,
    user?.job_level,
    user?.jobLevel,
    user?.role,
    user?.userRole,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return roleText ? roleText.includes('manager') : null
}

function canCurrentUserApproveFrp(frp, currentUser) {
  if (getFrpStatusValue(frp) !== 'PENDING') {
    return false
  }

  if (!currentUser) {
    return true
  }

  const isManager = isManagerUser(currentUser)

  if (isManager === false) {
    return false
  }

  const currentUserId = getCurrentUserId(currentUser)
  const requesterId = getFrpRequesterId(frp)

  if (currentUserId !== '' && requesterId !== '' && String(currentUserId) === String(requesterId)) {
    return false
  }

  const frpDepartmentId = getFirstValue(frp, ['department_id', 'departmentId'], '')
  const userDepartmentIds = getUserDepartmentIds(currentUser)

  if (
    frpDepartmentId !== '' &&
    userDepartmentIds.length > 0 &&
    !userDepartmentIds.some((departmentId) => String(departmentId) === String(frpDepartmentId))
  ) {
    return false
  }

  return true
}

function updateVendorStatus(frp, frpId, isActive, updatedBudgetType) {
  return frp.map((frp) => {
    if (String(frp?.id) !== String(frpId)) {
      return frp
    }

    return {
      ...frp,
      ...(updatedBudgetType ?? {}),
      is_active: updatedBudgetType?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(frp, frpId, updatedBudgetType) {
  return frp.map((frp) =>
    String(frp?.id) === String(frpId)
      ? {
          ...frp,
          ...updatedBudgetType,
        }
      : frp,
  )
}

function FrpPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const currentUser = props.currentUser ?? outletContext.currentUser ?? null
  const pageTitle = activePage?.title ?? 'RP Checker Rules'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [frp, setBudgetType] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBudgetType, setSelectedBudgetType] = useState(null)
  const [selectedApprovalFrp, setSelectedApprovalFrp] = useState(null)
  const [selectedRejectFrp, setSelectedRejectFrp] = useState(null)
  const [approveError, setApproveError] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVendors() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.frp.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setBudgetType(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setBudgetType([])
        setErrorMessage(error.message || 'Gagal memuat data RP checker rules.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadVendors()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleFrpCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (frp) => {
    setSelectedBudgetType(frp)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedBudgetType(null)
  }

  const openApproveDialog = (frp) => {
    setSelectedApprovalFrp(frp)
    setApproveError('')
    setIsApproveDialogOpen(true)
  }

  const closeApproveDialog = () => {
    if (isApproving) {
      return
    }

    setIsApproveDialogOpen(false)
    setSelectedApprovalFrp(null)
    setApproveError('')
  }

  const openRejectDialog = (frp) => {
    setSelectedRejectFrp(frp)
    setRejectError('')
    setIsRejectDialogOpen(true)
  }

  const closeRejectDialog = () => {
    if (isRejecting) {
      return
    }

    setIsRejectDialogOpen(false)
    setSelectedRejectFrp(null)
    setRejectError('')
  }

  const handleVendorUpdated = async (response) => {
    const updatedVendor = getVendorFromResponse(response)

    if (updatedVendor?.id !== undefined && updatedVendor?.id !== null) {
      setBudgetType((currentVendors) =>
        updateVendorRecord(currentVendors, updatedVendor.id, updatedVendor),
      )
    } else if (selectedBudgetType?.id !== undefined && selectedBudgetType?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleFrpApproved = async ({ frp: targetFrp, notes }) => {
    const target = targetFrp ?? selectedApprovalFrp
    const frpId = target?.id

    if (frpId === undefined || frpId === null) {
      setApproveError('ID FRP tidak tersedia.')
      return
    }

    setApproveError('')
    setIsApproving(true)

    try {
      const response = await api.frp.approve(frpId, {
        notes: notes || 'Approve FRP',
      })
      const approvedFrp = getFrpFromResponse(response)

      if (approvedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, frpId, approvedFrp))
      } else {
        setReloadToken((currentValue) => currentValue + 1)
      }

      setIsApproveDialogOpen(false)
      setSelectedApprovalFrp(null)
    } catch (error) {
      setApproveError(error.message || 'Gagal approve FRP.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleFrpRejected = async ({ frp: targetFrp, reason }) => {
    const target = targetFrp ?? selectedRejectFrp
    const frpId = target?.id

    if (frpId === undefined || frpId === null) {
      setRejectError('ID FRP tidak tersedia.')
      return
    }

    setRejectError('')
    setIsRejecting(true)

    try {
      const response = await api.frp.reject(frpId, {
        reason,
      })
      const rejectedFrp = getFrpFromResponse(response)

      if (rejectedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, frpId, rejectedFrp))
      } else {
        setReloadToken((currentValue) => currentValue + 1)
      }

      setIsRejectDialogOpen(false)
      setSelectedRejectFrp(null)
    } catch (error) {
      setRejectError(error.message || 'Gagal reject FRP.')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleVendorStatusChange = async (frp, nextIsActive) => {
    const frpId = frp?.id

    if (frpId === undefined || frpId === null) {
      return
    }

    const frpIdKey = String(frpId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(frpIdKey))
    setBudgetType((currentVendors) =>
      updateVendorStatus(currentVendors, frpId, normalizedIsActive),
    )

    try {
      const response = await api.frp.updateStatus(frpId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setBudgetType((currentVendors) =>
          updateVendorStatus(currentVendors, frpId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setBudgetType((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === frpIdKey ? frp : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status RP checker rule.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(frpIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data RP checker rules...'
    : errorMessage || (searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.')

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions">
          <ButtonCreateFrp
            variant="create"
            dialogProps={{
              onCreated: handleFrpCreated,
            }}
          >
            Create
          </ButtonCreateFrp>
        </div>
      </div>

      <DataTableFrp
        rows={frp}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        onApproval={openApproveDialog}
        onReject={openRejectDialog}
        canApprove={(row) => canCurrentUserApproveFrp(row, currentUser)}
        canReject={(row) => canCurrentUserApproveFrp(row, currentUser)}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      />

      <DialogEditFrp
        isOpen={isEditDialogOpen}
        title={`Edit ${getFrpEditLabel(selectedBudgetType)}`}
        frp={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />

      <DialogApproveFrp
        key={selectedApprovalFrp?.id ?? 'approve-frp'}
        isOpen={isApproveDialogOpen}
        title={`Approve ${getFrpEditLabel(selectedApprovalFrp)}`}
        frp={selectedApprovalFrp}
        isSubmitting={isApproving}
        submitError={approveError}
        onClose={closeApproveDialog}
        onApprove={handleFrpApproved}
      />

      <DialogRejectFrp
        key={selectedRejectFrp?.id ?? 'reject-frp'}
        isOpen={isRejectDialogOpen}
        title={`Reject ${getFrpEditLabel(selectedRejectFrp)}`}
        frp={selectedRejectFrp}
        isSubmitting={isRejecting}
        submitError={rejectError}
        onClose={closeRejectDialog}
        onReject={handleFrpRejected}
      />
    </section>

  )
}

export default FrpPage
