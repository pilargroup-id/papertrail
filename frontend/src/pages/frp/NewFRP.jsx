import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsFrp from '../../components/table/DataTableItemsFrp.jsx'
import { frpService } from '../../services/frp/new-frp'
import '../../styles/frp/new-frp.css';

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))

const formatNumberInput = v => {
  if (v === undefined || v === null || v === '') return ''
  const clean = String(v).replace(/\D/g, '')
  if (!clean) return ''
  return new Intl.NumberFormat('en-US').format(parseInt(clean, 10))
}

const normalizeCompany = v => String(v || '').trim().toUpperCase()

const getEmployeeAssignments = e => {
  if (Array.isArray(e?.companies) && e.companies.length > 0) return e.companies
  if (e?.class) return [{ name: e.company || '', class: e.class, jobLevel: e.jobLevel || '' }]
  return []
}

const buildDepartments = (employees, companyName) =>
  [...new Set((employees || [])
    .flatMap(e => getEmployeeAssignments(e))
    .filter(a => !companyName || normalizeCompany(a.name) === normalizeCompany(companyName))
    .map(a => a.class || '')
    .filter(Boolean))]
    .sort()

const buildDepartmentsFromMaster = (departments, companyName) =>
  [...new Set((departments || [])
    .filter(d => !companyName || normalizeCompany(d.company) === normalizeCompany(companyName))
    .map(d => d.name || '')
    .filter(Boolean))]
    .sort()

const getDefaultItems = () => [{ memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }]

const blankForm = {
  companyName: '',
  tanggalFrp: today,
  divisi: '',
  dimintaOleh: '',
  currency: 'IDR',
  kurs: '1',
  vendor: '',
  internalPoNumber: '',
  extDocType: '',
  extDocNumber: '',
  paymentMethod: 'Transfer',
  paymentDate: today,
  attachLink: '',
  keteranganFrp: '',
  checkDocs: ['Form Request Payment'],
  items: getDefaultItems(),
  id: '',
  rpReference: '',
  fromRpId: '',
}

const buildInitialForm = (data, isDuplicate = false) => {
  const base = {
    ...blankForm,
    companyName: data.selectedCompany || '',
    divisi: data.selectedDivision || '',
    dimintaOleh: data.user?.fullName || '',
    id: isDuplicate ? '' : (data.editData?.id || ''),
  }

  if (!data.editData) return base

  return {
    ...base,
    ...data.editData,
    tanggalFrp: isDuplicate ? today : (data.editData.tanggalFrp || data.editData.frpDate || today),
    id: isDuplicate ? '' : (data.editData.id || ''),
    rpReference: isDuplicate ? '' : (data.editData.rpReference || ''),
    fromRpId: isDuplicate ? '' : (data.editData.fromRpId || ''),
    status: isDuplicate ? '' : (data.editData.status || ''),
    frpNo: isDuplicate ? '' : (data.editData.frpNo || ''),
    paymentDate: data.editData.paymentDate || today,
    keteranganFrp: data.editData.keteranganFrp || data.editData.frpDescription || '',
    bankTujuan: data.editData.bankTujuan || data.editData.destinationBank || '',
    rekBankTujuan: data.editData.rekBankTujuan || data.editData.destinationBankAccount || '',
    extDocType: data.editData.extDocType || data.editData.externalDocumentType || '',
    extDocNumber: data.editData.extDocNumber || data.editData.externalDocumentNumber || '',
    kurs: String(data.editData.kurs || data.editData.exchangeRate || '1'),
    checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map(i => ({
        memo: i.memo || '',
        budgetId: i.budgetId || '',
        qty: String(i.qty || '1'),
        hargaSatuan: String(i.hargaSatuan || i.price || i.harga || '0'),
      }))
      : getDefaultItems(),
  }
}

