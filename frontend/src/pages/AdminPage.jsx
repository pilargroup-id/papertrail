import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { XClose } from '../components/template/TemplateIcons.jsx'
import SearchableSelect from '../components/template/SearchableSelect.jsx'
import CreateButton from '../components/button/CreateButton.jsx'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const COMPANIES = ['PT PILAR NIAGA MAKMUR', 'PT PILAR KARANG SAMUDERA', 'PT PILAR KARGO PERKASA']
const JOB_LEVELS = ['Staff', 'Manager', 'Direktur', 'Komisaris']
const VALID_TYPES = ['vendors', 'budgets']
const PAGE_META = {
  vendors: { title: 'Master Vendor', noun: 'Vendor', icon: 'store', accent: '#0f766e', description: 'Rapikan data vendor dan informasi rekening tujuan pembayaran.' },
  budgets: { title: 'Master Anggaran', noun: 'Anggaran', icon: 'savings', accent: '#b45309', description: 'Kelola budget ID, company, departemen, dan limit anggaran tahunan.' },
}

const COLUMN_WIDTHS = {
  vendors: ['5%', '33%', '30%', '22%', '10%'],
  budgets: ['4%', '10%', '13%', '10%', '7%', '7%', '22%', '18%', '9%'],
}

function getBlankForm(type) {
  if (type === 'vendors') return { name: '', bank: '', no_rekening: '' }
  if (type === 'budgets') return { id: '', department: '', company: COMPANIES[0], class: '', type: '', description: '', totalAmount: '' }
  return {}
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
}

const formatCurrency = value => {
  const normalized = Number(String(value || 0).replace(/[^0-9.-]/g, ''))
  return `IDR ${Number.isNaN(normalized) ? 0 : normalized.toLocaleString('id-ID')}`
}

function buildStyles(isMobile, isTablet, accent) {
  return {
    card: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem',
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0 0 1.25rem',
      fontSize: '0.95rem',
      fontWeight: 700,
      color: '#1e293b',
    },
    sectionSubtitle: {
      margin: '0.2rem 0 0',
      color: '#64748b',
      fontSize: '0.84rem',
      lineHeight: 1.5,
    },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' },
    label: {
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      color: '#64748b',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '10px',
      border: '1.5px solid #d7e0ea',
      fontSize: '0.9rem',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      outline: 'none',
      background: '#f8fafc',
      color: '#1e293b',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    },
    select: {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '10px',
      border: '1.5px solid #d7e0ea',
      fontSize: '0.9rem',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      outline: 'none',
      background: '#f8fafc',
      color: '#1e293b',
      cursor: 'pointer',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
      transition: 'border-color 0.2s, background 0.2s',
    },
    textarea: {
      width: '100%',
      padding: '9px 12px',
      borderRadius: '10px',
      border: '1.5px solid #d7e0ea',
      fontSize: '0.9rem',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      outline: 'none',
      background: '#f8fafc',
      color: '#1e293b',
      resize: 'vertical',
      minHeight: '96px',
    },
    grid2: { display: 'grid', gridTemplateColumns: getGridColumns(2, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' },
    grid3: { display: 'grid', gridTemplateColumns: getGridColumns(3, isMobile, isTablet), gap: isMobile ? '0.85rem' : '1rem' },
    assignCard: {
      border: '1px solid #dbe5f0',
      borderRadius: '14px',
      background: '#fbfdff',
      padding: isMobile ? '0.9rem' : '1rem',
      marginBottom: '0.85rem',
    },
    listShell: {
      background: 'white',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    toolbar: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: '0.9rem',
      padding: isMobile ? '12px' : '14px 18px',
      borderBottom: '1px solid #e2e8f0',
      background: '#f8fafc',
    },
    filterWrap: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'flex-end',
      gap: '10px',
    },
    tableContain: { display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 360px)' },
    scrollBody: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
    table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.875rem', tableLayout: 'fixed' },
    th: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '10px 14px',
      textAlign: 'left',
      borderBottom: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px -1px rgba(15,23,42,0.06)',
      background: '#f8fafc',
      fontWeight: 700,
      color: '#475569',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '11px 14px',
      textAlign: 'left',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '0.9rem',
      verticalAlign: 'top',
      color: '#334155',
    },
    mobileItemCard: {
      padding: '1rem',
      borderBottom: '1px solid #eef2f7',
      background: 'white',
    },
    mobileMetaGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.8rem',
      marginTop: '0.95rem',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
    },
    badgeSoft: { background: '#e2e8f0', color: '#334155' },
    badgeCode: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
    badgeClass: { background: '#e0f2fe', color: '#0369a1' },
  }
}

