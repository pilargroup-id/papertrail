import os

content = """import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsRp from '../../components/table/DataTableItemsRp.jsx'
import ButtonAddItemsFrp from '../../components/button/ButtonAddItemsFrp.jsx'
import '../../styles/frp/new-frp.css'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }
const normalizeCompany = v => String(v || '').trim().toUpperCase()

function FloatingGroup({ label, children, style, className }) {
  return (
    <div
      className={`frp-float-group${className ? ' ' + className : ''}`}
      style={style}
    >
      {children}
      <span className="frp-float-label">{label}</span>
    </div>
  )
}

function DateField({ name, value, onChange }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!inputRef.current) return
    if (typeof inputRef.current.showPicker === 'function') {
      inputRef.current.showPicker()
      return
    }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div style={{ position: 'relative', display: 'block', lineHeight: 0 }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        className="frp-input"
        placeholder=" "
        style={{
          paddingRight: '2.8rem',
          cursor: 'pointer',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          appearance: 'none',
          lineHeight: 'normal',
        }}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Buka kalender"
        style={{
          position: 'absolute',
          top: '50%',
          right: '6px',
          transform: 'translateY(-50%)',
          width: '26px',
          height: '26px',
          borderRadius: '8px',
          border: 'none',
          background: '#e2e8f0',
          color: '#475569',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
          pointerEvents: 'none',
        }}
      >
        <span className="material-icons-round" style={{ fontSize: '16px' }}>calendar_month</span>
      </button>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          display: none;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-clear-button {
          display: none;
        }
      `}</style>
    </div>
  )
}

const today = new Date().toISOString().slice(0, 10)
const getDefaultRpItems = () => [{ budgetId: '', memo: '', linkPembelian: '', qty: '1', estimatedValue: '0' }]
const blankRp = { companyName: '', divisi: '', class: '', dibuatOleh: '', kategoriPembelian: '', deskripsi: '', diprosesOleh: '', tanggalDibutuhkan: today, vendorSuggestion: '', picPenerima: '', items: getDefaultRpItems() }

const buildInitialRp = data => {
  const base = {
    ...blankRp,
    items: getDefaultRpItems(),
    companyName: data?.selectedCompany || '',
    divisi: data?.selectedDivision || '',
    dibuatOleh: data?.user?.fullName || '',
  }

  if (!data?.editData) return base

  return {
    ...base,
    ...data.editData,
    tanggalDibutuhkan: data.editData.tanggalDibutuhkan || today,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map(item => ({
          budgetId: item.budgetId || '',
          memo: item.memo || '',
          linkPembelian: item.linkPembelian || '',
          qty: String(item.qty || '1'),
          estimatedValue: String(item.estimatedValue || '0'),
        }))
      : getDefaultRpItems(),
  }
}

export default function NewRP() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [values, setValues] = useState(blankRp)
  const { setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [vw, setVw] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  useEffect(() => {
    const q = searchParams.toString() ? `?${searchParams.toString()}` : ''
    fetch(`/api/rp/form-data${q}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error() } return r.json() })
      .then(d => {
        setData(d)
        setUser(d?.user)
        setValues(buildInitialRp(d))
      })
      .catch(e => setError(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { const h = () => setVw(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])

  const D = data || {}
  const isAdmin = D.user?.role === 'administrator'
  const isMobile = vw < MOBILE_BREAKPOINT
  const isTablet = vw >= MOBILE_BREAKPOINT && vw < TABLET_BREAKPOINT
  const selectMenuPosition = isMobile ? 'fixed' : 'fixed'
  const mobileDropdownStyle = isMobile ? { maxWidth: 'calc(100vw - 32px)' } : undefined

  const updateField = (f, v) => setValues(p => ({ ...p, [f]: v }))
  const updateItem = (i, f, v) => setValues(p => ({ ...p, items: p.items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) }))
  const addRow = () => setValues(p => ({ ...p, items: [...p.items, ...getDefaultRpItems()] }))
  const removeRow = i => setValues(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const resetValues = () => setValues(buildInitialRp(D))

  const departments = useMemo(() => {
    if (D.departments && D.departments.length > 0) {
      return [...new Set(D.departments
        .filter(d => !values.companyName || normalizeCompany(d.company) === normalizeCompany(values.companyName))
        .map(d => d.name)
        .filter(Boolean))]
        .sort()
    }
    if (D.processDivisions && D.processDivisions.length > 0) return D.processDivisions
    const emps = D.employees || []
    const divs = [...new Set(emps.flatMap(e => (e.companies || []).filter(a => !values.companyName || normalizeCompany(a.name) === normalizeCompany(values.companyName)).map(a => a.class)).filter(Boolean))]
    return divs.sort()
  }, [D.departments, D.processDivisions, D.employees, values.companyName])

  const classOptions = useMemo(() => {
    const budgets = D.budgets || []
    const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
    const currentDivisi = (values.divisi || '').trim().toUpperCase()
    const isFullAccess = fullAccessDivisions.includes(currentDivisi)

    const classes = [...new Set(budgets.filter(b => {
      if (isFullAccess) return true
      return !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()
    }).map(b => b.class).filter(Boolean))]
    return classes.sort()
  }, [D.budgets, values.divisi])

  const budgetOptions = useMemo(() => {
    const budgets = D.budgets || []
    return budgets.filter(b => {
      const matchCompany = !values.companyName || (b.company || '').toLowerCase().includes(values.companyName.toLowerCase())
      if (!matchCompany) return false

      const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
      const currentDivisi = (values.divisi || '').trim().toUpperCase()
      if (fullAccessDivisions.includes(currentDivisi)) {
        return true
      }

      const matchDiv = !values.divisi || (b.department || '').toLowerCase() === values.divisi.toLowerCase()
      return matchDiv
    })
  }, [D.budgets, values.divisi, values.companyName])

  const processDivOptions = useMemo(() => {
    const source = D.departments?.length
      ? D.departments
        .filter(d => !values.companyName || normalizeCompany(d.company) === normalizeCompany(values.companyName))
        .map(d => d.name)
      : (D.processDivisions || ['IT', 'HCGA', 'Product'])
    return [...new Set(source.filter(Boolean))].sort().map(d => ({ value: d, label: d }))
  }, [D.departments, D.processDivisions, values.companyName])
  
  const companyOptions = useMemo(() => {
    const names = [
      ...(D.companies || []).map(company => company.name || company),
      ...(D.user?.allAssignments || []).map(assignment => assignment.name),
      ...(D.budgets || []).map(budget => budget.company),
    ].filter(Boolean)
    return [...new Set(names)].sort().map(name => ({ value: name, label: name }))
  }, [D.companies, D.user?.allAssignments, D.budgets])
  
  const divisionOptions = useMemo(() => departments.map(d => ({ value: d, label: d })), [departments])
  const rpClassOptions = useMemo(() => classOptions.map(c => ({ value: c, label: c })), [classOptions])
  const vendorOptions = useMemo(() => (D.vendors || []).map(v => ({ value: v.name, label: v.name })), [D.vendors])
  const kategoriOptions = ['Pengadaan Barang Baru', 'Pergantian Barang', 'Penambahan Barang'].map(k => ({ value: k, label: k }))
  const budgetSelectOpts = useMemo(() => budgetOptions.map(b => ({ value: b.id, label: `${b.id} - ${b.description}`, keywords: `${b.id} ${b.description}` })), [budgetOptions])

  const totalAmount = useMemo(() => values.items.reduce((s, it) => s + normalizeNumber(it.qty) * normalizeNumber(it.estimatedValue), 0), [values.items])

  const getBudgetRemaining = (budgetId) => {
    const b = (D.budgets || []).find(x => x.id === budgetId)
    return b ? b.remainingAmount : null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!values.class) {
      setSubmitError('Kolom Class wajib diisi.')
      return
    }
    setShowConfirm(true)
  }

  const executeSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true); setSubmitError(null)
    try {
      const processId = searchParams.get('process')
      if (processId) {
        const res = await fetch(`/api/rp/${processId}/process-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
        const result = await res.json()
        if (result.success) {
          alert('Data berhasil diupdate oleh divisi pemroses!')
          navigate('/rp-approval')
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      } else {
        let payload = { ...values }
        if (searchParams.get('revisi')) {
          payload.rpId = values.id
        } else {
          const rpNoRes = await fetch(`/api/rp/next-number/${encodeURIComponent(values.divisi)}`)
          const rpNoData = await rpNoRes.json()
          payload.rpNo = rpNoData.rpNo
        }
        const res = await fetch('/api/rp/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const result = await res.json()
        if (result.success) {
          alert(`RP berhasil disimpan!\\nNomor: ${result.rpNo}`)
          navigate('/rp-approval')
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      }
    } catch (err) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>
            Memuat data...
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <form id="rpForm" onSubmit={handleSubmit} className="frp-shell">
            {values.id && <input type="hidden" name="rpId" value={values.id} />}

            <div className="frp-top-panel">
              {/* Informasi Request Purchase */}
              <div className="frp-card">
                <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>info</span>
                  Informasi Request Purchase
                </h3>
                <div className="frp-grid-2">
                  <FloatingGroup label="Company Name">
                    {isAdmin && companyOptions.length > 0 ? (
                      <SearchableSelect
                        name="companyName"
                        value={values.companyName}
                        onChange={selectedValue => setValues(prev => ({ ...prev, companyName: selectedValue, divisi: '', class: '' }))}
                        options={companyOptions}
                        placeholder="Select company..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.companyName} readOnly />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="Tanggal Dibutuhkan">
                    <DateField name="tanggalDibutuhkan" value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-3" style={{ marginTop: "20px" }}>
                  <FloatingGroup label="Divisi">
                    {isAdmin ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => setValues(prev => ({ ...prev, divisi: selectedValue, class: '' }))}
                        options={divisionOptions}
                        placeholder="Select divisi..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.divisi} readOnly />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="Class">
                    <SearchableSelect
                      name="class"
                      value={values.class}
                      onChange={v => updateField('class', v)}
                      options={rpClassOptions}
                      placeholder="Select class..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="Dibuat Oleh">
                    <input className="frp-input-readonly" value={values.dibuatOleh} readOnly />
                  </FloatingGroup>
                </div>
                <FloatingGroup label="Deskripsi (Alasan Permintaan Barang & Nama Pengguna Barang)" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <textarea
                    name="deskripsi"
                    className="frp-textarea"
                    value={values.deskripsi}
                    onChange={e => updateField('deskripsi', e.target.value)}
                    placeholder="Write a description..."
                    style={{ height: '100%' }}
                  />
                </FloatingGroup>
              </div>

              {/* Vendor & Proses */}
              <div className="frp-card">
                <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>store</span>
                  Vendor &amp; Proses
                </h3>
                <div className="frp-grid-3">
                  <FloatingGroup label="Kategori Pembelian">
                    <SearchableSelect
                      name="kategoriPembelian"
                      value={values.kategoriPembelian}
                      onChange={v => updateField('kategoriPembelian', v)}
                      options={kategoriOptions}
                      placeholder="Pilih Kategori"
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="Diproses Oleh">
                    <SearchableSelect
                      name="diprosesOleh"
                      value={values.diprosesOleh}
                      onChange={v => updateField('diprosesOleh', v)}
                      options={processDivOptions}
                      placeholder="Pilih Divisi Pemroses"
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="Vendor Suggestion">
                    <SearchableSelect
                      name="vendorSuggestion"
                      value={values.vendorSuggestion}
                      onChange={v => updateField('vendorSuggestion', v)}
                      options={vendorOptions}
                      placeholder="Pilih Vendor"
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-2" style={{ marginTop: '20px' }}>
                  <FloatingGroup label="PIC Penerima">
                    <input
                      name="picPenerima"
                      className="frp-input"
                      value={values.picPenerima}
                      onChange={e => updateField('picPenerima', e.target.value)}
                      placeholder="Nama penerima barang"
                    />
                  </FloatingGroup>
                </div>
              </div>
            </div>

            <div className="frp-bottom-panel">
              <div className="frp-card frp-card--scroll">
                <div className="frp-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className="frp-section-title">
                      <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>list_alt</span>
                      Detail Items
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ButtonAddItemsFrp onClick={addRow} value="Add Item" />
                  </div>
                </div>

                <div className="frp-items-scrollable">
                  <DataTableItemsRp
                    items={values.items}
                    isMobile={isMobile}
                    budgetSelectOpts={budgetSelectOpts}
                    updateItem={updateItem}
                    removeRow={removeRow}
                    addRow={addRow}
                    getBudgetRemaining={getBudgetRemaining}
                    totalAmount={totalAmount}
                    mobileDropdownStyle={mobileDropdownStyle}
                  />
                </div>

                {submitError && (
                  <div className="frp-error-banner" style={{ marginTop: '10px' }}>
                    {submitError}
                  </div>
                )}

                <div className="frp-footer" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '10px', marginBottom: isMobile ? '10px' : 0 }}>
                    <span className="frp-total-label" style={{ fontSize: '0.85rem', margin: 0 }}>Total Amount:</span>
                    <div className="frp-total-value" style={{ fontSize: '1.2rem', margin: 0 }}>Rp {formatCurrency(totalAmount)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                    <button type="button" className="frp-btn-secondary" onClick={resetValues} disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>
                      Reset
                    </button>
                    <button type="submit" className="frp-btn-primary" disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                      {submitting ? 'Menyimpan...' : (searchParams.get('process') ? 'Update & Submit' : 'Submit Request Purchase')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
        <DialogConfirm
          isOpen={showConfirm}
          eyebrow="Konfirmasi Submit"
          title="Kirim Request Purchase?"
          message={
            !!searchParams.get('process')
              ? 'Apakah Anda yakin ingin mengupdate dan mengirimkan data Request Purchase ini?'
              : 'Apakah Anda yakin ingin mengirimkan Request Purchase ini?'
          }
          confirmLabel="Ya, Kirim"
          icon="send"
          tone="primary"
          isLoading={submitting}
          onClose={() => setShowConfirm(false)}
          onConfirm={executeSubmit}
        />
      </main>
    </>
  )
}
"""

with open("c:/Projects/frp/frontend/src/pages/rp/NewRP.jsx", "w", encoding="utf-8") as f:
    f.write(content)
