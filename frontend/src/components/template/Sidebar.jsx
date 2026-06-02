import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function getInitials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function isItemActive(item, pathname) {
  if (item.href === '/frp' && pathname === '/') return true
  if (item.href === '/') return pathname === '/'
  if (item.href) return pathname === item.href
  return item.children?.some(c => isItemActive(c, pathname)) ?? false
}

function SidebarNavItem({ item, pathname, collapsed, expandedGroups, onToggleGroup, onSelect, isChild = false }) {
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, pathname)
  const expanded = hasChildren ? (expandedGroups[getItemKey(item)] ?? false) : false

  const className = [
    'nav-item',
    isChild ? 'nav-item--child' : '',
    active ? 'active' : '',
    hasChildren ? 'nav-item--accordion' : '',
    expanded ? 'nav-item--expanded' : '',
    hasChildren ? 'nav-item--button' : '',
    item.danger ? 'logout-item' : '',
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {item.icon
        ? <span className="material-icons-round nav-icon" style={{ fontSize: isChild ? '18px' : '22px', opacity: isChild ? 0.75 : 1 }}>{item.icon}</span>
        : <span className="nav-item__bullet" />
      }
      <span className="nav-text">{item.label}</span>
      {hasChildren && <span className="material-icons-round nav-item__chevron" style={{ fontSize: '18px', marginLeft: 'auto' }}>{expanded ? 'expand_less' : 'expand_more'}</span>}
    </>
  )

  const handleClick = e => {
    e.preventDefault()
    if (hasChildren) { onToggleGroup(getItemKey(item)); return }
    onSelect(item)
  }

  const trigger = hasChildren ? (
    <button type="button" className={className} data-tooltip={collapsed ? item.label : undefined} onClick={handleClick}>
      {content}
    </button>
  ) : (
    <a href={item.href} className={className} data-tooltip={collapsed ? item.label : undefined} onClick={handleClick}>
      {content}
    </a>
  )

  if (!hasChildren || collapsed) return trigger

  return (
    <div className="nav-group">
      {trigger}
      <div className={`nav-submenu${expanded ? ' expanded' : ''}`}>
        <div className="nav-submenu__inner">
          {item.children.map(child => (
            <SidebarNavItem key={getItemKey(child)} item={child} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} isChild />
          ))}
        </div>
      </div>
    </div>
  )
}

function getInitialExpanded(pathname) {
  const map = {
    'FRP': ['/', '/frp', '/approval', '/approved', '/status_frp'],
    'Request Purchase': ['/rp', '/rp-approval'],
    'Generate Document': ['/document/generate', '/document/riwayat', '/document/template'],
    'Report': ['/laporan-frp', '/laporan-rp'],
    'Master Data': null,
  }
  const initial = {}
  for (const [key, paths] of Object.entries(map)) {
    if (paths ? paths.includes(pathname) : pathname.startsWith('/admin/')) {
      initial[key] = true
    }
  }
  return initial
}

export default function Sidebar({ collapsed = false, mobileOpen = false, userName = 'User', userJobLevel = '', userDivision = '', userRole = 'staff', userIsAdmin = false, allAssignments = [], onToggleCollapse, onCloseMobile, hideMenu = false }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [userExpandedGroups, setUserExpandedGroups] = useState({})
  const expandedGroups = { ...getInitialExpanded(pathname), ...userExpandedGroups }

  const uniqueCompanies = [...new Set((allAssignments || []).map(a => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'

  const primaryItems = hideMenu ? [] : [
    ...(userIsAdmin ? [{ label: 'Dashboard', href: '/dashboard', icon: 'space_dashboard' }] : []),
    { label: 'FRP', icon: 'receipt_long', children: [
      { label: 'New FRP', href: '/frp', icon: 'note_add' },
      ...(userIsAdmin || ['Manager', 'Direktur', 'Komisaris'].includes(userJobLevel) ? [
        { label: 'Approval FRP', href: '/approval', icon: 'fact_check' }
      ] : []),
      { label: 'FRP Approved', href: '/approved', icon: 'task_alt' },
    ]},
    { label: 'RP', icon: 'shopping_bag', children: [
      { label: 'New RP', href: '/rp', icon: 'note_add' },
      { label: 'Status RP', href: '/rp-approval', icon: 'rule' },
    ]},
    { label: 'Document', icon: 'description', children: [
      { label: 'Generate Document', href: '/document/generate', icon: 'note_add' },
      { label: 'Riwayat Document', href: '/document/riwayat', icon: 'history' },
      { label: 'Kelola Template', href: '/document/template', icon: 'folder_open' },
    ]},
    ...((userIsAdmin || (allAssignments || []).some(a => a.class === 'IT')) ? [{
      label: 'Report', icon: 'analytics', children: [
        { label: 'Report FRP', href: '/laporan-frp', icon: 'receipt_long' },
        { label: 'Report RP', href: '/laporan-rp', icon: 'shopping_bag' }
      ]
    }] : []),
    ...(userIsAdmin ? [{
      label: 'Master Data', icon: 'dns', children: [
        { label: 'Vendor', href: '/admin/vendors', icon: 'storefront' },
        { label: 'Anggaran', href: '/admin/budgets', icon: 'account_balance' },
      ]
    }] : []),
  ]

  const secondaryItems = [
    ...(showBack && !hideMenu ? [{ label: 'Ganti Akses', href: backUrl, icon: 'switch_account' }] : []),
    { label: 'Logout', href: '/logout', icon: 'logout', danger: true },
  ]

  const onToggleGroup = key => {
    const isExpanded = expandedGroups[key] ?? false
    setUserExpandedGroups(g => ({ ...g, [key]: !isExpanded }))
  }

  const onSelect = item => {
    if (onCloseMobile) onCloseMobile()
    if (item.href === '/logout') { window.location.href = '/logout'; return }
    navigate(item.href)
  }

  return (
    <>
    <button
      type="button"
      className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
      onClick={onCloseMobile}
      aria-label="Tutup menu"
    />
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <button type="button" className="sidebar-toggle" aria-label="Toggle Sidebar" onClick={onToggleCollapse}>
        <span className="material-icons-round toggle-icon" style={{ fontSize: '16px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>
      <button type="button" className="sidebar-mobile-dismiss" aria-label="Close menu" onClick={onCloseMobile}>
        <span className="material-icons-round" style={{ fontSize: '20px' }}>close</span>
      </button>

      <div className="sidebar-logo">
        <div className="profile-content">
          <div className="profile-avatar">
            <span className="profile-avatar__badge">{getInitials(userName)}</span>
            <div className="online-status" />
          </div>
          <div className="profile-info">
            <h3 className="profile-name">{userName}</h3>
            <p className="profile-role">
              {userDivision && userJobLevel
                ? `${userDivision} ${userJobLevel}`
                : (userJobLevel || userDivision || (userIsAdmin ? 'Administrator' : 'Staff'))}
            </p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {primaryItems.map(item => (
          <SidebarNavItem key={getItemKey(item)} item={item} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} />
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map(item => (
          <SidebarNavItem key={getItemKey(item)} item={item} pathname={pathname} collapsed={collapsed} expandedGroups={expandedGroups} onToggleGroup={onToggleGroup} onSelect={onSelect} />
        ))}
      </div>
    </aside>
    </>
  )
}
