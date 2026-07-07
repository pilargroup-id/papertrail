import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableFrpPage from '../../components/table/frp/DataTableFrp.jsx';

// Button Vendor
import Switch from '../../components/forms/Switch.jsx';
import ButtonCreateFrp from '../../components/button/button-frp/ButtonCreateFrp.jsx'
import DialogEditRpCheckerRules from '../../components/Dialog/dialog-rp-checker-rules/DialogEditRpCheckerRules.jsx';

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

function getRpCheckerRuleLabel(rule) {
  return [
    rule?.department_name_snapshot ?? rule?.destination_department_rule_id,
    rule?.job_position,
  ].filter(Boolean).join(' - ') || 'RP checker rule ini'
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
  const pageTitle = activePage?.title ?? 'RP Checker Rules'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [frp, setBudgetType] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBudgetType, setSelectedBudgetType] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVendors() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.rpCheckerRules.list(
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

  const openDeleteDialog = (frp) => {
    setSelectedBudgetType(frp)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setSelectedBudgetType(null)
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

  const handleRpCheckerRuleDelete = async (rpCheckerRule) => {
    const rpCheckerRuleId = rpCheckerRule?.id

    if (rpCheckerRuleId === undefined || rpCheckerRuleId === null) {
      return
    }

    setErrorMessage('')

    try {
      await api.rpCheckerRules.updateStatus(rpCheckerRuleId, 0)
      setBudgetType((currentRules) =>
        currentRules.filter((currentRule) => String(currentRule?.id) !== String(rpCheckerRuleId)),
      )
      closeDeleteDialog()
    } catch (error) {
      setErrorMessage(error.message || 'Gagal menonaktifkan RP checker rule.')
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
      const response = await api.rpCheckerRules.updateStatus(frpId, normalizedIsActive)
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

      {/* <DataTablefrp
        rows={frp}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      /> */}

      {/* <DialogEditfrp
        isOpen={isEditDialogOpen}
        title={`Edit ${getRpCheckerRuleLabel(selectedBudgetType)}`}
        rpCheckerRule={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      /> */}
    </section>

  )
}

export default FrpPage