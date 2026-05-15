const { useState, useMemo, useEffect } = React
const {
  Box,
  Button,
  Container,
  CssBaseline,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
} = MaterialUI

const {
  Header: TemplateHeader,
  Sidebar: TemplateSidebar,
  BackgroundMain: TemplateBackgroundMain,
} = window.FRPTemplateComponents || {}
const today = new Date().toISOString().split('T')[0]

const normalizeNumber = (value) => {
  const number = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(number) ? 0 : number
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID').format(normalizeNumber(value))
}

const buildDepartments = (employees) => {
  return [...new Set((employees || []).map((e) => e.class || '').filter(Boolean))].sort()
}

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
}

const buildInitialForm = (data) => {
  const base = {
    ...blankForm,
    companyName: data.selectedCompany || '',
    divisi: data.selectedDivision || '',
    dimintaOleh: data.user?.fullName || '',
    id: data.editData?.id || '',
  }

  if (!data.editData) return base

  return {
    ...base,
    ...data.editData,
    tanggalFrp: data.editData.tanggalFrp || today,
    paymentDate: data.editData.paymentDate || today,
    checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs,
    items: Array.isArray(data.editData.items)
      ? data.editData.items.map((item) => ({
          memo: item.memo || '',
          budgetId: item.budgetId || '',
          qty: String(item.qty || '1'),
          hargaSatuan: String(item.hargaSatuan || item.harga || '0'),
        }))
      : getDefaultItems(),
  }
}

