import { useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSidebarState } from '../../hooks/useSidebarState'
import { useUser } from '../../contexts/UserContext'
import SelectDivisionPage from '../../pages/SelectDivisionPage'
import { POST_LOGIN_ACCESS_DIALOG_KEY } from '../../utils/auth'

const HIDE_MENU_PATHS = new Set(['/select-company', '/select-division'])

function getDisplayName(user) {
  return (
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.displayName ||
    'User'
  )
}

function getDisplayJobLevel(user) {
  return (
    user?.selectedJobLevel ||
    user?.jobLevelName ||
    user?.jobLevel ||
    user?.role ||
    'staff'
  )
}

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useSidebarState()
  const { user } = useUser()
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const u = user || {}
  const breadcrumbLabelMap = {
    '/': 'Dashboard',
    '/frp': 'New FRP',
    '/approval': 'Approval FRP',
    '/approved': 'Approved FRP',
    '/rp': 'New RP',
    '/rp-approval': 'Approval RP',
    '/rp-approved': 'Approved RP',
  }

  const handleSidebarToggle = () => {
    if (window.innerWidth <= 1024) { setMobileMenuOpen(c => !c); return }
    setSidebarCollapsed(c => !c)
  }

  useEffect(() => {
    if (HIDE_MENU_PATHS.has(pathname)) {
      return
    }

    try {
      const shouldOpenAccessDialog = sessionStorage.getItem(POST_LOGIN_ACCESS_DIALOG_KEY) === '1'

      if (!shouldOpenAccessDialog) {
        return
      }

      sessionStorage.removeItem(POST_LOGIN_ACCESS_DIALOG_KEY)
      setIsAccessDialogOpen(true)
    } catch (_) {}
  }, [pathname])

  return (
    <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        userName={getDisplayName(u)}
        userJobLevel={getDisplayJobLevel(u)}
        userDivision={u.selectedDivision}
        userRole={u.role || u.selectedRole}
        userIsAdmin={u.role === 'administrator' || u.selectedRole === 'administrator'}
        allAssignments={u.allAssignments || []}
        onToggleCollapse={handleSidebarToggle}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onChangeAccess={(href) => {
          if (href === '/select-company') {
            navigate('/select-company')
          } else {
            setIsAccessDialogOpen(true)
          }
        }}
        hideMenu={HIDE_MENU_PATHS.has(pathname)}
      />
      <div className="dashboard-stage">
        <Header 
          onMenuClick={() => setMobileMenuOpen(true)}
          breadcrumb={[
            { label: 'FRP', href: '#' },
            {
              label: breadcrumbLabelMap[pathname] ?? pathname.substring(1),
              href: '#',
              active: true,
            }
          ]}
          notificationProps={{}}
          onRefresh={() => window.location.reload()}
        />
        <Outlet />
      </div>

      <SelectDivisionPage
        isOpen={isAccessDialogOpen}
        user={u}
        onClose={() => setIsAccessDialogOpen(false)}
        onSuccess={() => setIsAccessDialogOpen(false)}
      />
    </div>
  )
}
