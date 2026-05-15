import { useLocation } from 'react-router-dom'

function getInitials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

export default function Sidebar({ collapsed = false, userName = 'User', userRole = 'Staff', userIsAdmin = false, allAssignments = [], onToggleCollapse }) {
  const { pathname } = useLocation()

  const uniqueCompanies = [...new Set((allAssignments || []).map(a => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'

  const primaryItems = [
    { label: 'New Request', href: '/', icon: 'add_circle' },
    { label: 'Approval', href: '/approval', icon: 'pending_actions' },
    { label: 'Approved', href: '/approved', icon: 'check_circle' },
    { label: 'History', href: '/history', icon: 'history' },
    ...(userIsAdmin ? [{ label: 'Master Data', href: '/admin/employees', icon: 'admin_panel_settings' }] : []),
  ]

  const secondaryItems = [
    ...(showBack ? [{ label: 'Ganti Akses', href: backUrl, icon: 'swap_horiz' }] : []),
    { label: 'Logout', href: '/logout', icon: 'logout', danger: true },
  ]

  const isActive = href => {
    if (href === '/') return pathname === '/'
    if (href.startsWith('/admin')) return pathname.startsWith('/admin')
    return pathname === href
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button type="button" className="sidebar-toggle" aria-label="Toggle Sidebar" onClick={onToggleCollapse}>
        <span className="material-icons-round" style={{ fontSize: '18px' }}>{collapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>

      <div className="sidebar-logo">
        <span className="material-icons-round" style={{ fontSize: '28px', color: 'var(--theme-accent-primary)', flexShrink: 0 }}>payments</span>
        <span className="logo-text">Pilar Group</span>
      </div>

      <div className="sidebar-profile">
        <div className="profile-content">
          <div className="profile-avatar__badge">{getInitials(userName)}</div>
          <div className="profile-info">
            <p className="profile-name">{userName}</p>
            <p className="profile-role">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {primaryItems.map(item => (
          <a key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`} data-tooltip={collapsed ? item.label : undefined}>
            <span className="material-icons-round" style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map(item => (
          <a key={item.label} href={item.href} className={`nav-item${item.danger ? ' logout-item' : ''}`} data-tooltip={collapsed ? item.label : undefined}>
            <span className="material-icons-round" style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</span>
            <span className="nav-text">{item.label}</span>
          </a>
        ))}
      </div>
    </aside>
  )
}
