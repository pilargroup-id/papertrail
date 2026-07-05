import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DataTableVendorBanks from '../../../../components/table/master-table/vendor-banks/DataTableVendorBanks.jsx';

// Button Vendor Banks
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateVendorBanks from '../../../../components/button/button-vendor-banks/ButtonCreateVendorBanks.jsx';

// Dialog Vendor Banks
import DialogEditVendorBanks from '../../../../components/Dialog/dialog-vendor-banks/DialogEditVendorBanks.jsx';

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

function getVendorBanksFromResponse(response) {
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

function updateVendorBanksStatus(currentVendorBanks, banksId, isActive, updatedBanks) {
  return currentVendorBanks.map((vendorBanks) => {
    if (String(vendorBanks?.id) !== String(banksId)) {
      return vendorBanks
    }

    return {
      ...vendorBanks,
      ...(updatedBanks ?? {}),
      is_active: updatedBanks?.is_active ?? isActive,
    }
  })
}

function updateVendorBanksRecord(currentVendorBanks, banksId, updatedBanks) {
  return currentVendorBanks.map((vendorBanks) =>
    String(vendorBanks?.id) === String(banksId)
      ? {
          ...vendorBanks,
          ...updatedBanks,
        }
      : vendorBanks,
  )
}

function VendorBanksPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Vendor Banks Account'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [vendorBanks, setVendorBanks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedVendorBanks, setSelectedVendorBanks] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVendorBanks() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.vendorBankAccounts.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setVendorBanks(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setVendorBanks([])
        setErrorMessage(error.message || 'Gagal memuat data vendor banks.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadVendorBanks()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleVendorBanksCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (vendorBanks) => {
    setSelectedVendorBanks(vendorBanks)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedVendorBanks(null)
  }

  const handleVendorBanksUpdated = async (response) => {
    const updatedVendorBanks = getVendorBanksFromResponse(response)

    if (updatedVendorBanks?.id !== undefined && updatedVendorBanks?.id !== null) {
      setVendorBanks((currentBanks) =>
        updateVendorBanksRecord(currentBanks, updatedVendorBanks.id, updatedVendorBanks),
      )
    } else if (selectedVendorBanks?.id !== undefined && selectedVendorBanks?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleVendorBanksStatusChange = async (vendorBanks, nextIsActive) => {
    const vendorBanksId = vendorBanks?.id

    if (vendorBanksId === undefined || vendorBanksId === null) {
      return
    }

    const banksIdKey = String(vendorBanksId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(banksIdKey))
    setVendorBanks((currentVendorBanks) =>
      updateVendorBanksStatus(currentVendorBanks, vendorBanksId, normalizedIsActive),
    )

    try {
      const response = await api.vendorBankAccounts.updateStatus(vendorBanksId, normalizedIsActive)
      const updatedVendorBanks = getVendorBanksFromResponse(response)

      if (updatedVendorBanks) {
        setVendorBanks((currentVendorBanks) =>
          updateVendorBanksStatus(currentVendorBanks, vendorBanksId, normalizedIsActive, updatedVendorBanks),
        )
      }
    } catch (error) {
      setVendorBanks((currentVendorBanks) =>
        currentVendorBanks.map((currentVendorBanks) =>
          String(currentVendorBanks?.id) === banksIdKey ? vendorBanks : currentVendorBanks,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status banks.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(banksIdKey)
        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data Vendor Banks...'
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
          <ButtonCreateVendorBanks
            variant="create"
            dialogProps={{
              onCreated: handleVendorBanksCreated,
            }}
          >
            Create
          </ButtonCreateVendorBanks>
        </div>
      </div>

      <DataTableVendorBanks
        rows={vendorBanks}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(vendorBanks) => updatingStatusIds.has(String(vendorBanks?.id))}
        onStatusChange={handleVendorBanksStatusChange}
      />

      <DialogEditVendorBanks
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedVendorBanks?.account_name ?? 'Vendor Bank Account'}`}
        vendorBanks={selectedVendorBanks}
        onClose={closeEditDialog}
        onUpdated={handleVendorBanksUpdated}
      />
    </section>

  )
}

export default VendorBanksPage
