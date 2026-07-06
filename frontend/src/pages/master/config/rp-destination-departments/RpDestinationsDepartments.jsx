import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DialogEditRpDestinationsDepartments from '../../../../components/Dialog/dialog-rp-destinations-departments/DialogEditRpDestinationsDepartments.jsx';
import DataTableRpDestinationsDepartments from '../../../../components/table/master-table/rp-destinations/DataTableRpDestinationsDepartments.jsx';

// Button Vendor
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateRpDestinationsDepartments from '../../../../components/button/button-rp-destinations-departments/ButtonCreateRpDestinationsDepartments.jsx';

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

function updateVendorStatus(rpDestinationDepartments, rpDestinationDepartmentsId, isActive, updatedBudgetType) {
  return rpDestinationDepartments.map((rpDestinationDepartments) => {
    if (String(rpDestinationDepartments?.id) !== String(rpDestinationDepartmentsId)) {
      return rpDestinationDepartments
    }

    return {
      ...rpDestinationDepartments,
      ...(updatedBudgetType ?? {}),
      is_active: updatedBudgetType?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(rpDestinationDepartments, rpDestinationDepartmentsId, updatedBudgetType) {
  return rpDestinationDepartments.map((rpDestinationDepartments) =>
    String(rpDestinationDepartments?.id) === String(rpDestinationDepartmentsId)
      ? {
          ...rpDestinationDepartments,
          ...updatedBudgetType,
        }
      : rpDestinationDepartments,
  )
}

function RpDestinationsDepartments(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'RP Destination Departments'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [rpDestinationDepartments, setBudgetType] = useState([])
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
        const response = await api.rpDestinationDepartments.list(
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
        setErrorMessage(error.message || 'Gagal memuat data RP destination departments.')
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

  const openEditDialog = (rpDestinationDepartments) => {
    setSelectedBudgetType(rpDestinationDepartments)
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

  const handleVendorStatusChange = async (rpDestinationDepartments, nextIsActive) => {
    const rpDestinationDepartmentsId = rpDestinationDepartments?.id

    if (rpDestinationDepartmentsId === undefined || rpDestinationDepartmentsId === null) {
      return
    }

    const rpDestinationDepartmentsIdKey = String(rpDestinationDepartmentsId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(rpDestinationDepartmentsIdKey))
    setBudgetType((currentVendors) =>
      updateVendorStatus(currentVendors, rpDestinationDepartmentsId, normalizedIsActive),
    )

    try {
      const response = await api.rpDestinationDepartments.updateStatus(rpDestinationDepartmentsId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setBudgetType((currentVendors) =>
          updateVendorStatus(currentVendors, rpDestinationDepartmentsId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setBudgetType((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === rpDestinationDepartmentsIdKey ? rpDestinationDepartments : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status RP destination department.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(rpDestinationDepartmentsIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data RP destination departments...'
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
          <ButtonCreateRpDestinationsDepartments
            variant="create"
            dialogProps={{
              onCreated: handleVendorCreated,
            }}
          >
            Create
          </ButtonCreateRpDestinationsDepartments>
        </div>
      </div>

      <DataTableRpDestinationsDepartments
        rows={rpDestinationDepartments}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      />

      <DialogEditRpDestinationsDepartments
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedBudgetType?.department_name_snapshot ?? 'RP Destination Department'}`}
        rpDestinationDepartment={selectedBudgetType}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />
    </section>

  )
}

export default RpDestinationsDepartments
