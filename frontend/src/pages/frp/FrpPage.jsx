import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableFrp from '../../components/table/frp/DataTableFrp.jsx';
import { canCurrentUserApproveFrp } from '../../components/table/frp/frp-button-access.js';

// Button Frp
import Switch from '../../components/forms/Switch.jsx';
import ButtonCreateFrp from '../../components/button/button-frp/ButtonCreateFrp.jsx'

// Dialog Frp
import DialogEditFrp from '../../components/Dialog/dialog-frp/DialogEditFrp.jsx'
import DialogApproveFrp from '../../components/Dialog/dialog-frp/DialogApproveFrp.jsx'
import DialogRejectFrp from '../../components/Dialog/dialog-frp/DialogRejectFrp.jsx'
import DialogDetailsFrp from '../../components/Dialog/dialog-frp/DialogDetailsFrp.jsx'

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

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find(
    (key) => source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '',
  )

  return matchedKey ? source[matchedKey] : fallback
}

function getAuthDepartmentId(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const primaryDepartment =
    departments.find((department) => Number(department?.is_primary) === 1) ||
    departments[0] ||
    null

  return (
    getFirstValue(user, ['department_id', 'departmentId']) ||
    getFirstValue(primaryDepartment, ['department_id', 'departmentId', 'id'])
  )
}

function getFrpEditLabel(frp) {
  return frp?.frp_number ?? frp?.id ?? 'FRP ini'
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
  const isAuthLoading = props.isAuthLoading ?? outletContext.isAuthLoading ?? false
  const authDepartmentId = getAuthDepartmentId(currentUser)
  const shouldLoadFrp = !isAuthLoading && Boolean(currentUser) && authDepartmentId !== ''
  const pageTitle = activePage?.title ?? 'RP Checker Rules'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [frp, setBudgetType] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBudgetType, setSelectedBudgetType] = useState(null)
  const [selectedDetailsFrp, setSelectedDetailsFrp] = useState(null)
  const [selectedApprovalFrp, setSelectedApprovalFrp] = useState(null)
  const [selectedRejectFrp, setSelectedRejectFrp] = useState(null)
  const [approveError, setApproveError] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  useEffect(() => {
    if (!shouldLoadFrp) {
      return undefined
    }

    const controller = new AbortController()

    async function loadVendors() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.frp.list(
          {
            page: 1,
            limit: 100,
            search: searchQuery,
            department_id: authDepartmentId,
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
  }, [authDepartmentId, shouldLoadFrp, searchQuery, reloadToken])

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

  const openDetailsDialog = (frp) => {
    setSelectedDetailsFrp(frp)
    setIsDetailsDialogOpen(true)
  }

  const closeDetailsDialog = () => {
    setIsDetailsDialogOpen(false)
    setSelectedDetailsFrp(null)
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

  const handleFrpReverted = async (targetFrp) => {
    const frpId = targetFrp?.id

    if (frpId === undefined || frpId === null) {
      setErrorMessage('ID FRP tidak tersedia.')
      return
    }

    const frpLabel = getFrpEditLabel(targetFrp)

    if (typeof window !== 'undefined' && !window.confirm(`Revert ${frpLabel}?`)) {
      return
    }

    setErrorMessage('')

    try {
      const response = await api.frp.revert(frpId, {
        reason: `Revert ${frpLabel}`,
      })
      const revertedFrp = getFrpFromResponse(response)

      if (revertedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, frpId, revertedFrp))
      } else {
        setReloadToken((currentValue) => currentValue + 1)
      }
    } catch (error) {
      setErrorMessage(error.message || 'Gagal revert FRP.')
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

  const authGateMessage = isAuthLoading
    ? 'Memuat profil auth...'
    : !currentUser
      ? 'Profil auth tidak tersedia.'
      : authDepartmentId === ''
        ? 'Department auth tidak tersedia.'
        : ''
  const emptyMessage = authGateMessage || (isLoading
    ? 'Memuat data RP checker rules...'
    : errorMessage || (searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.'))

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
        rows={shouldLoadFrp ? frp : []}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        onDetails={openDetailsDialog}
        onApproval={openApproveDialog}
        onReject={openRejectDialog}
        onRevert={handleFrpReverted}
        currentUser={currentUser}
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

      <DialogDetailsFrp
        isOpen={isDetailsDialogOpen}
        title={`Detail ${getFrpEditLabel(selectedDetailsFrp)}`}
        frp={selectedDetailsFrp}
        onClose={closeDetailsDialog}
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
