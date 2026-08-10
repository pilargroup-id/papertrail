import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import {
  canCurrentUserApproveFrp,
  canCurrentUserCreateFrpFromRp,
  canCurrentUserEditFrp,
  isManagerUser,
} from '../../components/table/rp/rp-button-access.js';

// DataTable
import TabsProcessRp from './TabsProcessRp.jsx'
import RpFilter from './RpFilter.jsx'
import DataTableRp from '../../components/table/rp/DataTableRp.jsx';

// Button Frp
import Switch from '../../components/forms/Switch.jsx';
import ButtonCreateRp from '../../components/button/button-rp/ButtonCreateRp.jsx'
import ButtonFilterRp from '../../components/button/button-rp/ButtonFilterRp.jsx'
import MobileButtonCreate from '../../mobile/mobile-button/frp/MobileButtonCreate.jsx'

// Dialog Frp
import DialogEditRp from '../../components/Dialog/dialog-rp/DialogEditRp.jsx'
import DialogCheckDataRp from '../../components/Dialog/dialog-rp/DialogCheckDataRp.jsx'
import DialogApproveRp from '../../components/Dialog/dialog-rp/DialogApproveRp.jsx'
import DialogRejectFrp from '../../components/Dialog/dialog-frp/DialogRejectFrp.jsx'
import DialogRevertFrp from '../../components/Dialog/dialog-frp/DialogRevertFrp.jsx'
import DialogDetailsRp from '../../components/Dialog/dialog-rp/DialogDetailsRp.jsx'
import DialogCreateFrpFromRp from '../../components/Dialog/dialog-rp/DialogCreateFrpFromRp.jsx'

// Mobile Ui
import {
  RP_MOBILE_DEFAULT_STATUS,
  rpMobileStatusTabs,
} from '../../mobile/mobile-button/rp/mobileTabsRpConfig.js'
import MobileScreenDetailRp from '../../mobile/screen/screen-rp/MobileScreenDetailRp.jsx'
import MobileScreenCreateRp from '../../mobile/screen/screen-rp/screen-create-rp/MobileScreenCreateRp.jsx'
import MobileScreenEditRp from '../../mobile/screen/screen-rp/screen-edit-rp/MobileScreenEditRp.jsx'
import SearchFrp from '../../mobile/search-mobile/SearchFrp.jsx'

const RP_STATUS_ALL = 'ALL'
const RP_DEFAULT_STATUS = RP_MOBILE_DEFAULT_STATUS
const rpProcessStatusTabs = rpMobileStatusTabs

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

function getAuthDepartmentIds(user) {
  const departments = Array.isArray(user?.departments) ? user.departments : []
  const departmentIds = departments
    .flatMap((department) => [
      getFirstValue(department, ['id', 'department_id', 'departmentId']),
      getFirstValue(department, ['class_department_id', 'classDepartmentId']),
    ])
    .filter((departmentId) => departmentId !== '')

  return [
    getFirstValue(user, ['context_department_id', 'department_id', 'departmentId']),
    getFirstValue(user, ['class_department_id', 'classDepartmentId']),
    ...departmentIds,
  ].filter((departmentId) => departmentId !== '')
}

function isCurrentUserDestinationDepartment(rp, user) {
  const destinationDepartmentId = getFirstValue(
    rp,
    ['destination_department_id', 'destinationDepartmentId'],
  )

  if (destinationDepartmentId === '') {
    return false
  }

  return getAuthDepartmentIds(user).some(
    (departmentId) => String(departmentId) === String(destinationDepartmentId),
  )
}

function canCurrentUserDestinationCheckRp(rp, user) {
  return !isManagerUser(user) && isCurrentUserDestinationDepartment(rp, user)
}

function canCurrentUserSeeRpStatus(rp, user) {
  if (getFrpStatusValue(rp) !== 'PENDING_DESTINATION_CHECKER') {
    return true
  }

  return canCurrentUserDestinationCheckRp(rp, user)
}

function getFrpEditLabel(rp) {
  return rp?.rp_number ?? rp?.id ?? 'FRP ini'
}

function getFrpStatusValue(rp) {
  return normalizeRpStatusValue(rp?.status)
}

