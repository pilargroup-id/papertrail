import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DataTableRpPaymentCategories from '../../../../components/table/master-table/rp-payment-categories/DataTableRpPaymentCategories.jsx';

import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateRpPaymentCategories from '../../../../components/button/button-rp-payment-categories/ButtonCreateRpPaymentCategories.jsx'
import DialogEditRpPaymentCategories from '../../../../components/Dialog/dialog-rp-payment-categories/DialogEditRpPaymentCategories.jsx';

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

function getRpPaymentCategoryFromResponse(response) {
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

function getRpPaymentCategoryLabel(rule) {
  return [
    rule?.code,
    rule?.name,
  ].filter(Boolean).join(' - ') || 'RP payment category ini'
}

function updateRpPaymentCategoryStatus(categories, categoryId, isActive, updatedCategory) {
  return categories.map((category) => {
    if (String(category?.id) !== String(categoryId)) {
      return category
    }

    return {
      ...category,
      ...(updatedCategory ?? {}),
      is_active: updatedCategory?.is_active ?? isActive,
    }
  })
}

function updateRpPaymentCategoryRecord(categories, categoryId, updatedCategory) {
  return categories.map((category) =>
    String(category?.id) === String(categoryId)
      ? {
          ...category,
          ...updatedCategory,
        }
      : category,
  )
}

function RpPaymentCategories(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'RP Payment Categories'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [rpPaymentCategories, setRpPaymentCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedRpPaymentCategory, setSelectedRpPaymentCategory] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadRpPaymentCategories() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.rpPaymentCategories.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setRpPaymentCategories(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setRpPaymentCategories([])
        setErrorMessage(error.message || 'Gagal memuat data RP payment categories.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadRpPaymentCategories()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleRpPaymentCategoryCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (category) => {
    setSelectedRpPaymentCategory(category)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedRpPaymentCategory(null)
  }

  const handleRpPaymentCategoryUpdated = async (response) => {
    const updatedCategory = getRpPaymentCategoryFromResponse(response)

    if (updatedCategory?.id !== undefined && updatedCategory?.id !== null) {
      setRpPaymentCategories((currentCategories) =>
        updateRpPaymentCategoryRecord(currentCategories, updatedCategory.id, updatedCategory),
      )
    } else if (selectedRpPaymentCategory?.id !== undefined && selectedRpPaymentCategory?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleRpPaymentCategoryStatusChange = async (category, nextIsActive) => {
    const categoryId = category?.id

    if (categoryId === undefined || categoryId === null) {
      return
    }

    const categoryIdKey = String(categoryId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(categoryIdKey))
    setRpPaymentCategories((currentCategories) =>
      updateRpPaymentCategoryStatus(currentCategories, categoryId, normalizedIsActive),
    )

    try {
      const response = await api.rpPaymentCategories.updateStatus(categoryId, normalizedIsActive)
      const updatedCategory = getRpPaymentCategoryFromResponse(response)

      if (updatedCategory) {
        setRpPaymentCategories((currentCategories) =>
          updateRpPaymentCategoryStatus(currentCategories, categoryId, normalizedIsActive, updatedCategory),
        )
      }
    } catch (error) {
      setRpPaymentCategories((currentCategories) =>
        currentCategories.map((currentCategory) =>
          String(currentCategory?.id) === categoryIdKey ? category : currentCategory,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status RP payment category.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(categoryIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data RP payment categories...'
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
          <ButtonCreateRpPaymentCategories
            variant="create"
            dialogProps={{
              onCreated: handleRpPaymentCategoryCreated,
            }}
          >
            Create
          </ButtonCreateRpPaymentCategories>
        </div>
      </div>

      <DataTableRpPaymentCategories
        rows={rpPaymentCategories}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(category) => updatingStatusIds.has(String(category?.id))}
        onStatusChange={handleRpPaymentCategoryStatusChange}
      />

      <DialogEditRpPaymentCategories
        key={selectedRpPaymentCategory?.id ?? 'rp-payment-category-edit-dialog'}
        isOpen={isEditDialogOpen}
        title={`Edit ${getRpPaymentCategoryLabel(selectedRpPaymentCategory)}`}
        rpPaymentCategory={selectedRpPaymentCategory}
        onClose={closeEditDialog}
        onUpdated={handleRpPaymentCategoryUpdated}
      />
    </section>

  )
}

export default RpPaymentCategories