function SectionHeading({ icon, title, subtitle, accent }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
        <span className="material-icons-round" style={{ color: accent, fontSize: '20px' }}>{icon}</span>
        {title}
      </h3>
      {subtitle ? <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.5 }}>{subtitle}</p> : null}
    </div>
  )
}



function VendorFormFields({ form, onChange, styles }) {
  return (
    <div style={styles.grid3}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nama Vendor / PT</label>
        <input style={styles.input} required value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="PT Contoh Maju" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nama Bank Tujuan</label>
        <input style={styles.input} required value={form.bank} onChange={e => onChange('bank', e.target.value)} placeholder="BCA a/n PT Contoh" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Nomor Rekening</label>
        <input style={styles.input} required value={form.no_rekening} onChange={e => onChange('no_rekening', e.target.value)} placeholder="1234567890" />
      </div>
    </div>
  )
}



function BudgetFormFields({ form, onChange, companyNames, styles }) {
  return (
    <>
      <div style={styles.grid3}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Budget ID</label>
          <input style={styles.input} required value={form.id} onChange={e => onChange('id', e.target.value)} placeholder="FIN-001" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Departemen</label>
          <input style={styles.input} required value={form.department} onChange={e => onChange('department', e.target.value)} placeholder="FINANCE" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Company</label>
          <SearchableSelect
            style={styles.select}
            value={form.company}
            onChange={val => onChange('company', val)}
            options={companyNames}
            placeholder="Pilih Company"
            menuPosition="fixed"
          />
        </div>
      </div>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Class</label>
          <input style={styles.input} required value={form.class} onChange={e => onChange('class', e.target.value)} placeholder="Product" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Type</label>
          <input style={styles.input} required value={form.type} onChange={e => onChange('type', e.target.value)} placeholder="Cost / Aktiva" />
        </div>
      </div>
      <div style={styles.grid2}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Deskripsi</label>
          <textarea style={styles.textarea} required value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Biaya ATK" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Total Limit (Amount) Setahun</label>
          <input style={styles.input} required value={form.totalAmount} onChange={e => onChange('totalAmount', e.target.value)} placeholder="10000000" />
        </div>
      </div>
    </>
  )
}



function FormFields({ type, form, onChange, companyNames = COMPANIES, styles }) {
  if (type === 'vendors') return <VendorFormFields form={form} onChange={onChange} styles={styles} />
  if (type === 'budgets') return <BudgetFormFields form={form} onChange={onChange} companyNames={companyNames} styles={styles} />
  return null
}



function matchesSearch(type, item, search) {
  if (!search) return true
  const q = search.toLowerCase()
  if (type === 'vendors') return (item.name || '').toLowerCase().includes(q) || (item.bank || '').toLowerCase().includes(q) || String(item.no_rekening || '').toLowerCase().includes(q)
  if (type === 'budgets') return (item.id || '').toLowerCase().includes(q) || (item.department || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
  return true
}

function TableRows({ type, listData, onEdit, onDelete, companyFilter, search, companyNames = COMPANIES, styles }) {
  const defaultCompany = companyNames[0] || COMPANIES[0]
  const filtered = listData.filter(item => {
    if (companyFilter) {
      if (type === 'budgets' && (item.company || defaultCompany) !== companyFilter) return false
    }
    return matchesSearch(type, item, search)
  })

  if (filtered.length === 0) return <tr><td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Tidak ada data</td></tr>

  return filtered.map((item, idx) => {
    const rowBg = idx % 2 === 0 ? 'white' : '#fafbfc'
    return (
      <tr key={item.originalIndex ?? idx} style={{ background: rowBg }} onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff' }} onMouseLeave={e => { e.currentTarget.style.background = rowBg }}>
        <td style={styles.td}>{idx + 1}</td>
        {type === 'vendors' && <>
          <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.name}</strong></td>
          <td style={styles.td}>{item.bank}</td>
          <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace' }}>{item.no_rekening}</td>
        </>}
        {type === 'budgets' && <>
          <td style={styles.td}><strong style={{ color: '#1e293b' }}>{item.id}</strong></td>
          <td style={{ ...styles.td, fontSize: '0.82rem', fontWeight: 700 }}>{item.company || defaultCompany}</td>
          <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span></td>
          <td style={styles.td}>{item.class}</td>
          <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span></td>
          <td style={{ ...styles.td, fontSize: '0.85rem', color: '#64748b' }}>{item.description}</td>
          <td style={{ ...styles.td, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{formatCurrency(item.totalAmount || 0)}</td>
        </>}
        <td style={styles.td}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}><span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span></CreateButton>
            <CreateButton variant="accordion" tone="danger" onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}><span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span></CreateButton>
          </div>
        </td>
      </tr>
    )
  })
}

