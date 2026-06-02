import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, RefreshCw, Save, Plus, CheckCircle2 } from 'lucide-react';
import '../../styles/frp/new-frp.css';

function FloatingGroup({ label, children, style, className }) {
  return (
    <div className={`frp-float-group${className ? ' ' + className : ''}`} style={style}>
      {children}
      <span className="frp-float-label">{label}</span>
    </div>
  )
}

function DateField({ name, value, onChange, required }) {
  const inputRef = useRef(null)
  const openPicker = () => {
    if (!inputRef.current) return
    if (typeof inputRef.current.showPicker === 'function') {
      inputRef.current.showPicker()
      return
    }
    inputRef.current.focus()
    inputRef.current.click()
  }

  return (
    <div style={{ position: 'relative', display: 'block', lineHeight: 0 }} onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        name={name}
        className="frp-input"
        placeholder=" "
        required={required}
        style={{ paddingRight: '2.8rem', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'textfield', appearance: 'none', lineHeight: 'normal' }}
        value={value}
        onChange={onChange}
      />
      <button type="button" onClick={openPicker} style={{ position: 'absolute', top: '50%', right: '6px', transform: 'translateY(-50%)', width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: '#e2e8f0', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, pointerEvents: 'none' }}>
        <span className="material-icons-round" style={{ fontSize: '16px' }}>calendar_month</span>
      </button>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
        input[type="date"]::-webkit-inner-spin-button, input[type="date"]::-webkit-clear-button { display: none; }
      `}</style>
    </div>
  )
}

function ResultBanner({ doc, loading, onCopy, onDownload, onDuplicate, onSave, onNew }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1f4e8c 0%, #2d6bbf 100%)', borderRadius: '12px', padding: '16px', color: '#fff', position: 'relative', overflow: 'hidden', marginTop: '20px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <CheckCircle2 size={16} color="#93c5fd" />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Nomor Dokumen Berhasil Dibuat</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, wordBreak: 'break-all', lineHeight: 1.2 }}>{doc.doc_number}</span>
        <button type="button" onClick={onCopy} title="Salin" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
          <Copy size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={onNew} className="frp-btn-secondary" style={{ background: '#fff', color: '#1f4e8c', borderColor: '#fff' }}><Plus size={14} /> Buat Baru</button>
        <button type="button" onClick={onDuplicate} className="frp-btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}><Copy size={14} /> Duplikat</button>
        <button type="button" onClick={onDownload} className="frp-btn-primary" style={{ background: '#10b981' }}><Download size={14} /> Download .docx</button>
        <button type="button" onClick={onSave} disabled={loading} className="frp-btn-primary" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }}>
          {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Simpan
        </button>
      </div>
    </div>
  );
}

export default function FormView({ editingDoc, generatedDoc, formData, templates, masterData, loading, hChange, hSubmit, hDownload, resetForm, startDuplicate, userName }) {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth))
  useEffect(() => { const handleResize = () => setViewportWidth(window.innerWidth); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize) }, [])
  const isMobile = viewportWidth < 768

  return (
    <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: isMobile ? '12px' : '16px' }}>
      <form onSubmit={hSubmit} className="frp-shell" style={{ overflowY: 'auto' }}>
        <div className="frp-top-panel">
          {/* Card Perusahaan & Template */}
          <div className="frp-card">
            <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>business</span>
              Perusahaan & Template
            </h3>
            
            <div className="frp-grid-2">
              <FloatingGroup label="Perusahaan">
                <select name="company" value={formData.company} onChange={hChange} disabled={!!editingDoc} className="frp-select">
                  <option value="PNM">PT Pilar Niaga Makmur (PNM)</option>
                  <option value="PKS">PT Pilkada (PKS)</option>
                  <option value="PKP">PT Pikasa (PKP)</option>
                </select>
              </FloatingGroup>
              
              <FloatingGroup label="Internal / External">
                <select name="internal_external" value={formData.internal_external} onChange={hChange} className="frp-select">
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                </select>
              </FloatingGroup>
            </div>
            
            <FloatingGroup label="Template Dokumen" style={{ marginTop: '20px' }}>
              <select name="template_name" value={formData.template_name} onChange={hChange} className="frp-select">
                {templates.length === 0 ? <option value="">— Belum ada template —</option> : templates.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FloatingGroup>
            
            <FloatingGroup label="Judul Dokumen" style={{ marginTop: '20px' }}>
              <input type="text" name="judul_dokumen" value={formData.judul_dokumen} onChange={hChange} placeholder="Contoh: Perjanjian Kerja Sama Pemasaran..." required className="frp-input" />
            </FloatingGroup>
          </div>

          {/* Card Pengguna & Detail */}
          <div className="frp-card">
            <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>assignment</span>
              Detail Dokumen
            </h3>
            
            <div className="frp-grid-2">
              <FloatingGroup label="User">
                <input value={userName || ''} readOnly className="frp-input-readonly" />
              </FloatingGroup>
              
              <FloatingGroup label="Divisi">
                <select name="division" value={formData.division} onChange={hChange} required className="frp-select">
                  <option value="">— Pilih —</option>
                  {masterData.divisions.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                </select>
              </FloatingGroup>
            </div>

            <div className="frp-grid-2" style={{ marginTop: '20px' }}>
              <FloatingGroup label="Tanggal Dokumen">
                <DateField name="doc_date" value={formData.doc_date} onChange={hChange} required />
              </FloatingGroup>
              
              <FloatingGroup label="Klasifikasi">
                <input type="text" name="klasifikasi" value={formData.klasifikasi} onChange={hChange} placeholder="Surat Edaran..." className="frp-input" />
              </FloatingGroup>
            </div>
            
            <div className="frp-grid-2" style={{ marginTop: '20px' }}>
              <FloatingGroup label="Perihal">
                <input type="text" name="perihal" value={formData.perihal} onChange={hChange} placeholder="Perihal dokumen..." className="frp-input" />
              </FloatingGroup>
              
              <FloatingGroup label="Ditandatangani Oleh">
                <input type="text" name="signed_by" value={formData.signed_by} onChange={hChange} placeholder="Nama penandatangan" className="frp-input" />
              </FloatingGroup>
            </div>
          </div>
        </div>

        {/* Card Keterangan & Link */}
        <div className="frp-bottom-panel" style={{ minHeight: '300px' }}>
          <div className="frp-card frp-card--scroll">
             <h3 className="frp-section-title" style={{ marginBottom: '20px' }}>
              <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '18px' }}>link</span>
              Keterangan & Lampiran
            </h3>
            <FloatingGroup label="Link Dokumen">
              <input type="text" name="link_document" value={formData.link_document} onChange={hChange} placeholder="https://..." className="frp-input" />
            </FloatingGroup>
            
            <FloatingGroup label="Keterangan" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100px' }}>
              <textarea name="keterangan" value={formData.keterangan} onChange={hChange} placeholder="Catatan opsional..." className="frp-textarea" style={{ height: '100%' }} />
            </FloatingGroup>
          </div>

          {generatedDoc ? (
            <ResultBanner doc={generatedDoc} loading={loading}
              onCopy={() => { navigator.clipboard.writeText(generatedDoc.doc_number); alert('Nomor disalin!'); }}
              onDownload={() => hDownload(generatedDoc)} onDuplicate={() => startDuplicate(generatedDoc)} onSave={hSubmit} onNew={resetForm}
            />
          ) : (
            <div className="frp-footer">
               <div />
               <button type="submit" disabled={loading} className="frp-btn-primary" style={{ padding: '0.75rem 2.5rem' }}>
                 {loading ? <><RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</> : editingDoc ? <><Save size={17} /> Simpan Perubahan</> : <><Plus size={17} /> Generate Nomor Baru</>}
               </button>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
