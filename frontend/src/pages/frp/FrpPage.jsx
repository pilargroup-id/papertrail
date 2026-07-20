import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableFrp from '../../components/table/frp/DataTableFrp.jsx';
import TabsFrpDekstop from './TabsFrpDekstop.jsx'
import {
  canCurrentUserApproveFrp,
  canCurrentUserEditFrp,
} from '../../components/table/frp/frp-button-access.js';
import FrpFilter from './FrpFilter.jsx'
// Button Frp
import Switch from '../../components/forms/Switch.jsx';
import ButtonCreateFrp from '../../components/button/button-frp/ButtonCreateFrp.jsx'
import ButtonFilterFrp from '../../components/button/button-frp/ButtonFilterFrp.jsx'

// Dialog Frp
import DialogEditFrp from '../../components/Dialog/dialog-frp/DialogEditFrp.jsx'
import DialogApproveFrp from '../../components/Dialog/dialog-frp/DialogApproveFrp.jsx'
import DialogRejectFrp from '../../components/Dialog/dialog-frp/DialogRejectFrp.jsx'
import DialogRevertFrp from '../../components/Dialog/dialog-frp/DialogRevertFrp.jsx'
import DialogDetailsFrp from '../../components/Dialog/dialog-frp/DialogDetailsFrp.jsx'

// Mobile
import { FRP_MOBILE_STATUS_ALL } from '../../mobile/mobile-button/frp/MobileTabsFrp.jsx'
import MobileScreenDetailFrp from '../../mobile/screen/MobileScreenDetailFrp.jsx'
import MobileScreenCreateFrp from '../../mobile/screen/screen-create-frp/MobileScreenCreateFrp.jsx'
import MobileScreenEditFrp from '../../mobile/screen/screen-edit-frp/MobileScreenEditFrp.jsx'
import SearchFrp from '../../mobile/search-mobile/SearchFrp.jsx'
import MobileButtonCreate from '../../mobile/mobile-button/frp/MobileButtonCreate.jsx'

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

function getFrpStatusValue(frp) {
  return String(frp?.status ?? '').trim().toUpperCase()
}

function normalizeFilterValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getDateInputValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function getFilterOptions(rows, keys) {
  const values = rows
    .map((row) => getFirstValue(row, keys))
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')

  return [...new Set(values.map(String))].sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  )
}