function normalizeRpStatusValue(status) {
  return String(status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase()
}

function getRpStatusFilterLabel(status) {
  const normalizedStatus = normalizeRpStatusValue(status)
  const matchedTab = rpProcessStatusTabs.find((tab) => tab.id === normalizedStatus)

  if (matchedTab) {
    return matchedTab.label
  }

  return normalizedStatus
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function matchesStatusFilter(status, filter) {
  const normalizedStatus = normalizeRpStatusValue(status)
  const normalizedFilter = normalizeRpStatusValue(filter)

  if (!normalizedFilter || normalizedFilter === RP_STATUS_ALL) {
    return true
  }

  if (normalizedFilter === 'PENDING') {
    return normalizedStatus.startsWith('PENDING')
  }

  return normalizedStatus === normalizedFilter
}

function normalizeFilterValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getFilterOptions(rows, keys) {
  const values = rows
    .map((row) => getFirstValue(row, keys))
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')

  return [...new Set(values.map(String))].sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  )
}

function matchesRpFilters(rp, filters) {
  const requestBy = normalizeFilterValue(
    getFirstValue(rp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
  )
  const vendor = normalizeFilterValue(
    getFirstValue(rp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
  )

  return (
    (!filters.requestBy || requestBy === normalizeFilterValue(filters.requestBy)) &&
    (!filters.vendor || vendor === normalizeFilterValue(filters.vendor))
  )
}

function updateVendorStatus(rp, rpId, isActive, updatedBudgetType) {
  return rp.map((rp) => {
    if (String(rp?.id) !== String(rpId)) {
      return rp
    }

    return {
      ...rp,
      ...(updatedBudgetType ?? {}),
      is_active: updatedBudgetType?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(rp, rpId, updatedBudgetType) {
  return rp.map((rp) =>
    String(rp?.id) === String(rpId)
      ? {
          ...rp,
          ...updatedBudgetType,
        }
      : rp,
  )
}

function RpPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const searchProps = props.searchProps ?? outletContext.searchProps
  const currentUser = props.currentUser ?? outletContext.currentUser ?? null
  const setMobileHeaderHidden = props.setMobileHeaderHidden ?? outletContext.setMobileHeaderHidden
  const mobileRpStatusFilter =
    props.mobileRpStatusFilter ??
    outletContext.mobileRpStatusFilter ??
    RP_DEFAULT_STATUS
  const setMobileRpStatusFilter =
    props.setMobileRpStatusFilter ??
    outletContext.setMobileRpStatusFilter
  const isAuthLoading = props.isAuthLoading ?? outletContext.isAuthLoading ?? false
  const authDepartmentId = getAuthDepartmentId(currentUser)
  const shouldLoadFrp = !isAuthLoading && Boolean(currentUser) && authDepartmentId !== ''
  const activePageTitle = activePage?.title
  const pageTitle = activePageTitle && !['Page1', 'Page 1'].includes(activePageTitle) ? activePageTitle : 'RP'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [rp, setBudgetType] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCheckDataDialogOpen, setIsCheckDataDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false)
  const [isCreateFrpDialogOpen, setIsCreateFrpDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBudgetType, setSelectedBudgetType] = useState(null)
  const [selectedCheckDataRp, setSelectedCheckDataRp] = useState(null)
  const [selectedDetailsFrp, setSelectedDetailsFrp] = useState(null)
  const [selectedApprovalRp, setSelectedApprovalRp] = useState(null)
  const [selectedRejectFrp, setSelectedRejectFrp] = useState(null)
  const [selectedRevertFrp, setSelectedRevertFrp] = useState(null)
  const [selectedCreateFrpRp, setSelectedCreateFrpRp] = useState(null)
  const [selectedMobileDetailsFrp, setSelectedMobileDetailsFrp] = useState(null)
  const [selectedMobileEditFrp, setSelectedMobileEditFrp] = useState(null)
  const [isMobileCreateScreenOpen, setIsMobileCreateScreenOpen] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [revertError, setRevertError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [internalActiveRpStatus, setInternalActiveRpStatus] = useState(RP_DEFAULT_STATUS)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false)
  const [rpFilters, setRpFilters] = useState({
    requestBy: '',
    vendor: '',
  })
  const activeRpStatus = mobileRpStatusFilter ?? internalActiveRpStatus
  const setActiveRpStatus = setMobileRpStatusFilter ?? setInternalActiveRpStatus

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
        const response = await api.rp.list(
          {
            page: 1,
            limit: 100,
            search: searchQuery,
            department_scope_id: authDepartmentId,
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

  const handlePrintRp = (rp) => {
    // TODO: wire up RP print/export logic.
  }

  const updateRpFilter = (filterName, value) => {
    setRpFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: value,
    }))
  }

  const openEditDialog = (rp) => {
    setSelectedBudgetType(rp)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedBudgetType(null)
  }

  const openCheckDataDialog = (rp) => {
    setSelectedCheckDataRp(rp)
    setIsCheckDataDialogOpen(true)
  }

  const closeCheckDataDialog = () => {
    setIsCheckDataDialogOpen(false)
    setSelectedCheckDataRp(null)
  }

  const openDetailsDialog = (rp) => {
    setSelectedDetailsFrp(rp)
    setIsDetailsDialogOpen(true)
  }

  const closeDetailsDialog = () => {
    setIsDetailsDialogOpen(false)
    setSelectedDetailsFrp(null)
  }

  const openMobileDetailsPage = (rp) => {
    setSelectedMobileEditFrp(null)
    setSelectedMobileDetailsFrp(rp)
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

  const openMobileEditPage = (rp) => {
    setSelectedMobileDetailsFrp(null)
    setIsMobileCreateScreenOpen(false)
    setSelectedMobileEditFrp(rp)
  }

  const closeMobileEditPage = () => {
    setSelectedMobileEditFrp(null)
  }

  const openApproveDialog = (rp) => {
    setSelectedApprovalRp(rp)
    setApproveError('')
    setIsApproveDialogOpen(true)
  }

  const closeApproveDialog = () => {
    if (isApproving) {
      return
    }

    setIsApproveDialogOpen(false)
    setSelectedApprovalRp(null)
    setApproveError('')
  }

  const openRejectDialog = (rp) => {
    setSelectedRejectFrp(rp)
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

  const openRevertDialog = (rp) => {
    setSelectedRevertFrp(rp)
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

  const openCreateFrpDialog = (rp) => {
    setSelectedCreateFrpRp(rp)
    setIsCreateFrpDialogOpen(true)
  }

  const closeCreateFrpDialog = () => {
    setIsCreateFrpDialogOpen(false)
    setSelectedCreateFrpRp(null)
  }

  const handleRpConvertedToFrp = () => {
    setReloadToken((currentValue) => currentValue + 1)
    closeCreateFrpDialog()
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

  const handleRpChecked = async (response) => {
    const checkedRp = getFrpFromResponse(response)

    if (checkedRp?.id !== undefined && checkedRp?.id !== null) {
      setBudgetType((currentRp) => updateVendorRecord(currentRp, checkedRp.id, checkedRp))
    } else if (selectedCheckDataRp?.id !== undefined && selectedCheckDataRp?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeCheckDataDialog()
  }

  const handleRpApproved = async ({ rp: targetRp, notes }) => {
    const target = targetRp ?? selectedApprovalRp
    const rpId = target?.id

    if (rpId === undefined || rpId === null) {
      setApproveError('ID RP tidak tersedia.')
      return
    }

    setApproveError('')
    setIsApproving(true)

    try {
      const status = getFrpStatusValue(target)

      if (!['PENDING_REQUESTER_MANAGER', 'PENDING_DESTINATION_MANAGER'].includes(status)) {
        setApproveError(`RP status ${status || '-'} tidak bisa diapprove.`)
        return
      }

      const response = await api.rp.approveByStatus(
        rpId,
        status,
        {
          notes: notes || 'Approve RP',
        },
      )
      const approvedFrp = getFrpFromResponse(response)

      if (approvedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, rpId, approvedFrp))
      } else {
        setReloadToken((currentValue) => currentValue + 1)
      }

      setIsApproveDialogOpen(false)
      setSelectedApprovalRp(null)
    } catch (error) {
      setApproveError(error.message || 'Gagal approve RP.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleFrpRejected = async ({ rp: targetFrp, reason }) => {
    const target = targetFrp ?? selectedRejectFrp
    const rpId = target?.id

    if (rpId === undefined || rpId === null) {
      setRejectError('ID FRP tidak tersedia.')
      return
    }

    setRejectError('')
    setIsRejecting(true)

    try {
      const response = await api.rp.reject(rpId, {
        reason,
      })
      const rejectedFrp = getFrpFromResponse(response)

      if (rejectedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, rpId, rejectedFrp))
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

  const handleFrpReverted = async ({ rp: targetFrp, notes } = {}) => {
    const target = targetFrp ?? selectedRevertFrp
    const rpId = target?.id

    if (rpId === undefined || rpId === null) {
      setRevertError('ID FRP tidak tersedia.')
      return
    }

    const rpLabel = getFrpEditLabel(target)

    setRevertError('')
    setIsReverting(true)
    try {
      const response = await api.rp.revert(rpId, {
        reason: notes || `Revert ${rpLabel}`,
      })
      const revertedFrp = getFrpFromResponse(response)

      if (revertedFrp) {
        setBudgetType((currentFrp) => updateVendorRecord(currentFrp, rpId, revertedFrp))
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

  const handleVendorStatusChange = async (rp, nextIsActive) => {
    const rpId = rp?.id

    if (rpId === undefined || rpId === null) {
      return
    }

    const rpIdKey = String(rpId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(rpIdKey))
    setBudgetType((currentVendors) =>
      updateVendorStatus(currentVendors, rpId, normalizedIsActive),
    )

    try {
      const response = await api.rp.updateStatus(rpId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setBudgetType((currentVendors) =>
          updateVendorStatus(currentVendors, rpId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setBudgetType((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === rpIdKey ? rp : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status RP checker rule.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(rpIdKey)

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
    () => getFilterOptions(rp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
    [rp],
  )
  const vendorFilterOptions = useMemo(
    () => getFilterOptions(rp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
    [rp],
  )
  const hasActiveRpFilter = Boolean(rpFilters.requestBy || rpFilters.vendor)
  const canUseDestinationChecker = Boolean(currentUser) && !isManagerUser(currentUser)
  const availableRpProcessStatusTabs = rpProcessStatusTabs.filter(
    (tab) => tab.id !== 'PENDING_DESTINATION_CHECKER' || canUseDestinationChecker,
  )

  useEffect(() => {
    if (activeRpStatus === 'PENDING_DESTINATION_CHECKER' && !canUseDestinationChecker) {
      setActiveRpStatus(RP_DEFAULT_STATUS)
    }
  }, [activeRpStatus, canUseDestinationChecker, setActiveRpStatus])

  const rpTabsWithCounts = availableRpProcessStatusTabs.map((tab) => ({
    ...tab,
    count: rp.filter((rpItem) => {
      const status = getFrpStatusValue(rpItem)

      return (
        matchesStatusFilter(status, tab.id) &&
        canCurrentUserSeeRpStatus(rpItem, currentUser) &&
        matchesRpFilters(rpItem, rpFilters)
      )
    }).length,
  }))
  const visibleFrp = rp.filter((rpItem) => {
    const status = getFrpStatusValue(rpItem)
    const matchesRpStatusFilter = matchesStatusFilter(status, activeRpStatus)

    return (
      matchesRpStatusFilter &&
      canCurrentUserSeeRpStatus(rpItem, currentUser) &&
      matchesRpFilters(rpItem, rpFilters)
    )
  })
  const hasRpStatusFilter = activeRpStatus !== RP_STATUS_ALL
  const isDestinationCheckerTab = activeRpStatus === 'PENDING_DESTINATION_CHECKER'
  const filteredStatusLabel = getRpStatusFilterLabel(activeRpStatus)
  const filteredEmptyMessage =
    !authGateMessage &&
    !isLoading &&
    !errorMessage &&
    hasActiveRpFilter
      ? 'Data tidak ditemukan untuk filter yang dipilih.'
      : !authGateMessage &&
    !isLoading &&
    !errorMessage &&
    hasRpStatusFilter
      ? `Belum ada RP pada status ${filteredStatusLabel}.`
      : emptyMessage

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card rp-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions rp-page__desktop-actions">
          <SearchFrp searchProps={searchProps} variant="desktop" />
          <ButtonFilterRp
            label={isDesktopFilterOpen ? 'Tutup filter' : 'Buka filter'}
            dialogId="rp-desktop-filter"
            dialogLabel="Filter RP"
            isOpen={isDesktopFilterOpen}
            onClose={() => setIsDesktopFilterOpen(false)}
            className={[
              'rp-page__filter-button',
              hasActiveRpFilter ? 'rp-page__filter-button--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setIsDesktopFilterOpen((isOpen) => !isOpen)}
          >
            <RpFilter
              filters={rpFilters}
              requestByOptions={requestByFilterOptions}
              vendorOptions={vendorFilterOptions}
              onFilterChange={updateRpFilter}
            />
          </ButtonFilterRp>
          <ButtonCreateRp
            variant="create"
            dialogProps={{
              onCreated: handleFrpCreated,
            }}
          >
            Create
          </ButtonCreateRp>

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

      <MobileScreenDetailRp rp={selectedMobileDetailsFrp} onBack={closeMobileDetailsPage} />
      <MobileScreenCreateRp
        isOpen={isMobileCreateScreenOpen}
        mode="screen"
        onClose={closeMobileCreatePage}
        onCreated={handleFrpCreated}
      />
      <MobileScreenEditRp
        isOpen={Boolean(selectedMobileEditFrp)}
        mode="screen"
        title={`Edit ${getFrpEditLabel(selectedMobileEditFrp)}`}
        rp={selectedMobileEditFrp}
        onClose={closeMobileEditPage}
        onUpdated={handleVendorUpdated}
      />

      <div
        className={[
          'rp-page__table-section',
          selectedMobileDetailsFrp || selectedMobileEditFrp || isMobileCreateScreenOpen
            ? 'rp-page__mobile-list--hidden'
            : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="rp-page__tabs-toolbar">
          <TabsProcessRp
            activeStatus={activeRpStatus}
            onStatusChange={setActiveRpStatus}
            tabs={rpTabsWithCounts}
            variant="desktop"
          />
        </div>

        <DataTableRp
          rows={shouldLoadFrp ? visibleFrp : []}
          tableLabel={`${pageTitle} table`}
          emptyMessage={filteredEmptyMessage}
          tableWrapperStyle={{ marginTop: '0.75rem' }}
          SwitchComponent={Switch}
          onEdit={openEditDialog}
          onCheckData={openCheckDataDialog}
          onDetails={openDetailsDialog}
          onApproval={openApproveDialog}
          onReject={openRejectDialog}
          onRevert={openRevertDialog}
          onCreateFrp={openCreateFrpDialog}
          onPrint={handlePrintRp}
          currentUser={currentUser}
          canApprove={(row) => canCurrentUserApproveFrp(row, currentUser)}
          canReject={(row) => canCurrentUserApproveFrp(row, currentUser)}
          canCreateFrp={(row) => canCurrentUserCreateFrpFromRp(row, currentUser)}
          canCheckData={(row) =>
            getFrpStatusValue(row) === 'PENDING_DESTINATION_CHECKER' &&
            canCurrentUserDestinationCheckRp(row, currentUser)
          }
          useCheckDataAction={isDestinationCheckerTab}
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
                      disabled: (rp) =>
                        isDestinationCheckerTab
                          ? !(
                              getFrpStatusValue(rp) === 'PENDING_DESTINATION_CHECKER' &&
                              canCurrentUserDestinationCheckRp(rp, currentUser)
                            )
                          : !canCurrentUserEditFrp(rp, currentUser),
                      onClick: isDestinationCheckerTab ? openCheckDataDialog : openMobileEditPage,
                    }
                  : action,
              ),
          }}
        />
      </div>

      <DialogEditRp
        isOpen={isEditDialogOpen}
        title={`Edit ${getFrpEditLabel(selectedBudgetType)}`}
        rp={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />

      <DialogCheckDataRp
        isOpen={isCheckDataDialogOpen}
        title={`Check Data ${getFrpEditLabel(selectedCheckDataRp)}`}
        rp={selectedCheckDataRp}
        onClose={closeCheckDataDialog}
        onUpdated={handleRpChecked}
      />

      <DialogDetailsRp
        isOpen={isDetailsDialogOpen}
        title={`Detail ${getFrpEditLabel(selectedDetailsFrp)}`}
        rp={selectedDetailsFrp}
        onClose={closeDetailsDialog}
      />

      <DialogApproveRp
        key={selectedApprovalRp?.id ?? 'approve-rp'}
        isOpen={isApproveDialogOpen}
        title={`Approve ${getFrpEditLabel(selectedApprovalRp)}`}
        rp={selectedApprovalRp}
        isSubmitting={isApproving}
        submitError={approveError}
        onClose={closeApproveDialog}
        onApprove={handleRpApproved}
      />

      <DialogRejectFrp
        key={selectedRejectFrp?.id ?? 'reject-rp'}
        isOpen={isRejectDialogOpen}
        title={`Reject ${getFrpEditLabel(selectedRejectFrp)}`}
        rp={selectedRejectFrp}
        isSubmitting={isRejecting}
        submitError={rejectError}
        onClose={closeRejectDialog}
        onReject={handleFrpRejected}
      />

      <DialogRevertFrp
        key={selectedRevertFrp?.id ?? 'revert-rp'}
        isOpen={isRevertDialogOpen}
        title={`Revert ${getFrpEditLabel(selectedRevertFrp)}`}
        rp={selectedRevertFrp}
        isSubmitting={isReverting}
        submitError={revertError}
        onClose={closeRevertDialog}
        onRevert={handleFrpReverted}
      />

      <DialogCreateFrpFromRp
        key={selectedCreateFrpRp?.id ?? 'create-frp-from-rp'}
        isOpen={isCreateFrpDialogOpen}
        title="Create FRP"
        rp={selectedCreateFrpRp}
        onClose={closeCreateFrpDialog}
        onCreated={handleRpConvertedToFrp}
      />
    </section>

  )
}

export default RpPage
