import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function getGroupKey(item) {
  return `group:${getItemKey(item)}`
}

function isItemActive(item, currentPath) {
  if (item.href === '/frp' && currentPath === '/') return true
  if (item.href === '/') return currentPath === '/'
  if (item.href === currentPath) {
    return true
  }

  return item.children?.some((child) => isItemActive(child, currentPath)) ?? false
}

function getRpApprovalPath({ userJobLevel, userRole }) {
  const normalizedJobLevel = String(userJobLevel || '').trim().toLowerCase()
  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const isStaff = normalizedRole === 'staff' || normalizedJobLevel === 'staff'

  return isStaff ? '/rp-approval/staff' : '/rp-approval/manager'
}

function getInitiallyExpandedGroups(items, currentPath) {
  return items.reduce((expandedGroups, item) => {
    if (item.children?.length && isItemActive(item, currentPath)) {
      expandedGroups[getGroupKey(item)] = true
    }

    if (item.children?.length) {
      Object.assign(expandedGroups, getInitiallyExpandedGroups(item.children, currentPath))
    }

    return expandedGroups
  }, {})
}

function getInitialExpandedByPathname(pathname) {
  const map = {
    'group:FRP': ['/', '/frp', '/approval', '/approved', '/status_frp'],
    'group:RP': ['/rp', '/rp-approval', '/rp-approval/manager', '/rp-approval/staff', '/status_rp'],
    'group:Document': ['/document/generate', '/document/riwayat', '/document/template'],
    'group:Report': ['/laporan-frp', '/laporan-rp'],
    'group:Master Data': null,
  }
  const initial = {}
  for (const [key, paths] of Object.entries(map)) {
    if (paths ? paths.includes(pathname) : pathname.startsWith('/admin/')) {
      initial[key] = true
    }
  }
  return initial
}

