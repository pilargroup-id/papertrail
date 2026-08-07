import { useEffect, useId, useRef } from 'react'

import { Filter } from '../../layoute/TemplateIcons.jsx'

function ButtonFilterLogs({
  label = 'Filter',
  icon: Icon = Filter,
  size = 16,
  className = '',
  dialogClassName = '',
  dialogId,
  dialogLabel = 'Filter FRP',
  isOpen = false,
  onClose,
  type = 'button',
  children,
  ...buttonProps
}) {
  const generatedId = useId()
  const wrapperRef = useRef(null)
  const resolvedDialogId = dialogId || buttonProps['aria-controls'] || `frp-filter-dialog-${generatedId}`

  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--edit',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const panelClassName = ['frp-filter-dialog', dialogClassName].filter(Boolean).join(' ')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (wrapperRef.current?.contains(event.target)) {
        return
      }

      onClose?.()
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <div className="frp-filter-dialog-anchor" ref={wrapperRef}>
      <button
        type={type}
        className={buttonClassName}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={resolvedDialogId}
        {...buttonProps}
      >
        <Icon size={size} aria-hidden="true" />
      </button>

      {isOpen && children ? (
        <div
          className={panelClassName}
          id={resolvedDialogId}
          role="dialog"
          aria-label={dialogLabel}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default ButtonFilterLogs
