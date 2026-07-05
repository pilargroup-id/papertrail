import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DialogEditVendor from '../../../../components/Dialog/dialog-vendor/DialogEditVendor.jsx';
import DataTableVendor from '../../../../components/table/master-table/vendor/DataTableVendor.jsx';

// Button Vendor
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateVendor from '../../../../components/button/button-vendor/ButtonCreateVendor.jsx';



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

function updateVendorStatus(vendors, vendorId, isActive, updatedVendor) {
  return vendors.map((vendor) => {
    if (String(vendor?.id) !== String(vendorId)) {
      return vendor
    }

    return {
      ...vendor,
      ...(updatedVendor ?? {}),
      is_active: updatedVendor?.is_active ?? isActive,
    }
  })
}

function updateVendorRecord(vendors, vendorId, updatedVendor) {
  return vendors.map((vendor) =>
    String(vendor?.id) === String(vendorId)
      ? {
          ...vendor,
          ...updatedVendor,
        }
      : vendor,
  )
}

function VendorPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Vendor'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedVendor, setSelectedVendor] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVendors() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.vendors.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setVendors(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendors([])
        setErrorMessage(error.message || 'Gagal memuat data vendor.')
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

  const openEditDialog = (vendor) => {
    setSelectedVendor(vendor)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedVendor(null)
  }

  const handleVendorUpdated = async (response) => {
    const updatedVendor = getVendorFromResponse(response)

    if (updatedVendor?.id !== undefined && updatedVendor?.id !== null) {
      setVendors((currentVendors) =>
        updateVendorRecord(currentVendors, updatedVendor.id, updatedVendor),
      )
    } else if (selectedVendor?.id !== undefined && selectedVendor?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleVendorStatusChange = async (vendor, nextIsActive) => {
    const vendorId = vendor?.id

    if (vendorId === undefined || vendorId === null) {
      return
    }

    const vendorIdKey = String(vendorId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(vendorIdKey))
    setVendors((currentVendors) =>
      updateVendorStatus(currentVendors, vendorId, normalizedIsActive),
    )

    try {
      const response = await api.vendors.updateStatus(vendorId, normalizedIsActive)
      const updatedVendor = getVendorFromResponse(response)

      if (updatedVendor) {
        setVendors((currentVendors) =>
          updateVendorStatus(currentVendors, vendorId, normalizedIsActive, updatedVendor),
        )
      }
    } catch (error) {
      setVendors((currentVendors) =>
        currentVendors.map((currentVendor) =>
          String(currentVendor?.id) === vendorIdKey ? vendor : currentVendor,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status vendor.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(vendorIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data vendor...'
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
          <ButtonCreateVendor
            variant="create"
            dialogProps={{
              onCreated: handleVendorCreated,
            }}
          >
            Create
          </ButtonCreateVendor>
        </div>
      </div>

      <DataTableVendor
        rows={vendors}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(vendor) => updatingStatusIds.has(String(vendor?.id))}
        onStatusChange={handleVendorStatusChange}
      />

      <DialogEditVendor
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedVendor?.name ?? 'Vendor'}`}
        vendor={selectedVendor}
        onClose={closeEditDialog}
        onUpdated={handleVendorUpdated}
      />
    </section>

  )
}

export default VendorPage
