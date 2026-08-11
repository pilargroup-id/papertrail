import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import DataTableActivityLogs from '../../components/table/logs/DataTableActivityLogs.jsx';
import DataTableLogBudget from '../../components/table/logs/DataTableLogBudget.jsx';
import TabsLogsDekstop from './TabsLogsDekstop.jsx'
import SearchLogs from '../../mobile/search-mobile/SearchLogs.jsx'

const LOGS_TAB_ACTIVITY = 'ACTIVITY'
const LOGS_TAB_BUDGET = 'BUDGET'
const LOGS_TABS = [
  { id: LOGS_TAB_ACTIVITY, label: 'Activity Logs' },
  { id: LOGS_TAB_BUDGET, label: 'Budget Usage' },
]
const LOGS_PAGE_SIZE = 100

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

  return []
}

function LogsPages(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const searchProps = props.searchProps ?? outletContext.searchProps
  const isAuthLoading = props.isAuthLoading ?? outletContext.isAuthLoading ?? false
  const activePageTitle = activePage?.title
  const pageTitle = activePageTitle && !['Page1', 'Page 1'].includes(activePageTitle) ? activePageTitle : 'Logs'
  const pageEyebrow = activePage?.eyebrow ?? 'Audit Trail'

  const [activeLogTab, setActiveLogTab] = useState(LOGS_TAB_ACTIVITY)
  const [activityLogs, setActivityLogs] = useState([])
  const [budgetUsageLogs, setBudgetUsageLogs] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [isLoadingBudget, setIsLoadingBudget] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [budgetError, setBudgetError] = useState('')

  useEffect(() => {
    if (isAuthLoading) {
      return undefined
    }

    const controller = new AbortController()

    async function loadActivityLogs() {
      setIsLoadingActivity(true)
      setActivityError('')

      try {
        const response = await api.logs.activities.list(
          { page: 1, limit: LOGS_PAGE_SIZE, search: searchQuery },
          { signal: controller.signal },
        )

        setActivityLogs(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setActivityLogs([])
        setActivityError(error.message || 'Gagal memuat activity logs.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingActivity(false)
        }
      }
    }

    loadActivityLogs()

    return () => controller.abort()
  }, [isAuthLoading, searchQuery])

  useEffect(() => {
    if (isAuthLoading) {
      return undefined
    }

    const controller = new AbortController()

    async function loadBudgetUsageLogs() {
      setIsLoadingBudget(true)
      setBudgetError('')

      try {
        const response = await api.logs.budgetUsages.list(
          { page: 1, limit: LOGS_PAGE_SIZE, search: searchQuery },
          { signal: controller.signal },
        )

        setBudgetUsageLogs(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setBudgetUsageLogs([])
        setBudgetError(error.message || 'Gagal memuat budget usage logs.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingBudget(false)
        }
      }
    }

    loadBudgetUsageLogs()

    return () => controller.abort()
  }, [isAuthLoading, searchQuery])

  const isActivityTab = activeLogTab === LOGS_TAB_ACTIVITY
  const isLoading = isActivityTab ? isLoadingActivity : isLoadingBudget
  const errorMessage = isActivityTab ? activityError : budgetError
  const rows = isActivityTab ? activityLogs : budgetUsageLogs
  const emptyMessage = isAuthLoading
    ? 'Memuat profil auth...'
    : isLoading
      ? 'Memuat data logs...'
      : errorMessage || (searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.')

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card frp-page logs-page"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions frp-page__desktop-actions">
          <SearchLogs searchProps={searchProps} variant="desktop" />
        </div>
      </div>

      <SearchLogs searchProps={searchProps} />

      <div className="frp-page__table-section">
        <div className="frp-page__tabs-toolbar">
          <TabsLogsDekstop
            activeStatus={activeLogTab}
            tabs={LOGS_TABS}
            ariaLabel="Filter jenis log"
            onStatusChange={setActiveLogTab}
          />
        </div>

        {isActivityTab ? (
          <DataTableActivityLogs
            rows={rows}
            tableLabel="Activity logs table"
            emptyMessage={emptyMessage}
            tableWrapperStyle={{ marginTop: '0.65rem' }}
          />
        ) : (
          <DataTableLogBudget
            rows={rows}
            tableLabel="Budget usage logs table"
            emptyMessage={emptyMessage}
            tableWrapperStyle={{ marginTop: '0.65rem' }}
          />
        )}
      </div>
    </section>
  )
}

export default LogsPages
