import { useMemo, useState } from 'react'
import { Bell04, ChevronDown, SearchMd } from './TemplateIcons.jsx'
import {
  defaultNavigationPath,
  implementedNavigationPaths,
  primaryNavigationItems,
  secondaryNavigationItems,
} from '../../services/layoutes/Navigation.js'

import logoPiagam from '../../images/logo-piagam2.svg'
import '../../styles/template-style/TemplateComponents.css'

function Header({
  activePath = '/dashboard',
  userName = '',
  userRole = '',
}) {
  const [openMenu, setOpenMenu] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const items = useMemo(() => primaryNavigationItems, [])
  const profileMenuItem = secondaryNavigationItems[0]
  const visibleItems = items.filter((item) => !item.allowedRoles?.length || item.allowedRoles.some((role) => role.toUpperCase() === userRole.toUpperCase()))
  const profileName = userName || 'Trisha'
  const profileInitials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
  const navigate = (item) => {
    if (item.external) return window.location.assign(item.href)
    if (!item.href || !implementedNavigationPaths.includes(item.href)) return
    const nextPath = item.href || defaultNavigationPath
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    setOpenMenu(null)
  }
  const renderItems = (navigationItems, nested = false) => navigationItems.map((item) => {
    const hasChildren = item.children?.length > 0
    const active = item.href === activePath || item.children?.some((child) => child.href === activePath || child.children?.some((grandchild) => grandchild.href === activePath))
    return <div className={`header-nav-item${nested ? ' header-nav-item--nested' : ''}${active ? ' active' : ''}`} key={item.id ?? item.label}>
      <button type="button" className="header-nav-trigger" onClick={() => (hasChildren ? setOpenMenu(openMenu === item.id ? null : item.id) : navigate(item))}>
        {item.icon ? <item.icon size={18} /> : null}<span>{item.label}</span>{hasChildren ? <ChevronDown size={15} /> : null}
      </button>
      {hasChildren && openMenu === item.id ? <div className="header-nav-dropdown">{renderItems(item.children, true)}</div> : null}
    </div>
  })
  return (
    <header className="header-main">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <img src={logoPiagam} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>

        <nav className="header-navigation" aria-label="Main navigation">{renderItems(visibleItems)}</nav>

        <div className="header-right">
          <button type="button" className="header-utility-button" aria-label="Notifications">
            <Bell04 size={18} />
          </button>
          <button type="button" className="header-utility-button" aria-label="Global search">
            <SearchMd size={18} />
          </button>
          <div className="header-profile-wrapper">
            <button
              type="button"
              className="header-profile"
              title={userRole || profileName}
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              onClick={() => setIsProfileOpen((currentValue) => !currentValue)}
            >
              <span className="header-profile__avatar">{profileInitials}</span>
              <span className="header-profile__details">
                <strong>{profileName}</strong>
                <small>{userRole || 'General Procurement'}</small>
              </span>
              <span className="header-profile__status" aria-label="Online" />
              <ChevronDown className="header-profile__chevron" size={15} />
            </button>
            {isProfileOpen ? (
              <div className="header-profile-dropdown" role="menu">
                <button type="button" role="menuitem" onClick={() => window.location.assign(profileMenuItem.href)}>
                  {profileMenuItem.icon ? <profileMenuItem.icon size={17} /> : null}
                  <span>{profileMenuItem.label}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