function MobileList({ type, listData, onEdit, onDelete, companyFilter, search, companyNames = COMPANIES, styles }) {
  const defaultCompany = companyNames[0] || COMPANIES[0]
  const filtered = listData.filter(item => {
    if (companyFilter) {
      if (type === 'budgets' && (item.company || defaultCompany) !== companyFilter) return false
    }
    return matchesSearch(type, item, search)
  })

  if (filtered.length === 0) {
    return <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data</div>
  }

  return filtered.map((item, idx) => (
    <div key={item.originalIndex ?? idx} style={styles.mobileItemCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          {type === 'vendors' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.name}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.bank}</div>
          </>}
          {type === 'budgets' && <>
            <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{item.id}</div>
            <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.84rem' }}>{item.company || defaultCompany}</div>
          </>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <CreateButton variant="accordion" tone="primary" onClick={() => onEdit(item)}><span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span></CreateButton>
          <CreateButton variant="accordion" tone="danger" onClick={() => onDelete(typeof item.originalIndex !== 'undefined' ? item.originalIndex : idx)}><span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span></CreateButton>
        </div>
      </div>

      <div style={styles.mobileMetaGrid}>
        {type === 'vendors' && <>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Rekening</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{item.no_rekening}</div>
          </div>
        </>}
        {type === 'budgets' && <>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Dept</div>
            <span style={{ ...styles.badge, ...styles.badgeSoft }}>{item.department}</span>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Type</div>
            <span style={{ ...styles.badge, ...styles.badgeCode }}>{item.type}</span>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>Limit Tahunan</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.totalAmount || 0)}</div>
          </div>
        </>}
      </div>
    </div>
  ))
}

function TableHeadRow({ type, styles }) {
  const cols = {
    vendors: ['No', 'Nama Vendor', 'Bank', 'No Rekening', 'Aksi'],
    budgets: ['No', 'Budget ID', 'Company', 'Dept', 'Class', 'Type', 'Deskripsi', 'Total Amount', 'Aksi'],
  }
  return <thead><tr>{(cols[type] || []).map(col => <th key={col} style={styles.th}>{col}</th>)}</tr></thead>
}

