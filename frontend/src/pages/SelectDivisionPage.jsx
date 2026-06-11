import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import DialogChangeAccess from '../components/Dialog/DialogChangeAccess.jsx'

export default function SelectDivisionPage({
  isOpen = true,
  onClose,
  onSuccess,
} = {}) {
  const navigate = useNavigate()
  const { setUser } = useUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [selectedDivision, setSelectedDivision] = useState('')
  const [selectedJobLevel, setSelectedJobLevel] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    let cancelled = false

    fetch('api/departments')
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/'
          throw new Error('Failed to load division data')
        }

        return response.json()
      })
      .then((payload) => {
        if (cancelled) return

        setData(payload)
        setUser(payload?.user)

        const initialDivision = payload?.selectedDivision || payload?.user?.selectedDivision || payload?.divisions?.[0]?.class || ''
        const initialItem = (payload?.divisions || []).find((division) => division.class === initialDivision) || payload?.divisions?.[0]

        if (initialItem) {
          setSelectedDivision(initialItem.class || '')
          setSelectedJobLevel(initialItem.jobLevel || '')
        }
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[SelectDivisionPage] Failed to load division data', error)
        setSubmitError('Gagal memuat data divisi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, setUser])

  const divisions = data?.divisions || []

  const handleSelect = async () => {
    if (!selectedDivision) {
      setSubmitError('Pilih divisi terlebih dahulu.')
      return
    }

    try {
      const response = await fetch('/api/auth/select-division', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ division: selectedDivision }),
      })

      if (!response.ok) {
        throw new Error('Gagal menyimpan divisi.')
      }

      try {
        const meResponse = await fetch('/api/auth/me')
        if (meResponse.ok) {
          const meData = await meResponse.json()
          setUser(meData?.user || null)
        }
      } catch (_) {}

      if (typeof onSuccess === 'function') {
        onSuccess()
        return
      }

      window.location.href = '/'
    } catch (error) {
      console.error('[SelectDivisionPage] Failed to save division', error)
      setSubmitError(error.message || 'Gagal menyimpan divisi.')
    }
  }

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose()
      return
    }

    navigate('/', { replace: true })
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <DialogChangeAccess
      isOpen
      title="Pilih Divisi"
      eyebrow="Select Division"
      labelBatal="Batal"
      labelSimpan="Pilih"
      onClose={handleClose}
      onSave={handleSelect}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Pilih divisi dan level jabatan Anda untuk melanjutkan.
        </p>

        {loading && (
          <div style={{ padding: '16px 0', color: '#64748b' }}>
            Memuat...
          </div>
        )}

        {!loading && submitError && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
            }}
          >
            {submitError}
          </div>
        )}

        {!loading && !submitError && divisions.length === 0 && (
          <div style={{ padding: '16px 0', color: '#64748b' }}>
            Tidak ada divisi yang tersedia.
          </div>
        )}

        {!loading && divisions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {divisions.map((division, index) => {
              const isSelected = selectedDivision === division.class

              return (
                <button
                  key={`${division.class}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedDivision(division.class || '')
                    setSelectedJobLevel(division.jobLevel || '')
                    setSubmitError('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: `1.5px solid ${isSelected ? '#16a34a' : '#e2e8f0'}`,
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    color: isSelected ? '#16a34a' : '#334155',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 10px 24px rgba(22, 163, 74, 0.08)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIdx(index)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{division.class}</div>
                    <div style={{ fontSize: '0.82rem', color: isSelected ? '#15803d' : '#94a3b8', marginTop: '2px' }}>
                      {division.jobLevel || selectedJobLevel || '-'}
                    </div>
                  </div>
                  <span
                    className="material-icons-round"
                    style={{ color: isSelected || hoveredIdx === index ? '#16a34a' : '#cbd5e1', fontSize: '20px' }}
                  >
                    {isSelected ? 'check_circle' : 'chevron_right'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </DialogChangeAccess>,
    document.body,
  )
}
