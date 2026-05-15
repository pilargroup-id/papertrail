import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Button, Container, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Checkbox } from '@mui/material'
import BackgroundMain from '../components/BackgroundMain'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const today = new Date().toISOString().split('T')[0]

const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))

const getEmployeeAssignments = e => {
  if (Array.isArray(e?.companies) && e.companies.length > 0) return e.companies
  if (e?.class) return [{ name: e.company || '', class: e.class, jobLevel: e.jobLevel || '' }]
  return []
}

const buildDepartments = (employees, companyName) =>
  [...new Set((employees || []).flatMap(e => getEmployeeAssignments(e)).filter(a => !companyName || a.name === companyName).map(a => a.class || '').filter(Boolean))].sort()

const getDefaultItems = () => [{ memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }]

const blankForm = { companyName: '', tanggalFrp: today, divisi: '', dimintaOleh: '', currency: 'IDR', kurs: '1', vendor: '', internalPoNumber: '', extDocType: '', extDocNumber: '', paymentMethod: 'Transfer', paymentDate: today, attachLink: '', keteranganFrp: '', checkDocs: ['Form Request Payment'], items: getDefaultItems(), id: '' }

const buildInitialForm = data => {
  const base = { ...blankForm, companyName: data.selectedCompany || '', divisi: data.selectedDivision || '', dimintaOleh: data.user?.fullName || '', id: data.editData?.id || '' }
  if (!data.editData) return base
  return { ...base, ...data.editData, tanggalFrp: data.editData.tanggalFrp || today, paymentDate: data.editData.paymentDate || today, checkDocs: Array.isArray(data.editData.checkDocs) ? data.editData.checkDocs : base.checkDocs, items: Array.isArray(data.editData.items) ? data.editData.items.map(i => ({ memo: i.memo || '', budgetId: i.budgetId || '', qty: String(i.qty || '1'), hargaSatuan: String(i.hargaSatuan || i.harga || '0') })) : getDefaultItems() }
}