export default function AdminPage() {
  const { type } = useParams()

  if (!VALID_TYPES.includes(type)) return <Navigate to="/" replace />

  const [data, setData] = useState(null)
  const { setUser } = useUser()
  const [addForm, setAddForm] = useState(() => getBlankForm(type))
  const [editItem, setEditItem] = useState(null)
  const [companyFilter, setCompanyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  const [renderedType, setRenderedType] = useState(type)

  // Synchronous state reset — runs before browser paint, no stale-data flash
  if (renderedType !== type) {
    setRenderedType(type)
    setAddForm(getBlankForm(type))
    setEditItem(null)
    setCompanyFilter('')
    setSearch('')
    setData(null)
  }

  const loading = data === null

  const meta = PAGE_META[type]
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT
  const styles = buildStyles(isMobile, isTablet, meta.accent)

  const loadData = useCallback(() => {
    fetch(`/api/data/admin?type=${type}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(() => { })
  }, [type])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!editItem) return
    const handleKeyDown = e => { if (e.key === 'Escape') setEditItem(null) }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editItem])

  const updateAddForm = (field, val) => setAddForm(f => ({ ...f, [field]: val }))
  const updateEditForm = (field, val) => setEditItem(f => ({ ...f, [field]: val }))

  const handleAdd = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      const d = await res.json()
      if (d.success) {
        setAddForm(getBlankForm(type))
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async index => {
    if (!confirm('Yakin ingin menghapus baris ini?')) return
    const res = await fetch(`/api/admin/${type}/delete/${index}`, { method: 'POST' })
    const d = await res.json()
    if (d.success) loadData()
  }

  const handleEdit = item => {
    const copy = JSON.parse(JSON.stringify(item))
    setEditItem(copy)
  }

  const handleEditSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/${type}/edit/${editItem.originalIndex}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) })
      const d = await res.json()
      if (d.success) {
        setEditItem(null)
        loadData()
      }
    } finally {
      setSaving(false)
    }
  }

  const showFilter = type === 'budgets'
  const listData = data?.listData || []
  const companyNames = useMemo(() => {
    const names = (data?.companies || []).map(company => company.name || company).filter(Boolean)
    return names.length ? names : COMPANIES
  }, [data?.companies])

  return (
    <>
      <main className="dashboard-main">
        {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}

        {!loading && <>
          <section style={styles.card}>
            <SectionHeading icon="add_circle" title={`Tambah ${meta.noun} Baru`} subtitle={`Isi form berikut untuk menambahkan data ${meta.noun.toLowerCase()} baru ke sistem.`} accent={meta.accent} />
            <form onSubmit={handleAdd}>
              <FormFields type={type} form={addForm} onChange={updateAddForm} companyNames={companyNames} styles={styles} />
              <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                <CreateButton type="submit" variant="accordion" tone="primary" disabled={saving} style={{ width: isMobile ? '100%' : 'auto', opacity: saving ? 0.7 : 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </CreateButton>
              </div>
            </form>
          </section>

          <section style={styles.listShell}>
            <div style={styles.toolbar}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>Daftar {meta.noun}</h3>
                <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.84rem' }}>Lihat, filter, edit, dan hapus data {meta.noun.toLowerCase()} dari satu tampilan.</p>
              </div>
              <div style={styles.filterWrap}>
                <div style={{ minWidth: isMobile ? '100%' : '220px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Cari</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-icons-round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '18px', pointerEvents: 'none' }}>search</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cari ${meta.noun.toLowerCase()}...`}
                      style={{ ...styles.select, paddingLeft: '36px', cursor: 'text' }} />
                  </div>
                </div>
                {showFilter && (
                  <div style={{ minWidth: isMobile ? '100%' : '220px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.05em' }}>Filter PT</label>
                    <SearchableSelect
                      style={styles.select}
                      value={companyFilter}
                      onChange={val => setCompanyFilter(val)}
                      options={companyNames}
                      placeholder="Semua Perusahaan"
                      menuPosition="fixed"
                    />
                  </div>
                )}
              </div>
            </div>

            {isMobile ? (
              <MobileList type={type} listData={listData} onEdit={handleEdit} onDelete={handleDelete} companyFilter={companyFilter} search={search} companyNames={companyNames} styles={styles} />
            ) : (
              <div style={styles.tableContain}>
                <table style={styles.table}>
                  <colgroup>{(COLUMN_WIDTHS[type] || []).map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <TableHeadRow type={type} styles={styles} />
                </table>
                <div style={styles.scrollBody}>
                  <table style={styles.table}>
                    <colgroup>{(COLUMN_WIDTHS[type] || []).map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                    <tbody>
                      <TableRows type={type} listData={listData} onEdit={handleEdit} onDelete={handleDelete} companyFilter={companyFilter} search={search} companyNames={companyNames} styles={styles} />
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>}
      </main>

      {editItem && createPortal(
        <div className="dashboard-popup-overlay" role="presentation" onClick={() => setEditItem(null)}>
          <div className="dashboard-popup" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ width: 'min(92vw, 920px)', maxWidth: 'none', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-popup__header">
              <div>
                <p className="dashboard-popup__eyebrow">Edit Data</p>
                <h2 className="dashboard-popup__title">Edit {meta.noun}</h2>
              </div>
              <button type="button" className="dashboard-popup__close" aria-label="Tutup dialog" onClick={() => setEditItem(null)}>
                <XClose size={18} />
              </button>
            </div>
            <div className="dashboard-popup__body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
              <form onSubmit={handleEditSave}>
                <FormFields type={type} form={editItem} onChange={updateEditForm} companyNames={companyNames} styles={styles} />
                <CreateButton type="submit" variant="accordion" tone="primary" disabled={saving} style={{ width: '100%', marginTop: '0.75rem', opacity: saving ? 0.7 : 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </CreateButton>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
