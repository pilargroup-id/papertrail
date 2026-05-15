const { useState, useEffect } = React
const { BackgroundMain, Sidebar, Header } = window.FRPTemplateComponents || {}

const S = {
  stage: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '100%',
    padding: '16px 0 28px',
  },
  card: {
    background: 'white',
    padding: '2.5rem',
    borderRadius: '20px',
    boxShadow: '0 22px 44px -16px rgba(15, 23, 42, 0.18)',
    width: '100%',
    maxWidth: '520px',
    textAlign: 'center',
    border: '1px solid #dbe7f5',
    boxSizing: 'border-box',
  },
  iconBox: {
    width: '60px',
    height: '60px',
    background: 'rgba(47, 111, 178, 0.12)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1f4e8c',
    margin: '0 auto 1.5rem',
  },
  h1: { fontSize: '1.4rem', fontWeight: 800, color: '#163a6b', margin: '0 0 0.65rem' },
  subtitle: { color: '#64748b', margin: '0 0 1.5rem', fontSize: '0.92rem', lineHeight: 1.5 },
  grid: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.1rem',
    border: '1px solid #dbe7f5',
    borderRadius: '16px',
    background: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: '0.98rem',
    fontWeight: 600,
    color: '#334155',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
  },
  subtitle2: { display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginTop: '4px' },
  footerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '1.25rem',
    color: '#64748b',
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: 600,
  },
}

function SelectDivisionPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/data/select-division')
      .then(r => {
        if (!r.ok) { window.location.href = '/login'; throw new Error() }
        return r.json()
      })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (division) => {
    await fetch('/api/auth/select-division', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ division }),
    })
    window.location.href = '/'
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Memuat...</div>

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
          onToggleCollapse={() => setSidebarCollapsed(current => !current)}
        />

        <div className="dashboard-stage">
          <Header
            title="Pilih Divisi"
            subtitle={`Akses perusahaan: ${data?.selectedCompany || '-'}`}
            breadcrumb={[
              { label: 'Akses', href: '#'},
              { label: 'Divisi', href: '#', active: true },
            ]}
          />

          <main className="dashboard-main">
            <div style={S.stage}>
              <div style={S.card}>
                <div style={S.iconBox}>
                  <span className="material-icons-round">account_tree</span>
                </div>
                <h1 style={S.h1}>Pilih Divisi</h1>
                <p style={S.subtitle}>Pilih divisi Anda di {data?.selectedCompany || 'perusahaan ini'}</p>
                <div style={S.grid}>
                  {(data?.divisions || []).map((div, idx) => (
                    <button
                      key={`${div.class}-${idx}`}
                      style={{
                        ...S.btn,
                        ...(hoveredIdx === idx ? { borderColor: '#2f6fb2', background: '#f7fbff', color: '#1f4e8c', transform: 'translateX(4px)', boxShadow: '0 10px 24px rgba(31, 78, 140, 0.08)' } : {}),
                      }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => handleSelect(div.class)}
                    >
                      <div>
                        <span>{div.class}</span>
                        <span style={{ ...S.subtitle2, ...(hoveredIdx === idx ? { color: '#2f6fb2', opacity: 0.9 } : {}) }}>{div.jobLevel}</span>
                      </div>
                      <span className="material-icons-round" style={{ color: hoveredIdx === idx ? '#1f4e8c' : '#cbd5e1' }}>chevron_right</span>
                    </button>
                  ))}
                </div>
                <a href="/select-company" style={S.footerLink}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_back</span> Kembali ke Pilih Perusahaan
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<SelectDivisionPage />)