const getGridColumns = (desktopColumns, isMobile, isTablet) => {
  if (isMobile) return '1fr'
  if (isTablet && desktopColumns >= 3) return '1fr 1fr'
  return `repeat(${desktopColumns}, minmax(0, 1fr))`
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

export default function NewFRP() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const { setUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [error, setError] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))

  useEffect(() => {
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    frpService.getFormData(query)
      .then(async data => {
        setFrpData(data)
      setUser(data?.user)
        const isDuplicate = searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'
        const initial = buildInitialForm(data, isDuplicate)

        const fromRpId = searchParams.get('fromRp')
        if (fromRpId) {
          try {
            const rpJson = await frpService.getRpData(fromRpId)
            if (rpJson && rpJson.data) {
              const rp = rpJson.data

              // Map items from RP to FRP format
              const mappedItems = Array.isArray(rp.items) ? rp.items.map(it => {
                const qtyVal = Number(it.qty) || 1
                const estVal = Number(it.estimatedValue) || 0
                return {
                  memo: it.memo || '',
                  budgetId: it.budgetId || '',
                  qty: String(qtyVal),
                  hargaSatuan: formatNumberInput(estVal),
                  amount: qtyVal * estVal,
                }
              }) : getDefaultItems()

              const rpAttachLink = Array.isArray(rp.items) ? (rp.items.find(it => it.linkPembelian)?.linkPembelian || '') : ''

              setValues({
                ...initial,
                companyName: rp.companyName || initial.companyName,
                divisi: rp.divisi || initial.divisi,
                dimintaOleh: rp.dibuatOleh || initial.dimintaOleh,
                keteranganFrp: rp.deskripsi || '',
                vendor: rp.vendorSuggestion || '',
                paymentDate: rp.tanggalDibutuhkan || today,
                attachLink: rpAttachLink || '',
                rpReference: rp.rpNo || '',
                fromRpId: fromRpId,
                items: mappedItems,
              })
              return
            }
          } catch (e) {
            console.error('Failed to load RP data:', e)
          }
        }

        setValues(initial)
      })
      .catch(err => {
        if (err.status === 401 || err.status === 403) {
          window.location.href = '/login'
        }
        setError(err.message || 'Gagal memuat data')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const FRP = frpData || {}
  const isMobile = viewportWidth < MOBILE_BREAKPOINT
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT

  const departments = useMemo(
    () => (FRP.departments?.length
      ? buildDepartmentsFromMaster(FRP.departments, values.companyName)
      : (FRP.divisionList || buildDepartments(FRP.employees || [], values.companyName))),
    [FRP.departments, FRP.divisionList, FRP.employees, values.companyName],
  )

  const filteredEmployees = useMemo(() => {
    let sourceEmployees = FRP.user?.role === 'administrator' ? FRP.employees : FRP.departmentEmployees;
    if (!sourceEmployees || sourceEmployees.length === 0) {
      sourceEmployees = [{
        fullName: FRP.user?.fullName || '',
        companies: [{
          name: FRP.user?.selectedCompany || '',
          code: FRP.user?.selectedCompany || '',
          class: FRP.user?.selectedDivision || '',
          deptName: FRP.user?.selectedDivision || '',
        }]
      }];
    }
    const targetCompany = normalizeCompany(values.companyName);
    const targetDivision = normalizeCompany(values.divisi);

    return sourceEmployees.filter(e => {
      const assignments = getEmployeeAssignments(e);
      if (!targetCompany && !targetDivision) return true;
      return assignments.some(a => {
        const matchCompany = !targetCompany ||
          normalizeCompany(a.name) === targetCompany ||
          normalizeCompany(a.code) === targetCompany ||
          normalizeCompany(a.companyCode) === targetCompany;

        const matchDivision = !targetDivision ||
          normalizeCompany(a.class) === targetDivision ||
          normalizeCompany(a.deptName) === targetDivision;

        return matchCompany && matchDivision;
      });
    });
  }, [values.companyName, values.divisi, FRP.employees, FRP.departmentEmployees, FRP.user?.fullName, FRP.user?.role, FRP.user?.selectedCompany, FRP.user?.selectedDivision])

  const budgetOptions = useMemo(
    () =>
      (FRP.budgets || []).filter(b => {
        const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
        const sc = (values.companyName || '').trim().toUpperCase()
        const matchCompany = !sc || tc === sc

        if (!matchCompany) return false

        // Divisi tertentu (HCGA, IT, Marketing, Product) memiliki akses ke seluruh budget
        const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
        const currentDivisi = (values.divisi || '').trim().toUpperCase()
        if (fullAccessDivisions.includes(currentDivisi)) {
          return true
        }

        if (values.divisi) {
          const sd = values.divisi.trim().toUpperCase()
          // Find matching departments in FRP.departments
          const matchedDepts = (FRP.departments || []).filter(d => {
            const matchName = (d.name || '').trim().toUpperCase() === sd || (d.class || '').trim().toUpperCase() === sd
            const matchDeptCompany = !sc || (d.company || '').trim().toUpperCase() === sc
            return matchName && matchDeptCompany
          })

          if (matchedDepts.length > 0) {
            const deptIds = matchedDepts.map(d => String(d.id))
            const bDeptId = String(b.department_id !== undefined ? b.department_id : (b.departmentId || ''))
            return deptIds.includes(bDeptId)
          } else {
            // Fallback if master departments list is empty/missing
            const bDeptName = (b.department || '').trim().toUpperCase()
            const bClass = (b.class || '').trim().toUpperCase()
            return bDeptName === sd || bClass === sd
          }
        }

        return true
      }),
    [values.companyName, values.divisi, FRP.budgets, FRP.departments],
  )

  const calculateRowAmount = item =>
    normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)

  const getBudgetAmount = budgetId => {
    const b = (frpData?.budgets || []).find(x => x.id === budgetId)
    if (!b) return 0
    return b.budget_remaining !== undefined ? b.budget_remaining : (b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : (b.remainingAmount !== undefined ? b.remainingAmount : 0)))
  }

  const totalAmount = useMemo(
    () => values.items.reduce((sum, item) => sum + calculateRowAmount(item), 0),
    [values.items, values.kurs],
  )

  const updateField = (field, value) => setValues(prev => ({ ...prev, [field]: value }))
  const updateItem = (index, field, value) =>
    setValues(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }))

  const handleAddRow = () =>
    setValues(prev => ({
      ...prev,
      items: [...prev.items, { memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }],
    }))

  const handleRemoveRow = index =>
    setValues(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))

  const handleCheckDocToggle = doc =>
    setValues(prev => ({
      ...prev,
      checkDocs: prev.checkDocs.includes(doc)
        ? prev.checkDocs.filter(d => d !== doc)
        : [...prev.checkDocs, doc],
    }))

  const visibleCompanyField = FRP.user?.role === 'administrator'
        const companySelectOptions = useMemo(
    () => (FRP.companies || []).map(company => ({ value: company.name, label: company.name })),
    [FRP.companies],
  )
  const divisionSelectOptions = useMemo(
    () => departments.map(department => ({ value: department, label: department })),
    [departments],
  )
  const employeeSelectOptions = useMemo(
    () => filteredEmployees.map(employee => ({ value: employee.fullName, label: employee.fullName })),
    [filteredEmployees],
  )
  const vendorSelectOptions = useMemo(
    () => (FRP.vendors || []).map(vendor => ({ value: vendor.name, label: vendor.name })),
    [FRP.vendors],
  )
  const currencySelectOptions = useMemo(
    () => ['IDR', 'USD', 'CNY', 'EUR', 'SGD'].map(currency => ({ value: currency, label: currency })),
    [],
  )
  const extDocTypeOptions = useMemo(
    () => ([
      { value: 'invoice', label: 'Invoice' },
      { value: 'kontrak', label: 'Kontrak' },
      { value: 'kwitansi', label: 'Kwitansi' },
      { value: 'nota', label: 'Nota' },
      { value: 'other', label: 'Lainnya' },
    ]),
    [],
  )
  const paymentMethodOptions = useMemo(
    () => ['Transfer', 'Cash', 'Giro'].map(method => ({ value: method, label: method })),
    [],
  )
  const budgetSelectOptions = useMemo(
    () => budgetOptions.map(budget => ({ value: budget.id, label: `${budget.id} - ${budget.description}`, keywords: `${budget.id} ${budget.description}` })),
    [budgetOptions],
  )

  const CHECK_DOCS = [
    'Form Request Payment',
    'Tanda Terima Asli',
    'Invoice / Kontrak',
    'Surat Jalan Asli / Berita Acara',
    'Faktur Pajak',
    'Purchase Order',
  ]

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitError(null)

    setSubmitting(true)

    try {
      // Cek ke database terlebih dahulu untuk mendapatkan sisa budget ter-update
      const resBudgets = await fetch('/api/budgets/all')
      if (!resBudgets.ok) {
        throw new Error('Gagal memeriksa budget terbaru dari database. Silakan coba lagi.')
      }
      const latestBudgets = await resBudgets.json()

      // Ambil data FRP lama jika sedang revisi
      const isRevision = !!values.id
      let oldItems = []
      if (isRevision && frpData?.editData?.items) {
        oldItems = frpData.editData.items
      }

      // Validasi limit budget
      for (const item of values.items) {
        if (item.budgetId) {
          const dbBudget = latestBudgets.find(b => b.id === item.budgetId)
          if (!dbBudget) {
            setSubmitError(`Budget ID ${item.budgetId} tidak ditemukan di database.`)
            setSubmitting(false)
            return
          }

          const dbRemaining = dbBudget.budget_remaining !== undefined ? dbBudget.budget_remaining : (dbBudget.remainingAmount || 0)
          
          let revertedAmount = 0
          if (isRevision) {
            const matchedOld = oldItems.filter(oi => oi.budgetId === item.budgetId)
            revertedAmount = matchedOld.reduce((sum, oi) => sum + (parseFloat(oi.amount) || 0), 0)
          }

          const availableBudget = dbRemaining + revertedAmount

          // Cek Harga Satuan (dalam IDR)
          const unitPriceIdr = normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)
          if (unitPriceIdr > availableBudget) {
            setSubmitError(`Harga Satuan untuk budget ${item.budgetId} (Rp ${formatCurrency(unitPriceIdr)}) melebihi batas sisa budget di database (Rp ${formatCurrency(availableBudget)}).`)
            setSubmitting(false)
            return
          }

          // Cek Total Amount (dalam IDR)
          const reqAmount = calculateRowAmount(item)
          if (reqAmount > availableBudget) {
            setSubmitError(`Total Amount pada budget ${item.budgetId} (Rp ${formatCurrency(reqAmount)}) melebihi batas sisa budget di database (Rp ${formatCurrency(availableBudget)}).`)
            setSubmitting(false)
            return
          }
        }
      }

      const payload = {
        frpId: values.id || undefined,
        fromRpId: values.fromRpId || undefined,
        
        companyName: values.companyName,
        divisi: values.divisi,
        dimintaOleh: values.dimintaOleh,
        rpReference: values.rpReference,
        attachLink: values.attachLink,

        frpDate: values.tanggalFrp,
        currency: values.currency,
        exchangeRate: String(values.kurs),
        frpDescription: values.keteranganFrp,
        vendor: values.vendor,
        internalPoNumber: values.internalPoNumber,
        externalDocumentType: values.extDocType,
        externalDocumentNumber: values.extDocNumber,
        paymentMethod: values.paymentMethod,
        paymentDate: values.paymentDate,
        destinationBank: values.bankTujuan,
        destinationBankAccount: values.rekBankTujuan,
        checkDocs: values.checkDocs,
        items: values.items.map(item => ({
          budgetId: item.budgetId || null,
          memo: item.memo || '',
          qty: normalizeNumber(item.qty),
          price: normalizeNumber(item.hargaSatuan),
          amount: calculateRowAmount(item),
        })),
      }

      const d = await frpService.saveFrp(payload)

      if (d.success) {
        navigate('/approval')
      } else {
        setSubmitError(d.error || 'Gagal menyimpan, coba lagi.')
      }
    } catch (err) {
      setSubmitError(err.message || 'Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="dashboard-main">
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
        <form id="frpForm" onSubmit={handleSubmit}>
          {values.id && <input type="hidden" name="frpId" value={values.id} />}

          {values.rpReference && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', marginBottom: '1.5rem', color: '#1e40af', fontWeight: 600, fontSize: '0.9rem' }}>
              <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '20px' }}>info</span>
              Membuat FRP dari referensi Request Purchase No: <strong>{values.rpReference}</strong>
            </div>
          )}

          <div className="frp-card">
            {/* Informasi FRP & Vendor Pembayaran Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '4.5fr 5.5fr',
              gap: isMobile ? '1.5rem' : '2.5rem',
              alignItems: 'start'
            }}>
              {/* Informasi FRP */}
              <div>
                <h3 className="frp-section-title">
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>info</span>
                  Informasi FRP
                </h3>
                <div className="frp-grid-2">
                  <div className="frp-form-group">
                    <label className="frp-label">Company Name</label>
                    {visibleCompanyField ? (
                      <SearchableSelect
                        name="companyName"
                        value={values.companyName}
                        onChange={selectedValue => updateField('companyName', selectedValue)}
                        options={companySelectOptions}
                        placeholder="Pilih Company"
                        className="frp-select"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.companyName} readOnly />
                    )}
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Tanggal FRP</label>
                    <DateField name="tanggalFrp" value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} />
                  </div>
                </div>
                <div className="frp-grid-3" style={{ marginTop: "1rem" }}>
                  <div className="frp-form-group">
                    <label className="frp-label">Divisi</label>
                    {FRP.user?.role === 'administrator' ? (
                      <SearchableSelect
                        name="divisi"
                        value={values.divisi}
                        onChange={selectedValue => updateField('divisi', selectedValue)}
                        options={divisionSelectOptions}
                        placeholder="Pilih Divisi"
                        className="frp-select"
                      />
                    ) : (
                      <input className="frp-input-readonly" value={values.divisi} readOnly />
                    )}
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Diminta Oleh</label>
                    <SearchableSelect
                      name="dimintaOleh"
                      value={values.dimintaOleh}
                      onChange={selectedValue => updateField('dimintaOleh', selectedValue)}
                      options={employeeSelectOptions}
                      placeholder="Pilih Karyawan"
                      className="frp-select"
                    />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Currency</label>
                    <SearchableSelect
                      name="currency"
                      value={values.currency}
                      onChange={async selectedValue => {
                        updateField('currency', selectedValue)
                        if (selectedValue === 'IDR') {
                          updateField('kurs', '1')
                        } else {
                          updateField('kurs', 'Memuat...')
                          try {
                            const data = await frpService.getKurs(selectedValue)
                            if (data.success && data.rate) {
                              updateField('kurs', String(data.rate))
                            } else {
                              updateField('kurs', '1') // fallback
                              console.error('API Error:', data.error)
                            }
                          } catch (e) {
                            updateField('kurs', '1')
                            console.error('Gagal mengambil kurs:', e)
                          }
                        }
                      }}
                      options={currencySelectOptions}
                      placeholder="Pilih Currency"
                      className="frp-select"
                    />
                  </div>
                </div>
                {values.currency !== 'IDR' && (
                  <div className="frp-form-group" style={{ marginTop: "1rem", maxWidth: isMobile ? "100%" : "200px" }}>
                    <label className="frp-label">Kurs</label>
                    <input name="kurs" className="frp-input" value={values.kurs} onChange={e => updateField('kurs', e.target.value)} />
                  </div>
                )}
                <div className="frp-form-group" style={{ marginTop: "1rem" }}>
                  <label className="frp-label">Keterangan FRP</label>
                  <textarea
                    name="keteranganFrp"
                    className="frp-textarea"
                    value={values.keteranganFrp}
                    onChange={e => updateField('keteranganFrp', e.target.value)}
                    placeholder="Tulis keterangan..."
                  />
                </div>
              </div>

              {/* Vendor & Pembayaran */}
              <div>
                <h3 className="frp-section-title">
                  <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>store</span>
                  Vendor &amp; Pembayaran
                </h3>
                <div className="frp-grid-2">
                  <div className="frp-form-group">
                    <label className="frp-label">Vendor</label>
                    <SearchableSelect
                      name="vendor"
                      value={values.vendor}
                      onChange={selectedValue => {
                        const selected = (FRP.vendors || []).find(v => v.name === selectedValue)
                        console.log('Selected vendor:', selected)
                        updateField('vendor', selectedValue)
                        updateField('bankTujuan', selected?.bank || '')
                        updateField('rekBankTujuan', selected?.no_rekening || '')
                      }}
                      options={vendorSelectOptions}
                      placeholder="Pilih Vendor"
                      className="frp-select"
                    />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Internal PO Number</label>
                    <input name="internalPoNumber" className="frp-input" value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} />
                  </div>
                </div>
                <div className="frp-grid-3" style={{ marginTop: "1rem" }}>
                  <div className="frp-form-group">
                    <label className="frp-label">Ext Doc Type</label>
                    <SearchableSelect
                      name="extDocType"
                      value={values.extDocType}
                      onChange={selectedValue => updateField('extDocType', selectedValue)}
                      options={extDocTypeOptions}
                      placeholder="Pilih"
                      className="frp-select"
                    />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Ext Doc Number</label>
                    <input name="extDocNumber" className="frp-input" value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Payment Method</label>
                    <SearchableSelect
                      name="paymentMethod"
                      value={values.paymentMethod}
                      onChange={selectedValue => updateField('paymentMethod', selectedValue)}
                      options={paymentMethodOptions}
                      placeholder="Pilih Metode"
                      className="frp-select"
                    />
                  </div>
                </div>
                <div className="frp-grid-3" style={{ marginTop: "1rem" }}>
                  <div className="frp-form-group">
                    <label className="frp-label">Payment Date</label>
                    <DateField name="paymentDate" value={values.paymentDate} onChange={e => updateField('paymentDate', e.target.value)} />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Bank Tujuan</label>
                    <input name="bankTujuan" className="frp-input" value={values.bankTujuan || ''} onChange={e => updateField('bankTujuan', e.target.value)} />
                  </div>
                  <div className="frp-form-group">
                    <label className="frp-label">Rekening Bank Tujuan</label>
                    <input name="rekBankTujuan" className="frp-input" value={values.rekBankTujuan || ''} onChange={e => updateField('rekBankTujuan', e.target.value)} />
                  </div>
                </div>
                <div className="frp-form-group" style={{ marginTop: "1rem" }}>
                  <label className="frp-label">Attach Link</label>
                  <input name="attachLink" className="frp-input" value={values.attachLink} onChange={e => updateField('attachLink', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }}></div>

            {/* Checklist Documents Section */}
            <div>
              <h3 className="frp-section-title">
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>checklist</span>
                Checklist Documents
              </h3>
              <div className="frp-check-row">
                {CHECK_DOCS.map(doc => {
                  const checked = values.checkDocs.includes(doc)
                  return (
                    <div
                      key={doc}
                      className={`frp-check-item ${checked ? 'frp-check-item-active' : ''}`}
                      onClick={() => handleCheckDocToggle(doc)}
                    >
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>
                        {checked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <input type="checkbox" name="checkDocs[]" value={doc} checked={checked} onChange={() => { }} style={{ display: 'none' }} />
                      {doc}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }}></div>

            {/* Line Items Section */}
            <DataTableItemsFrp
              items={values.items}
              isMobile={isMobile}
              budgetSelectOptions={budgetSelectOptions}
              updateItem={updateItem}
              handleAddRow={handleAddRow}
              handleRemoveRow={handleRemoveRow}
              getBudgetAmount={getBudgetAmount}
              totalAmount={totalAmount}
              calculateRowAmount={calculateRowAmount}
              budgets={frpData?.budgets || []}
              kurs={values.kurs}
            />

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }}></div>

            {submitError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <button type="button" className="frp-btn-secondary" onClick={() => setValues(buildInitialForm(FRP, searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'))} disabled={submitting}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>refresh</span>
                Reset
              </button>
              <button type="submit" className="frp-btn-primary" style={{ opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                {submitting ? 'Menyimpan...' : 'Submit ke Approval'}
              </button>
            </div>
          </div>
        </form>
      )}
    </main>
  )
}