function FRPForm() {
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/form-data${window.location.search}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setFrpData(data)
        setValues(buildInitialForm(data))
      } catch (err) {
        setError(err.message || 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const FRP = frpData || {}

  const departments = useMemo(() => buildDepartments(FRP.employees || []), [FRP.employees])

  const filteredEmployees = useMemo(() => {
    if (FRP.user?.role !== 'administrator') {
      return [{ fullName: FRP.user?.fullName || '' }]
    }
    return (FRP.employees || []).filter((employee) => {
      const companyMatch = !values.companyName || employee.companies?.some((c) => c.name === values.companyName)
      const divisionMatch = !values.divisi || employee.class === values.divisi
      return companyMatch && divisionMatch
    })
  }, [values.companyName, values.divisi, FRP.employees])

  const budgetOptions = useMemo(() => {
    return (FRP.budgets || []).filter((budget) => {
      const targetCompany = (budget.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
      const selectedCompany = (values.companyName || '').trim().toUpperCase()
      const targetDept = (budget.department || '').trim().toLowerCase()
      const selectedDept = (values.divisi || '').trim().toLowerCase()
      const companyMatches = !selectedCompany || targetCompany === selectedCompany
      const deptMatches = !selectedDept || targetDept === selectedDept
      return companyMatches && deptMatches
    })
  }, [values.companyName, values.divisi, FRP.budgets])

  const calculateRowAmount = (item) => {
    const qty = normalizeNumber(item.qty)
    const harga = normalizeNumber(item.hargaSatuan)
    const kurs = normalizeNumber(values.kurs) || 1
    return qty * harga * kurs
  }

  const totalAmount = useMemo(
    () => values.items.reduce((sum, item) => sum + calculateRowAmount(item), 0),
    [values.items, values.kurs],
  )

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">Memuat data...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error">
          Error: {error}
        </Typography>
      </Box>
    )
  }

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const updateItem = (index, field, value) => {
    setValues((prev) => {
      const items = prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
      return { ...prev, items }
    })
  }

  const handleAddRow = () => {
    setValues((prev) => ({ ...prev, items: [...prev.items, { memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }] }))
  }

  const handleRemoveRow = (index) => {
    setValues((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))
  }

  const handleCheckDocToggle = (doc) => {
    setValues((prev) => {
      const next = prev.checkDocs.includes(doc)
        ? prev.checkDocs.filter((value) => value !== doc)
        : [...prev.checkDocs, doc]
      return { ...prev, checkDocs: next }
    })
  }

  const visibleCompanyField = FRP.user?.role === 'administrator'

  return (
    <>
      <TemplateBackgroundMain />
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <TemplateSidebar
          collapsed={sidebarCollapsed}
          userName={FRP.user?.fullName || 'User'}
          userRole={FRP.user?.selectedJobLevel || FRP.user?.role || 'Administrator'}
          onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        />
        <div className="dashboard-stage">
          <TemplateHeader title="Form Request Payment" subtitle="FRP System" />
          <main className="dashboard-main">
            <Container maxWidth="lg">
              <CssBaseline />
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                  Form Request Payment
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Buat permintaan pembayaran dengan tampilan React + MUI.
                </Typography>
                <Box component="form" id="frpForm" method="POST" action="/generate-pdf" noValidate>
                  {values.id && <input type="hidden" name="frpId" value={values.id} />}
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>
                      Informasi FRP
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        {visibleCompanyField ? (
                          <FormControl fullWidth>
                            <InputLabel>Company Name</InputLabel>
                            <Select
                              name="companyName"
                              value={values.companyName}
                              label="Company Name"
                              onChange={(event) => updateField('companyName', event.target.value)}
                            >
                              <MenuItem value="">Pilih Company</MenuItem>
                              {(FRP.companies || []).map((company) => (
                                <MenuItem key={company.name} value={company.name}>
                                  {company.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField fullWidth label="Company Name" name="companyName" value={values.companyName} InputProps={{ readOnly: true }} variant="outlined" />
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Tanggal FRP"
                          type="date"
                          name="tanggalFrp"
                          value={values.tanggalFrp}
                          onChange={(event) => updateField('tanggalFrp', event.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Divisi</InputLabel>
                          <Select
                            name="divisi"
                            value={values.divisi}
                            label="Divisi"
                            onChange={(event) => updateField('divisi', event.target.value)}
                          >
                            <MenuItem value="">Pilih Divisi</MenuItem>
                            {departments.map((dept) => (
                              <MenuItem key={dept} value={dept}>
                                {dept}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Diminta Oleh</InputLabel>
                          <Select
                            name="dimintaOleh"
                            value={values.dimintaOleh}
                            label="Diminta Oleh"
                            onChange={(event) => updateField('dimintaOleh', event.target.value)}
                          >
                            <MenuItem value="">Pilih Karyawan</MenuItem>
                            {filteredEmployees.map((employee) => (
                              <MenuItem key={employee.fullName} value={employee.fullName}>
                                {employee.fullName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Currency</InputLabel>
                          <Select
                            name="currency"
                            value={values.currency}
                            label="Currency"
                            onChange={(event) => updateField('currency', event.target.value)}
                          >
                            <MenuItem value="IDR">IDR - Indonesian Rupiah</MenuItem>
                            <MenuItem value="USD">USD - US Dollar</MenuItem>
                            <MenuItem value="CNY">CNY - Chinese Yuan</MenuItem>
                            <MenuItem value="EUR">EUR - Euro</MenuItem>
                            <MenuItem value="SGD">SGD - Singapore Dollar</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {values.currency !== 'IDR' && (
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            type="text"
                            label="Exchange Rate (Kurs)"
                            name="kurs"
                            value={values.kurs}
                            onChange={(event) => updateField('kurs', event.target.value)}
                          />
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Keterangan FRP"
                          name="keteranganFrp"
                          value={values.keteranganFrp}
                          onChange={(event) => updateField('keteranganFrp', event.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>
                      Vendor & Pembayaran
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Vendor"
                          name="vendor"
                          value={values.vendor}
                          onChange={(event) => updateField('vendor', event.target.value)}
                          list="vendorList"
                          placeholder="Ketik atau pilih vendor"
                        />
                        <datalist id="vendorList">
                          {(FRP.vendors || []).map((vendor) => (
                            <option key={vendor.name} value={vendor.name} />
                          ))}
                        </datalist>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Internal PO Number"
                          name="internalPoNumber"
                          value={values.internalPoNumber}
                          onChange={(event) => updateField('internalPoNumber', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Ext Doc Type</InputLabel>
                          <Select
                            name="extDocType"
                            value={values.extDocType}
                            label="Ext Doc Type"
                            onChange={(event) => updateField('extDocType', event.target.value)}
                          >
                            <MenuItem value="">Pilih</MenuItem>
                            <MenuItem value="invoice">Invoice</MenuItem>
                            <MenuItem value="kontrak">Kontrak</MenuItem>
                            <MenuItem value="kwitansi">Kwitansi</MenuItem>
                            <MenuItem value="nota">Nota</MenuItem>
                            <MenuItem value="other">Lainnya</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Ext Doc Number"
                          name="extDocNumber"
                          value={values.extDocNumber}
                          onChange={(event) => updateField('extDocNumber', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Payment Method</InputLabel>
                          <Select
                            name="paymentMethod"
                            value={values.paymentMethod}
                            label="Payment Method"
                            onChange={(event) => updateField('paymentMethod', event.target.value)}
                          >
                            <MenuItem value="">Pilih</MenuItem>
                            <MenuItem value="Transfer">Transfer</MenuItem>
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="Giro">Giro</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Payment Date"
                          type="date"
                          name="paymentDate"
                          value={values.paymentDate}
                          InputLabelProps={{ shrink: true }}
                          onChange={(event) => updateField('paymentDate', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Bank Tujuan"
                          name="bankTujuan"
                          value={values.bankTujuan || ''}
                          onChange={(event) => updateField('bankTujuan', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Rekening Bank Tujuan"
                          name="rekBankTujuan"
                          value={values.rekBankTujuan || ''}
                          onChange={(event) => updateField('rekBankTujuan', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Attach Link (Dokumen Pendukung)"
                          name="attachLink"
                          value={values.attachLink}
                          onChange={(event) => updateField('attachLink', event.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>
                      Checklist Documents
                    </Typography>
                    <FormGroup>
                      {['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order'].map((doc) => (
                        <FormControlLabel
                          key={doc}
                          control={
                            <Checkbox
                              name="checkDocs[]"
                              checked={values.checkDocs.includes(doc)}
                              onChange={() => handleCheckDocToggle(doc)}
                              value={doc}
                            />
                          }
                          label={doc}
                        />
                      ))}
                    </FormGroup>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>
                      Line Items
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Memo</TableCell>
                            <TableCell>Budget</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Harga Satuan</TableCell>
                            <TableCell>Amount (IDR)</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {values.items.map((item, idx) => {
                            const amount = calculateRowAmount(item)
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <TextField
                                    fullWidth
                                    name={`items[${idx}][memo]`}
                                    value={item.memo}
                                    onChange={(event) => updateItem(idx, 'memo', event.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormControl fullWidth>
                                    <InputLabel>Budget</InputLabel>
                                    <Select
                                      name={`items[${idx}][budgetId]`}
                                      value={item.budgetId}
                                      label="Budget"
                                      onChange={(event) => updateItem(idx, 'budgetId', event.target.value)}
                                    >
                                      <MenuItem value="">Pilih Budget</MenuItem>
                                      {budgetOptions.map((budget) => (
                                        <MenuItem key={budget.id} value={budget.id}>
                                          {budget.id} — {budget.description}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    name={`items[${idx}][qty]`}
                                    value={item.qty}
                                    onChange={(event) => updateItem(idx, 'qty', event.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    name={`items[${idx}][hargaSatuan]`}
                                    value={item.hargaSatuan}
                                    onChange={(event) => updateItem(idx, 'hargaSatuan', event.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    fullWidth
                                    name={`items[${idx}][amount]`}
                                    value={formatCurrency(amount)}
                                    InputProps={{ readOnly: true }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button color="error" onClick={() => handleRemoveRow(idx)}>
                                    Hapus
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Button variant="contained" onClick={handleAddRow}>
                        Tambah Baris
                      </Button>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Total: Rp {formatCurrency(totalAmount)}
                      </Typography>
                    </Box>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button type="reset" variant="outlined" onClick={() => setValues(buildInitialForm(FRP))}>
                      Reset
                    </Button>
                    <Button type="submit" variant="contained" color="primary">
                      Save & Submit
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Container>
          </main>
        </div>
      </div>
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('reactFormRoot'))
root.render(<FRPForm />)
