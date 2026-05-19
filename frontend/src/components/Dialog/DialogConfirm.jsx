import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function DialogConfirm({
  isOpen = false,
  eyebrow = 'Konfirmasi',
  title = 'Lanjutkan Aksi?',
  message = 'Apakah Anda yakin ingin melanjutkan?',
  confirmLabel = 'Ya, Lanjutkan',
  icon = 'help',
  tone = 'primary',
  isLoading = false,
  onClose,
  onConfirm,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const confirmToneStyles = {
    approve: {
      border: 'none',
      background: 'linear-gradient(135deg, var(--accent-teal, #15803d) 0%, var(--accent-teal-dark, #166534) 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(42, 157, 143, 0.28)',
    },
    reject: {
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(239, 68, 68, 0.24)',
    },
    warning: {
      border: '1px solid rgba(245, 158, 11, 0.34)',
      background: '#fef3c7',
      color: '#92400e',
      boxShadow: 'none',
    },
    primary: {
      border: 'none',
      background: 'linear-gradient(135deg, var(--accent-blue, #2563eb) 0%, var(--accent-blue-dark, #1d4ed8) 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
    },
    danger: {
      border: 'none',
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 10px 24px rgba(239, 68, 68, 0.24)',
    }
  }[tone] || {}

  const iconStyles = {
    approve: { background: '#dcfce7', color: '#15803d' },
    reject: { background: '#fee2e2', color: '#dc2626' },
    warning: { background: '#fef3c7', color: '#92400e' },
    primary: { background: '#dbeafe', color: '#1e40af' },
    danger: { background: '#fee2e2', color: '#dc2626' },
  }[tone] || { background: '#dbeafe', color: '#1e40af' }

  const handleOverlayClick = () => {
    if (!isLoading) onClose?.()
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="confirm-dialog-title">{title}</h2>
          </div>
          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={handleOverlayClick}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                ...iconStyles,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '22px' }}>{icon}</span>
            </div>
            <div style={{ display: 'grid', gap: '0.65rem', minWidth: 0 }}>
              <p className="dashboard-popup__text">{message}</p>
              {children}
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleOverlayClick}
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button"
            onClick={onConfirm}
            disabled={isLoading}
            style={confirmToneStyles}
          >
            {isLoading ? (
              <span className="material-icons-round dashboard-popup__spinner" style={{ fontSize: '18px' }}>progress_activity</span>
            ) : (
              <span className="material-icons-round" style={{ fontSize: '18px' }}>{icon}</span>
            )}
            {isLoading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}
