import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../../services/api.js';
import DialogEditCurrencies from '../../../../components/Dialog/dialog-currencies/DialogEditCurrencies.jsx';
import DataTableCurrencies from '../../../../components/table/master-table/currencies/DataTableCurrencies.jsx';

// Button Vendor
import Switch from '../../../../components/forms/Switch.jsx';
import ButtonCreateCurrencies from '../../../../components/button/button-currencies/ButtonCreateCurrencies.jsx';
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

function updateCurrencyStatus(currencies, currencyId, isActive, updatedCurrency) {
  return currencies.map((currency) => {
    if (String(currency?.id) !== String(currencyId)) {
      return currency
    }

    return {
      ...currency,
      ...(updatedCurrency ?? {}),
      is_active: updatedCurrency?.is_active ?? isActive,
    }
  })
}

function CurrenciesPage(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle = activePage?.title ?? 'Currencies'
  const pageEyebrow = activePage?.eyebrow ?? 'Master Data'
  const [currencies, setCurrencies] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedCurrency, setSelectedCurrency] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCurrencies() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.currencies.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setCurrencies(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setCurrencies([])
        setErrorMessage(error.message || 'Gagal memuat data Currencies.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCurrencies()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const handleCurrencyCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const openEditDialog = (currency) => {
    setSelectedCurrency(currency)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedCurrency(null)
  }

  const handleCurrencyUpdated = async () => {
    setReloadToken((currentValue) => currentValue + 1)
    closeEditDialog()
  }

  const handleCurrencyStatusChange = async (currency, nextIsActive) => {
    const currencyId = currency?.id

    if (currencyId === undefined || currencyId === null) {
      return
    }

    const currencyIdKey = String(currencyId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(currencyIdKey))
    setCurrencies((currentCurrencies) =>
      updateCurrencyStatus(currentCurrencies, currencyId, normalizedIsActive),
    )

    try {
      const response = await api.currencies.updateStatus(currencyId, normalizedIsActive)
      const updatedCurrency = getVendorFromResponse(response)

      if (updatedCurrency) {
        setCurrencies((currentCurrencies) =>
          updateCurrencyStatus(currentCurrencies, currencyId, normalizedIsActive, updatedCurrency),
        )
      }
    } catch (error) {
      setCurrencies((currentCurrencies) =>
        currentCurrencies.map((currentCurrency) =>
          String(currentCurrency?.id) === currencyIdKey ? currency : currentCurrency,
        ),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status Currencies.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(currencyIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data Currencies...'
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
          <ButtonCreateCurrencies
            variant="create"
            dialogProps={{
              onCreated: handleCurrencyCreated,
            }}
          >
            Create
          </ButtonCreateCurrencies>
        </div>
      </div>

      <DataTableCurrencies
        rows={currencies}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(currency) => updatingStatusIds.has(String(currency?.id))}
        onStatusChange={handleCurrencyStatusChange}
      />

      <DialogEditCurrencies
        isOpen={isEditDialogOpen}
        title={`Edit ${selectedCurrency?.name ?? 'Currency'}`}
        currency={selectedCurrency}
        onClose={closeEditDialog}
        onUpdated={handleCurrencyUpdated}
      />
    </section>

  )
}

export default CurrenciesPage
