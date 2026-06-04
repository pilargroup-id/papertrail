import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import SearchableSelect from '../../components/template/SearchableSelect.jsx'
import DataTableItemsFrp from '../../components/table/DataTableItemsFrp.jsx'
import ButtonAddItemsFrp from '../../components/button/ButtonAddItemsFrp.jsx'
import { frpService } from '../../services/frp/new-frp'
import DialogValidationNewFRP from '../../components/Dialog/DialogValidationNewFRP.jsx'
import '../../styles/frp/new-frp.css';

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100
const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

const formatCurrency = v => new Intl.NumberFormat('en-US').format(normalizeNumber(v))

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
  (departments || [])
    .filter(d => !companyName || normalizeCompany(d.company) === normalizeCompany(companyName))
    .map((d, i) => ({
      originalIndex: d.originalIndex !== undefined ? d.originalIndex : (d.id !== undefined ? d.id : i),
      name: d.name || '',
      class: d.class || '',
      label: d.class ? `${d.name} - ${d.class}` : (d.name || ''),
      company: d.company || ''
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

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
  attachFile: null,
  keteranganFrp: '',
  checkDocs: ['Form Request Payment'],
  items: getDefaultItems(),
  id: '',
  rpReference: '',
  fromRpId: '',
}

const buildInitialForm = (data, isDuplicate = false) => {
  let initialCompany = data.selectedCompany || data.user?.selectedCompany || data.user?.companyName || data.user?.company || '';
  if (data.companies && initialCompany) {
    const searchCompany = normalizeCompany(initialCompany);
    const comp = data.companies.find(c => String(c.id) === String(initialCompany) || normalizeCompany(c.code) === searchCompany || normalizeCompany(c.name) === searchCompany);
    if (comp) initialCompany = comp.name;
  }

  const base = {
    ...blankForm,
    companyName: initialCompany,
    dimintaOleh: data.user?.fullName || '',
    id: isDuplicate ? '' : (data.editData?.id || ''),
  }

  let initialDivisi = '';
  if (data.departments && data.departments.length > 0) {
    const userDiv = normalizeCompany(data.selectedDivision || '');
    const matched = data.departments.find(d => normalizeCompany(d.class) === userDiv || normalizeCompany(d.name) === userDiv);
    if (matched) initialDivisi = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
  } else {
    initialDivisi = data.selectedDivision || '';
  }
  base.divisi = initialDivisi;

  if (!data.editData) return base

  let editDivisi = base.divisi;
  if (data.departments && data.departments.length > 0) {
    const dName = normalizeCompany(data.editData.departmentName || data.editData.department_name || '');
    const dClass = normalizeCompany(data.editData.departmentClass || data.editData.department_class || '');
    const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
    if (matched) editDivisi = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
    else if (data.editData.department_id) editDivisi = data.editData.department_id;
  } else {
    editDivisi = data.editData.departmentName || data.editData.department_name || base.divisi;
  }

  return {
    ...base,
    ...data.editData,
    divisi: editDivisi,
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

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

              const dName = normalizeCompany(rp.departmentName || rp.divisi || '');
              const dClass = normalizeCompany(rp.departmentClass || '');
              let editDiv = initial.divisi;
              if (data.departments && data.departments.length > 0) {
                 const matched = data.departments.find(d => normalizeCompany(d.name) === dName && (!dClass || normalizeCompany(d.class) === dClass));
                 if (matched) editDiv = matched.originalIndex !== undefined ? matched.originalIndex : matched.id;
                 else if (rp.departmentId) editDiv = rp.departmentId;
              } else {
                 editDiv = rp.departmentName || rp.divisi || initial.divisi;
              }

              setValues({
                ...initial,
                companyName: rp.companyName || initial.companyName,
                divisi: editDiv,
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
      : (FRP.divisionList || buildDepartments(FRP.employees || [], values.companyName)).map((d, i) => ({ originalIndex: d, name: d, class: d, label: d, company: '' }))),
    [FRP.departments, FRP.divisionList, FRP.employees, values.companyName],
  )

  const divisionSelectOptions = useMemo(
    () => departments.map(d => ({ value: d.originalIndex, label: d.label })),
    [departments],
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
    const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
    const targetDivision = normalizeCompany(selectedDept ? selectedDept.name : values.divisi);
    const targetClass = normalizeCompany(selectedDept ? selectedDept.class : '');

    return sourceEmployees.filter(e => {
      const assignments = getEmployeeAssignments(e);
      if (!targetCompany && !targetDivision && !targetClass) return true;
      return assignments.some(a => {
        const matchCompany = !targetCompany ||
          normalizeCompany(a.name) === targetCompany ||
          normalizeCompany(a.code) === targetCompany ||
          normalizeCompany(a.companyCode) === targetCompany;

        const matchDivision = !targetDivision ||
          normalizeCompany(a.class) === targetDivision ||
          normalizeCompany(a.deptName) === targetDivision;

        const matchClass = !targetClass || normalizeCompany(a.class) === targetClass;

        return matchCompany && matchDivision && matchClass;
      });
    });
  }, [values.companyName, values.divisi, departments, FRP.employees, FRP.departmentEmployees, FRP.user?.fullName, FRP.user?.role, FRP.user?.selectedCompany, FRP.user?.selectedDivision])

  const budgetOptions = useMemo(
    () => {
      const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));
      const sd = selectedDept ? String(selectedDept.name || '').trim().toUpperCase() : String(values.divisi || '').trim().toUpperCase();
      const sk = selectedDept ? String(selectedDept.class || '').trim().toUpperCase() : '';
      const sc = String(values.companyName || '').trim().toUpperCase();

      return (FRP.budgets || []).filter(b => {
        const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
        const matchCompany = !sc || tc === sc

        if (!matchCompany) return false

        // Divisi tertentu (HCGA, IT, Marketing, Product) memiliki akses ke seluruh budget
        const fullAccessDivisions = ['HCGA', 'IT', 'MARKETING', 'PRODUCT']
        if (fullAccessDivisions.includes(sd) || fullAccessDivisions.includes(sk)) {
          return true
        }

        if (sd || sk) {
          const matchedDepts = (FRP.departments || []).filter(d => {
            const matchName = (d.name || '').trim().toUpperCase() === sd || (d.class || '').trim().toUpperCase() === sd
            const matchClass = !sk || (d.class || '').trim().toUpperCase() === sk
            const matchDeptCompany = !sc || (d.company || '').trim().toUpperCase() === sc
            return matchName && matchClass && matchDeptCompany
          })

          if (matchedDepts.length > 0) {
            const deptIds = matchedDepts.map(d => String(d.id))
            const bDeptId = String(b.department_id !== undefined ? b.department_id : (b.departmentId || ''))
            return deptIds.includes(bDeptId)
          } else {
            const bDeptName = (b.department || '').trim().toUpperCase()
            const bClass = (b.class || '').trim().toUpperCase()
            return bDeptName === sd || bClass === sd || (sk && (bDeptName === sk || bClass === sk))
          }
        }

        return true
      })
    },
    [values.companyName, values.divisi, departments, FRP.budgets, FRP.departments],
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

  const handlePreSubmit = async e => {
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

      setIsConfirmOpen(true)
    } catch (err) {
      setSubmitError(err.message || 'Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const processSubmit = async () => {
    setSubmitting(true)
    try {
      const selectedDept = departments.find(d => String(d.originalIndex) === String(values.divisi));

      const payload = {
        frpId: values.id || undefined,
        fromRpId: values.fromRpId || undefined,
        
        companyName: values.companyName,
        divisi: selectedDept ? selectedDept.name : values.divisi,
        kelas: selectedDept ? selectedDept.class : '',
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
        if (values.attachFile) {
          try {
            await frpService.uploadAttachment(d.id, values.attachFile)
          } catch (uploadErr) {
            console.error('Failed to upload attachment:', uploadErr)
          }
        }
        navigate('/approval')
      } else {
        setSubmitError(d.error || 'Gagal menyimpan, coba lagi.')
      }
    } catch (err) {
      setSubmitError(err.message || 'Koneksi gagal, coba lagi.')
    } finally {
      setSubmitting(false)
      setIsConfirmOpen(false)
    }
  }

  return (
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
        <form id="frpForm" onSubmit={handlePreSubmit} className="frp-shell">
          {values.id && <input type="hidden" name="frpId" value={values.id} />}

          {values.rpReference && (
            <div className="frp-ref-banner">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>info</span>
              Membuat FRP dari referensi Request Purchase No: <strong>{values.rpReference}</strong>
            </div>
          )}

          <div className="frp-top-panel">
            {/* Informasi FRP */}
            <div className="frp-card">
              <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>info</span>
                Informasi FRP
              </h3>
              <div className="frp-grid-2">
                <FloatingGroup label="Company Name">
                  {visibleCompanyField ? (
                    <SearchableSelect
                      name="companyName"
                      value={values.companyName}
                      onChange={selectedValue => updateField('companyName', selectedValue)}
                      options={companySelectOptions}
                      placeholder="Select company..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  ) : (
                    <input className="frp-input-readonly" value={values.companyName} readOnly />
                  )}
                </FloatingGroup>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <FloatingGroup label="Currency" style={{ flex: 1, minWidth: 0 }}>
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
                              updateField('kurs', '1')
                              console.error('API Error:', data.error)
                            }
                          } catch (e) {
                            updateField('kurs', '1')
                            console.error('Gagal mengambil kurs:', e)
                          }
                        }
                      }}
                      options={currencySelectOptions}
                      placeholder="Select currency..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  </FloatingGroup>
                  <FloatingGroup label="Rate" style={{ width: '120px', flexShrink: 0 }}>
                    <input
                      name="kurs"
                      className="frp-input"
                      placeholder="0"
                      style={{ width: '100%', background: values.currency === 'IDR' ? '#f8fafc' : undefined, color: values.currency === 'IDR' ? '#94a3b8' : undefined }}
                      value={values.kurs}
                      onChange={e => updateField('kurs', e.target.value)}
                      readOnly={values.currency === 'IDR'}
                    />
                  </FloatingGroup>
                </div>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px", gridTemplateColumns: (!isMobile && !isTablet) ? 'minmax(0, 1.8fr) minmax(0, 1.2fr) 170px' : undefined }}>
                <FloatingGroup label="Division & Class">
                  {FRP.user?.role === 'administrator' ? (
                    <SearchableSelect
                      name="divisi"
                      value={values.divisi}
                      onChange={selectedValue => updateField('divisi', selectedValue)}
                      options={divisionSelectOptions}
                      placeholder="Select divisi..."
                      className="frp-select"
                      menuPosition="fixed"
                    />
                  ) : (
                    <input className="frp-input-readonly" value={departments.find(d => String(d.originalIndex) === String(values.divisi))?.label || values.divisi} readOnly />
                  )}
                </FloatingGroup>
                <FloatingGroup label="Request by">
                  <input className="frp-input-readonly" value={values.dimintaOleh} readOnly />
                </FloatingGroup>
                <FloatingGroup label="FRP Date">
                  <DateField name="tanggalFrp" value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} />
                </FloatingGroup>
              </div>
              <FloatingGroup label="Description" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <textarea
                  name="keteranganFrp"
                  className="frp-textarea"
                  value={values.keteranganFrp}
                  onChange={e => updateField('keteranganFrp', e.target.value)}
                  placeholder="Write a description..."
                  style={{ height: '100%' }}
                />
              </FloatingGroup>
            </div>

            {/* Vendor & Pembayaran */}
            <div className="frp-card">
              <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
                <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>store</span>
                Vendor &amp; Pembayaran
              </h3>
              <div className="frp-grid-2">
                <FloatingGroup label="Vendor">
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
                    placeholder="Select vendor..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
                <FloatingGroup label="Internal PO Number">
                  <input name="internalPoNumber" className="frp-input" placeholder="Internal PO Number..." value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} />
                </FloatingGroup>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px" }}>
                <FloatingGroup label="Ext Doc Type">
                  <SearchableSelect
                    name="extDocType"
                    value={values.extDocType}
                    onChange={selectedValue => updateField('extDocType', selectedValue)}
                    options={extDocTypeOptions}
                    placeholder="Select tipe..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
                <FloatingGroup label="Ext Doc Number">
                  <input name="extDocNumber" className="frp-input" placeholder="Document Number..." value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="Payment Method">
                  <SearchableSelect
                    name="paymentMethod"
                    value={values.paymentMethod}
                    onChange={selectedValue => updateField('paymentMethod', selectedValue)}
                    options={paymentMethodOptions}
                    placeholder="Pilih metode..."
                    className="frp-select"
                    menuPosition="fixed"
                  />
                </FloatingGroup>
              </div>
              <div className="frp-grid-3" style={{ marginTop: "20px" }}>
                <FloatingGroup label="Payment Date">
                  <DateField name="paymentDate" value={values.paymentDate} onChange={e => updateField('paymentDate', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="destination bank">
                  <input name="bankTujuan" className="frp-input" placeholder="Bank Name..." value={values.bankTujuan || ''} onChange={e => updateField('bankTujuan', e.target.value)} />
                </FloatingGroup>
                <FloatingGroup label="Rekening Bank Tujuan">
                  <input name="rekBankTujuan" className="frp-input" placeholder="account number..." value={values.rekBankTujuan || ''} onChange={e => updateField('rekBankTujuan', e.target.value)} />
                </FloatingGroup>
              </div>
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachment</label>
                <div 
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: values.attachFile ? 'space-between' : 'center',
                    gap: '12px'
                  }}
                  onClick={() => document.getElementById('frp-file-upload').click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      updateField('attachFile', e.dataTransfer.files[0]);
                    }
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#94a3b8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <input 
                    id="frp-file-upload"
                    type="file" 
                    name="attachFile" 
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        updateField('attachFile', e.target.files[0])
                      }
                    }} 
                  />
                  {values.attachFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <span className="material-icons-round" style={{ fontSize: '28px', color: '#10b981' }}>description</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{values.attachFile.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{(values.attachFile.size / 1024).toFixed(2)} KB</span>
                      </div>
                      <button 
                        type="button" 
                        className="frp-btn-del"
                        onClick={(e) => { e.stopPropagation(); updateField('attachFile', null); document.getElementById('frp-file-upload').value = ''; }}
                        style={{ flexShrink: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Hapus File"
                      >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-icons-round" style={{ fontSize: '28px', color: '#94a3b8' }}>cloud_upload</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                          <span style={{ color: '#2563eb', fontWeight: '600' }}>Klik untuk upload</span> atau drag & drop
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Maks. 10MB (Dokumen/Gambar)</span>
                      </div>
                    </div>
                  )}
                </div>
                {values.attachLink && typeof values.attachLink === 'string' && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: '#2563eb' }}>attachment</span>
                    <a href={`/api/frp/${values.id}/attachment`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                      Lihat Attachment Tersimpan
                    </a>
                  </div>
                )}
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
                  <div className="frp-check-row">
                    {CHECK_DOCS.map(doc => {
                      const checked = values.checkDocs.includes(doc)
                      return (
                        <div
                          key={doc}
                          className={`frp-check-item ${checked ? 'frp-check-item-active' : ''}`}
                          onClick={() => handleCheckDocToggle(doc)}
                        >
                          <span className="material-icons-round" style={{ fontSize: '14px' }}>
                            {checked ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <input type="checkbox" name="checkDocs[]" value={doc} checked={checked} onChange={() => { }} style={{ display: 'none' }} />
                          {doc}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ButtonAddItemsFrp onClick={handleAddRow} value="Add Item" />
                </div>
              </div>
              
              <div className="frp-items-scrollable">
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
                  currency={values.currency}
                />
              </div>

              {submitError && (
                <div className="frp-error-banner" style={{ marginTop: '10px' }}>
                  {submitError}
                </div>
              )}

              <div className="frp-footer" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '10px', marginBottom: isMobile ? '10px' : 0 }}>
                  <span className="frp-total-label" style={{ fontSize: '0.85rem', margin: 0 }}>Total Payment:</span>
                  <div className="frp-total-value" style={{ fontSize: '1.2rem', margin: 0 }}>Rp {formatCurrency(totalAmount)}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                  <button type="button" className="frp-btn-secondary" onClick={() => setValues(buildInitialForm(FRP, searchParams.get('duplicate') === '1' || searchParams.get('duplicate') === 'true'))} disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>
                    Reset
                  </button>
                  <button type="submit" className="frp-btn-primary" disabled={submitting} style={isMobile ? { width: '100%' } : {}}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>{submitting ? 'hourglass_empty' : 'send'}</span>
                    {submitting ? 'Menyimpan...' : 'Submit ke Approval'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <DialogValidationNewFRP
        isOpen={isConfirmOpen}
        isLoading={submitting}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={processSubmit}
        frpNo={values.frpNo || values.id}
        dimintaOleh={values.dimintaOleh || FRP.user?.fullName}
      />
    </main>
  )
}
