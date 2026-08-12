import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableConvertFrpFromRp from '../../components/table/frp/DataTableConvertFrpFromRp.jsx';
import { canCurrentUserCreateFrpFromRp } from '../../components/table/rp/rp-button-access.js';
import RpFilter from '../rp/RpFilter.jsx'
import TabsProcessRp from '../rp/TabsProcessRp.jsx'
import ButtonFilterRp from '../../components/button/button-rp/ButtonFilterRp.jsx'
import {
  getRpDetailFromResponse,
  getRpItemsFromResponse,
} from '../../components/Dialog/dialog-rp/tabs-details-rp/detailRpUtils.jsx'
import { printRpDocument, showPrintError, showPrintLoading } from '../rp/print-rp.js'

// Dialog
import DialogCreateFrpFromRp from '../../components/Dialog/dialog-rp/DialogCreateFrpFromRp.jsx'

// Mobile
import MobileScreenDetailRp from '../../mobile/screen/screen-rp/MobileScreenDetailRp.jsx'
import SearchFrp from '../../mobile/search-mobile/SearchFrp.jsx'

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

function getFirstValue(source, keys, fallback = '') {
  const matchedKey = keys.find(
    (key) => source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '',
  )

  return matchedKey ? source[matchedKey] : fallback
}

function normalizeFilterValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getFilterOptions(rows, keys) {
  const values = rows
    .map((row) => getFirstValue(row, keys))
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')

  return [...new Set(values.map(String))].sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  )
}

