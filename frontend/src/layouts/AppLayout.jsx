import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import BackgroundMain from '../components/layoute/BackgroundMain.jsx'
import Header from '../components/layoute/Header.jsx'
import Sidebar from '../components/layoute/Sidebar.jsx'
import { pageDetails } from '../dummy/pageDetails.js'
import createMobileFrpHeaderTabs, {
  FRP_MOBILE_STATUS_ALL,
} from '../mobile/mobile-button/frp/MobileTabsFrp.jsx'
import createMobileRpHeaderTabs from '../mobile/mobile-button/rp/MobileTabsRp.jsx'
import { RP_MOBILE_DEFAULT_STATUS } from '../mobile/mobile-button/rp/mobileTabsRpConfig.js'
import HeaderMobile from '../mobile/layoutes-mobile/HeaderMobile.jsx'
import api from '../services/api.js'

const defaultActivePage = {
  title: 'Page1',
  eyebrow: 'Master Data',
  value: '0',
  detail: 'Halaman default.',
}

function extractAuthUser(authResponse) {
  return authResponse?.data?.data ?? authResponse?.data ?? authResponse?.result ?? authResponse ?? {}
}

function extractAuthProfile(authResponse) {
  const authData = extractAuthUser(authResponse)

  return {
    userName:
      authData.fullName ??
      authData.full_name ??
      authData.name ??
      authData.userName ??
      authData.username ??
      '',
    userRole:
      authData.job_position ??
      authData.jobPosition ??
      authData.role ??
      authData.userRole ??
      '',
  }
}

function AppLayout({
  activePage,
  activePath,
  children,
  isSearchTable = false,
  searchQuery: controlledSearchQuery,
  onRefresh,
  onSearchChange,
}) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [mobileFrpStatusFilter, setMobileFrpStatusFilter] = useState(FRP_MOBILE_STATUS_ALL)
  const [mobileRpStatusFilter, setMobileRpStatusFilter] = useState(RP_MOBILE_DEFAULT_STATUS)
  const [isMobileHeaderHidden, setIsMobileHeaderHidden] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [authProfile, setAuthProfile] = useState({
    userName: '',
    userRole: '',
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const resolvedActivePath = activePath ?? location.pathname
  const resolvedActivePage = pageDetails[resolvedActivePath] ?? activePage ?? defaultActivePage
  const resolvedPageTitle = resolvedActivePage.title ?? defaultActivePage.title
  const searchQuery = controlledSearchQuery ?? internalSearchQuery
  const handleSearchChange = onSearchChange ?? setInternalSearchQuery
  const handleRefresh = onRefresh ?? (() => setLastUpdated(new Date()))

  const shellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isMyTicketsPage = resolvedActivePath === '/MyTickets'
  const normalizedActivePath = resolvedActivePath.toLowerCase()
  const isFrpPage = normalizedActivePath === '/frp'
  const isRpPage = normalizedActivePath === '/rp'
  const mobileHeaderTabs = isFrpPage
    ? createMobileFrpHeaderTabs({
        activeStatus: mobileFrpStatusFilter,
        onStatusChange: setMobileFrpStatusFilter,
      })
    : isRpPage
      ? createMobileRpHeaderTabs({
          activeStatus: mobileRpStatusFilter,
          currentUser,
          onStatusChange: setMobileRpStatusFilter,
        })
    : undefined
  const searchProps = {
    value: searchQuery,
    placeholder: isSearchTable ? 'Cari data table...' : 'Search Data...',
    ariaLabel: isSearchTable ? 'Cari data table' : 'Search legal tickets',
    onChange: (event) => handleSearchChange(event.target.value),
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadAuthProfile = async () => {
      try {
        const authResponse = await api.auth.me({
          signal: controller.signal,
        })
        const authUser = extractAuthUser(authResponse)

        setAuthProfile(extractAuthProfile(authUser))
        setCurrentUser(authUser)
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setAuthProfile({
          userName: '',
          userRole: '',
        })
        setCurrentUser(null)
      } finally {
        if (!controller.signal.aborted) {
          setIsAuthLoading(false)
        }
      }
    }

    loadAuthProfile()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!isFrpPage) {
      setMobileFrpStatusFilter(FRP_MOBILE_STATUS_ALL)
    }
  }, [isFrpPage])

  return (
    <div className={shellClassName}>
      <BackgroundMain />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        activePath={resolvedActivePath}
        userName={authProfile.userName}
        userRole={authProfile.userRole}
        onToggleCollapse={() => setSidebarCollapsed((currentValue) => !currentValue)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <button
        type="button"
        className={`sidebar-overlay${mobileSidebarOpen ? ' active' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <div className="dashboard-header-desktop">
          <Header
            title="Papertrail"
            showMenuButton
            onMenuToggle={() => setMobileSidebarOpen(true)}
          />
        </div>

        {!isMobileHeaderHidden ? (
          <HeaderMobile
            showMenuButton
            onMenuToggle={() => setMobileSidebarOpen(true)}
            breadcrumb={[
              { label: 'Papertrail', href: '#' },
              { label: resolvedPageTitle, href: '#', active: true },
            ]}
            searchProps={searchProps}
            notificationProps={{
              ariaLabel: 'Filter',
              modalTitle: 'Filter',
            }}
            onRefresh={handleRefresh}
            headerTabs={mobileHeaderTabs}
          />
        ) : null}

        <main className={`dashboard-main${isMyTicketsPage ? ' dashboard-main--mytickets' : ''}`}>
          <div
            className={`dashboard-content${
              isMyTicketsPage ? ' dashboard-content--mytickets' : ''
            }`}
          >
            {children ?? (
              <Outlet
                context={{
                  activePage: resolvedActivePage,
                  activePath: resolvedActivePath,
                  lastUpdated,
                  searchQuery,
                  currentUser,
                  isAuthLoading,
                  mobileFrpStatusFilter,
                  mobileRpStatusFilter,
                  setMobileRpStatusFilter,
                  setMobileHeaderHidden: setIsMobileHeaderHidden,
                  searchProps,
                  onDataChange: handleRefresh,
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
