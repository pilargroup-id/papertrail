import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DialogEditBudgetType from '../../../../components/Dialog/dialog-budget-type/DialogEditBudgetType.jsx';
import DataTableBudgetType from '../../../../components/table/master-table/budget-type/DataTableBudgetType.jsx';

// Button Vendor
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateBudgetType from '../../../../components/button/button-budget-type/ButtonCreateBudgetType.jsx';
// import ButtonCreateBudgetType from '../../../../components/butt/dialog-budget-type/DialogEditBudgetType.jsx';

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

function updateVendorStatus(budgetTypes, budgetTypesId, isActive, updatedBudgetType) {
  return budgetTypes.map((budgetTypes) => {
    if (String(budgetTypes?.id) !== String(budgetTypesId)) {
      return budgetTypes
    }

    return {
      ...budgetTypes,
      ...(updatedBudgetType ?? {}),
      is_active: updatedBudgetType?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(budgetTypes, budgetTypesId, updatedBudgetType) {
  return budgetTypes.map((budgetTypes) =>
    String(budgetTypes?.id) === String(budgetTypesId)
      ? {
          ...budgetTypes,
          ...updatedBudgetType,
        }
      : budgetTypes,
  )
}

function BudgetTypePage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Budget Type'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [budgetTypes, setBudgetType] = useState([])
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
        const response = await api.budgetTypes.list(
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
        setErrorMessage(error.message || 'Gagal memuat data Budget Type.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadVendors()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleVendorCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (budgetTypesss) => {
    setSelectedBudgetType(budgetTypesss)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
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

  const handleVendorStatusChange = async (budgetTypesss, nextIsActive) => {
    const budgetTypesssId = budgetTypesss?.id

    if (budgetTypesssId === undefined || budgetTypesssId === null) {
      return
    }

    const budgetTypesssIdKey = String(budgetTypesssId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(budgetTypesssIdKey))
    setBudgetType((currentVendors) =>
      updateVendorStatus(currentVendors, budgetTypesssId, normalizedIsActive),
    )

    try {
      const response = await api.budgetTypes.updateStatus(budgetTypesssId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setBudgetType((currentVendors) =>
          updateVendorStatus(currentVendors, budgetTypesssId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setBudgetType((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === budgetTypesssIdKey ? budgetTypesss : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status Budget Type.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(budgetTypesssIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data Budget Type...'
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
          <ButtonCreateBudgetType
            variant="create"
            dialogProps={{
              onCreated: handleVendorCreated,
            }}
          >
            Create
          </ButtonCreateBudgetType>
        </div>
      </div>

      <DataTableBudgetType
        rows={budgetTypes}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      />

      <DialogEditBudgetType
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedBudgetType?.name ?? 'Budget Type'}`}
        budgetType={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />
    </section>

  )
}

export default BudgetTypePage