function matchesRpFilters(rp, filters) {
  const requestBy = normalizeFilterValue(
    getFirstValue(rp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
  )
  const vendor = normalizeFilterValue(
    getFirstValue(rp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
  )

  return (
    (!filters.requestBy || requestBy === normalizeFilterValue(filters.requestBy)) &&
    (!filters.vendor || vendor === normalizeFilterValue(filters.vendor))
  )
}

function removeRpRecord(rp, rpId) {
  return rp.filter((rpItem) => String(rpItem?.id) !== String(rpId))
}

const conversionStatusTabs = [
  { id: 'NOT_CREATED', label: 'Approved' },
  { id: 'CREATED', label: 'Create FRP' },
]

function ConvertFrpFromRp(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const searchProps = props.searchProps ?? outletContext.searchProps
  const currentUser = props.currentUser ?? outletContext.currentUser ?? null
  const setMobileHeaderHidden = props.setMobileHeaderHidden ?? outletContext.setMobileHeaderHidden
  const isAuthLoading = props.isAuthLoading ?? outletContext.isAuthLoading ?? false
  const shouldLoadRp = !isAuthLoading && Boolean(currentUser)
  const activePageTitle = activePage?.title
  const pageTitle = activePageTitle && !['Page1', 'Page 1'].includes(activePageTitle) ? activePageTitle : 'Convert FRP from RP'
  const pageEyebrow = activePage?.eyebrow ?? 'Document Transaction'
  const [rp, setRp] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [isCreateFrpDialogOpen, setIsCreateFrpDialogOpen] = useState(false)
  const [selectedCreateFrpRp, setSelectedCreateFrpRp] = useState(null)
  const [selectedMobileDetailsRp, setSelectedMobileDetailsRp] = useState(null)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false)
  const [rpFilters, setRpFilters] = useState({
    requestBy: '',
    vendor: '',
  })
  const [activeConversionStatus, setActiveConversionStatus] = useState(conversionStatusTabs[0].id)

  useEffect(() => {
    setMobileHeaderHidden?.(Boolean(selectedMobileDetailsRp))

    return () => {
      setMobileHeaderHidden?.(false)
    }
  }, [selectedMobileDetailsRp, setMobileHeaderHidden])

  useEffect(() => {
    if (!shouldLoadRp) {
      return undefined
    }

    const controller = new AbortController()

    async function loadRp() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const listRp =
          activeConversionStatus === 'CREATED' ? api.rp.listConvertedToFrp : api.rp.listReadyForFrp
        const response = await listRp(
          {
            page: 1,
            limit: 100,
            search: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setRp(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setRp([])
        setErrorMessage(error.message || 'Gagal memuat data RP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadRp()

    return () => controller.abort()
  }, [shouldLoadRp, searchQuery, reloadToken, activeConversionStatus])

  const updateRpFilter = (filterName, value) => {
    setRpFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: value,
    }))
  }

  const handleConversionStatusTabChange = (nextStatus) => {
    setActiveConversionStatus(nextStatus)
    setRpFilters({ requestBy: '', vendor: '' })
  }

  const openCreateFrpDialog = (rpRow) => {
    setSelectedCreateFrpRp(rpRow)
    setIsCreateFrpDialogOpen(true)
  }

  const closeCreateFrpDialog = () => {
    setIsCreateFrpDialogOpen(false)
    setSelectedCreateFrpRp(null)
  }

  const openMobileDetailsPage = (rpRow) => {
    setSelectedMobileDetailsRp(rpRow)
  }

  const closeMobileDetailsPage = () => {
    setSelectedMobileDetailsRp(null)
  }

  const handlePrintRp = async (rpRow) => {
    const rpId = rpRow?.id

    if (rpId === undefined || rpId === null) {
      window.alert('ID RP tidak tersedia.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=850')

    if (!printWindow) {
      window.alert('Popup print diblokir browser. Izinkan popup untuk mencetak RP.')
      return
    }

    showPrintLoading(printWindow)

    try {
      const response = await api.rp.detail(rpId)
      const rpDetail = getRpDetailFromResponse(response) ?? rpRow
      const items = getRpItemsFromResponse(response)

      printRpDocument(printWindow, { rpDetail, items })
    } catch (error) {
      showPrintError(printWindow, error.message || 'Gagal memuat data RP untuk print.')
    }
  }

  const handleRpConvertedToFrp = () => {
    const rpId = selectedCreateFrpRp?.id

    if (rpId !== undefined && rpId !== null) {
      setRp((currentRp) => removeRpRecord(currentRp, rpId))
    } else {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeCreateFrpDialog()
  }

  const authGateMessage = isAuthLoading
    ? 'Memuat profil auth...'
    : !currentUser
      ? 'Profil auth tidak tersedia.'
      : ''
  const defaultEmptyMessage =
    activeConversionStatus === 'CREATED'
      ? 'Belum ada RP yang sudah dibuatkan FRP.'
      : 'Belum ada RP yang siap dibuatkan FRP.'
  const emptyMessage = authGateMessage || (isLoading
    ? 'Memuat data RP...'
    : errorMessage || (searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : defaultEmptyMessage))
  const requestByFilterOptions = useMemo(
    () => getFilterOptions(rp, ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by']),
    [rp],
  )
  const vendorFilterOptions = useMemo(
    () => getFilterOptions(rp, ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id']),
    [rp],
  )
  const hasActiveRpFilter = Boolean(rpFilters.requestBy || rpFilters.vendor)
  const visibleRp = rp.filter((rpItem) => matchesRpFilters(rpItem, rpFilters))
  const filteredEmptyMessage =
    !authGateMessage && !isLoading && !errorMessage && hasActiveRpFilter
      ? 'Data tidak ditemukan untuk filter yang dipilih.'
      : emptyMessage

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card rp-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions rp-page__desktop-actions">
          <SearchFrp searchProps={searchProps} variant="desktop" />
          <ButtonFilterRp
            label={isDesktopFilterOpen ? 'Tutup filter' : 'Buka filter'}
            dialogId="convert-frp-from-rp-desktop-filter"
            dialogLabel="Filter RP"
            isOpen={isDesktopFilterOpen}
            onClose={() => setIsDesktopFilterOpen(false)}
            className={[
              'rp-page__filter-button',
              hasActiveRpFilter ? 'rp-page__filter-button--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setIsDesktopFilterOpen((isOpen) => !isOpen)}
          >
            <RpFilter
              filters={rpFilters}
              requestByOptions={requestByFilterOptions}
              vendorOptions={vendorFilterOptions}
              onFilterChange={updateRpFilter}
            />
          </ButtonFilterRp>
        </div>
      </div>

      {!selectedMobileDetailsRp ? <SearchFrp searchProps={searchProps} /> : null}

      <MobileScreenDetailRp rp={selectedMobileDetailsRp} onBack={closeMobileDetailsPage} />

      <div
        className={[
          'rp-page__table-section',
          selectedMobileDetailsRp ? 'rp-page__mobile-list--hidden' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="rp-page__tabs-toolbar">
          <TabsProcessRp
            activeStatus={activeConversionStatus}
            onStatusChange={handleConversionStatusTabChange}
            tabs={conversionStatusTabs}
            variant="desktop"
            ariaLabel="Filter status Convert FRP from RP"
          />
        </div>

        <DataTableConvertFrpFromRp
          rows={shouldLoadRp ? visibleRp : []}
          tableLabel={`${pageTitle} table`}
          emptyMessage={filteredEmptyMessage}
          tableWrapperStyle={{ marginTop: '0.75rem' }}
          onCreateFrp={openCreateFrpDialog}
          onPrint={handlePrintRp}
          currentUser={currentUser}
          canCreateFrp={(row) => canCurrentUserCreateFrpFromRp(row, currentUser)}
          mobileCard={{
            onMoreInfo: openMobileDetailsPage,
          }}
        />
      </div>

      <DialogCreateFrpFromRp
        key={selectedCreateFrpRp?.id ?? 'create-frp-from-rp'}
        isOpen={isCreateFrpDialogOpen}
        title="Create FRP"
        rp={selectedCreateFrpRp}
        onClose={closeCreateFrpDialog}
        onCreated={handleRpConvertedToFrp}
      />
    </section>
  )
}

export default ConvertFrpFromRp
