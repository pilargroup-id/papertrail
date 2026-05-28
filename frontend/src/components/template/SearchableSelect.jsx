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

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const filteredOptions = normalizedOptions.filter(option =>
    String(option.keywords || '').toLowerCase().includes(search.toLowerCase()),
  )

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
      <div style={{ padding: '8px' }}>
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
      </div>
      <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
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
            onClick={() => { onChange(option.value); setOpen(false) }}
            style={{
              width: '100%',
              border: 'none',
              borderTop: '1px solid #f8fafc',
              background: option.value === value ? '#eff6ff' : 'white',
              color: option.value === value ? '#1f4e8c' : '#1e293b',
              textAlign: 'left',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: option.value === value ? 700 : 500,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {option.label}
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
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-icons-round" style={{ fontSize: '18px', color: '#94a3b8', flexShrink: 0 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && createPortal(dropdown, document.body)}

      <input type="hidden" name={name} value={value} />
    </div>
  )
}
