const { useState, useEffect } = React
const { BackgroundMain, Sidebar, Header } = window.FRPTemplateComponents

function HistoryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/data/history')
      .then(r => {
        if (!r.ok) { window.location.href = '/login'; throw new Error() }
        return r.json()
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr) => {
    try { return new Date(dateStr).toLocaleString('id-ID') } catch { return dateStr }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'inherit', color: '#64748b' }}>
        Memuat data...
      </div>
    )
  }

  const files = data?.files || []
  const user = data?.user || {}

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
          <Header
            title="Document History"
            subtitle="Daftar FRP PDF yang telah di-generate"
          />

          <main className="dashboard-main">
            <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              {files.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      {['Nama File', 'Tanggal Generate', 'Aksi'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(file => (
                      <tr
                        key={file.name}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        style={{ transition: 'background 0.15s' }}
                      >
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-icons-round" style={{ color: '#ef4444', fontSize: '20px' }}>picture_as_pdf</span>
                            <strong>{file.name}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{formatDate(file.date)}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                          <a
                            href={file.path}
                            download
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', textDecoration: 'none', fontFamily: 'inherit' }}
                          >
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>download</span> Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                  <span className="material-icons-round" style={{ fontSize: '48px', display: 'block', marginBottom: '1rem' }}>folder_open</span>
                  <h3 style={{ margin: '0 0 0.5rem', color: '#64748b' }}>Belum Ada Dokumen</h3>
                  <p style={{ margin: '0 0 1.5rem' }}>Silakan buat Form Request Payment baru untuk melihat riwayat di sini.</p>
                  <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white', padding: '8px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none', fontFamily: 'inherit' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span> Buat FRP
                  </a>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<HistoryPage />)
