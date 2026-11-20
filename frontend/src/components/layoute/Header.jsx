import { useState } from 'react'
import {
  MDBContainer,
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBNavbarLink,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem,
} from 'mdb-react-ui-kit'
import DialogSwitchDepartment from '../Dialog/DialogSwitchDepartment.jsx'
import { Bell04, ChevronDown, SearchMd } from './TemplateIcons.jsx'
import {
  defaultNavigationPath,
  implementedNavigationPaths,
  primaryNavigationItems,
  secondaryNavigationItems,
} from '../../services/layoutes/Navigation.js'

import logoPiagam from '../../images/logo-piagam2.svg'
import '../../styles/template-style/TemplateComponents.css'
import '../../styles/template-style/HeaderNavbar.css'

const normalizePath = (path = '') => path.replace(/\/+$/, '').toLowerCase()
const dropdownOptions = {
  modifiers: [
    { name: 'offset', options: { offset: [0, 8] } },
    { name: 'preventOverflow', options: { padding: 16 } },
  ],
}

function getSwitchOptions(items = [], getId, getLabel) {
  const options = new Map()
  for (const item of items) {
    if (!item) continue
    const id = String(getId(item) ?? '')
    if (id && !options.has(id)) {
      options.set(id, { id, label: getLabel(item) || id })
    }
  }
  return [...options.values()]
}

