import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import logoPiagam from '../../assets/logo-piagam.png'
import logoPiagamTransparent from '../../assets/logo-piagam2.png'
import { Bell04, RefreshCw05, SearchMd, XClose } from './TemplateIcons.jsx'

const ROUTE_TITLES = {
  '/': 'New Request',
  '/frp': 'New Request',
  '/approval': 'Approval',
  '/approved': 'Approved',
  '/dashboard': 'Dashboard',
  '/laporan': 'Laporan',
  '/history': 'History',
  '/select-company': 'Pilih Perusahaan',
  '/select-division': 'Pilih Divisi',
  '/rp': 'Request Purchase (RP)',
  '/rp-approval': 'Approval RP',
  '/status_rp': 'Status RP',
}

function getTitleFromPath(pathname) {
  if (pathname.startsWith('/admin')) return 'Master Data'
  if (pathname.startsWith('/frp/')) return 'Detail FRP'
  if (pathname.startsWith('/rp-approval')) return 'Approval RP'
  return ROUTE_TITLES[pathname] ?? 'Form Request Payment'
}

export default function Header({
  title,
  onMenuClick,
  breadcrumb,
  searchProps,
  notificationProps,
  onRefresh,
}) {
  const { pathname } = useLocation()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false))
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const hasSearch = Boolean(searchProps)
  const hasNotification = Boolean(notificationProps)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isNotificationModalOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNotificationModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNotificationModalOpen])

  const displayTitle = isMobile ? 'FRP' : (title ?? getTitleFromPath(pathname))

  return (
    <header className="header-main">
      <img src={logoPiagamTransparent} alt="" aria-hidden="true" className="header-accent-logo" />
      <div className="header-content">
        <div className="header-left">
          <button type="button" className="header-menu-button" aria-label="Open menu" onClick={onMenuClick}>
            <span className="material-icons-round" style={{ fontSize: '22px' }}>menu</span>
          </button>
          <div className="header-brand">
            <img src={logoPiagam} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>
        <div className="header-right">
          <span className="header-brand-title">{displayTitle}</span>
        </div>
      </div>

      {breadcrumb && breadcrumb.length > 0 && (
        <div className="header-breadcrumb">
          <div className="header-breadcrumb-content">
            <nav className="breadcrumb-nav" aria-label="Breadcrumb">
              {breadcrumb.map((item, index) => (
                <div className="breadcrumb-item" key={`${item.label}-${index}`}>
                  <a
                    href={item.href ?? '#'}
                    className={`breadcrumb-link${item.active ? ' active' : ''}`}
                    onClick={(event) => {
                      if (!item.href || item.href === '#') {
                        event.preventDefault()
                      }
                    }}
                  >
                    {item.label}
                  </a>
                  {index < breadcrumb.length - 1 && (
                    <span className="breadcrumb-separator">/</span>
                  )}
                </div>
              ))}
            </nav>
            
            {(hasSearch || hasNotification || onRefresh) && (
              <div className="header-toolbar">
                {hasSearch && (
                  <label
                    className="header-search header-search--compact"
                    aria-label={searchProps.ariaLabel ?? 'Search'}
                  >
                    <SearchMd size={16} className="header-search__icon header-search__icon--compact" />
                    <input
                      type="search"
                      className="header-search__input header-search__input--compact"
                      value={searchProps.value ?? ''}
                      placeholder={searchProps.placeholder ?? 'Search...'}
                      onChange={searchProps.onChange}
                      aria-label={searchProps.ariaLabel ?? 'Search'}
                      autoComplete="off"
                    />
                  </label>
                )}

                {hasNotification && (
                  <button
                    type="button"
                    className="header-icon-button header-icon-button--compact"
                    aria-label={notificationProps.ariaLabel ?? 'Open notifications'}
                    title={notificationProps.ariaLabel ?? 'Open notifications'}
                    onClick={() => setIsNotificationModalOpen(true)}
                  >
                    <Bell04 size={16} />
                  </button>
                )}

                {onRefresh && (
                  <button
                    type="button"
                    className="header-icon-button header-icon-button--compact"
                    aria-label="Refresh dashboard"
                    title="Refresh dashboard"
                    onClick={onRefresh}
                  >
                    <RefreshCw05 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {hasNotification && isNotificationModalOpen && (
        <div
          className="header-modal-overlay"
          role="presentation"
          onClick={() => setIsNotificationModalOpen(false)}
        >
          <div
            className="header-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-notification-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="header-modal__header">
              <h2 className="header-modal__title" id="header-notification-title">
                {notificationProps.modalTitle ?? 'Notifications'}
              </h2>
              <button
                type="button"
                className="header-modal__close"
                aria-label="Close notification modal"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                <XClose size={18} />
              </button>
            </div>
            <div className="header-modal__body">
              <div className="header-modal__empty" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
