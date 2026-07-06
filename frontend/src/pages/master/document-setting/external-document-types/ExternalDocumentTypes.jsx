import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import api from '../../../../services/api.js'

import Switch from '../../../../components/forms/Switch.jsx'
import DataTableExternalDocumentTypes from '../../../../components/table/master-table/external-documents/DataTableExternalDocumentTypes.jsx'

import DialogEditExternalDocumentsType from '../../../../components/Dialog/dialog-external-document-types/DialogEditExternalDocumentsType.jsx'

import ButtonCreateExternalDocumentsType from '../../../../components/button/button-external-document-types/ButtonCreateExternalDocumentTypes.jsx'

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
    rule?.code,
    rule?.name,
  ].filter(Boolean).join(' - ') || 'FRP document type ini'
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

function ExternalDocumentTypes(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'FRP Document Types'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [budgetAccessRules, setFrpDocumentsTypeRules] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedFrpDocumentsTypeRule, setSelectedFrpDocumentsTypeRule] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFrpDocumentsTypeRules() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.externalDocumentTypes.list(
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
        setErrorMessage(error.message || 'Gagal memuat data FRP document types.')
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
      const response = await api.externalDocumentTypes.updateStatus(budgetAccessRuleId, normalizedIsActive)
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
      setErrorMessage(error.message || 'Gagal memperbarui status FRP document type.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(budgetAccessRuleIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data FRP document types...'
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
          <ButtonCreateExternalDocumentsType
            variant="create"
            dialogProps={{
              onCreated: handleRuleCreated,
            }}
          >
            Create
          </ButtonCreateExternalDocumentsType>
        </div>
      </div>

      <DataTableExternalDocumentTypes
        rows={budgetAccessRules}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(budgetAccessRule) =>
          updatingStatusIds.has(String(budgetAccessRule?.id))
        }
        onStatusChange={handleRuleStatusChange}
      />

      <DialogEditExternalDocumentsType
        key={selectedFrpDocumentsTypeRule?.id ?? 'frp-document-type-edit-dialog'}
        isOpen={isEditDialogOpen}
        title={`Edit ${getRuleLabel(selectedFrpDocumentsTypeRule)}`}
        frpDocumentType={selectedFrpDocumentsTypeRule}
        onClose={closeEditDialog}
        onUpdated={handleRuleUpdated}
      />
    </section>
  )
}

export default ExternalDocumentTypes
