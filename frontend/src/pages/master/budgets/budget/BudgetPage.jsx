import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DialogEditBudgets from '../../../../components/Dialog/dialog-budgets/DialogEditBudgets.jsx';
import DataTableBudget from '../../../../components/table/master-table/budget/DataTableBudget.jsx';

// Button Vendor
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateBudgets from '../../../../components/button/button-budgets/ButtonCreateBudgets.jsx';
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

function updateVendorStatus(budgets, budgetsId, isActive, updatedBudgetType) {
  return budgets.map((budgets) => {
    if (String(budgets?.id) !== String(budgetsId)) {
      return budgets
    }

    return {
      ...budgets,
      ...(updatedBudgetType ?? {}),
      is_active: updatedBudgetType?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(budgets, budgetsId, updatedBudgetType) {
  return budgets.map((budgets) =>
    String(budgets?.id) === String(budgetsId)
      ? {
          ...budgets,
          ...updatedBudgetType,
        }
      : budgets,
  )
}

function BudgetsPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Budget'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [budgets, setBudgetType] = useState([])
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
        const response = await api.budgets.list(
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

  const openEditDialog = (budgets) => {
    setSelectedBudgetType(budgets)
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

  const handleVendorStatusChange = async (budgets, nextIsActive) => {
    const budgetsId = budgets?.id

    if (budgetsId === undefined || budgetsId === null) {
      return
    }

    const budgetsIdKey = String(budgetsId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(budgetsIdKey))
    setBudgetType((currentVendors) =>
      updateVendorStatus(currentVendors, budgetsId, normalizedIsActive),
    )

    try {
      const response = await api.budgets.updateStatus(budgetsId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setBudgetType((currentVendors) =>
          updateVendorStatus(currentVendors, budgetsId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setBudgetType((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === budgetsIdKey ? budgets : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status Budget Type.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(budgetsIdKey)

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
          <ButtonCreateBudgets
            dialogProps={{
              onCreated: handleVendorCreated,
            }}
          >
            Create
          </ButtonCreateBudgets>
        </div>
      </div>

      <DataTableBudget
        rows={budgets}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      />

      <DialogEditBudgets
        key={selectedBudgetType?.id ?? 'budget-edit-dialog'}
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedBudgetType?.project_name ?? 'Budget'}`}
        budgetType={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />
    </section>

  )
}

export default BudgetsPage
