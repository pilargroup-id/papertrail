import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

export default function ChoicePage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const { setUser } = useUser()

  useEffect(() => {
    fetch('/api/form-data')
      .then(r => { if(!r.ok){window.location.href='/login';throw new Error()} return r.json() })
      .then(d => { setData(d); setUser(d?.user) })
      .catch(() => {})
  }, [])

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '2rem' }}>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Pilih Jenis Request</h2>
        <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '400px', margin: '0 auto' }}>Silakan pilih form yang ingin Anda buat hari ini.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '700px' }}>

        <div onClick={() => navigate('/frp')} style={{ background: 'white', borderRadius: '24px', padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', border: '2px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="choice-card">
          <div style={{ width: '80px', height: '80px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons-round" style={{ fontSize: '40px', color: '#1f4e8c' }}>payments</span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' }}>FRP</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Formulir Request Pembayaran untuk operasional dan kebutuhan non-pengadaan.</p>
          </div>
        </div>

        <div onClick={() => navigate('/rp')} style={{ background: 'white', borderRadius: '24px', padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', border: '2px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="choice-card">
          <div style={{ width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons-round" style={{ fontSize: '40px', color: '#16a34a' }}>shopping_cart</span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' }}>Request Purchase (RP)</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>Formulir Request Purchase untuk pengadaan atau pembelian barang/jasa.</p>
          </div>
        </div>

      </div>

      <style>{`
        .choice-card:hover { border-color: #1f4e8c !important; transform: translateY(-5px); box-shadow: 0 20px 40px rgba(31,78,140,0.1) !important; }
      `}</style>
    </main>
  )
}
