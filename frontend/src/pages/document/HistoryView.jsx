import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, X, Copy, Edit, Download, Link, FileText, ChevronLeft, ChevronRight, ChevronDown, Save, SlidersHorizontal, Globe, LayoutList, Inbox, SearchX } from 'lucide-react';
import { token, Btn, card, Inp, badgeStyles, Field, Sel, Divider } from './SharedUI';

const MOBILE_BP = 768;
const formatDate = v => { if (!v) return '-'; try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v + 'T00:00:00')); } catch { return v; } };
const dash = v => v || '-';

function useIsMobile(bp = MOBILE_BP) {
  const [m, setM] = useState(() => window.innerWidth <= bp);
  useEffect(() => { const fn = () => setM(window.innerWidth <= bp); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, [bp]);
  return m;
}

function Overlay({ onClick }) { return <div onClick={onClick} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(5px)', zIndex: 9000 }} />; }

function ModalBox({ children, maxWidth = '700px', isMobile }) {
  return (
    <div style={{ position: 'fixed', top: isMobile ? 'max(12px,env(safe-area-inset-top,0px))' : '50%', left: '50%', transform: isMobile ? 'translateX(-50%)' : 'translate(-50%,-50%)', zIndex: 9001, background: token.surface, borderRadius: '1.1rem', boxShadow: '0 30px 80px rgba(15,23,42,0.25)', border: `1px solid ${token.border}`, maxHeight: isMobile ? 'calc(100dvh - 24px)' : '92vh', display: 'flex', flexDirection: 'column', width: isMobile ? 'calc(100vw - 24px)' : '92vw', maxWidth, overflowY: 'auto' }}>
      {children}
    </div>
  );
}

function EditModal({ doc, templates, masterData, onClose, onSaved, userName }) {
  const [form, setForm] = useState({ company: doc.company, template_name: doc.template_name || templates[0] || '', judul_dokumen: doc.judul_dokumen || '', division: doc.division || '', internal_external: doc.internal_external || 'Internal', doc_date: doc.doc_date || '', klasifikasi: doc.klasifikasi || '', perihal: doc.perihal || '', signed_by: doc.signed_by || '', keterangan: doc.keterangan || '', link_document: doc.link_document || '' });
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();
  const hChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const hSubmit = async e => { e.preventDefault(); if (!form.division || !form.doc_date) { alert('Harap isi Divisi dan Tanggal!'); return; } setSaving(true); try { await axios.put(`/api/document/documents/${doc.id}`, form); onSaved(); onClose(); } catch { alert('Gagal menyimpan.'); } finally { setSaving(false); } };

  return (
    <>
      <Overlay onClick={onClose} />
      <ModalBox maxWidth="800px" isMobile={isMobile}>
        <div style={{ padding: isMobile ? '1rem' : '1.25rem 1.75rem', borderBottom: `1px solid ${token.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: token.surface, zIndex: 1, borderRadius: '1.1rem 1.1rem 0 0' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: token.muted }}>Edit Dokumen</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: token.blue }}>{doc.doc_number}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(26,42,87,0.07)', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}><X size={18} /></button>
        </div>
        <form onSubmit={hSubmit} style={{ padding: isMobile ? '1rem' : '1rem 1.75rem 1.5rem' }}>
          <Divider label="Perusahaan" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Template"><Sel name="template_name" value={form.template_name} onChange={hChange}>{templates.map(t => <option key={t} value={t}>{t}</option>)}</Sel></Field>
            <Field label="Int/Ext"><Sel name="internal_external" value={form.internal_external} onChange={hChange}><option value="Internal">Internal</option><option value="External">External</option></Sel></Field>
            <Field label="Kode PT"><Inp value={form.company} readOnly /></Field>
          </div>
          <div style={{ marginTop: '1rem' }}><Field label="Judul Dokumen"><Inp type="text" name="judul_dokumen" value={form.judul_dokumen} onChange={hChange} placeholder="Judul dokumen..." /></Field></div>
          <Divider label="Pengguna & Tanggal" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="User"><Inp value={userName || ''} readOnly /></Field>
            <Field label="Divisi *"><Sel name="division" value={form.division} onChange={hChange} required><option value="">-- Pilih --</option>{masterData.divisions.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}</Sel></Field>
            <Field label="Tanggal *"><Inp type="date" name="doc_date" value={form.doc_date} onChange={hChange} required /></Field>
            <Field label="Klasifikasi"><Inp type="text" name="klasifikasi" value={form.klasifikasi} onChange={hChange} /></Field>
          </div>
          <Divider label="Detail" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <Field label="Perihal"><Inp type="text" name="perihal" value={form.perihal} onChange={hChange} /></Field>
            <Field label="Ditandatangani Oleh"><Inp type="text" name="signed_by" value={form.signed_by} onChange={hChange} /></Field>
            <Field label="Link Dokumen"><Inp type="text" name="link_document" value={form.link_document} onChange={hChange} placeholder="https://..." /></Field>
            <Field label="Keterangan"><textarea name="keterangan" value={form.keterangan} onChange={hChange} rows={2} style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem', color: token.text, background: token.surface, border: `1px solid ${token.border}`, borderRadius: '0.5rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} /></Field>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${token.border}`, display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Btn variant="ghost" type="button" onClick={onClose}>Batal</Btn>
            <Btn variant="primary" type="submit" disabled={saving}>{saving ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : <><Save size={13} /> Simpan Perubahan</>}</Btn>
          </div>
        </form>
      </ModalBox>
    </>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '1.25rem', background: hasFilters ? 'rgba(239,68,68,0.07)' : 'rgba(26,42,87,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
        {hasFilters ? <SearchX size={32} style={{ color: '#ef4444', opacity: 0.75 }} /> : <Inbox size={32} style={{ color: '#2d4a8c', opacity: 0.55 }} />}
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: hasFilters ? '#b91c1c' : '#1e293b', marginBottom: '0.45rem' }}>{hasFilters ? 'Tidak ada hasil' : 'Belum ada dokumen'}</div>
      <div style={{ fontSize: '0.82rem', color: '#8a93a6', maxWidth: '300px', lineHeight: 1.65, marginBottom: hasFilters ? '1.25rem' : 0 }}>{hasFilters ? 'Coba hapus filter atau ubah kata pencarian.' : 'Dokumen yang digenerate akan muncul di sini.'}</div>
      {hasFilters && <button type="button" onClick={onReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: '0.55rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}><X size={13} /> Hapus Filter</button>}
    </div>
  );
}

const thStyle = { padding: '1rem 1.15rem', textAlign: 'left', fontWeight: 700, fontSize: '0.66rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: token.muted, whiteSpace: 'nowrap', background: 'linear-gradient(180deg,#f8fafc,#eef2f6)' };
const tdStyle = { padding: '1rem 1.15rem', verticalAlign: 'top', borderBottom: `1px solid ${token.border}` };

export default function HistoryView({ filtered, pageSize, setPageSize, setCurrentPage, fetchData, tableLoading, searchTerm, setSearchTerm, searchDate, setSearchDate, searchIntExt, setSearchIntExt, pageData, currentPage, hDownload, totalPages, masterData, templates, userName }) {
  const [editDoc, setEditDoc] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const toggleRow = id => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isMobile = useIsMobile();

  return (
    <div style={{ position: 'relative', height: isMobile ? 'auto' : '100%', padding: isMobile ? '0.5rem 0' : '0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {editDoc && <EditModal doc={editDoc} templates={templates} masterData={masterData} userName={userName} onClose={() => setEditDoc(null)} onSaved={() => { fetchData(); setEditDoc(null); }} />}

      <div style={{ ...card, padding: isMobile ? '0.75rem' : '1rem', borderRadius: isMobile ? '1rem' : '1.25rem', flex: isMobile ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 'auto' : 0, overflow: isMobile ? 'visible' : 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,255,0.98))', border: '1.5px solid rgba(26,42,87,0.10)' }}>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem', justifyContent: 'space-between', padding: isMobile ? '0.6rem 0.75rem' : '0.6rem 0.85rem', background: 'linear-gradient(180deg,#f8fafc,#f1f5f9)', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: token.muted, paddingRight: '0.65rem', borderRight: '1px solid rgba(26,42,87,0.08)', flexShrink: 0 }}>
              <SlidersHorizontal size={13} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Filter</span>
            </div>
            <input type="search" value={searchTerm} placeholder="Cari dokumen..." onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ height: '2.35rem', padding: '0 0.8rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.10)', borderRadius: '0.8rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: 'linear-gradient(180deg,#f4f6f8,#eceff3)' }} />
            <select value={searchIntExt} onChange={e => { setSearchIntExt(e.target.value); setCurrentPage(1); }} style={{ height: '2.35rem', padding: '0 0.8rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.10)', borderRadius: '0.8rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: 'linear-gradient(180deg,#f4f6f8,#eceff3)', cursor: 'pointer' }}>
              <option value="">Semua</option><option value="Internal">Internal</option><option value="External">External</option>
            </select>
            <input type="date" value={searchDate} onChange={e => { setSearchDate(e.target.value); setCurrentPage(1); }} style={{ height: '2.35rem', padding: '0 0.8rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.10)', borderRadius: '0.8rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: 'linear-gradient(180deg,#f4f6f8,#eceff3)' }} />
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ height: '2.35rem', padding: '0 0.8rem', fontSize: '0.82rem', border: '1px solid rgba(26,42,87,0.10)', borderRadius: '0.8rem', outline: 'none', fontFamily: 'inherit', color: token.text, background: 'linear-gradient(180deg,#f4f6f8,#eceff3)', cursor: 'pointer' }}>
              {[10,25,50,100].map(n => <option key={n} value={n}>{n} baris</option>)}
            </select>
            {(searchTerm || searchDate || searchIntExt) && (
              <button type="button" onClick={() => { setSearchTerm(''); setSearchDate(''); setSearchIntExt(''); setCurrentPage(1); }} style={{ height: '2.35rem', padding: '0 0.8rem', fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(239,68,68,0.24)', borderRadius: '0.8rem', background: 'rgba(239,68,68,0.07)', color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><X size={13} /> Reset</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: token.blueMid, background: 'rgba(26,42,87,0.06)', border: '1px solid rgba(26,42,87,0.10)', padding: '0.38rem 0.8rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
              <FileText size={11} /> {filtered.length} dokumen
            </span>
            <button type="button" onClick={fetchData} disabled={tableLoading} style={{ height: '2.35rem', width: '2.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(26,42,87,0.10)', borderRadius: '0.8rem', background: 'linear-gradient(180deg,#f4f6f8,#eceff3)', cursor: tableLoading ? 'not-allowed' : 'pointer', color: token.muted }}>
              <RefreshCw size={13} style={tableLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          </div>
        </div>

        {/* Table */}
        {isMobile ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {pageData.length === 0 ? <EmptyState hasFilters={!!(searchTerm || searchDate || searchIntExt)} onReset={() => { setSearchTerm(''); setSearchDate(''); setSearchIntExt(''); setCurrentPage(1); }} /> : (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {pageData.map((doc, idx) => (
                  <div key={doc.id} style={{ border: '1px solid rgba(26,42,87,0.10)', borderRadius: '1rem', background: 'white', padding: '1rem' }}>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: token.blue, marginBottom: '0.5rem', wordBreak: 'break-word' }}>{doc.doc_number}</div>
                    <div style={{ fontSize: '0.85rem', color: token.text, fontWeight: 600, marginBottom: '0.5rem' }}>{dash(doc.judul_dokumen)}</div>
                    <div style={{ fontSize: '0.78rem', color: token.muted, marginBottom: '0.75rem' }}>{formatDate(doc.doc_date)} · {dash(doc.division)} · {dash(doc.internal_external)}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Btn variant="ghost" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setEditDoc(doc)}><Edit size={12} /> Edit</Btn>
                      <Btn variant="success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }} onClick={() => hDownload(doc)}><Download size={12} /> Download</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'white', borderRadius: '1rem', border: '1px solid rgba(26,42,87,0.10)' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.845rem', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>{['No','Kode PT','No. Dokumen','Judul','Tanggal','User','Divisi','Int/Ext','Aksi'].map(h => <th key={h} style={{ ...thStyle, borderBottom: `1px solid ${token.border}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr><td colSpan={9}><EmptyState hasFilters={!!(searchTerm || searchDate || searchIntExt)} onReset={() => { setSearchTerm(''); setSearchDate(''); setSearchIntExt(''); setCurrentPage(1); }} /></td></tr>
                ) : pageData.map((doc, idx) => (
                  <tr key={doc.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,42,87,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, textAlign: 'center', width: '4%' }}><span style={{ fontSize: '0.72rem', color: token.muted, fontWeight: 700 }}>{(currentPage - 1) * pageSize + idx + 1}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'center', width: '7%' }}><span style={{ ...(badgeStyles[doc.company] || {}), padding: '0.24rem 0.58rem', borderRadius: '999px', fontSize: '0.66rem', fontWeight: 700, display: 'inline-block' }}>{doc.company}</span></td>
                    <td style={{ ...tdStyle, width: '19%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: token.text, wordBreak: 'break-word', flex: 1 }}>{doc.doc_number}</span>
                        <button onClick={() => { navigator.clipboard.writeText(doc.doc_number); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: token.muted, padding: '0.1rem', display: 'flex' }} title="Salin"><Copy size={12} /></button>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, width: '20%' }}><div style={{ fontSize: '0.82rem', fontWeight: 600, color: token.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dash(doc.judul_dokumen)}</div></td>
                    <td style={{ ...tdStyle, width: '10%' }}><span style={{ fontSize: '0.82rem', color: token.text, whiteSpace: 'nowrap' }}>{formatDate(doc.doc_date)}</span></td>
                    <td style={{ ...tdStyle, width: '11%' }}><span style={{ fontSize: '0.82rem', color: token.text }}>{dash(doc.user_name)}</span></td>
                    <td style={{ ...tdStyle, width: '13%' }}><span style={{ fontSize: '0.82rem', color: token.text }}>{dash(doc.division)}</span></td>
                    <td style={{ ...tdStyle, width: '9%' }}><span style={{ fontSize: '0.78rem', color: token.muted }}>{dash(doc.internal_external)}</span></td>
                    <td style={{ ...tdStyle, width: '7%' }}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setEditDoc(doc)} title="Edit" style={{ background: 'rgba(26,42,87,0.06)', border: `1px solid ${token.border}`, borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: token.blue, display: 'flex' }}><Edit size={13} /></button>
                        <button onClick={() => hDownload(doc)} title="Download" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#059669', display: 'flex' }}><Download size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', padding: '0.5rem 0', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.78rem', color: token.muted }}>Halaman {currentPage} dari {totalPages} ({filtered.length} dokumen)</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.4rem 0.75rem', border: `1px solid ${token.border}`, borderRadius: '0.5rem', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? token.muted : token.blue, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.4rem 0.75rem', border: `1px solid ${token.border}`, borderRadius: '0.5rem', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? token.muted : token.blue, display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', fontWeight: 600 }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