export default function FormPage() {
  const [searchParams] = useSearchParams()
  const [frpData, setFrpData] = useState(null)
  const [values, setValues] = useState(blankForm)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    fetch(`/api/form-data${query}`)
      .then(r => { if (!r.ok) { window.location.href = '/login'; throw new Error(`HTTP ${r.status}`) } return r.json() })
      .then(data => { setFrpData(data); setValues(buildInitialForm(data)) })
      .catch(err => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }, [])

  const FRP = frpData || {}

  const departments = useMemo(() => buildDepartments(FRP.employees || [], values.companyName), [FRP.employees, values.companyName])

  const filteredEmployees = useMemo(() => {
    if (FRP.user?.role !== 'administrator') return [{ fullName: FRP.user?.fullName || '' }]
    return (FRP.employees || []).filter(e => {
      const assignments = getEmployeeAssignments(e)
      if (!values.companyName && !values.divisi) return true
      return assignments.some(a => (!values.companyName || a.name === values.companyName) && (!values.divisi || a.class === values.divisi))
    })
  }, [values.companyName, values.divisi, FRP.employees])

  const budgetOptions = useMemo(() => (FRP.budgets || []).filter(b => {
    const tc = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase()
    const sc = (values.companyName || '').trim().toUpperCase()
    const td = (b.department || '').trim().toLowerCase()
    const sd = (values.divisi || '').trim().toLowerCase()
    return (!sc || tc === sc) && (!sd || td === sd)
  }), [values.companyName, values.divisi, FRP.budgets])

  const calculateRowAmount = item => normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(values.kurs) || 1)

  const totalAmount = useMemo(() => values.items.reduce((sum, item) => sum + calculateRowAmount(item), 0), [values.items, values.kurs])

  if (loading) return (<><BackgroundMain /><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Typography>Memuat data...</Typography></Box></>)
  if (error) return (<><BackgroundMain /><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Typography color="error">Error: {error}</Typography></Box></>)

  const updateField = (field, value) => setValues(prev => ({ ...prev, [field]: value }))
  const updateItem = (index, field, value) => setValues(prev => ({ ...prev, items: prev.items.map((item, idx) => idx === index ? { ...item, [field]: value } : item) }))
  const handleAddRow = () => setValues(prev => ({ ...prev, items: [...prev.items, { memo: '', budgetId: '', qty: '1', hargaSatuan: '0' }] }))
  const handleRemoveRow = index => setValues(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))
  const handleCheckDocToggle = doc => setValues(prev => ({ ...prev, checkDocs: prev.checkDocs.includes(doc) ? prev.checkDocs.filter(d => d !== doc) : [...prev.checkDocs, doc] }))
  const visibleCompanyField = FRP.user?.role === 'administrator'

  return (
    <>
      <BackgroundMain />
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar collapsed={sidebarCollapsed} userName={FRP.user?.fullName} userRole={FRP.user?.selectedJobLevel || FRP.user?.role} userIsAdmin={FRP.user?.role === 'administrator'} allAssignments={FRP.user?.allAssignments || []} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
        <div className="dashboard-stage">
          <Header title="Form Request Payment" />
          <main className="dashboard-main">
            <Container maxWidth="lg">
              <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom fontWeight={700}>Form Request Payment</Typography>
                <Box component="form" id="frpForm" method="POST" action="/generate-pdf" noValidate>
                  {values.id && <input type="hidden" name="frpId" value={values.id} />}

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>Informasi FRP</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        {visibleCompanyField ? (
                          <FormControl fullWidth>
                            <InputLabel>Company Name</InputLabel>
                            <Select name="companyName" value={values.companyName} label="Company Name" onChange={e => updateField('companyName', e.target.value)}>
                              <MenuItem value="">Pilih Company</MenuItem>
                              {(FRP.companies || []).map(c => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : <TextField fullWidth label="Company Name" name="companyName" value={values.companyName} InputProps={{ readOnly: true }} />}
                      </Grid>
                      <Grid item xs={12} md={6}><TextField fullWidth label="Tanggal FRP" type="date" name="tanggalFrp" value={values.tanggalFrp} onChange={e => updateField('tanggalFrp', e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth><InputLabel>Divisi</InputLabel>
                          <Select name="divisi" value={values.divisi} label="Divisi" onChange={e => updateField('divisi', e.target.value)}>
                            <MenuItem value="">Pilih Divisi</MenuItem>
                            {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth><InputLabel>Diminta Oleh</InputLabel>
                          <Select name="dimintaOleh" value={values.dimintaOleh} label="Diminta Oleh" onChange={e => updateField('dimintaOleh', e.target.value)}>
                            <MenuItem value="">Pilih Karyawan</MenuItem>
                            {filteredEmployees.map(e => <MenuItem key={e.fullName} value={e.fullName}>{e.fullName}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth><InputLabel>Currency</InputLabel>
                          <Select name="currency" value={values.currency} label="Currency" onChange={e => updateField('currency', e.target.value)}>
                            <MenuItem value="IDR">IDR</MenuItem><MenuItem value="USD">USD</MenuItem><MenuItem value="CNY">CNY</MenuItem><MenuItem value="EUR">EUR</MenuItem><MenuItem value="SGD">SGD</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {values.currency !== 'IDR' && <Grid item xs={12} md={4}><TextField fullWidth label="Kurs" name="kurs" value={values.kurs} onChange={e => updateField('kurs', e.target.value)} /></Grid>}
                      <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Keterangan FRP" name="keteranganFrp" value={values.keteranganFrp} onChange={e => updateField('keteranganFrp', e.target.value)} /></Grid>
                    </Grid>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>Vendor &amp; Pembayaran</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Vendor" name="vendor" value={values.vendor} onChange={e => updateField('vendor', e.target.value)} list="vendorList" placeholder="Ketik atau pilih vendor" />
                        <datalist id="vendorList">{(FRP.vendors || []).map(v => <option key={v.name} value={v.name} />)}</datalist>
                      </Grid>
                      <Grid item xs={12} md={6}><TextField fullWidth label="Internal PO Number" name="internalPoNumber" value={values.internalPoNumber} onChange={e => updateField('internalPoNumber', e.target.value)} /></Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth><InputLabel>Ext Doc Type</InputLabel>
                          <Select name="extDocType" value={values.extDocType} label="Ext Doc Type" onChange={e => updateField('extDocType', e.target.value)}>
                            <MenuItem value="">Pilih</MenuItem><MenuItem value="invoice">Invoice</MenuItem><MenuItem value="kontrak">Kontrak</MenuItem><MenuItem value="kwitansi">Kwitansi</MenuItem><MenuItem value="nota">Nota</MenuItem><MenuItem value="other">Lainnya</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}><TextField fullWidth label="Ext Doc Number" name="extDocNumber" value={values.extDocNumber} onChange={e => updateField('extDocNumber', e.target.value)} /></Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth><InputLabel>Payment Method</InputLabel>
                          <Select name="paymentMethod" value={values.paymentMethod} label="Payment Method" onChange={e => updateField('paymentMethod', e.target.value)}>
                            <MenuItem value="Transfer">Transfer</MenuItem><MenuItem value="Cash">Cash</MenuItem><MenuItem value="Giro">Giro</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}><TextField fullWidth label="Payment Date" type="date" name="paymentDate" value={values.paymentDate} InputLabelProps={{ shrink: true }} onChange={e => updateField('paymentDate', e.target.value)} /></Grid>
                      <Grid item xs={12} md={4}><TextField fullWidth label="Bank Tujuan" name="bankTujuan" value={values.bankTujuan || ''} onChange={e => updateField('bankTujuan', e.target.value)} /></Grid>
                      <Grid item xs={12} md={4}><TextField fullWidth label="Rekening Bank Tujuan" name="rekBankTujuan" value={values.rekBankTujuan || ''} onChange={e => updateField('rekBankTujuan', e.target.value)} /></Grid>
                      <Grid item xs={12}><TextField fullWidth label="Attach Link" name="attachLink" value={values.attachLink} onChange={e => updateField('attachLink', e.target.value)} /></Grid>
                    </Grid>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>Checklist Documents</Typography>
                    <FormGroup>
                      {['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order'].map(doc => (
                        <FormControlLabel key={doc} control={<Checkbox name="checkDocs[]" checked={values.checkDocs.includes(doc)} onChange={() => handleCheckDocToggle(doc)} value={doc} />} label={doc} />
                      ))}
                    </FormGroup>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" mb={2}>Line Items</Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Memo</TableCell><TableCell>Budget</TableCell><TableCell>Qty</TableCell><TableCell>Harga Satuan</TableCell><TableCell>Amount (IDR)</TableCell><TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {values.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell><TextField fullWidth name={`items[${idx}][memo]`} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} /></TableCell>
                              <TableCell>
                                <FormControl fullWidth><InputLabel>Budget</InputLabel>
                                  <Select name={`items[${idx}][budgetId]`} value={item.budgetId} label="Budget" onChange={e => updateItem(idx, 'budgetId', e.target.value)}>
                                    <MenuItem value="">Pilih Budget</MenuItem>
                                    {budgetOptions.map(b => <MenuItem key={b.id} value={b.id}>{b.id} — {b.description}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell><TextField fullWidth type="number" name={`items[${idx}][qty]`} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></TableCell>
                              <TableCell><TextField fullWidth type="number" name={`items[${idx}][hargaSatuan]`} value={item.hargaSatuan} onChange={e => updateItem(idx, 'hargaSatuan', e.target.value)} /></TableCell>
                              <TableCell><TextField fullWidth name={`items[${idx}][amount]`} value={formatCurrency(calculateRowAmount(item))} InputProps={{ readOnly: true }} /></TableCell>
                              <TableCell><Button color="error" onClick={() => handleRemoveRow(idx)}>Hapus</Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Button variant="contained" onClick={handleAddRow}>Tambah Baris</Button>
                      <Typography variant="subtitle1" fontWeight={600}>Total: Rp {formatCurrency(totalAmount)}</Typography>
                    </Box>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button type="reset" variant="outlined" onClick={() => setValues(buildInitialForm(FRP))}>Reset</Button>
                    <Button type="submit" variant="contained" color="primary">Save &amp; Submit</Button>
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
