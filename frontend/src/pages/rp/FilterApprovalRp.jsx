import React, { useState, useEffect, useRef } from 'react'  

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function DateField({ value, onChange, placeholder = 'Pilih Tanggal', style }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    try {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
        return
      }
    } catch (_) { }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onClick={openPicker}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
      <div
        className="filter-input-element"
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          color: value ? '#1e293b' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDate(value) : placeholder}
        </span>
      </div>
    </div>
  )
}

function FilterField({ label, icon, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', paddingLeft: '4px' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span
            className="material-icons-round"
            style={{
              position: 'absolute',
              left: '14px',
              color: '#94a3b8',
              fontSize: '18px',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  style,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

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

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    const handleOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 20 : 1, width: '100%' }}>
      <button
        type="button"
        className="select-dropdown-btn"
        onClick={() => setOpen(current => !current)}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          minHeight: style?.minHeight || '44px',
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            flex: 1,
            color: value ? '#0f172a' : '#94a3b8',
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
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 200,
            overflow: 'hidden',
            padding: '6px'
          }}
        >
          <div style={{ padding: '4px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="material-icons-round" style={{ position: 'absolute', left: '10px', fontSize: '16px', color: '#94a3b8' }}>search</span>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Cari..."
                style={{ ...style, paddingLeft: '32px', fontSize: '0.875rem', padding: '8px 10px 8px 32px', minHeight: '38px', borderRadius: '8px' }}
              />
            </div>
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                onChange('')
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
                color: '#64748b',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              {placeholder}
            </button>
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: option.value === value ? '#eff6ff' : 'white',
                  color: option.value === value ? '#1f4e8c' : '#334155',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: option.value === value ? 600 : 400,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  borderRadius: '8px',
                  marginTop: '2px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => { if (option.value !== value) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={(e) => { if (option.value !== value) e.currentTarget.style.background = 'white' }}
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
      )}
    </div>
  )
}

export default function FilterApprovalRp({
  filters,
  setFilters,
  searchValue = '',
  onSearchChange,
  creatorOptions,
  statusOptions,
  divisionOptions,
  processorOptions,
  isMobile,
  filteredCount = 0,
  onRefresh,
}) {
  const filterInput = {
    width: '100%',
    padding: '10px 14px 10px 40px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: '#f8fafc',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    color: '#0f172a',
    minHeight: '44px',
    transition: 'all 0.2s ease',
  }

  const handleReset = () => {
    onSearchChange?.('')
    setFilters({
      search: '',
      date: '',
      creator: '',
      status: '',
      division: '',
      processor: '',
    })
  }

  const hasActiveFilters = searchValue || Object.values(filters).some(Boolean)

  return (
    <>
      <style>{`
        .filter-input-element {
          transition: all 0.2s ease-in-out;
        }
        .filter-input-element:focus, .filter-input-element:hover {
          background: white !important;
          border-color: #1f4e8c !important;
          box-shadow: 0 0 0 3px rgba(31, 78, 140, 0.15) !important;
        }
        .select-dropdown-btn {
          transition: all 0.2s ease-in-out;
        }
        .select-dropdown-btn:focus, .select-dropdown-btn:hover {
          background: white !important;
          border-color: #1f4e8c !important;
          box-shadow: 0 0 0 3px rgba(31, 78, 140, 0.15) !important;
        }
      `}</style>
      <div
        style={{
          background: 'white',
          padding: isMobile ? '16px 12px' : '20px 24px',
          borderBottom: '1.5px solid #e8edf4',
          flexShrink: 0,
        }}
      >
        {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#e6f2f0',
              display: 'grid',
              placeItems: 'center',
              color: '#1e5e4d',
            }}>
              <span className="material-icons-round" style={{ fontSize: '20px' }}>filter_alt</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                Filter Data RP
              </h2>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {filteredCount} data sesuai filter aktif
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onRefresh}
              title="Segarkan data"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid #dbe5f0',
                background: 'white',
                color: '#475569',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.borderColor = '#cbd5e1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.borderColor = '#dbe5f0'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
            </button>
          </div>
        </div> */}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(6, minmax(140px, 1fr))',
              gap: '12px',
              flex: 1,
              minWidth: isMobile ? '100%' : '800px',
            }}
          >
            {/* Search */}
            <FilterField label="Cari" icon="search">
              <input
                className="filter-input-element"
                style={filterInput}
                placeholder="No RP / Vendor..."
                value={onSearchChange ? searchValue : filters.search}
                onChange={(e) => onSearchChange ? onSearchChange(e.target.value) : setFilters((c) => ({ ...c, search: e.target.value }))}
              />
            </FilterField>

            {/* Tanggal */}
            <FilterField label="Tanggal" icon="calendar_month">
              <DateField
                value={filters.date}
                onChange={(e) => setFilters((c) => ({ ...c, date: e.target.value }))}
                style={filterInput}
              />
            </FilterField>

            {/* Pemohon */}
            <FilterField label="Pemohon" icon="person">
              <SearchableSelect
                value={filters.creator}
                onChange={(v) => setFilters((c) => ({ ...c, creator: v }))}
                options={creatorOptions}
                placeholder="Semua Pemohon"
                style={filterInput}
              />
            </FilterField>

            {/* Status */}
            <FilterField label="Status" icon="rule">
              <SearchableSelect
                value={filters.status}
                onChange={(v) => setFilters((c) => ({ ...c, status: v }))}
                options={statusOptions}
                placeholder="Semua Status"
                style={filterInput}
              />
            </FilterField>

            {/* Divisi */}
            <FilterField label="Divisi" icon="business">
              <SearchableSelect
                value={filters.division}
                onChange={(v) => setFilters((c) => ({ ...c, division: v }))}
                options={divisionOptions}
                placeholder="Semua Divisi"
                style={filterInput}
              />
            </FilterField>

            {/* Diproses */}
            <FilterField label="Diproses" icon="engineering">
              <SearchableSelect
                value={filters.processor}
                onChange={(v) => setFilters((c) => ({ ...c, processor: v }))}
                options={processorOptions}
                placeholder="Semua Proses"
                style={filterInput}
              />
            </FilterField>
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: '18px' }} /> {/* Spacer for label alignment */}
              <button
                onClick={handleReset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                  background: 'white', color: '#64748b', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', height: '44px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.color = '#0f172a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.color = '#64748b'
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
