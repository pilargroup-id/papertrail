import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsRp from '../../components/table/DataTableItemsRp.jsx'
import '../../styles/frp/new-frp.css'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }
const normalizeCompany = v => String(v || '').trim().toUpperCase()

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
    <div style={{ position: 'relative' }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        className="frp-input"
        style={{
          paddingRight: '3rem',
          cursor: 'pointer',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          appearance: 'none',
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
          right: '8px',
          transform: 'translateY(-50%)',
          width: '34px',
          height: '34px',
          borderRadius: '10px',
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
        <span className="material-icons-round" style={{ fontSize: '18px' }}>calendar_month</span>
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
  const selectMenuPosition = isMobile ? 'fixed' : 'absolute'
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
          alert(`RP berhasil disimpan!\nNomor: ${result.rpNo}`)
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
      <main className="dashboard-main">
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#64748b' }}>Memuat data...</div>}
          {error && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && (
            <form id="rpForm" onSubmit={handleSubmit}>
              <div className="frp-card">
                {/* Informasi Request Purchase & Vendor & Proses Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '4.5fr 5.5fr',
                  gap: isMobile ? '1.5rem' : '2.5rem',
                  alignItems: 'start'
                }}>
                  {/* Informasi Request Purchase */}
                  <div>
                    <h3 className="frp-section-title">
                      <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>info</span>
                      Informasi Request Purchase
                    </h3>
                    <div className="frp-grid-2">
                      <div className="frp-form-group">
                        <label className="frp-label">Company Name</label>
                        {isAdmin && companyOptions.length > 0 ? (
                          <SearchableSelect
                            name="companyName"
                            value={values.companyName}
                            onChange={selectedValue => setValues(prev => ({ ...prev, companyName: selectedValue, divisi: '', class: '' }))}
                            options={companyOptions}
                            placeholder="Pilih Company"
                            className="frp-select"
                            dropdownStyle={mobileDropdownStyle}
                            menuPosition={selectMenuPosition}
                          />
                        ) : (
                          <input className="frp-input-readonly" value={values.companyName} readOnly />
                        )}
                      </div>
                      <div className="frp-form-group">
                        <label className="frp-label">Tanggal Dibutuhkan</label>
                        <DateField name="tanggalDibutuhkan" value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                      </div>
                    </div>
                    <div className="frp-grid-3" style={{ marginTop: '1rem' }}>
                      <div className="frp-form-group">
                        <label className="frp-label">Divisi</label>
                        {isAdmin ? (
                          <SearchableSelect
                            name="divisi"
                            value={values.divisi}
                            onChange={selectedValue => setValues(prev => ({ ...prev, divisi: selectedValue, class: '' }))}
                            options={divisionOptions}
                            placeholder="Pilih Divisi"
                            className="frp-select"
                            dropdownStyle={mobileDropdownStyle}
                            menuPosition={selectMenuPosition}
                          />
                        ) : (
                          <input className="frp-input-readonly" value={values.divisi} readOnly />
                        )}
                      </div>
                      <div className="frp-form-group">
                        <label className="frp-label">Class</label>
                        <SearchableSelect name="class" value={values.class} onChange={v => updateField('class', v)} options={rpClassOptions} placeholder="Pilih Class" className="frp-select" dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                      </div>
                      <div className="frp-form-group">
                        <label className="frp-label">Dibuat Oleh</label>
                        <input className="frp-input-readonly" value={values.dibuatOleh} readOnly />
                      </div>
                    </div>
                    <div className="frp-form-group" style={{ marginTop: '1rem' }}>
                      <label className="frp-label">Deskripsi (Alasan Permintaan Barang & Nama Pengguna Barang)</label>
                      <textarea name="deskripsi" className="frp-textarea" value={values.deskripsi} onChange={e => updateField('deskripsi', e.target.value)} placeholder="Jelaskan alasan permintaan barang..." />
                    </div>
                  </div>

                  {/* Vendor & Proses */}
                  <div>
                    <h3 className="frp-section-title">
                      <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>store</span>
                      Vendor &amp; Proses
                    </h3>
                    <div className="frp-grid-3">
                      <div className="frp-form-group">
                        <label className="frp-label">Kategori Pembelian</label>
                        <SearchableSelect name="kategoriPembelian" value={values.kategoriPembelian} onChange={v => updateField('kategoriPembelian', v)} options={kategoriOptions} placeholder="Pilih Kategori" className="frp-select" dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                      </div>
                      <div className="frp-form-group">
                        <label className="frp-label">Diproses Oleh</label>
                        <SearchableSelect name="diprosesOleh" value={values.diprosesOleh} onChange={v => updateField('diprosesOleh', v)} options={processDivOptions} placeholder="Pilih Divisi Pemroses" className="frp-select" dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                      </div>
                      <div className="frp-form-group">
                        <label className="frp-label">Vendor Suggestion</label>
                        <SearchableSelect name="vendorSuggestion" value={values.vendorSuggestion} onChange={v => updateField('vendorSuggestion', v)} options={vendorOptions} placeholder="Pilih Vendor" className="frp-select" dropdownStyle={mobileDropdownStyle} menuPosition={selectMenuPosition} />
                      </div>
                    </div>
                    <div className="frp-grid-2" style={{ marginTop: '1rem' }}>
                      <div className="frp-form-group">
                        <label className="frp-label">PIC Penerima</label>
                        <input name="picPenerima" className="frp-input" value={values.picPenerima} onChange={e => updateField('picPenerima', e.target.value)} placeholder="Nama penerima barang" />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }}></div>

                {/* Line Items Section */}
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

                {submitError && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>{submitError}</div>}

                <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }}></div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
                  <button type="button" className="frp-btn-secondary" onClick={resetValues} disabled={submitting}>
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                    Reset
                  </button>
                  <button type="submit" className="frp-btn-primary" style={{ opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                    <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                    {submitting ? 'Mengirim...' : (searchParams.get('process') ? 'Update & Submit' : 'Submit Request Purchase')}
                  </button>
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
