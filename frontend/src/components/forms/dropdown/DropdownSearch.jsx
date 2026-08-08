import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Check, ChevronDown, SearchMd } from '../../layoute/TemplateIcons.jsx'

function normalizeOption(option) {
  if (typeof option === 'string' || typeof option === 'number') {
    return {
      value: option,
      label: option,
    }
  }

  return option
}

function getOptionRenderKey(option, index) {
  return `${String(option?.value ?? option?.label ?? 'option')}-${index}`
}

function DropdownSearch({
  id,
  label,
  helperText,
  error,
  options = [],
  value,
  placeholder = 'Pilih data',
  searchPlaceholder = 'Cari data...',
  emptyMessage = 'Data tidak ditemukan.',
  disabled = false,
  required = false,
  hideSearch = false,
  className = '',
  onChange,
}) {
  const generatedId = useId()
  const buttonId = id ?? `dropdown-search-${generatedId}`
  const menuId = `${buttonId}-menu`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options])
  const selectedOption = normalizedOptions.find((option) => option.value === value)
  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${buttonId}-message` : undefined
  const hasError = Boolean(error)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return normalizedOptions
    }

    return normalizedOptions.filter((option) =>
      String(option.label).toLowerCase().includes(normalizedQuery),
    )
  }, [normalizedOptions, query])

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
      const minMenuHeight = 160
      const viewportPadding = 16
      const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding - offset
      const availableAbove = triggerRect.top - viewportPadding - offset
      const shouldOpenUp = availableBelow < minMenuHeight && availableAbove > availableBelow

      if (shouldOpenUp) {
        setMenuStyle({
          left: triggerRect.left,
          width: triggerRect.width,
          bottom: Math.max(viewportPadding, window.innerHeight - triggerRect.top + offset),
          maxHeight: Math.max(minMenuHeight, availableAbove),
        })
        return
      }

      setMenuStyle({
        left: triggerRect.left,
        width: triggerRect.width,
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

  const wrapperClassName = [
    'form-dropdown',
    'form-dropdown--search',
    open ? 'form-dropdown--open' : '',
    hasError ? 'form-dropdown--error' : '',
    disabled ? 'form-dropdown--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName} ref={rootRef}>
      {label ? (
        <label className="form-control__label" htmlFor={buttonId}>
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </label>
      ) : null}

      <button
        id={buttonId}
        className="form-dropdown__trigger"
        type="button"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-invalid={hasError || undefined}
        aria-describedby={messageId}
        disabled={disabled}
        onClick={() => setOpen((currentValue) => !currentValue)}
      >
        <span className={selectedOption ? 'form-dropdown__value' : 'form-dropdown__placeholder'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="form-dropdown__chevron" size={18} />
      </button>

      {open && typeof document !== 'undefined' && menuStyle
        ? createPortal(
            <div
              className="form-dropdown__menu form-dropdown__menu--portal"
              id={menuId}
              ref={menuRef}
              role="listbox"
              aria-labelledby={buttonId}
              style={menuStyle}
            >
              {hideSearch ? null : (
                <div className="form-dropdown__search">
                  <SearchMd className="form-dropdown__search-icon" size={17} />
                  <input
                    className="form-dropdown__search-input"
                    type="search"
                    value={query}
                    placeholder={searchPlaceholder}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              )}

              <div className="form-dropdown__items">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                    const selected = option.value === value

                    return (
                      <button
                        className={`form-dropdown__item${selected ? ' form-dropdown__item--selected' : ''}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={option.disabled}
                        key={getOptionRenderKey(option, index)}
                        onClick={() => {
                          onChange?.(option.value, option)
                          setOpen(false)
                          setQuery('')
                        }}
                      >
                        <span>{option.label}</span>
                        {selected ? <Check size={16} /> : null}
                      </button>
                    )
                  })
                ) : (
                  <div className="form-dropdown__empty">{emptyMessage}</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {message ? (
        <p className="form-control__message" id={messageId}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default DropdownSearch
