import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import DialogConfirm from '../../components/Dialog/DialogConfirm'
import DialogSuccesAction from '../../components/Dialog/DialogSuccesAction'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsRp from '../../components/table/DataTableItemsRp.jsx'
import ButtonAddItemsFrp from '../../components/button/ButtonAddItemsFrp.jsx'
import '../../styles/frp/new-frp.css'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }
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
  let initialCompany = data?.selectedCompany || data?.user?.selectedCompany || data?.user?.companyName || data?.user?.company || '';
  if (data?.companies && initialCompany) {
    const searchCompany = normalizeCompany(initialCompany);
    const comp = data.companies.find(c => String(c.id) === String(initialCompany) || normalizeCompany(c.code) === searchCompany || normalizeCompany(c.name) === searchCompany);
    if (comp) initialCompany = comp.name;
  }

  const base = {
    ...blankRp,
    items: getDefaultRpItems(),
    companyName: initialCompany,
    dibuatOleh: data?.user?.fullName || '',
  }

  let initialDivisi = '';
  if (data?.departments && data.departments.length > 0) {
    const userDiv = normalizeCompany(data.selectedDivision || '');
    const matched = data.departments.find(d => normalizeCompany(d.class) === userDiv || normalizeCompany(d.name) === userDiv);
    if (matched) initialDivisi = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
  } else {
    initialDivisi = data?.selectedDivision || '';
  }
  base.divisi = initialDivisi;

  if (!data?.editData) return base

  let editDivisi = base.divisi;
  if (data?.departments && data.departments.length > 0) {
    const dName = normalizeCompany(data.editData.departmentName || data.editData.divisi || '');
    const dClass = normalizeCompany(data.editData.departmentClass || data.editData.class || '');
    const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
    if (matched) editDivisi = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
    else if (data.editData.departmentId) editDivisi = data.editData.departmentId;
  } else {
    editDivisi = data.editData.departmentName || data.editData.divisi || base.divisi;
  }

  return {
    ...base,
    ...data.editData,
    divisi: editDivisi,
    tanggalDibutuhkan: data.editData.tanggalDibutuhkan || data.editData.requiredDate || today,
    deskripsi: data.editData.deskripsi || data.editData.description || '',
    picPenerima: data.editData.picPenerima || data.editData.receiverPic || '',
    kategoriPembelian: data.editData.kategoriPembelian || data.editData.purchaseCategory || '',
    diprosesOleh: data.editData.diprosesOleh || data.editData.processedByDepartment || '',
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

const resolveDivisionValue = (departments, currentValue) => {
  if (!Array.isArray(departments) || departments.length === 0) {
    return currentValue || ''
  }

  const normalizedValue = normalizeCompany(currentValue)
  const matched = departments.find(d =>
    String(d.originalIndex) === String(currentValue) ||
    normalizeCompany(d.name) === normalizedValue ||
    normalizeCompany(d.class) === normalizedValue
  )

  if (!matched) {
    return currentValue || ''
  }

  return matched.originalIndex !== undefined ? matched.originalIndex : (matched.id ?? currentValue ?? '')
}

export default function NewRP({
  embedded = false,
  embeddedProcessId = null,
  onCloseEmbedded = null,
} = {}) {
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
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, title: '', message: '', subMessage: '', rpNo: '' })
  const [processorDepts, setProcessorDepts] = useState([])
  const [vw, setVw] = useState(typeof window === 'undefined' ? 1280 : window.innerWidth)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (embeddedProcessId) {
      params.set('process', embeddedProcessId)
    }
    const q = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/rp/form-data${q}`)
      .then(r => { if (!r.ok) { window.location.href = '/'; throw new Error() } return r.json() })
      .then(d => {
        setData(d)
        setUser(d?.user)
        setValues(buildInitialRp(d))

         fetch('/api/rp/processor-departments')
          .then(r => r.json())
          .then(depts => setProcessorDepts(depts))
          .catch(() => {})
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
      return (D.departments || [])
        .filter(d => !values.companyName || normalizeCompany(d.company) === normalizeCompany(values.companyName))
        .map((d, i) => ({
          originalIndex: d.originalIndex !== undefined ? d.originalIndex : (d.id !== undefined ? d.id : i),
          name: d.name || '',
          class: d.class || '',
          label: d.class ? `${d.name} - ${d.class}` : (d.name || ''),
          company: d.company || ''
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }
    
    let sourceDivs = []
    if (D.processDivisions && D.processDivisions.length > 0) {
      sourceDivs = D.processDivisions
    } else {
      const emps = D.employees || []
      sourceDivs = [...new Set(emps.flatMap(e => (e.companies || []).filter(a => !values.companyName || normalizeCompany(a.name) === normalizeCompany(values.companyName)).map(a => a.class)).filter(Boolean))].sort()
    }
    return sourceDivs.map((d, i) => ({ originalIndex: d, name: d, class: d, label: d, company: '' }))
  }, [D.departments, D.processDivisions, D.employees, values.companyName])

  useEffect(() => {
    if (departments.length === 0) return

    setValues(prev => {
      const nextDivisi = resolveDivisionValue(departments, prev.divisi)
      if (nextDivisi === prev.divisi) return prev

      const matchedDept = departments.find(d => String(d.originalIndex) === String(nextDivisi))
      return {
        ...prev,
        divisi: nextDivisi,
        class: matchedDept?.class || matchedDept?.name || prev.class || '',
      }
    })
  }, [departments])

  const getDefaultDivisionForCompany = (companyName) => {
    const sourceDepartments = D.departments && D.departments.length > 0
      ? (D.departments || [])
          .filter(d => !companyName || normalizeCompany(d.company) === normalizeCompany(companyName))
          .map((d, i) => ({
            originalIndex: d.originalIndex !== undefined ? d.originalIndex : (d.id !== undefined ? d.id : i),
            name: d.name || '',
            class: d.class || '',
            label: d.class ? `${d.name} - ${d.class}` : (d.name || ''),
            company: d.company || '',
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : (D.processDivisions && D.processDivisions.length > 0
          ? D.processDivisions.map((d, i) => ({ originalIndex: d, name: d, class: d, label: d, company: '' }))
          : [...new Set((D.employees || [])
              .flatMap(e => (e.companies || [])
                .filter(a => !companyName || normalizeCompany(a.name) === normalizeCompany(companyName))
                .map(a => a.class))
              .filter(Boolean))].sort().map((d, i) => ({ originalIndex: d, name: d, class: d, label: d, company: '' }))
        )

    return resolveDivisionValue(sourceDepartments, sourceDepartments[0]?.originalIndex ?? '')
  }

  const budgetOptions = useMemo(() => {
    const budgets = D.budgets || []
    return budgets.filter(b => {
      const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
      const sc = (values.companyName || '').trim().toUpperCase()
      const matchCompany = !sc || tc === sc
      if (!matchCompany) return false

      const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
      const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
      const currentDivisi = selectedDept ? selectedDept.name.trim().toUpperCase() : (values.divisi || '').trim().toUpperCase();
      const currentClass = selectedDept ? selectedDept.class.trim().toUpperCase() : '';

      if (fullAccessDivisions.includes(currentDivisi) || fullAccessDivisions.includes(currentClass)) {
        return true
      }

      if (currentDivisi || currentClass) {
        const matchedDepts = (D.departments || []).filter(d => {
          const matchName = (d.name || '').trim().toUpperCase() === currentDivisi || (d.class || '').trim().toUpperCase() === currentDivisi;
          const matchClass = !currentClass || (d.class || '').trim().toUpperCase() === currentClass;
          const matchDeptCompany = !sc || normalizeCompany(d.company) === sc;
          return matchName && matchClass && matchDeptCompany;
        });

        if (matchedDepts.length > 0) {
          const deptIds = matchedDepts.map(d => String(d.id));
          const bDeptId = String(b.department_id !== undefined ? b.department_id : (b.departmentId || ''));
          return deptIds.includes(bDeptId);
        } else {
          const bDeptName = (b.department || '').trim().toUpperCase();
          const bClass = (b.class || '').trim().toUpperCase();
          return bDeptName === currentDivisi || bClass === currentDivisi || (currentClass && (bDeptName === currentClass || bClass === currentClass));
        }
      }

      return true
    })
  }, [D.budgets, values.divisi, values.companyName, departments, D.departments])

  const processDivOptions = useMemo(() => {
      if (processorDepts.length > 0) {
          return processorDepts.map(d => ({ value: d, label: d }))
      }
      return ['IT', 'HCGA'].map(d => ({ value: d, label: d }))
  }, [processorDepts])
  
  const companyOptions = useMemo(() => {
    const names = [
      ...(D.companies || []).map(company => company.name || company),
      ...(D.user?.allAssignments || []).map(assignment => assignment.name),
      ...(D.budgets || []).map(budget => budget.company),
    ].filter(Boolean)
    return [...new Set(names)].sort().map(name => ({ value: name, label: name }))
  }, [D.companies, D.user?.allAssignments, D.budgets])
  
  const divisionOptions = useMemo(() => departments.map(d => ({ value: d.originalIndex, label: d.label })), [departments])
  const vendorOptions = useMemo(() => (D.vendors || []).map(v => ({ value: v.name, label: v.name })), [D.vendors])
  const kategoriOptions = ['Pengadaan Barang Baru', 'Pergantian Barang', 'Penambahan Barang'].map(k => ({ value: k, label: k }))
  const budgetSelectOpts = useMemo(() => budgetOptions.map(b => ({ value: b.id, label: `${b.id} - ${b.description}`, keywords: `${b.id} ${b.description}` })), [budgetOptions])

  const totalAmount = useMemo(() => values.items.reduce((s, it) => s + normalizeNumber(it.qty) * normalizeNumber(it.estimatedValue), 0), [values.items])
  const processId = embeddedProcessId || searchParams.get('process')
  const sectionSurfaceStyle = embedded
    ? { padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }
    : undefined
  const sectionHeaderStyle = embedded
    ? { flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }
    : { flexWrap: 'wrap', gap: '10px' }

  const getBudgetRemaining = (budgetId) => {
    const b = (D.budgets || []).find(x => x.id === budgetId)
    return b ? b.remainingAmount : null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    
    if (!values.companyName) {
      setSubmitError('Kolom Company Name wajib diisi.')
      return
    }
    if (!values.tanggalDibutuhkan) {
      setSubmitError('Kolom Date Required wajib diisi.')
      return
    }
    if (!values.deskripsi || values.deskripsi.trim() === '') {
      setSubmitError('Kolom Description wajib diisi.')
      return
    }
    if (!values.kategoriPembelian) {
      setSubmitError('Kolom Category Payment wajib diisi.')
      return
    }
    if (!values.diprosesOleh) {
      setSubmitError('Kolom Division to Process wajib diisi.')
      return
    }
    if (!values.vendorSuggestion) {
      setSubmitError('Kolom Vendor Suggestion wajib diisi.')
      return
    }
    if (!values.picPenerima || values.picPenerima.trim() === '') {
      setSubmitError('Kolom PIC wajib diisi.')
      return
    }

    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
    const deptClass = selectedDept ? selectedDept.class : values.class;
    
    if (!deptClass) {
      setSubmitError('Kolom Class wajib diisi. Silakan pilih Divisi & Class yang valid.')
      return
    }
    setShowConfirm(true)
  }

  const executeSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true); setSubmitError(null)
    try {
      let payload = { 
        ...values,
        purchaseCategory: values.kategoriPembelian,
        description: values.deskripsi,
        processedByDepartment: values.diprosesOleh,
        requiredDate: values.tanggalDibutuhkan,
        vendorSuggestion: values.vendorSuggestion,
        receiverPic: values.picPenerima,
      }
      const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
      payload.divisi = selectedDept ? selectedDept.name : values.divisi;
      payload.class = selectedDept ? selectedDept.class : '';

      if (processId) {
        const res = await fetch(`/api/rp/${processId}/process-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const result = await res.json()
        if (result.success) {
          setSuccessDialog({
            isOpen: true,
            title: 'Update Berhasil!',
            message: 'Data berhasil diupdate oleh divisi pemroses.',
            subMessage: 'Anda akan dialihkan kembali ke halaman Approval RP.',
            rpNo: ''
          })
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      } else {
        if (searchParams.get('revisi')) {
          payload.rpId = values.id
        } else {
          const rpNoRes = await fetch(`/api/rp/next-number/${encodeURIComponent(payload.divisi)}`)
          const rpNoData = await rpNoRes.json()
          payload.rpNo = rpNoData.rpNo
        }
        const res = await fetch('/api/rp/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const result = await res.json()
        if (result.success) {
          setSuccessDialog({
            isOpen: true,
            title: 'Berhasil!',
            message: 'Request Purchase Anda telah berhasil disimpan.',
            subMessage: 'Anda akan dialihkan kembali ke halaman Approval RP.',
            rpNo: result.rpNo
          })
        } else {
          setSubmitError(result.error || 'Gagal menyimpan')
        }
      }
    } catch (err) { setSubmitError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <main
        className="dashboard-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: embedded ? 'auto' : '100%',
          overflow: embedded ? 'visible' : 'hidden',
          padding: embedded ? '0' : '16px',
          background: 'transparent',
        }}
      >
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
          <form
            id="rpForm"
            onSubmit={handleSubmit}
            className={embedded ? 'frp-shell frp-shell--embedded' : 'frp-shell'}
            style={embedded ? { height: 'auto', minHeight: 0 } : undefined}
          >
            {values.id && <input type="hidden" name="rpId" value={values.id} />}

            <div className="frp-top-panel">
              {/* Informasi Request Purchase */}
              <div className={embedded ? '' : 'frp-card'} style={sectionSurfaceStyle}>
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
                        onChange={selectedValue => setValues(prev => ({
                          ...prev,
                          companyName: selectedValue,
                          divisi: getDefaultDivisionForCompany(selectedValue),
                          class: '',
                        }))}
                        options={companyOptions}
                        placeholder="Select company..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.companyName} readOnly />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="date required">
                    <DateField name="tanggalDibutuhkan" value={values.tanggalDibutuhkan} onChange={e => updateField('tanggalDibutuhkan', e.target.value)} />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-2" style={{ marginTop: "20px" }}>
                  <FloatingGroup label="Division & Class">
                    {isAdmin ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => updateField('divisi', selectedValue)}
                        options={divisionOptions}
                        placeholder="Select divisi..."
                        className="frp-select"
                        menuPosition="fixed"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={departments.find(d => String(d.originalIndex) === String(values.divisi))?.label || values.divisi} readOnly />
                    )}
                  </FloatingGroup>
                  <FloatingGroup label="Request By">
                    <input className="frp-input-readonly" value={values.dibuatOleh} readOnly />
                  </FloatingGroup>
                </div>
                <FloatingGroup label="Description" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <textarea
                    name="deskripsi"
                    className="frp-textarea"
                    value={values.deskripsi}
                    onChange={e => updateField('deskripsi', e.target.value)}
                    placeholder="Notes..."
                    style={{ height: '100%' }}
                  />
                </FloatingGroup>
              </div>

              {/* Vendor & Proses */}
              <div className={embedded ? '' : 'frp-card'} style={sectionSurfaceStyle}>
                <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>store</span>
                  Vendor &amp; Proses
                </h3>
                <div style={{ marginBottom: '20px' }}>
                  <FloatingGroup label="Vendor Suggestion">
                    <SearchableSelect
                      name="vendorSuggestion"
                      value={values.vendorSuggestion}
                      onChange={v => updateField('vendorSuggestion', v)}
                      options={vendorOptions}
                      placeholder="Pilih vendor atau ketik sendiri"
                      className="frp-select"
                      menuPosition="fixed"
                      allowCustomInput
                      customInputLabel="Vendor Manual"
                      customInputButtonLabel="Pakai nama ini"
                    />
                  </FloatingGroup>
                </div>
                <div className="frp-grid-3">
                  <FloatingGroup label="category payment">
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
                  <FloatingGroup label="division to process">
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
                  <FloatingGroup label="PIC">
                    <input
                      name="picPenerima"
                      className="frp-input"
                      value={values.picPenerima}
                      onChange={e => updateField('picPenerima', e.target.value)}
                      placeholder="Recipient's name"
                    />
                  </FloatingGroup>
                </div>
              </div>
            </div>

            <div className="frp-bottom-panel">
              <div className={embedded ? 'frp-card--scroll' : 'frp-card frp-card--scroll'} style={sectionSurfaceStyle}>
                <div className="frp-card-header" style={sectionHeaderStyle}>
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
                    embedded={embedded}
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
                      {submitting ? 'Menyimpan...' : (processId ? 'Update & Submit' : 'Submit Request Purchase')}
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
            processId
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
        <DialogSuccesAction
          isOpen={successDialog.isOpen}
          title={successDialog.title}
          message={successDialog.message}
          subMessage={successDialog.subMessage}
          rpNo={successDialog.rpNo}
          onConfirm={() => {
            setSuccessDialog(prev => ({ ...prev, isOpen: false }))
            if (embedded) {
              onCloseEmbedded?.()
            } else {
              navigate('/rp-approval')
            }
          }}
          buttonText={embedded ? 'Tutup' : 'Approval'}
        />
      </main>
    </>
  )
}
