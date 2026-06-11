import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

export default function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
  className,
  dropdownStyle,
  disabled = false,
  menuPosition = 'absolute', // kept for API compat, portal is always used
  searchable = true,
  allowCustomInput = false,
  customInputLabel = 'Isi manual',
  customInputButtonLabel = 'Gunakan teks ini',
  multiple = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const [rect, setRect] = useState(null)

  const normalizedOptions = options.map(option =>
    typeof option === 'string'
      ? { value: option, label: option, keywords: option }
      : {
          value: option.value,
          label: option.label,
          keywords: option.keywords || option.label || option.value,
        },
  )

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : [value]
  const selectedOption = normalizedOptions.find(option => option.value === value)
  const selectedOptions = normalizedOptions.filter(option => selectedValues.includes(option.value))
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )
  const selectedSet = new Set(selectedValues.map(v => String(v)))

  const toggleMultipleValue = optionValue => {
    const normalizedValue = String(optionValue)
    const current = new Set(selectedSet)
    if (current.has(normalizedValue)) current.delete(normalizedValue)
    else current.add(normalizedValue)
    onChange(Array.from(current))
  }

  // Calculate position of the trigger button
  const updateRect = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setRect(r)
  }, [])

  useEffect(() => {
    if (!open) { setSearch(''); return }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open, updateRect])

  // Close when clicking outside trigger OR dropdown
  useEffect(() => {
    if (!open) return
    const handleOutside = e => {
      const clickedTrigger = triggerRef.current?.contains(e.target)
      const clickedDropdown = dropdownRef.current?.contains(e.target)
      if (!clickedTrigger && !clickedDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Determine dropdown vertical position
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const renderUpward = spaceBelow < 320

  const dropdownPortalStyle = rect
    ? {
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        minWidth: rect.width,
        maxWidth: rect.width,
        boxSizing: 'border-box',
        ...(renderUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        zIndex: 99999,
        background: 'white',
        border: '1.5px solid #dbe5f0',
        borderRadius: '12px',
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
        overflow: 'hidden',
        ...dropdownStyle,
      }
    : { display: 'none' }

  const dropdown = (
    <div ref={dropdownRef} style={dropdownPortalStyle}>
        {searchable && (
        <div style={{ padding: '8px' }}>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setOpen(false)
                return
              }
              if (allowCustomInput && e.key === 'Enter' && search.trim()) {
                e.preventDefault()
                onChange(search.trim())
                setOpen(false)
              }
            }}
            placeholder="Cari..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1.5px solid #d7e0ea',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              outline: 'none',
              background: '#f8fafc',
              color: '#1e293b',
            }}
          />
          {allowCustomInput && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                {customInputLabel}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                {search.trim()
                  ? 'Tekan Enter atau klik tombol di bawah untuk memakai teks ini sebagai vendor manual.'
                  : 'Cari vendor dari master data, atau ketik nama vendor sendiri.'}
              </div>
              <button
                type="button"
                onClick={() => {
                  const customValue = search.trim()
                  if (!customValue) return
                  onChange(customValue)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '10px',
                  background: '#1f4e8c',
                  color: 'white',
                  padding: '9px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: search.trim() ? 'pointer' : 'not-allowed',
                  opacity: search.trim() ? 1 : 0.55,
                }}
                disabled={!search.trim()}
              >
                {customInputButtonLabel}
              </button>
            </div>
          )}
        </div>
      )}
      <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: searchable ? '1px solid #f1f5f9' : 'none' }}>
        <button
          type="button"
          onClick={() => {
            onChange(multiple ? [] : '')
            setOpen(false)
          }}
          style={{
            width: '100%',
            border: 'none',
            background: 'white',
            textAlign: 'left',
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          {placeholder}
        </button>
        {filteredOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (multiple) {
                toggleMultipleValue(option.value)
                return
              }
              onChange(option.value)
              setOpen(false)
            }}
            style={{
              width: '100%',
              border: 'none',
              borderTop: '1px solid #f8fafc',
              background: (multiple ? selectedSet.has(String(option.value)) : option.value === value) ? '#eff6ff' : 'white',
              color: (multiple ? selectedSet.has(String(option.value)) : option.value === value) ? '#1f4e8c' : '#1e293b',
              textAlign: 'left',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: (multiple ? selectedSet.has(String(option.value)) : option.value === value) ? 700 : 500,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span>{option.label}</span>
            {multiple && selectedSet.has(String(option.value)) && (
              <span className="material-icons-round" style={{ fontSize: '16px', flexShrink: 0 }}>check</span>
            )}
          </button>
        ))}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
            Tidak ditemukan
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        onClick={() => !disabled && setOpen(cur => !cur)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          minHeight: style?.minHeight || '42px',
          borderRadius: style?.borderRadius || '12px',
          boxShadow: style?.boxShadow || 'inset 0 1px 0 rgba(255,255,255,0.65)',
        }}
        disabled={disabled}
      >
        {multiple ? (
          <span
            style={{
              display: 'flex',
              flex: 1,
              flexWrap: 'nowrap',
              gap: '8px',
              alignItems: 'center',
              color: selectedOptions.length ? '#1e293b' : '#94a3b8',
              paddingRight: '12px',
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedOptions.length ? (
              <>
                {selectedOptions.slice(0, 1).map(option => (
                  <span
                    key={option.value}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      maxWidth: '100%',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#eaf2ff',
                      color: '#1f4e8c',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexShrink: 1,
                    }}
                  >
                    {option.label}
                  </span>
                ))}
                {selectedOptions.length > 1 && (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#64748b',
                      flexShrink: 0,
                    }}
                  >
                    +{selectedOptions.length - 1} lagi
                  </span>
                )}
              </>
            ) : (
              <span style={{ display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {placeholder}
              </span>
            )}
          </span>
        ) : (
          <span
            style={{
              display: 'block',
              flex: 1,
              color: value ? '#1e293b' : '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingRight: '12px',
            }}
          >
            {selectedOption?.label || value || placeholder}
          </span>
        )}
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && createPortal(dropdown, document.body)}

      <input type="hidden" name={name} value={multiple ? selectedValues.join(', ') : value} />
    </div>
  )
}
