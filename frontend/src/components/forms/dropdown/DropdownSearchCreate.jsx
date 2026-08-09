import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Check, Plus, RefreshCw05, SearchMd } from '../../layoute/TemplateIcons.jsx'

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

function DropdownSearchCreate({
  id,
  label,
  helperText,
  error,
  options = [],
  value,
  placeholder = 'Cari atau pilih data',
  emptyMessage = 'Data tidak ditemukan.',
  disabled = false,
  required = false,
  className = '',
  onChange,
  onSearch,
  onCreate,
  createLabel,
  minSearchLength = 1,
  searchDebounceMs = 300,
}) {
  const generatedId = useId()
  const inputId = id ?? `dropdown-search-create-${generatedId}`
  const menuId = `${inputId}-menu`
  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options])
  const selectedOption = normalizedOptions.find((option) => option.value === value)

  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState(() => selectedOption?.label ?? '')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const selectedLabelRef = useRef(selectedOption?.label ?? '')

  useEffect(() => {
    selectedLabelRef.current = selectedOption?.label ?? ''
  })

  const message = typeof error === 'string' ? error : helperText
  const messageId = message ? `${inputId}-message` : undefined
  const hasError = Boolean(error)

  const closeAndRevert = () => {
    setOpen(false)
    setInputText(selectedLabelRef.current)
  }

  const trimmedQuery = inputText.trim()

  const localFilteredOptions = useMemo(() => {
    if (!trimmedQuery) {
      return normalizedOptions
    }

    return normalizedOptions.filter((option) =>
      String(option.label).toLowerCase().includes(trimmedQuery.toLowerCase()),
    )
  }, [normalizedOptions, trimmedQuery])

  const displayedOptions =
    trimmedQuery.length >= minSearchLength && searchResults ? searchResults : localFilteredOptions

  useEffect(() => {
    if (!open || typeof onSearch !== 'function' || trimmedQuery.length < minSearchLength) {
      return undefined
    }

    const controller = new AbortController()

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)

      try {
        const results = await onSearch(trimmedQuery, { signal: controller.signal })

        if (!controller.signal.aborted) {
          setSearchResults(Array.isArray(results) ? results.map(normalizeOption) : [])
        }
      } catch (searchErr) {
        if (searchErr?.name !== 'AbortError' && !controller.signal.aborted) {
          setSearchResults([])
        }
      } finally {
        setIsSearching(false)
      }
    }, searchDebounceMs)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [open, onSearch, trimmedQuery, minSearchLength, searchDebounceMs])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        closeAndRevert()
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

  const handleSelect = (option) => {
    onChange?.(option.value, option)
    setInputText(option.label)
    setSearchResults(null)
    setCreateError('')
    setOpen(false)
  }

  const hasExactMatch = displayedOptions.some(
    (option) => String(option.label).trim().toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const canCreate = typeof onCreate === 'function' && trimmedQuery.length > 0 && !hasExactMatch

  const handleCreate = async () => {
    if (!canCreate || isCreating) {
      return
    }

    setIsCreating(true)
    setCreateError('')

    try {
      const created = await onCreate(trimmedQuery)

      if (created) {
        handleSelect(normalizeOption(created))
      }
    } catch (createErr) {
      setCreateError(createErr?.message || 'Gagal menambahkan data baru.')
    } finally {
      setIsCreating(false)
    }
  }

  const resolvedCreateLabel =
    typeof createLabel === 'function' ? createLabel(trimmedQuery) : `Tambah "${trimmedQuery}"`

  const wrapperClassName = [
    'form-dropdown',
    'form-dropdown--search',
    'form-dropdown--combobox',
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
        <label className="form-control__label" htmlFor={inputId}>
          <span>{label}</span>
          {required ? <span className="form-control__required">*</span> : null}
        </label>
      ) : null}

      <div
        className="form-control__input-shell form-control__input-shell--with-left-icon form-control__input-shell--with-right-icon"
        ref={triggerRef}
      >
        <SearchMd className="form-control__icon form-control__icon--left" size={17} />
        <input
          id={inputId}
          className="form-control__input"
          type="text"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-autocomplete="list"
          aria-invalid={hasError || undefined}
          aria-describedby={messageId}
          autoComplete="off"
          placeholder={placeholder}
          value={inputText}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setInputText(event.target.value)
            setCreateError('')
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeAndRevert()
            }
          }}
        />
        {isSearching ? (
          <RefreshCw05
            className="dashboard-popup__spinner form-control__icon form-control__icon--right"
            size={17}
          />
        ) : null}
      </div>

      {open && typeof document !== 'undefined' && menuStyle
        ? createPortal(
            <div
              className="form-dropdown__menu form-dropdown__menu--portal"
              id={menuId}
              ref={menuRef}
              role="listbox"
              aria-labelledby={inputId}
              style={menuStyle}
            >
              <div className="form-dropdown__items">
                {displayedOptions.length > 0
                  ? displayedOptions.map((option, index) => {
                      const selected = option.value === value

                      return (
                        <button
                          className={`form-dropdown__item${selected ? ' form-dropdown__item--selected' : ''}`}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={option.disabled}
                          key={getOptionRenderKey(option, index)}
                          onClick={() => handleSelect(option)}
                        >
                          <span>{option.label}</span>
                          {selected ? <Check size={16} /> : null}
                        </button>
                      )
                    })
                  : !canCreate
                    ? <div className="form-dropdown__empty">{emptyMessage}</div>
                    : null}

                {canCreate ? (
                  <button
                    type="button"
                    className="form-dropdown__item form-dropdown__item--create"
                    onClick={handleCreate}
                    disabled={isCreating}
                  >
                    <span className="form-dropdown__item--create-content">
                      <Plus size={16} />
                      <span>{isCreating ? 'Menambahkan...' : resolvedCreateLabel}</span>
                    </span>
                  </button>
                ) : null}
              </div>

              {createError ? <p className="form-dropdown__create-error">{createError}</p> : null}
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

export default DropdownSearchCreate
