import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ChevronDown, Eye, FileText01, Trash03 } from '../../../layoute/TemplateIcons.jsx'

function AttachmentListDropdown({ files = [], disabled = false, onPreview, onRemove }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const hasFiles = files.length > 0

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined
    }

    const updateMenuPosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect()

      if (!triggerRect) {
        return
      }

      const offset = 8
      const minMenuHeight = 120
      const viewportPadding = 16
      const menuWidth = Math.max(240, triggerRect.width)
      const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding - offset
      const availableAbove = triggerRect.top - viewportPadding - offset
      const shouldOpenUp = availableBelow < minMenuHeight && availableAbove > availableBelow
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding,
      )

      if (shouldOpenUp) {
        setMenuStyle({
          left,
          width: menuWidth,
          bottom: Math.max(viewportPadding, window.innerHeight - triggerRect.top + offset),
          maxHeight: Math.max(minMenuHeight, availableAbove),
        })
        return
      }

      setMenuStyle({
        left,
        width: menuWidth,
        top: triggerRect.bottom + offset,
        maxHeight: Math.max(minMenuHeight, availableBelow),
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  return (
    <div className="frp-attachment-menu" ref={rootRef}>
      <button
        type="button"
        className="frp-attachment-menu__trigger"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || !hasFiles}
        onClick={() => setOpen((currentValue) => !currentValue)}
      >
        <FileText01 size={16} />
        <span>{files.length}</span>
        <ChevronDown size={14} />
      </button>

      {open && hasFiles && typeof document !== 'undefined' && menuStyle
        ? createPortal(
            <div
              className="frp-attachment-menu__list"
              id="frp-attachment-menu-list"
              ref={menuRef}
              role="listbox"
              style={menuStyle}
            >
              {files.map((attachment) => (
                <div className="frp-attachment-menu__item" key={attachment.id}>
                  <button
                    type="button"
                    className="frp-attachment-menu__item-name"
                    onClick={() => {
                      onPreview?.(attachment.previewUrl)
                      setOpen(false)
                    }}
                  >
                    <Eye size={14} />
                    <span>{attachment.file.name}</span>
                  </button>
                  <button
                    type="button"
                    className="frp-attachment-menu__item-remove"
                    aria-label={`Hapus attachment ${attachment.file.name}`}
                    onClick={() => onRemove?.(attachment.id)}
                  >
                    <Trash03 size={14} />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export default AttachmentListDropdown
