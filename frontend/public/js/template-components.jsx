;(function () {

// ── BackgroundMain ────────────────────────────────────────────────────────────

const bgStyles = {
  root: {
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,243,249,1) 100%)',
  },
  texture: {
    position: 'absolute', inset: 0, opacity: 0.55,
    backgroundImage: 'linear-gradient(135deg, rgba(31,78,140,0.08) 0, rgba(31,78,140,0.08) 2px, transparent 2px, transparent 34px), radial-gradient(rgba(31,78,140,0.09) 1.2px, transparent 1.2px)',
    backgroundSize: '34px 34px, 24px 24px',
    backgroundPosition: '0 0, 12px 10px',
  },
  topCurve: {
    position: 'absolute', top: '-18%', left: '-8%', width: '88%', height: '48%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(210,218,228,0.94) 0%, rgba(210,218,228,0.94) 42%, rgba(210,218,228,0) 73%)',
  },
  topRing: {
    position: 'absolute', top: '-28%', right: '-12%', width: '58%', height: '58%',
    borderRadius: '50%', border: '30px solid rgba(31,78,140,0.12)',
  },
  topGlow: {
    position: 'absolute', top: '4%', right: '8%', width: '420px', height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(47,111,178,0.22) 0%, rgba(47,111,178,0) 70%)',
    filter: 'blur(6px)',
  },
  middleBand: {
    position: 'absolute', top: '26%', left: '-10%', width: '70%', height: '22%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(244,169,64,0.12) 24%, rgba(31,78,140,0.12) 68%, rgba(255,255,255,0) 100%)',
    transform: 'rotate(-10deg)',
  },
  dotField: {
    position: 'absolute', top: '14%', right: '5%', width: '26%', height: '34%', opacity: 0.9,
    backgroundImage: 'radial-gradient(rgba(31,78,140,0.22) 1.6px, transparent 1.6px)',
    backgroundSize: '18px 18px',
  },
  bottomCurve: {
    position: 'absolute', right: '-14%', bottom: '-26%', width: '78%', height: '54%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(214,224,236,0.88) 0%, rgba(214,224,236,0.88) 44%, rgba(214,224,236,0) 74%)',
  },
  bottomRing: {
    position: 'absolute', left: '-14%', bottom: '-28%', width: '44%', height: '44%',
    borderRadius: '50%', border: '22px solid rgba(244,169,64,0.12)',
  },
  rightGlow: {
    position: 'absolute', top: '40%', right: '-10%', width: '500px', height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,169,64,0.2) 0%, rgba(244,169,64,0) 72%)',
    filter: 'blur(8px)',
  },
  dotLarge: { position: 'absolute', right: '64px', top: '132px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(31,78,140,0.18)' },
  dotSmall: { position: 'absolute', right: '38px', top: '176px', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(244,169,64,0.3)' },
}

function BackgroundMain({ position = 'fixed', zIndex = -1 }) {
  return (
    <div aria-hidden="true" style={{ ...bgStyles.root, position, zIndex }}>
      <div style={bgStyles.texture} />
      <div style={bgStyles.topCurve} />
      <div style={bgStyles.topRing} />
      <div style={bgStyles.topGlow} />
      <div style={bgStyles.middleBand} />
      <div style={bgStyles.dotField} />
      <div style={bgStyles.bottomCurve} />
      <div style={bgStyles.bottomRing} />
      <div style={bgStyles.rightGlow} />
      <div style={bgStyles.dotLarge} />
      <div style={bgStyles.dotSmall} />
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function NavIcon({ name }) {
  return (
    <span
      className="material-icons-round"
      style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

function Sidebar({
  collapsed = false,
  userName = 'User',
  userRole = 'Staff',
  userIsAdmin = false,
  allAssignments = [],
  onToggleCollapse,
}) {
  const currentPath = window.location.pathname

  const uniqueCompanies = [...new Set((allAssignments || []).map((a) => a.name))]
  const showBack = (allAssignments || []).length > 1
  const backUrl = uniqueCompanies.length > 1 ? '/select-company' : '/select-division'

  const primaryItems = [
    { label: 'New Request', href: '/', icon: 'add_circle' },
    { label: 'Approval', href: '/approval', icon: 'pending_actions' },
    { label: 'Approved', href: '/approved', icon: 'check_circle' },
    ...(userIsAdmin ? [{ label: 'Master Data', href: '/admin/employees', icon: 'admin_panel_settings' }] : []),
  ]

  const secondaryItems = [
    ...(showBack ? [{ label: 'Ganti Akses', href: backUrl, icon: 'swap_horiz' }] : []),
    { label: 'Logout', href: '/logout', icon: 'logout', variant: 'danger' },
  ]

  const isActive = (href) => {
    if (href === '/') return currentPath === '/'
    if (href.startsWith('/admin')) return currentPath.startsWith('/admin')
    return currentPath === href
  }

  return (
    <aside id="sidebar" className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle Sidebar"
        onClick={onToggleCollapse}
      >
        <span className="material-icons-round" style={{ fontSize: '18px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      <div className="sidebar-logo">
        <span className="material-icons-round" style={{ fontSize: '28px', color: 'var(--theme-accent-primary)', flexShrink: 0 }}>
          payments
        </span>
        <span className="logo-text" style={{ fontSize: '1.1rem' }}>Pilar Group</span>
      </div>

      <div className="sidebar-profile">
        <div className="profile-content">
          <div className="profile-avatar__badge" style={{ fontSize: '1rem', flexShrink: 0 }}>
            {getInitials(userName)}
          </div>
          <div className="profile-info" style={{ overflow: 'hidden' }}>
            <p className="profile-name">{userName}</p>
            <p className="profile-role">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {primaryItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
            data-tooltip={collapsed ? item.label : undefined}
          >
            <NavIcon name={item.icon} />
            <span className="nav-text">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`nav-item${item.variant === 'danger' ? ' logout-item' : ''}`}
            data-tooltip={collapsed ? item.label : undefined}
          >
            <NavIcon name={item.icon} />
            <span className="nav-text">{item.label}</span>
          </a>
        ))}
      </div>
    </aside>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ title = 'Form Request Payment' }) {
  return (
    <header className="header-main">
      <div className="header-content">
        <span className="header-brand-title">{title}</span>
      </div>
    </header>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
window.FRPTemplateComponents = {
  BackgroundMain,
  Sidebar,
  Header,
}

})()