function Header({
  activePath = '/dashboard',
  userName = '',
  userDepartment = '',
  userRole = '',
  currentUser,
  onSwitchDepartment,
}) {
  const [isDepartmentSwitchOpen, setIsDepartmentSwitchOpen] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const departmentOptions = getSwitchOptions(
    currentUser?.departments,
    (department) => department.class_department_id ?? department.id ?? department.department_id,
    (department) => {
      const name = department.department_name || department.name
      const className = department.class_name || department.name
      return name && className && name !== className ? `${name} / ${className}` : name || className
    },
  )
  const companyOptions = getSwitchOptions(currentUser?.companies, (company) => company.id, (company) => company.name)
  const canSwitchDepartment = departmentOptions.length > 1 || companyOptions.length > 1
  const profileMenuItem = secondaryNavigationItems[0]
  const visibleItems = primaryNavigationItems.filter((item) =>
    !item.allowedRoles?.length || item.allowedRoles.some((role) =>
      role.toUpperCase() === userRole.trim().toUpperCase(),
    ),
  )
  const profileName = userName.trim() || 'Pengguna'
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
  }

  const isCurrentPath = (item) => normalizePath(item.href) === normalizePath(activePath)
  const hasActiveChild = (item) => item.children?.some((child) =>
    child.children?.length ? hasActiveChild(child) : isCurrentPath(child),
  )
  const isItemActive = (item) => hasActiveChild(item) || (
    isCurrentPath(item) && visibleItems.find(isCurrentPath) === item
  )

  const isSectionOpen = (section) => openSections[section.id ?? section.label] ?? hasActiveChild(section)
  const toggleSection = (section) => setOpenSections((current) => ({
    ...current,
    [section.id ?? section.label]: !isSectionOpen(section),
  }))

  const renderDropdownChildren = (children) => children.flatMap((child) => {
    if (child.children?.length) {
      const sectionKey = child.id ?? child.label
      const open = isSectionOpen(child)
      return [
        <MDBDropdownItem
          link
          childTag="button"
          preventCloseOnClick
          className={`app-navbar__accordion-toggle${hasActiveChild(child) ? ' app-navbar__accordion-toggle--active' : ''}`}
          aria-expanded={open}
          key={`section-${sectionKey}`}
          onClick={() => toggleSection(child)}
        >
          <span>{child.label}</span>
          <ChevronDown className="app-navbar__chevron" size={13} />
        </MDBDropdownItem>,
        ...(!open ? [] : child.children.map((grandchild) => (
          <MDBDropdownItem
            link
            childTag="button"
            className={`app-navbar__dropdown-item--nested${isCurrentPath(grandchild) ? ' app-navbar__dropdown-item--current' : ''}`}
            aria-current={isCurrentPath(grandchild) ? 'page' : undefined}
            key={grandchild.id ?? grandchild.label}
            onClick={() => navigate(grandchild)}
          >
            {grandchild.label}
          </MDBDropdownItem>
        ))),
      ]
    }

    return [
      <MDBDropdownItem
        link
        childTag="button"
        className={isCurrentPath(child) ? 'app-navbar__dropdown-item--current' : ''}
        aria-current={isCurrentPath(child) ? 'page' : undefined}
        key={child.id ?? child.label}
        onClick={() => navigate(child)}
      >
        <span>{child.label}</span>
      </MDBDropdownItem>,
    ]
  })

  const renderItems = (navigationItems) => navigationItems.map((item) => {
    const hasChildren = item.children?.length > 0
    const active = isItemActive(item)

    if (!hasChildren) {
      return (
        <MDBNavbarItem key={item.id ?? item.label}>
          <MDBNavbarLink
            tag="button"
            type="button"
            active={active}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item)}
          >
            <span>{item.label}</span>
          </MDBNavbarLink>
        </MDBNavbarItem>
      )
    }

    return (
      <MDBNavbarItem key={item.id ?? item.label}>
        <MDBDropdown animation={false} options={dropdownOptions}>
          <MDBDropdownToggle
            tag="button"
            type="button"
            className={`nav-link${active ? ' active' : ''}`}
            aria-controls={`app-navbar-menu-${item.id}`}
          >
            <span>{item.label}</span>
            <ChevronDown className="app-navbar__chevron" size={13} />
          </MDBDropdownToggle>
          <MDBDropdownMenu id={`app-navbar-menu-${item.id}`} aria-label={item.label}>
            {renderDropdownChildren(item.children)}
          </MDBDropdownMenu>
        </MDBDropdown>
      </MDBNavbarItem>
    )
  })

  return (
    <MDBNavbar light className="app-navbar" aria-label="Navigasi utama">
      <MDBContainer fluid className="app-navbar__container">
        <MDBNavbarBrand tag="span" className="app-navbar__brand">
          <img src={logoPiagam} alt="Logo Piagam" className="app-navbar__logo" />
        </MDBNavbarBrand>

        <div className="app-navbar__navigation">
          <MDBNavbarNav className="app-navbar__nav">
            {renderItems(visibleItems)}
          </MDBNavbarNav>
        </div>

        <div className="app-navbar__actions">
          <button type="button" className="app-navbar__icon-btn" aria-label="Notifications">
            <Bell04 size={18} />
          </button>
          <button type="button" className="app-navbar__icon-btn" aria-label="Global search">
            <SearchMd size={18} />
          </button>

          <MDBDropdown animation={false} options={dropdownOptions}>
            <MDBDropdownToggle
              tag="button"
              type="button"
              className="app-navbar__profile"
              aria-label={`Menu akun ${profileName}`}
              aria-controls="app-navbar-profile-menu"
              title={[profileName, userDepartment].filter(Boolean).join(' / ')}
            >
              <span className="app-navbar__avatar">{profileInitials}</span>
              <span className="app-navbar__profile-details">
                <strong>{profileName}</strong>
                {userDepartment ? <small>{userDepartment}</small> : null}
              </span>
              <ChevronDown className="app-navbar__chevron" size={13} />
            </MDBDropdownToggle>
            <MDBDropdownMenu id="app-navbar-profile-menu" className="app-navbar__profile-menu" aria-label="Akun">
              {[
                canSwitchDepartment && <MDBDropdownItem key="switch-department" link childTag="button" onClick={() => setIsDepartmentSwitchOpen(true)}>
                  <span>Switch Department</span>
                </MDBDropdownItem>,
                <MDBDropdownItem key={profileMenuItem.id} link childTag="button" onClick={() => window.location.assign(profileMenuItem.href)}>
                  <span>{profileMenuItem.label}</span>
                </MDBDropdownItem>,
              ].filter(Boolean)}
            </MDBDropdownMenu>
          </MDBDropdown>
        </div>
        {canSwitchDepartment && isDepartmentSwitchOpen ? (
          <DialogSwitchDepartment
            departmentOptions={departmentOptions}
            companyOptions={companyOptions}
            activeDepartmentId={currentUser.class_department_id ?? currentUser.department_id}
            activeCompanyId={currentUser.company_id}
            onClose={() => setIsDepartmentSwitchOpen(false)}
            onSwitch={onSwitchDepartment}
          />
        ) : null}
      </MDBContainer>
    </MDBNavbar>
  )
}

export default Header
