import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../services/api.js';
import DataTableBanks from '../../../components/table/master-table/banks/DataTableBanks.jsx';

// Button Banks
import Switch from '../../../components/forms/Switch.jsx';
import ButtonCreateBanks from '../../../components/button/button-banks/ButtonCreateBanks.jsx';

// Dialog ba
import DialogEditBanks from '../../../components/Dialog/dialog-banks/DialogEditBanks.jsx';

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

function getBanksFromResponse(response) {
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

function updateBanksStatus(currentBanks, banksId, isActive, updatedBanks) {
  return currentBanks.map((banks) => {
    if (String(banks?.id) !== String(banksId)) {
      return banks
    }

    return {
      ...banks,
      ...(updatedBanks ?? {}),
      is_active: updatedBanks?.is_active ?? isActive,
    }
  })
}

function updateBanksRecord(currentBanks, banksId, updatedBanks) {
  return currentBanks.map((banks) =>
    String(banks?.id) === String(banksId)
      ? {
          ...banks,
          ...updatedBanks,
        }
      : banks,
  )
}

function BanksPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Banks'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [banks, setBanks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedBanks, setSelectedBanks] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadBanks() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.banks.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setBanks(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setBanks([])
        setErrorMessage(error.message || 'Gagal memuat data banks.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadBanks()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleBanksCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (banks) => {
    setSelectedBanks(banks)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedBanks(null)
  }

  const handleBanksUpdated = async (response) => {
    const updatedBanks = getBanksFromResponse(response)

    if (updatedBanks?.id !== undefined && updatedBanks?.id !== null) {
      setBanks((currentBanks) =>
        updateBanksRecord(currentBanks, updatedBanks.id, updatedBanks),
      )
    } else if (selectedBanks?.id !== undefined && selectedBanks?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleBanksStatusChange = async (banks, nextIsActive) => {
    const banksId = banks?.id

    if (banksId === undefined || banksId === null) {
      return
    }

    const banksIdKey = String(banksId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(banksIdKey))
    setBanks((currentBanks) =>
      updateBanksStatus(currentBanks, banksId, normalizedIsActive),
    )

    try {
      const response = await api.banks.updateStatus(banksId, normalizedIsActive)
      const updatedBanks = getBanksFromResponse(response)

      if (updatedBanks) {
        setBanks((currentBanks) =>
          updateBanksStatus(currentBanks, banksId, normalizedIsActive, updatedBanks),
        )
      }
    } catch (error) {
      setBanks((currentBanks) =>
        currentBanks.map((currentBanks) =>
          String(currentBanks?.id) === banksIdKey ? banks : currentBanks,
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
    ? 'Memuat data banks...'
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
          <ButtonCreateBanks
            variant="create"
            dialogProps={{
              onCreated: handleBanksCreated,
            }}
          >
            Create
          </ButtonCreateBanks>
        </div>
      </div>

      <DataTableBanks
        rows={banks}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(banks) => updatingStatusIds.has(String(banks?.id))}
        onStatusChange={handleBanksStatusChange}
      />

      <DialogEditBanks
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedBanks?.name ?? 'Banks'}`}
        banks={selectedBanks}
        onClose={closeEditDialog}
        onUpdated={handleBanksUpdated}
      />
    </section>

  )
}

export default BanksPage
