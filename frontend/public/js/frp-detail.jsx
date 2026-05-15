const { useEffect, useMemo, useState } = React

const DOCS = ['Form Request Payment', 'Tanda Terima Asli', 'Invoice / Kontrak', 'Surat Jalan Asli / Berita Acara', 'Faktur Pajak', 'Purchase Order']

const shell = {
  page: { background: 'transparent', minHeight: '100vh', paddingBottom: '96px' },
  card: { background: 'transparent', boxShadow: 'none', border: 'none', padding: '1rem', margin: 0, maxWidth: '100%' },
  floatingActions: {
    position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
    padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', boxShadow: '0 -4px 15px rgba(0,0,0,0.05)', zIndex: 1000, flexWrap: 'wrap',
  },
}

function normalizeNumber(value) {
  return parseInt(String(value || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
}

function statusColor(status) {
  if (status === 'APPROVED') return '#10b981'
  if (status === 'REJECTED') return '#ef4444'
  return '#f59e0b'
}

function buildPostForm(action, payload, target = '_self') {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.target = target
  form.style.display = 'none'

  const appendValue = (name, value) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value ?? ''
    form.appendChild(input)
  }

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          Object.entries(item).forEach(([subKey, subValue]) => appendValue(`${key}[${idx}][${subKey}]`, subValue))
        } else {
          appendValue(`${key}[]`, item)
        }
      })
      return
    }

    appendValue(key, value)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

