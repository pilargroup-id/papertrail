import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BackgroundDialog from '../template/BackgroundDialog'
import { XClose } from '../template/TemplateIcons.jsx'

const normalizeNumber = v => parseInt(String(v || '0').replace(/\./g, '').replace(/[^0-9]/g, ''), 10) || 0

const formatDisplayDate = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const fieldStyle = { width: '100%', padding: '2px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', fontSize: '0.75rem', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '24px' }
const sectionStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', marginBottom: '6px' }
const labelStyle = { display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '2px' }
const headingStyle = { margin: '0 0 4px', fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }
const iconStyle = { fontSize: '13px' }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '4px' }

function DialogDetailRP({
  isOpen = false,
  request = null,
  title = 'Detail Request Purchase',
  eyebrow = 'Request Detail',
  onClose,
  extraFooter = null,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !request || typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div
        className="dashboard-popup dashboard-popup--frp-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-rp-detail-title"
        onClick={(event) => event.stopPropagation()}
        style={{ height: 'auto', maxHeight: '40vh', width: 'min(1180px, calc(100vw - 48px))', margin: 'auto', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}
      >
        <BackgroundDialog />
        <div className="dashboard-popup__header" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <span className="dashboard-popup__eyebrow" style={{ margin: '0 0 4px 0', fontSize: '0.65rem', lineHeight: 1, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {eyebrow}
            </span>
            <h2 className="dashboard-popup__title" id="dialog-rp-detail-title" style={{ fontSize: '1.1rem', margin: 0, lineHeight: 1.2, color: '#f8fafc', fontWeight: 600 }}>
              {title}
            </h2>
          </div>
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              color: '#cbd5e1', 
              fontSize: '0.7rem', 
              fontWeight: '500', 
              fontFamily: 'monospace', 
              whiteSpace: 'nowrap', 
              textOverflow: 'ellipsis', 
              overflow: 'hidden' 
            }}>
              {request.rpNo ? `No: ${request.rpNo}` : `ID: ${request.id}`}
            </span>
            {(() => {
              const statusStr = request.status || 'Waiting Approval'
              const sLow = statusStr.toLowerCase()
              let bg = 'rgba(245, 158, 11, 0.12)', border = 'rgba(245, 158, 11, 0.25)', color = '#fbbf24'
              
              if (sLow.includes('approve') || sLow.includes('completed')) { 
                bg = 'rgba(16, 185, 129, 0.12)'; border = 'rgba(16, 185, 129, 0.25)'; color = '#34d399'
              } else if (sLow.includes('reject')) { 
                bg = 'rgba(239, 68, 68, 0.12)'; border = 'rgba(239, 68, 68, 0.25)'; color = '#f87171'
              } else if (sLow.includes('draft')) { 
                bg = 'rgba(148, 163, 184, 0.12)'; border = 'rgba(148, 163, 184, 0.25)'; color = '#cbd5e1'
              }

              return (
                <span style={{ 
                  background: bg, 
                  border: `1px solid ${border}`,
                  color: color, 
                  padding: '4px 10px', 
                  borderRadius: '8px', 
                  fontSize: '0.65rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {statusStr}
                </span>
              )
            })()}
          </div>

          <div className="frp-detail-header-actions" style={{ flexShrink: 0, marginLeft: '6px' }}>
            <button
              type="button"
              className="dashboard-popup__close"
              aria-label="Tutup dialog"
              onClick={onClose}
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', borderRadius: '8px' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <XClose size={20} />
            </button>
          </div>
        </div>

        <div className="dashboard-popup__body dashboard-popup__body--frp-detail">
          <div className="frp-detail-content hide-scrollbar" style={{ 
            padding: '4px 8px', 
            overflowY: 'auto', 
            maxHeight: 'calc(40vh - 120px)',
            scrollBehavior: 'smooth',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)'
          }}>
            
            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>info</span> Informasi Request Purchase</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Company Name</label><input readOnly value={request.companyName || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Tanggal Dibutuhkan</label><input readOnly value={formatDisplayDate(request.tanggalDibutuhkan || request.tanggalRp)} style={fieldStyle} /></div>
              </div>
              <div style={grid3}>
                <div><label style={labelStyle}>Divisi</label><input readOnly value={request.divisi || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Class</label><input readOnly value={request.class || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Dibuat Oleh</label><input readOnly value={request.dibuatOleh || ''} style={fieldStyle} /></div>
              </div>
              <div><label style={labelStyle}>Deskripsi (Alasan Permintaan Barang)</label><textarea rows="2" readOnly value={request.deskripsi || request.keteranganRp || ''} style={{ ...fieldStyle, resize: 'none' }} /></div>
            </div>

            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>store</span> Vendor & Proses</h3>
              <div style={grid2}>
                <div><label style={labelStyle}>Kategori Pembelian</label><input readOnly value={request.kategoriPembelian || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Diproses Oleh</label><input readOnly value={request.diprosesOleh || ''} style={fieldStyle} /></div>
              </div>
              <div style={grid2}>
                <div><label style={labelStyle}>Vendor Suggestion</label><input readOnly value={request.vendorSuggestion || ''} style={fieldStyle} /></div>
                <div><label style={labelStyle}>PIC Penerima</label><input readOnly value={request.picPenerima || ''} style={fieldStyle} /></div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={headingStyle}><span className="material-icons-round" style={iconStyle}>table_rows</span> Detail Item</h3>
              <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      {['No', 'Budget ID', 'Memo', 'Link Pembelian', 'Qty', 'Est. Value', 'Subtotal'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(request.items || []).map((item, idx) => {
                      const qty = normalizeNumber(item.qty) || 1
                      const val = normalizeNumber(item.estimatedValue) || 0
                      const sub = qty * val
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', width: '36px' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.budgetId || ''} style={{ ...fieldStyle, margin: 0 }} /></td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}><input readOnly value={item.memo || item.description || ''} style={{ ...fieldStyle, margin: 0 }} /></td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                            {item.linkPembelian ? (
                              <a href={item.linkPembelian} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.linkPembelian}</a>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>{qty}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{val.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{sub.toLocaleString('id-ID')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="6" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '12px' }}>Total Estimasi</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#1e293b', textAlign: 'right' }}>
                        IDR {((request.items || []).reduce((sum, item) => sum + (normalizeNumber(item.qty) || 1) * normalizeNumber(item.estimatedValue), 0)).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions" style={{ position: 'relative', zIndex: 1, padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {extraFooter}
          <button
            type="button"
            className="dashboard-popup__button"
            onClick={onClose}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: '80px', justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#fff', border: 'none',
              borderRadius: '6px', padding: '6px 16px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.2)', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 6px 15px rgba(15, 23, 42, 0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.2)'; e.currentTarget.style.transform = 'none' }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDetailRP
