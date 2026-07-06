import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import DialogDelete from '../../../components/Dialog/DialogDelete.jsx'
import DialogEditBudgetAccesRules from '../../../components/Dialog/dialog-budget-access/DialogEditBudgetAccess.jsx'
import ButtonCreateBudgetAccesRules from '../../../components/button/button-budget-access/ButtonCreateBudgetAccess.jsx'
import Switch from '../../../components/forms/Switch.jsx'
import DataTableFrpDocumentsType from '../../../components/table/master-table/frp-documents/DataTableFrpDocumentsType.jsx'
import api from '../../../services/api.js'

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

function getRuleFromResponse(response) {
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

function getRuleLabel(rule) {
  return [
    rule?.module,
    rule?.access_type,
    rule?.department_name_snapshot ?? rule?.department_id,
  ].filter(Boolean).join(' - ') || 'budget access rule ini'
}

function updateRuleStatus(budgetAccessRules, budgetAccessRuleId, isActive, updatedRule) {
  return budgetAccessRules.map((budgetAccessRule) => {
    if (String(budgetAccessRule?.id) !== String(budgetAccessRuleId)) {
      return budgetAccessRule
    }

    return {
      ...budgetAccessRule,
      ...(updatedRule ?? {}),
      is_active: updatedRule?.is_active ?? isActive,
    }
  })
}

function updateRuleRecord(budgetAccessRules, budgetAccessRuleId, updatedRule) {
  return budgetAccessRules.map((budgetAccessRule) =>
    String(budgetAccessRule?.id) === String(budgetAccessRuleId)
      ? {
          ...budgetAccessRule,
          ...updatedRule,
        }
      : budgetAccessRule,
  )
}

function FrpDocumentsTypePage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Budget Access'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [budgetAccessRules, setFrpDocumentsTypeRules] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedFrpDocumentsTypeRule, setSelectedFrpDocumentsTypeRule] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFrpDocumentsTypeRules() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.budgetAccessRules.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setFrpDocumentsTypeRules(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setFrpDocumentsTypeRules([])
        setErrorMessage(error.message || 'Gagal memuat data Budget Access.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadFrpDocumentsTypeRules()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleRuleCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (budgetAccessRule) => {
    setSelectedFrpDocumentsTypeRule(budgetAccessRule)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedFrpDocumentsTypeRule(null)
  }

  const openDeleteDialog = (budgetAccessRule) => {
    setSelectedFrpDocumentsTypeRule(budgetAccessRule)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setSelectedFrpDocumentsTypeRule(null)
  }

  const handleRuleUpdated = async (response) => {
    const updatedRule = getRuleFromResponse(response)

    if (updatedRule?.id !== undefined && updatedRule?.id !== null) {
      setFrpDocumentsTypeRules((currentRules) =>
        updateRuleRecord(currentRules, updatedRule.id, updatedRule),
      )
    } else if (selectedFrpDocumentsTypeRule?.id !== undefined && selectedFrpDocumentsTypeRule?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleRuleDelete = async (budgetAccessRule) => {
    const budgetAccessRuleId = budgetAccessRule?.id

    if (budgetAccessRuleId === undefined || budgetAccessRuleId === null) {
      return
    }

    setErrorMessage('')

    try {
      await api.budgetAccessRules.remove(budgetAccessRuleId)
      setFrpDocumentsTypeRules((currentRules) =>
        currentRules.filter((currentRule) => String(currentRule?.id) !== String(budgetAccessRuleId)),
      )
      closeDeleteDialog()
    } catch (error) {
      setErrorMessage(error.message || 'Gagal menghapus Budget Access Rule.')
    }
  }

  const handleRuleStatusChange = async (budgetAccessRule, nextIsActive) => {
    const budgetAccessRuleId = budgetAccessRule?.id

    if (budgetAccessRuleId === undefined || budgetAccessRuleId === null) {
      return
    }

    const budgetAccessRuleIdKey = String(budgetAccessRuleId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(budgetAccessRuleIdKey))
    setFrpDocumentsTypeRules((currentRules) =>
      updateRuleStatus(currentRules, budgetAccessRuleId, normalizedIsActive),
    )

    try {
      const response = await api.budgetAccessRules.updateStatus(budgetAccessRuleId, normalizedIsActive)
      const updatedRule = getRuleFromResponse(response)

      if (updatedRule) {
        setFrpDocumentsTypeRules((currentRules) =>
          updateRuleStatus(currentRules, budgetAccessRuleId, normalizedIsActive, updatedRule),
        )
      }
    } catch (error) {
      setFrpDocumentsTypeRules((currentRules) =>
        currentRules.map((currentRule) =>
          String(currentRule?.id) === budgetAccessRuleIdKey ? budgetAccessRule : currentRule,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status Budget Access Rule.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(budgetAccessRuleIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data Budget Access...'
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
          <ButtonCreateBudgetAccesRules
            variant="create"
            dialogProps={{
              onCreated: handleRuleCreated,
            }}
          >
            Create
          </ButtonCreateBudgetAccesRules>
        </div>
      </div>

      {/* <DataTableFrpDocumentsTypeRules
        rows={budgetAccessRules}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        isStatusUpdating={(budgetAccessRule) =>
          updatingStatusIds.has(String(budgetAccessRule?.id))
        }
        onStatusChange={handleRuleStatusChange}
      /> */}

      {/* <DialogEditBudgetAccesRules
        key={selectedFrpDocumentsTypeRule?.id ?? 'budget-access-edit-dialog'}
        isOpen={isEditDialogOpen}
        title={`Edit ${getRuleLabel(selectedFrpDocumentsTypeRule)}`}
        budgetAccessRule={selectedFrpDocumentsTypeRule}
        onClose={closeEditDialog}
        onUpdated={handleRuleUpdated}
      /> */}

      {/* <DialogDelete
        isOpen={isDeleteDialogOpen}
        eyebrow="Budget Access"
        title={`Delete ${getRuleLabel(selectedFrpDocumentsTypeRule)}`}
        user={
          selectedFrpDocumentsTypeRule
            ? {
                ...selectedFrpDocumentsTypeRule,
                name: getRuleLabel(selectedFrpDocumentsTypeRule),
              }
            : null
        }
        onClose={closeDeleteDialog}
        onConfirm={handleRuleDelete}
      /> */}
    </section>
  )
}

export default FrpDocumentsTypePage
