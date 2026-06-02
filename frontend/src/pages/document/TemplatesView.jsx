import React, { useState, useEffect } from 'react';
import { FileText, Trash2, StickyNote, X, CheckCircle2, AlertCircle, CloudUpload } from 'lucide-react';
import { token, Btn, card } from './SharedUI';

export default function TemplatesView({ templates, uploadLoading, uploadMsg, showNote, setShowNote, hUpload, hDeleteTemplate, fileInputRef, setUploadMsg }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  const handleDrop = e => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) hUpload({ target: { files: [file] } }); };

  return (
    <div style={{ position: 'relative', height: isMobile ? 'auto' : '100%', padding: isMobile ? '0.5rem 0' : '0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {showNote && (
        <>
          <div onClick={() => setShowNote(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(5px)', zIndex: 9000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9001, width: '92vw', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(135deg,#fffbeb,#fefce8)', border: '1.5px solid #fde68a', borderRadius: '1.1rem', boxShadow: '0 30px 80px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.25rem', borderBottom: '1px solid #fde68a' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cara Menyiapkan Template</span>
              <button onClick={() => setShowNote(false)} style={{ background: 'rgba(180,83,9,0.1)', border: 'none', cursor: 'pointer', color: '#a16207', padding: '0.35rem', borderRadius: '0.45rem', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: '1rem', lineHeight: 1.6 }}>Buka file <b>.docx</b> di MS Word, lalu masukkan tag berikut di posisi yang diinginkan:</p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.4rem 1.25rem', background: 'rgba(255,255,255,0.65)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fde68a' }}>
                {[['{doc_number}','Nomor Dokumen'],['{company}','Perusahaan'],['{user_name}','Nama User'],['{division}','Divisi'],['{doc_date}','Tanggal'],['{perihal}','Perihal'],['{klasifikasi}','Klasifikasi'],['{signed_by}','Penandatangan'],['{judul_dokumen}','Judul Dokumen'],['{keterangan}','Keterangan']].map(([tag,label]) => (
                  <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ fontFamily: 'monospace', background: 'rgba(180,83,9,0.1)', border: '1px solid rgba(180,83,9,0.22)', borderRadius: '0.3rem', padding: '0.07rem 0.45rem', fontWeight: 700, fontSize: '0.75rem', color: '#92400e' }}>{tag}</span>
                    <span style={{ color: '#a16207', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ ...card, padding: isMobile ? '1rem' : '1.75rem', borderRadius: isMobile ? '1rem' : '1.25rem', flex: isMobile ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : 0, overflow: isMobile ? 'visible' : 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.99) 0%,rgba(248,250,255,0.98) 100%)', border: '1.5px solid rgba(26,42,87,0.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isMobile ? '1.25rem' : '1.45rem', flexShrink: 0 }}>
          <Btn variant={showNote ? 'primary' : 'ghost'} onClick={() => setShowNote(!showNote)}><StickyNote size={14} /> Petunjuk Tag</Btn>
        </div>

        <div onClick={() => { setUploadMsg({ type: '', text: '' }); fileInputRef.current?.click(); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
          style={{ border: `2px dashed ${dragOver ? token.blueMid : uploadMsg.type === 'ok' ? '#16a34a' : uploadMsg.type === 'err' ? '#dc2626' : 'rgba(26,42,87,0.14)'}`, borderRadius: '1.1rem', padding: isMobile ? '1.75rem 1.25rem' : '2.65rem 2.4rem', textAlign: 'center', cursor: uploadLoading ? 'wait' : 'pointer', background: dragOver ? 'rgba(45,74,140,0.04)' : '#f8fafc', marginBottom: isMobile ? '1.25rem' : '1.55rem', flexShrink: 0, transition: 'border-color 0.2s' }}>
          <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={hUpload} />
          <div style={{ width: 56, height: 56, borderRadius: '1rem', background: uploadMsg.type === 'ok' ? 'rgba(22,163,74,0.1)' : uploadMsg.type === 'err' ? 'rgba(220,38,38,0.1)' : 'linear-gradient(180deg,#ffffff,#eef2f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
            {uploadMsg.type === 'ok' ? <CheckCircle2 size={24} style={{ color: '#16a34a' }} /> : uploadMsg.type === 'err' ? <AlertCircle size={24} style={{ color: '#dc2626' }} /> : <CloudUpload size={24} style={{ color: token.blueMid }} />}
          </div>
          <p style={{ fontWeight: 700, color: uploadMsg.type === 'ok' ? '#15803d' : uploadMsg.type === 'err' ? '#b91c1c' : token.blue, fontSize: '0.96rem', marginBottom: '0.38rem' }}>
            {uploadLoading ? 'Mengupload...' : uploadMsg.text ? uploadMsg.text : 'Klik atau seret file .docx ke sini'}
          </p>
          {!uploadMsg.text && <p style={{ fontSize: '0.77rem', color: token.muted }}>Hanya file <b>.docx</b> yang didukung</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isMobile ? '0.75rem' : '0.95rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: token.muted }}>Template tersimpan</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: token.blueMid, background: 'rgba(26,42,87,0.06)', border: '1px solid rgba(26,42,87,0.10)', padding: '0.22rem 0.62rem', borderRadius: '999px' }}>{templates.length}</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {templates.length === 0 ? (
            <div style={{ padding: '2.75rem 1rem', textAlign: 'center', border: '1.5px dashed rgba(26,42,87,0.14)', borderRadius: '1rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FileText size={28} style={{ color: token.blueMid, opacity: 0.5, marginBottom: '0.75rem' }} />
              <p style={{ color: token.text, fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.35rem' }}>Belum ada template</p>
              <p style={{ color: token.muted, fontSize: '0.79rem' }}>Upload file .docx pertama Anda di atas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {templates.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.1rem', borderRadius: '1rem', background: 'linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))', border: '1px solid rgba(26,42,87,0.10)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '0.85rem', background: 'linear-gradient(180deg,#ffffff,#eef2f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(26,42,87,0.08)' }}>
                      <FileText size={15} style={{ color: token.blueMid }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: token.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</div>
                      <div style={{ fontSize: '0.72rem', color: token.muted, marginTop: '0.08rem' }}>.docx template</div>
                    </div>
                  </div>
                  <button onClick={() => hDeleteTemplate(t)} title={`Hapus "${t}"`} style={{ background: 'linear-gradient(180deg,#ffffff,#fff4f4)', border: '1px solid rgba(220,38,38,0.18)', borderRadius: '0.75rem', padding: '0.48rem', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
