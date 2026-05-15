const { useState, useEffect } = React

const S = {
  body: {
    fontFamily: "'Inter', sans-serif",
    background: '#f8fafc',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  card: {
    background: 'white',
    padding: '3rem',
    borderRadius: '2rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  },
  iconBox: {
    width: '64px',
    height: '64px',
    background: '#f0fdf4',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#16a34a',
    margin: '0 auto 2rem',
  },
  h1: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 2rem' },
  subtitle: { color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' },
  grid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '1.25rem',
    background: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#334155',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s',
  },
  subtitle2: { display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' },
  footerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '1.5rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: 500,
  },
}

function SelectDivisionPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState(null)

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

  if (loading) return <div style={{ ...S.body, fontSize: '1rem', color: '#64748b' }}>Memuat...</div>

  return (
    <div style={S.body}>
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
                ...(hoveredIdx === idx ? { borderColor: '#16a34a', background: '#f0fdf4', color: '#16a34a', transform: 'translateX(5px)' } : {}),
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleSelect(div.class)}
            >
              <div>
                <span>{div.class}</span>
                <span style={{ ...S.subtitle2, ...(hoveredIdx === idx ? { color: '#16a34a', opacity: 0.8 } : {}) }}>{div.jobLevel}</span>
              </div>
              <span className="material-icons-round" style={{ color: hoveredIdx === idx ? '#16a34a' : '#cbd5e1' }}>chevron_right</span>
            </button>
          ))}
        </div>
        <a href="/select-company" style={S.footerLink}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_back</span> Kembali ke Pilih Perusahaan
        </a>
        <br />
        <a href="/logout" style={{ ...S.footerLink, marginTop: '0.75rem' }}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>logout</span> Logout
        </a>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<SelectDivisionPage />)