function matchesFrpFilters(frp, filters) {
  const requestBy = normalizeFilterValue(
    getFirstValue(frp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
  )
  const vendor = normalizeFilterValue(
    getFirstValue(frp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
  )
  const createdAt = getDateInputValue(getFirstValue(frp, ['created_at', 'createdAt']))

  return (
    (!filters.requestBy || requestBy === normalizeFilterValue(filters.requestBy)) &&
    (!filters.vendor || vendor === normalizeFilterValue(filters.vendor)) &&
    (!filters.createdAt || createdAt === filters.createdAt)
  )
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
  const searchProps = props.searchProps ?? outletContext.searchProps
  const currentUser = props.currentUser ?? outletContext.currentUser ?? null
  const setMobileHeaderHidden = props.setMobileHeaderHidden ?? outletContext.setMobileHeaderHidden
  const mobileFrpStatusFilter =
    props.mobileFrpStatusFilter ??
    outletContext.mobileFrpStatusFilter ??
    FRP_MOBILE_STATUS_ALL
  const isAuthLoading = props.isAuthLoading ?? outletContext.isAuthLoading ?? false
  const authDepartmentId = getAuthDepartmentId(currentUser)
  const shouldLoadFrp = !isAuthLoading && Boolean(currentUser) && authDepartmentId !== ''
  const activePageTitle = activePage?.title
  const pageTitle = activePageTitle && !['Page1', 'Page 1'].includes(activePageTitle) ? activePageTitle : 'FRP'
  const pageEyebrow = activePage?.eyebrow ?? 'Document Transaction'
  const [frp, setBudgetType] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBudgetType, setSelectedBudgetType] = useState(null)
  const [selectedDetailsFrp, setSelectedDetailsFrp] = useState(null)
  const [selectedApprovalFrp, setSelectedApprovalFrp] = useState(null)
  const [selectedRejectFrp, setSelectedRejectFrp] = useState(null)
  const [selectedRevertFrp, setSelectedRevertFrp] = useState(null)
  const [selectedMobileDetailsFrp, setSelectedMobileDetailsFrp] = useState(null)
  const [selectedMobileEditFrp, setSelectedMobileEditFrp] = useState(null)
  const [isMobileCreateScreenOpen, setIsMobileCreateScreenOpen] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [revertError, setRevertError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [desktopFrpStatusFilter, setDesktopFrpStatusFilter] = useState(FRP_MOBILE_STATUS_ALL)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false)
  const [frpFilters, setFrpFilters] = useState({
    requestBy: '',
    vendor: '',
    createdAt: '',
  })

  useEffect(() => {
    setMobileHeaderHidden?.(
      isMobileCreateScreenOpen || Boolean(selectedMobileEditFrp) || Boolean(selectedMobileDetailsFrp),
    )

    return () => {
      setMobileHeaderHidden?.(false)
    }
  }, [isMobileCreateScreenOpen, selectedMobileDetailsFrp, selectedMobileEditFrp, setMobileHeaderHidden])

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

  const updateFrpFilter = (filterName, value) => {
    setFrpFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: value,
    }))
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

  const openMobileDetailsPage = (frp) => {
    setSelectedMobileEditFrp(null)
    setSelectedMobileDetailsFrp(frp)
  }

  const closeMobileDetailsPage = () => {
    setSelectedMobileDetailsFrp(null)
  }

  const openMobileCreatePage = () => {
    setSelectedMobileDetailsFrp(null)
    setSelectedMobileEditFrp(null)
    setIsMobileCreateScreenOpen(true)
  }

  const closeMobileCreatePage = () => {
    setIsMobileCreateScreenOpen(false)
  }

  const openMobileEditPage = (frp) => {
    setSelectedMobileDetailsFrp(null)
    setIsMobileCreateScreenOpen(false)
    setSelectedMobileEditFrp(frp)
  }

  const closeMobileEditPage = () => {
    setSelectedMobileEditFrp(null)
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

  const openRevertDialog = (frp) => {
    setSelectedRevertFrp(frp)
    setRevertError('')
    setIsRevertDialogOpen(true)
  }

  const closeRevertDialog = () => {
    if (isReverting) {
      return
    }

    setIsRevertDialogOpen(false)
    setSelectedRevertFrp(null)
    setRevertError('')
  }

  const handleVendorUpdated = async (response) => {
    const updatedVendor = getVendorFromResponse(response)

    if (updatedVendor?.id !== undefined && updatedVendor?.id !== null) {
      setBudgetType((currentVendors) =>
        updateVendorRecord(currentVendors, updatedVendor.id, updatedVendor),
      )
    } else if (selectedBudgetType?.id !== undefined && selectedBudgetType?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    } else if (selectedMobileEditFrp?.id !== undefined && selectedMobileEditFrp?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
    closeMobileEditPage()
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

  const handleFrpReverted = async ({ frp: targetFrp, notes } = {}) => {
    const target = targetFrp ?? selectedRevertFrp
    const frpId = target?.id

    if (frpId === undefined || frpId === null) {
      setRevertError('ID FRP tidak tersedia.')
      return
    }

    const frpLabel = getFrpEditLabel(target)

    setRevertError('')
    setIsReverting(true)
    try {
      const response = await api.frp.revert(frpId, {
        reason: notes || `Revert ${frpLabel}`,
      })
      const revertedFrp = getFrpFromResponse(response)

      if (revertedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, frpId, revertedFrp))
      } else {
        setReloadToken((currentValue) => currentValue + 1)
      }

      setIsRevertDialogOpen(false)
      setSelectedRevertFrp(null)
    } catch (error) {
      setRevertError(error.message || 'Gagal revert FRP.')
    } finally {
      setIsReverting(false)
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
  const requestByFilterOptions = useMemo(
    () => getFilterOptions(frp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
    [frp],
  )
  const vendorFilterOptions = useMemo(
    () => getFilterOptions(frp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
    [frp],
  )
  const hasActiveFrpFilter = Boolean(frpFilters.requestBy || frpFilters.vendor || frpFilters.createdAt)
  const visibleFrp = frp.filter((frpItem) => {
    const matchesMobileStatus =
      mobileFrpStatusFilter === FRP_MOBILE_STATUS_ALL ||
      getFrpStatusValue(frpItem) === mobileFrpStatusFilter
    const matchesDesktopStatus =
      desktopFrpStatusFilter === FRP_MOBILE_STATUS_ALL ||
      getFrpStatusValue(frpItem) === desktopFrpStatusFilter

    return matchesMobileStatus && matchesDesktopStatus && matchesFrpFilters(frpItem, frpFilters)
  })
  const filteredEmptyMessage =
    !authGateMessage &&
    !isLoading &&
    !errorMessage &&
    hasActiveFrpFilter
      ? 'Data tidak ditemukan untuk filter yang dipilih.'
      : !authGateMessage &&
    !isLoading &&
    !errorMessage &&
    desktopFrpStatusFilter !== FRP_MOBILE_STATUS_ALL
      ? `Belum ada FRP berstatus ${desktopFrpStatusFilter.toLowerCase()}.`
      : !authGateMessage &&
    !isLoading &&
    !errorMessage &&
    mobileFrpStatusFilter !== FRP_MOBILE_STATUS_ALL
      ? `Belum ada FRP berstatus ${mobileFrpStatusFilter.toLowerCase()}.`
      : emptyMessage

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card frp-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions frp-page__desktop-actions">
          <SearchFrp searchProps={searchProps} variant="desktop" />
          <ButtonFilterFrp
            label={isDesktopFilterOpen ? 'Tutup filter' : 'Buka filter'}
            dialogId="frp-desktop-filter"
            dialogLabel="Filter FRP"
            isOpen={isDesktopFilterOpen}
            onClose={() => setIsDesktopFilterOpen(false)}
            className={[
              'frp-page__filter-button',
              hasActiveFrpFilter ? 'frp-page__filter-button--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setIsDesktopFilterOpen((isOpen) => !isOpen)}
          >
            <FrpFilter
              filters={frpFilters}
              requestByOptions={requestByFilterOptions}
              vendorOptions={vendorFilterOptions}
              onFilterChange={updateFrpFilter}
            />
          </ButtonFilterFrp>
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

      {!selectedMobileDetailsFrp && !selectedMobileEditFrp && !isMobileCreateScreenOpen ? (
        <SearchFrp searchProps={searchProps}>
          <MobileButtonCreate
            label="Create"
            onClick={openMobileCreatePage}
          />
        </SearchFrp>
      ) : null}

      <MobileScreenDetailFrp frp={selectedMobileDetailsFrp} onBack={closeMobileDetailsPage} />
      <MobileScreenCreateFrp
        isOpen={isMobileCreateScreenOpen}
        mode="screen"
        onClose={closeMobileCreatePage}
        onCreated={handleFrpCreated}
      />
      <MobileScreenEditFrp
        isOpen={Boolean(selectedMobileEditFrp)}
        mode="screen"
        title={`Edit ${getFrpEditLabel(selectedMobileEditFrp)}`}
        frp={selectedMobileEditFrp}
        onClose={closeMobileEditPage}
        onUpdated={handleVendorUpdated}
      />

      <div
        className={[
          'frp-page__table-section',
          selectedMobileDetailsFrp || selectedMobileEditFrp || isMobileCreateScreenOpen
            ? 'frp-page__mobile-list--hidden'
            : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="frp-page__tabs-toolbar">
          <TabsFrpDekstop
            activeStatus={desktopFrpStatusFilter}
            onStatusChange={setDesktopFrpStatusFilter}
          />
        </div>

        <DataTableFrp
          rows={shouldLoadFrp ? visibleFrp : []}
          tableLabel={`${pageTitle} table`}
          emptyMessage={filteredEmptyMessage}
          tableWrapperStyle={{ marginTop: '0.75rem' }}
          SwitchComponent={Switch}
          onEdit={openEditDialog}
          onDetails={openDetailsDialog}
          onApproval={openApproveDialog}
          onReject={openRejectDialog}
          onRevert={openRevertDialog}
          currentUser={currentUser}
          canApprove={(row) => canCurrentUserApproveFrp(row, currentUser)}
          canReject={(row) => canCurrentUserApproveFrp(row, currentUser)}
          isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
          onStatusChange={handleVendorStatusChange}
          mobileCard={{
            onMoreInfo: openMobileDetailsPage,
            actions: (_row, _index, defaultActions = []) =>
              defaultActions.map((action) =>
                action.key === 'edit'
                  ? {
                      ...action,
                      hidden: false,
                      disabled: (frp) => !canCurrentUserEditFrp(frp, currentUser),
                      onClick: openMobileEditPage,
                    }
                  : action,
              ),
          }}
        />
      </div>

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

      <DialogRevertFrp
        key={selectedRevertFrp?.id ?? 'revert-frp'}
        isOpen={isRevertDialogOpen}
        title={`Revert ${getFrpEditLabel(selectedRevertFrp)}`}
        frp={selectedRevertFrp}
        isSubmitting={isReverting}
        submitError={revertError}
        onClose={closeRevertDialog}
        onRevert={handleFrpReverted}
      />
    </section>

  )
}

export default FrpPage
