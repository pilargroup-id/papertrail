const { useState, useEffect, useMemo } = React
const { BackgroundMain, Sidebar, Header } = window.FRPTemplateComponents

function ApprovalPage() {
  const isApprovedView = window.location.pathname === '/approved'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filters, setFilters] = useState({ search: '', date: '', requester: '', status: '', division: '' })
  const [modalId, setModalId] = useState(null)

  const loadData = () => {
    fetch(`/api/data/approval?view=${isApprovedView ? 'approved' : 'pending'}`)
      .then(r => {
        if (!r.ok) { window.location.href = '/login'; throw new Error() }
        return r.json()
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const handler = (e) => { if (e.data === 'refresh') loadData() }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const calcTotal = (r) => {
    if (!r.items) return 0
    return r.items.reduce((sum, i) => {
      const raw = parseInt(String(i.amount || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0
      return sum + raw
    }, 0)
  }

  const divisions = useMemo(() => {
    if (!data?.requests) return []
    return [...new Set(data.requests.map(r => r.divisi))].sort()
  }, [data])

  const filtered = useMemo(() => {
    if (!data?.requests) return []
    return data.requests.filter(r => {
      const matchSearch = !filters.search || (r.frpNo || '').toLowerCase().includes(filters.search.toLowerCase()) || (r.vendor || '').toLowerCase().includes(filters.search.toLowerCase())
      const matchDate = !filters.date || r.tanggalFrp === filters.date
      const matchRequester = !filters.requester || (r.dimintaOleh || '').toLowerCase().includes(filters.requester.toLowerCase())
      const matchStatus = !filters.status || r.status === filters.status
      const matchDivision = !filters.division || r.divisi === filters.division
      return matchSearch && matchDate && matchRequester && matchStatus && matchDivision
    })
  }, [data, filters])

  const doAction = async (id, action) => {
    const msg = action === 'approve' ? 'Approve pengajuan ini?' : 'Reject pengajuan ini?'
    if (!confirm(msg)) return
    const res = await fetch(`/api/frp/${id}/${action}`, { method: 'POST' })
    const d = await res.json()
    if (d.success) loadData()
    else alert('Gagal melakukan aksi')
  }

  const user = data?.user || {}

  const statusColors = {
    PENDING: { background: '#fef08a', color: '#854d0e' },
    APPROVED: { background: '#bbf7d0', color: '#166534' },
    REJECTED: { background: '#fecaca', color: '#991b1b' },
  }

  const filterInputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '13px', background: 'white',
    boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
  }

  const actionBtnStyle = (type) => ({
    background: type === 'approve' ? '#dcfce7' : '#fee2e2',
    color: type === 'approve' ? '#16a34a' : '#dc2626',
    border: 'none', padding: '6px 12px', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 700, marginRight: type === 'approve' ? '4px' : 0,
    fontFamily: 'inherit', fontSize: '12px',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  })

  if (loading) {
    return (
      <>
        <BackgroundMain />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'inherit', color: '#64748b' }}>
          Memuat data...
        </div>
      </>
    )
  }

  return (
    <>
      <BackgroundMain />
      <div className={`dashboard-shell${sidebarCollapsed ? ' dashboard-shell--sidebar-collapsed' : ''}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          userName={user.fullName || 'User'}
          userRole={user.selectedJobLevel || user.role || 'Staff'}
          userIsAdmin={user.role === 'administrator'}
          allAssignments={user.allAssignments || []}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        />

        <div className="dashboard-stage">
          <Header title="Form Request Payment" />

          <main className="dashboard-main">
            {/* Filter Bar */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr', gap: '15px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    Search
                  </label>
                  <input style={filterInputStyle} placeholder="Cari No FRP / Vendor..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>Tanggal</label>
                  <input type="date" style={filterInputStyle} value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>Pemohon</label>
                  <input style={filterInputStyle} placeholder="Nama Pemohon..." value={filters.requester} onChange={e => setFilters(f => ({ ...f, requester: e.target.value }))} />
                </div>
                {isApprovedView ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>Status</label>
                    <select style={filterInputStyle} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                      <option value="">Semua</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                ) : <div />}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.5px' }}>Divisi</label>
                  <select style={filterInputStyle} value={filters.division} onChange={e => setFilters(f => ({ ...f, division: e.target.value }))}>
                    <option value="">Semua Divisi</option>
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              {filtered.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      {['No FRP', 'Tanggal', 'Pemohon', 'Vendor', 'Memo', 'Keterangan', 'Divisi', 'Total', ...(isApprovedView ? ['Approved By'] : []), 'Status', ...(data?.canApprove && !isApprovedView ? ['Aksi'] : [])].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const firstMemo = r.items?.length > 0 ? r.items[0].memo : '-'
                      const keterangan = r.keteranganFrp || '-'
                      const total = calcTotal(r)
                      const sColor = statusColors[r.status] || {}
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setModalId(r.id)}
                          style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><strong>{r.frpNo}</strong></td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{r.tanggalFrp}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>{r.dimintaOleh}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>{r.vendor}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={firstMemo}>{firstMemo}</div></td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={keterangan}>{keterangan}</div></td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>{r.divisi}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap' }}>IDR {total.toLocaleString('id-ID')}</td>
                          {isApprovedView && <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>{r.approvedBy || '-'}</td>}
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-block', ...sColor }}>{r.status}</span>
                          </td>
                          {data?.canApprove && !isApprovedView && (
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                              <button style={actionBtnStyle('approve')} onClick={() => doAction(r.id, 'approve')}>
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span> Approve
                              </button>
                              <button style={actionBtnStyle('reject')} onClick={() => doAction(r.id, 'reject')}>
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span> Reject
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                  <span className="material-icons-round" style={{ fontSize: '48px', display: 'block', marginBottom: '1rem' }}>task</span>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#64748b' }}>Belum Ada Data</h3>
                  <p style={{ margin: 0 }}>Tidak ada pengajuan di daftar ini.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Detail Modal */}
      {modalId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalId(null)}
        >
          <div
            style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '1000px', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <span className="material-icons-round">description</span> Detail FRP
              </h3>
              <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} onClick={() => setModalId(null)}>
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <iframe src={`/frp/${modalId}`} style={{ width: '100%', height: '100%', border: 'none' }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<ApprovalPage />)