function DetailPage() {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)

  const frpId = useMemo(() => window.location.pathname.split('/').pop(), [])

  useEffect(() => {
    fetch(`/api/frp/${frpId}`)
      .then((r) => r.json())
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false))
  }, [frpId])

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Memuat...</div>
  if (!payload?.data) return <div style={{ padding: '2rem', color: '#ef4444' }}>Data FRP tidak ditemukan.</div>

  const { data, companies, employees, user, isIT, canApprove, canEdit } = payload
  const items = Array.isArray(data.items) ? data.items : []
  const total = items.reduce((sum, item) => sum + normalizeNumber(item.amount), 0)

  const doAction = async (action) => {
    if (!window.confirm(`Anda yakin ingin melakukan ${action}?`)) return
    const res = await fetch(`/api/frp/${data.id}/${action}`, { method: 'POST' })
    const result = await res.json()
    if (result.success) window.parent.postMessage('refresh', '*')
    else window.alert('Gagal mengeksekusi aksi.')
  }

  const revisiForm = () => {
    if (!window.confirm('Anda yakin ingin merevisi FRP ini?')) return
    window.parent.location.href = `/?revisi=${data.id}`
  }

  const handlePreview = () => buildPostForm('/preview', data, '_blank')
  const handleDownload = () => buildPostForm('/generate-pdf', data, '_blank')

  return (
    <div style={shell.page}>
      <div className="main-content">
        <div className="form-container" style={shell.card}>
          <div className="header-card" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
            <div className="header-icon-wrap" style={{ width: '48px', height: '48px' }}>
              <span className="material-icons-round" style={{ fontSize: '1.5rem' }}>description</span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>Form Request Payment ({data.frpNo})</h2>
              <p style={{ fontSize: '0.875rem' }}>Status: <strong style={{ color: statusColor(data.status) }}>{data.status}</strong></p>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header"><span className="material-icons-round section-icon">info</span><h3>Informasi FRP</h3></div>
            <div className="form-grid cols-2">
              <div className="form-group">
                <label>Company Name</label>
                <input type="text" readOnly value={data.companyName || ''} />
              </div>
              <div className="form-group">
                <label>Tanggal FRP</label>
                <input type="date" readOnly value={data.tanggalFrp || ''} />
              </div>
            </div>
            <div className="form-grid cols-2">
              <div className="form-group">
                <label>Divisi</label>
                <input type="text" readOnly value={data.divisi || ''} />
              </div>
              <div className="form-group">
                <label>Diminta Oleh</label>
                <input type="text" readOnly value={data.dimintaOleh || ''} />
              </div>
            </div>
            <div className="form-group full-width" style={{ marginTop: '15px' }}>
              <label>Keterangan FRP</label>
              <textarea rows="2" readOnly value={data.keteranganFrp || ''} />
            </div>
          </div>

          <div className="form-section">
            <div className="section-header"><span className="material-icons-round section-icon">store</span><h3>Vendor & Pembayaran</h3></div>
            <div className="form-grid cols-2">
              <div className="form-group"><label>Vendor</label><input type="text" readOnly value={data.vendor || ''} /></div>
              <div className="form-group"><label>Internal PO Number</label><input type="text" readOnly value={data.internalPoNumber || ''} /></div>
            </div>
            <div className="form-grid cols-3">
              <div className="form-group"><label>Ext Doc Type</label><input type="text" readOnly value={data.extDocType || ''} /></div>
              <div className="form-group"><label>Ext Doc Number</label><input type="text" readOnly value={data.extDocNumber || ''} /></div>
              <div className="form-group"><label>Payment Method</label><input type="text" readOnly value={data.paymentMethod || ''} /></div>
            </div>
            <div className="form-grid cols-3">
              <div className="form-group"><label>Payment Date</label><input type="date" readOnly value={data.paymentDate || ''} /></div>
              <div className="form-group"><label>Bank Tujuan</label><input type="text" readOnly value={data.bankTujuan || ''} /></div>
              <div className="form-group"><label>Rekening Bank Tujuan</label><input type="text" readOnly value={data.rekBankTujuan || ''} /></div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header"><span className="material-icons-round section-icon">checklist</span><h3>Checklist Documents</h3></div>
            <div className="checklist-grid">
              {DOCS.map((doc) => {
                const checked = (data.checkDocs || []).includes(doc)
                return (
                  <label key={doc} className="checklist-item" style={checked ? { borderColor: 'var(--primary)', background: 'var(--primary-light)' } : { opacity: 0.7 }}>
                    <input type="checkbox" checked={checked} disabled />
                    <span className="checkmark" />
                    <span>{doc}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header"><span className="material-icons-round section-icon">receipt_long</span><h3>Detail Pembayaran</h3></div>
            <div className="line-items-table">
              <table>
                <thead>
                  <tr><th className="th-no">No</th><th className="th-memo">Memo / Keterangan</th><th className="th-budget">Budget ID</th><th className="th-amount">Amount (IDR)</th></tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="line-item-row">
                      <td className="td-no">{idx + 1}</td>
                      <td><input type="text" readOnly value={item.memo || ''} /></td>
                      <td><input type="text" readOnly value={item.budgetId || ''} /></td>
                      <td><input type="text" readOnly value={item.amount || ''} style={{ textAlign: 'right', fontFamily: 'monospace' }} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="total-row"><td colSpan="3" className="total-label">Total</td><td className="total-amount">IDR {total.toLocaleString('id-ID')}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style={shell.floatingActions}>
        {data.status === 'APPROVED' ? (
          <>
            <button type="button" className="btn btn-sm" style={{ background: 'white', color: 'var(--secondary)', border: '1.5px solid var(--secondary)' }} onClick={handlePreview}><span className="material-icons-round">visibility</span> Preview & Print</button>
            <button type="button" className="btn btn-sm btn-generate" onClick={handleDownload}><span className="material-icons-round">download</span> Download</button>
            {(canApprove || isIT) ? <button type="button" className="btn btn-sm" style={{ background: '#f59e0b', color: 'white' }} onClick={() => doAction('reject')}><span className="material-icons-round">cancel</span> Reject</button> : null}
          </>
        ) : null}

        {data.status === 'PENDING' ? (
          <>
            {(canApprove || isIT || data.createdBy === user.fullName) ? <button type="button" className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => doAction('delete')}><span className="material-icons-round">delete</span> Hapus</button> : null}
            {(canApprove || isIT || data.createdBy === user.fullName) ? <button type="button" className="btn btn-sm" style={{ background: 'var(--primary)', color: 'white' }} onClick={revisiForm}><span className="material-icons-round">edit</span> Revisi</button> : null}
            {(canApprove || isIT) ? <button type="button" className="btn btn-sm" style={{ background: '#f59e0b', color: 'white' }} onClick={() => doAction('reject')}><span className="material-icons-round">cancel</span> Reject</button> : null}
            {(canApprove || isIT) ? <button type="button" className="btn btn-sm btn-generate" onClick={() => doAction('approve')}><span className="material-icons-round">check_circle</span> Approve</button> : null}
          </>
        ) : null}

        {data.status === 'REJECTED' ? (
          <>
            {(canApprove || isIT || data.createdBy === user.fullName) ? <button type="button" className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => doAction('delete')}><span className="material-icons-round">delete</span> Hapus</button> : null}
            {(canApprove || isIT || data.createdBy === user.fullName) ? <button type="button" className="btn btn-sm" style={{ background: 'var(--primary)', color: 'white' }} onClick={revisiForm}><span className="material-icons-round">edit</span> Revisi</button> : null}
            {(canApprove || isIT) ? <button type="button" className="btn btn-sm btn-generate" onClick={() => doAction('approve')}><span className="material-icons-round">check_circle</span> Approve</button> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<DetailPage />)