function SidebarNavItem({
  item,
  selectedPath,
  collapsed,
  onSelect,
  expandedGroups,
  onToggleGroup,
  depth = 0,
}) {
  const Icon = item.icon
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, selectedPath)
  const expanded = hasChildren ? expandedGroups[getGroupKey(item)] ?? false : false
  const isButton = hasChildren || !item.href
  const submenuId = hasChildren ? `${getGroupKey(item)}-submenu` : undefined
  const className = [
    'nav-item',
    active ? 'active' : '',
    hasChildren ? 'nav-item--accordion' : '',
    expanded ? 'nav-item--expanded' : '',
    isButton ? 'nav-item--button' : '',
    depth > 0 ? 'nav-item--child' : '',
    item.variant === 'danger' || item.danger ? 'logout-item' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {Icon ? (
        typeof Icon === 'string' ? (
          <span className="material-icons-round nav-icon" style={{ fontSize: depth > 0 ? '18px' : '22px', opacity: depth > 0 ? 0.75 : 1, transform: item.flipIcon ? 'scaleX(-1)' : 'none', display: 'inline-block' }}>{Icon}</span>
        ) : (
          <Icon className="nav-icon" size={22} />
        )
      ) : (
        <span className="nav-item__bullet" aria-hidden="true" />
      )}
      <span className="nav-text">{item.label}</span>
      {hasChildren ? (
        <span 
          className="material-icons-round nav-item__chevron"
          style={{ 
            fontSize: '18px',
            marginLeft: 'auto',
            transform: expanded ? 'rotate(90deg)' : 'none', 
            transition: 'transform 0.2s ease, opacity 0.2s ease' 
          }}
        >
          chevron_right
        </span>
      ) : null}
    </>
  )

  const handleClick = (event) => {
    if (hasChildren) {
      event.preventDefault()
      onToggleGroup?.(item)
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    onSelect?.(item)
  }

  const trigger = isButton ? (
    <button
      type="button"
      className={className}
      data-tooltip={collapsed ? item.label : undefined}
      aria-controls={submenuId}
      aria-current={active && !hasChildren ? 'page' : undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      onClick={handleClick}
    >
      {content}
    </button>
  ) : (
    <a
      href={item.href}
      className={className}
      data-tooltip={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={handleClick}
    >
      {content}
    </a>
  )

  if (hasChildren && !collapsed) {
    return (
      <div className="nav-group">
        {trigger}
        <div
          id={submenuId}
          className={`nav-submenu${expanded ? ' expanded' : ''}`}
          aria-hidden={!expanded}
        >
          <div className="nav-submenu__inner">
            {item.children.map((child) => (
              <SidebarNavItem
                key={getItemKey(child)}
                item={child}
                selectedPath={selectedPath}
                collapsed={collapsed}
                onSelect={onSelect}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return trigger
}

function Sidebar({
  collapsed = false,
  mobileOpen = false,
  userName = 'User',
  userJobLevel = '',
  userDivision = '',
  userRole = 'staff',
  userIsAdmin = false,
  allAssignments = [],
  onToggleCollapse,
  onCloseMobile,
  hideMenu = false
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  
  const uniqueCompanies = [...new Set((allAssignments || []).map(a => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'
  const rpApprovalHref = getRpApprovalPath({ userJobLevel, userRole })

  const primaryItems = hideMenu ? [] : [
    ...(userIsAdmin ? [{ label: 'Dashboard', href: '/dashboard', icon: 'space_dashboard' }] : []),
    { label: 'FRP', icon: 'receipt_long', children: [
      { label: 'New FRP', href: '/frp', icon: 'note_add' },
      { label: 'Approval FRP', href: '/approval', icon: 'fact_check' },
      { label: 'Status FRP', href: '/approved', icon: 'task_alt' },
    ]},
    { label: 'RP', icon: 'shopping_bag', children: [
      { label: 'New RP', href: '/rp', icon: 'note_add' },
      { label: 'Approval RP', href: rpApprovalHref, icon: 'rule' },
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
    { label: 'Back Pilargroup', href: 'https://pilargroup.id/dashboard', icon: 'logout', danger: true, external: true, flipIcon: true },
  ]

  const initialExpandedPathname = useMemo(() => getInitialExpandedByPathname(pathname), [pathname])
  const [userExpandedGroups, setUserExpandedGroups] = useState({})
  const activeExpandedGroups = useMemo(
    () => getInitiallyExpandedGroups([...primaryItems, ...secondaryItems], pathname),
    [pathname, primaryItems, secondaryItems]
  )
  const visibleExpandedGroups = useMemo(
    () => ({
      ...initialExpandedPathname,
      ...activeExpandedGroups,
      ...userExpandedGroups,
    }),
    [initialExpandedPathname, activeExpandedGroups, userExpandedGroups],
  )

  const handleSelect = async (item) => {
    if (item.href === '/logout') { 
        if (mobileOpen) { onCloseMobile?.() }
        window.location.href = '/logout'
        return 
    }
    
    if (item.external && item.href) {
      if (mobileOpen) { onCloseMobile?.() }
      window.location.assign(item.href)
      return
    }

    if (item.action) {
      onAction?.(item.action, item)
      if (mobileOpen) { onCloseMobile?.() }
      return
    }

    if (!item.href) {
      return
    }

    navigate(item.href)

    if (mobileOpen) {
      onCloseMobile?.()
    }
  }

  const handleToggleGroup = (item) => {
    const groupKey = getGroupKey(item)

    if (collapsed) {
      setUserExpandedGroups((currentGroups) => ({
        ...currentGroups,
        [groupKey]: true,
      }))
      onToggleCollapse?.()
      return
    }

    setUserExpandedGroups((currentGroups) => ({
      ...currentGroups,
      [groupKey]: !(visibleExpandedGroups[groupKey] ?? false),
    }))
  }

  const sidebarClassName = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const initials = getInitials(userName)
  
  const displayedRole = userDivision && userJobLevel
    ? `${userDivision} ${userJobLevel}`
    : (userJobLevel || userDivision || (userIsAdmin ? 'Administrator' : 'Staff'))

  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={onCloseMobile}
        aria-label="Tutup menu"
      />
      <aside id="sidebar" className={sidebarClassName}>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label="Toggle Sidebar"
          onClick={onToggleCollapse}
        >
          <span className="material-icons-round toggle-icon" style={{ fontSize: '16px' }}>
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>

        <button
          type="button"
          className="sidebar-mobile-dismiss"
          aria-label="Close Sidebar"
          onClick={onCloseMobile}
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>close</span>
        </button>

        <div className="sidebar-logo">
          <div className="profile-content">
            <div className="profile-avatar">
              <span className="profile-avatar__badge">{initials}</span>
              <div className="online-status" />
            </div>

            <div className="profile-info">
              <h3 className="profile-name">{userName}</h3>
              <p className="profile-role">{displayedRole}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {primaryItems.map((item) => (
            <SidebarNavItem
              key={getItemKey(item)}
              item={item}
              selectedPath={pathname}
              collapsed={collapsed}
              onSelect={handleSelect}
              expandedGroups={visibleExpandedGroups}
              onToggleGroup={handleToggleGroup}
            />
          ))}
        </nav>

        <div className="sidebar-bottom">
          {secondaryItems.map((item) => (
            <SidebarNavItem
              key={getItemKey(item)}
              item={item}
              selectedPath={pathname}
              collapsed={collapsed}
              onSelect={handleSelect}
              expandedGroups={visibleExpandedGroups}
              onToggleGroup={handleToggleGroup}
            />
          ))}
        </div>

        <div className="sidebar-copyright" aria-label="Copyright">
          <p>&copy; 2026 PT Pilar Niaga Makmur</p>
          <p>Developed by IT Team </p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
