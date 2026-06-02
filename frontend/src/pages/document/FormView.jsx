import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, RefreshCw, Save, Plus, CalendarDays, Building2, FileText, User, AlignLeft, CheckCircle2, Check } from 'lucide-react';
import { token, card, Btn } from './SharedUI';

const MOBILE_BP = 768;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FIELD_HEIGHT = '2.75rem';
const FIELD_PADDING_X = '0.95rem';
const FIELD_BORDER_COLOR = 'rgba(26,42,87,0.12)';
const FIELD_SHADOW = '0 2px 8px rgba(26,42,87,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';
const FOCUS_COLOR = '#2d4a8c';
const FOCUS_SHADOW = '0 0 0 3px rgba(26,42,87,0.15), 0 2px 8px rgba(26,42,87,0.10)';

const baseInp = {
  width: '100%', height: FIELD_HEIGHT, padding: `0 ${FIELD_PADDING_X}`,
  fontSize: '0.875rem', color: '#1e293b', background: '#f1f5f9',
  border: `1.5px solid ${FIELD_BORDER_COLOR}`, borderRadius: '0.75rem',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: `border-color 180ms ${EASE}, box-shadow 180ms ${EASE}, background 180ms ${EASE}`,
  boxShadow: FIELD_SHADOW,
};

function Inp({ readOnly, style, isMobile, ...props }) {
  const ro = readOnly ? { background: 'linear-gradient(135deg,#e2e8f0,#d8e0ec)', color: '#94a3b8', cursor: 'not-allowed', borderColor: 'rgba(148,163,184,0.2)', boxShadow: 'none' } : {};
  return (
    <input readOnly={readOnly} {...props}
      style={{ ...baseInp, ...(isMobile ? { fontSize: '16px' } : null), ...ro, ...style }}
      onFocus={e => { if (!readOnly) { e.target.style.borderColor = FOCUS_COLOR; e.target.style.boxShadow = FOCUS_SHADOW; e.target.style.background = '#f0f4fa'; } }}
      onBlur={e => { e.target.style.borderColor = ro.borderColor || FIELD_BORDER_COLOR; e.target.style.background = ro.background || '#f1f5f9'; e.target.style.boxShadow = ro.boxShadow || FIELD_SHADOW; }}
    />
  );
}

function Sel({ children, style, disabled, isMobile, ...props }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const wrapRef = useRef(null);
  const hasValue = String(props.value ?? '').trim() !== '';
  const options = useMemo(() => React.Children.toArray(children).filter(React.isValidElement).map(c => ({ value: c.props.value ?? '', label: c.props.children, disabled: Boolean(c.props.disabled) })), [children]);
  const selectedOption = options.find(o => String(o.value) === String(props.value ?? ''));
  const placeholder = options[0]?.value === '' ? options[0]?.label : null;
  const displayLabel = hasValue ? selectedOption?.label : (placeholder ?? options[0]?.label ?? '');

  useEffect(() => {
    if (isMobile || disabled || !open) return;
    const onDown = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [disabled, isMobile, open]);

  if (isMobile) {
    return (
      <div style={{ position: 'relative' }}>
        <select disabled={disabled} {...props} style={{ ...baseInp, fontSize: '16px', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'linear-gradient(135deg,#e2e8f0,#d8e0ec)' : '#f1f5f9', color: disabled ? '#94a3b8' : hasValue ? '#1e293b' : '#94a3b8', paddingRight: '3rem', fontWeight: hasValue ? 600 : 400, appearance: 'none', WebkitAppearance: 'none', borderColor: disabled ? 'rgba(148,163,184,0.2)' : FIELD_BORDER_COLOR, boxShadow: disabled ? 'none' : FIELD_SHADOW, ...style }}>
          {children}
        </select>
        <div style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', pointerEvents: 'none', color: disabled ? '#cbd5e1' : '#6366f1' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => { if (!disabled) setOpen(c => !c); }}
        style={{ ...baseInp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'linear-gradient(135deg,#e2e8f0,#d8e0ec)' : open ? '#f0f4fa' : '#f1f5f9', color: disabled ? '#94a3b8' : hasValue ? '#1e293b' : '#94a3b8', paddingLeft: FIELD_PADDING_X, paddingRight: '0.65rem', borderColor: open ? FOCUS_COLOR : disabled ? 'rgba(148,163,184,0.2)' : FIELD_BORDER_COLOR, boxShadow: open ? FOCUS_SHADOW : disabled ? 'none' : FIELD_SHADOW, fontWeight: hasValue ? 600 : 400, textAlign: 'left' }}>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{displayLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem', height: '1.75rem', borderRadius: '0.55rem', flexShrink: 0, background: disabled ? 'rgba(148,163,184,0.1)' : open ? 'linear-gradient(135deg,#1a2a57,#2d4a8c)' : hasValue ? 'linear-gradient(135deg,#eef1f9,#dde3ef)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: open ? 'none' : `1px solid ${hasValue ? 'rgba(26,42,87,0.2)' : 'rgba(148,163,184,0.18)'}`, boxShadow: open ? '0 4px 12px rgba(26,42,87,0.25)' : 'none', transition: `all 200ms ${EASE}` }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={open ? '#ffffff' : hasValue ? '#2d4a8c' : '#94a3b8'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 220ms ${EASE}` }}><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 0.4rem)', left: 0, right: 0, zIndex: 50, borderRadius: '0.9rem', background: '#ffffff', border: '1.5px solid rgba(26,42,87,0.10)', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', overflow: 'hidden', animation: `dropIn 180ms ${EASE} both` }}>
          <div style={{ padding: '0.5rem 0.5rem 0.3rem' }}>
            <div style={{ display: 'grid', gap: '0.2rem', maxHeight: '240px', overflowY: 'auto' }}>
              {options.map(opt => {
                const isSelected = String(opt.value) === String(props.value ?? '');
                const isHov = hovered === opt.value;
                return (
                  <button key={String(opt.value)} type="button" disabled={opt.disabled}
                    onClick={() => { if (opt.disabled) return; props.onChange?.({ target: { name: props.name, value: opt.value } }); setOpen(false); }}
                    onMouseEnter={() => setHovered(opt.value)} onMouseLeave={() => setHovered(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: '2.5rem', padding: '0.55rem 0.75rem', border: 'none', borderRadius: '0.65rem', background: isSelected ? 'linear-gradient(135deg,#1a2a57,#2d4a8c)' : isHov && !opt.disabled ? 'linear-gradient(135deg,#eef1f9,#dde3ef)' : 'transparent', color: opt.disabled ? '#cbd5e1' : isSelected ? '#ffffff' : isHov ? '#2d4a8c' : '#334155', fontSize: '0.86rem', fontWeight: isSelected ? 700 : isHov ? 600 : 500, textAlign: 'left', cursor: opt.disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ width: '1.2rem', height: '1.2rem', borderRadius: '0.35rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'rgba(255,255,255,0.25)' : 'transparent' }}>
                      {isSelected && <Check size={11} strokeWidth={3} color="#ffffff" />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DatePicker({ name, value, onChange, required, isMobile }) {
  return (
    <div style={{ position: 'relative' }}>
      <input type="date" className="docform-date-input" name={name} value={value} onChange={onChange} required={required}
        style={{ ...baseInp, ...(isMobile ? { fontSize: '16px' } : null), paddingRight: '3rem', color: value ? '#1e293b' : '#94a3b8', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', colorScheme: 'light' }}
        onFocus={e => { e.target.style.borderColor = FOCUS_COLOR; e.target.style.boxShadow = FOCUS_SHADOW; e.target.style.background = '#f0f4fa'; }}
        onBlur={e => { e.target.style.borderColor = FIELD_BORDER_COLOR; e.target.style.background = '#f1f5f9'; e.target.style.boxShadow = FIELD_SHADOW; }}
        onClick={e => e.currentTarget.showPicker?.()}
      />
      <div style={{ position: 'absolute', top: '50%', right: '0.7rem', transform: 'translateY(-50%)', width: '1.75rem', height: '1.75rem', borderRadius: '0.55rem', background: value ? 'linear-gradient(135deg,#1a2a57,#2d4a8c)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', border: value ? 'none' : '1px solid rgba(148,163,184,0.18)', boxShadow: value ? '0 4px 10px rgba(26,42,87,0.25)' : 'none' }}>
        <CalendarDays size={13} color={value ? '#ffffff' : '#94a3b8'} />
      </div>
    </div>
  );
}

function DocField({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#2d4a8c' }}>
        {label}{required && <span style={{ color: '#f43f5e', marginLeft: 3 }}>*</span>}
      </span>
      {children}
    </div>
  );
}

function SectionDivider({ icon: Icon, label, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', margin: '1.75rem 0 1.1rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: '0.8rem', flexShrink: 0, background: `${accent}20`, border: `1.5px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${accent}20` }}>
        <Icon size={14} color={accent} strokeWidth={2.2} />
      </div>
      <span style={{ fontSize: '0.71rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: accent, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1.5px', background: `linear-gradient(90deg, ${accent}40 0%, ${accent}10 50%, transparent 100%)`, borderRadius: '9999px' }} />
    </div>
  );
}

function Grid({ cols, isMobile, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: '0.9rem' }}>{children}</div>;
}

function ResultBanner({ doc, isMobile, loading, onCopy, onDownload, onDuplicate, onSave, onNew }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1a2a57 0%, #2d4a8c 60%, #3a5fa8 100%)', borderRadius: '1rem', padding: isMobile ? '1.25rem 1rem' : '1.5rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 50px rgba(26,42,87,0.30)', marginTop: '2rem', animation: `fUp 480ms ${EASE} both` }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <CheckCircle2 size={14} color="#a5f3fc" />
          <span style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Nomor Dokumen Berhasil Dibuat</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: isMobile ? '1.2rem' : '1.55rem', fontWeight: 800, letterSpacing: '0.5px', wordBreak: 'break-all', lineHeight: 1.2 }}>{doc.doc_number}</span>
          <button type="button" onClick={onCopy} title="Salin" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '0.5rem', padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <Copy size={13} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          <Btn type="button" onClick={onNew} style={{ background: '#ffffff', color: token.blue, border: 'none' }}><Plus size={13} />Buat Baru</Btn>
          <Btn type="button" onClick={onDuplicate} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}><Copy size={13} />Duplikat</Btn>
          <Btn type="button" variant="success" onClick={onDownload}><Download size={13} />Download .docx</Btn>
          <Btn type="submit" onClick={onSave} disabled={loading} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
            {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}Simpan
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function FormView({ editingDoc, generatedDoc, formData, templates, masterData, loading, hChange, hSubmit, hDownload, resetForm, startDuplicate, userName }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BP);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth <= MOBILE_BP); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  return (
    <div style={{ padding: isMobile ? '0.5rem 0' : '0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: '100%' }}>
      <style>{`@keyframes fUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes dropIn{from{opacity:0;transform:translateY(-8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes spin{to{transform:rotate(360deg)}} .docform-date-input::-webkit-calendar-picker-indicator{opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer}`}</style>
      <div style={{ ...card, padding: isMobile ? '1.1rem' : '1.75rem', borderRadius: isMobile ? '1rem' : '1.25rem', flex: '0 0 auto', animation: `fUp 600ms ${EASE} both`, background: 'linear-gradient(180deg,rgba(255,255,255,0.99) 0%,rgba(248,250,255,0.98) 100%)', border: '1.5px solid rgba(26,42,87,0.10)', boxShadow: '0 4px 6px rgba(26,42,87,0.04), 0 12px 32px rgba(26,42,87,0.10)', overflow: 'hidden' }}>
        <form onSubmit={hSubmit}>
          <SectionDivider icon={Building2} label="Perusahaan" accent="#1a2a57" />
          <Grid cols="1fr 1fr 1fr" isMobile={isMobile}>
            <DocField label="Pilih Perusahaan">
              <Sel name="company" value={formData.company} onChange={hChange} disabled={!!editingDoc} isMobile={isMobile}>
                <option value="PNM">PT Pilar Niaga Makmur (PNM)</option>
                <option value="PKS">PT Pilkada (PKS)</option>
                <option value="PKP">PT Pikasa (PKP)</option>
              </Sel>
            </DocField>
            <DocField label="Template Dokumen">
              <Sel name="template_name" value={formData.template_name} onChange={hChange} isMobile={isMobile}>
                {templates.length === 0 ? <option value="">— Belum ada template —</option> : templates.map(t => <option key={t} value={t}>{t}</option>)}
              </Sel>
            </DocField>
            <DocField label="Internal / External">
              <Sel name="internal_external" value={formData.internal_external} onChange={hChange} isMobile={isMobile}>
                <option value="Internal">Internal</option>
                <option value="External">External</option>
              </Sel>
            </DocField>
          </Grid>

          <SectionDivider icon={FileText} label="Judul Dokumen" accent="#2d4a8c" />
          <DocField label="Judul Dokumen" required>
            <Inp type="text" name="judul_dokumen" value={formData.judul_dokumen} onChange={hChange} placeholder="Contoh: Perjanjian Kerja Sama Pemasaran..." required isMobile={isMobile} />
          </DocField>

          <SectionDivider icon={User} label="Pengguna & Tanggal" accent="#10b981" />
          <Grid cols="1fr 1fr 1fr 1fr" isMobile={isMobile}>
            <DocField label="User"><Inp value={userName || ''} readOnly isMobile={isMobile} /></DocField>
            <DocField label="Divisi" required>
              <Sel name="division" value={formData.division} onChange={hChange} required isMobile={isMobile}>
                <option value="">— Pilih —</option>
                {masterData.divisions.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
              </Sel>
            </DocField>
            <DocField label="Tanggal Dokumen" required>
              <DatePicker name="doc_date" value={formData.doc_date} onChange={hChange} required isMobile={isMobile} />
            </DocField>
            <DocField label="Klasifikasi">
              <Inp type="text" name="klasifikasi" value={formData.klasifikasi} onChange={hChange} placeholder="Surat Edaran..." isMobile={isMobile} />
            </DocField>
          </Grid>

          <SectionDivider icon={AlignLeft} label="Detail Dokumen" accent="#f59e0b" />
          <Grid cols="1fr 1fr" isMobile={isMobile}>
            <DocField label="Perihal"><Inp type="text" name="perihal" value={formData.perihal} onChange={hChange} placeholder="Perihal dokumen..." isMobile={isMobile} /></DocField>
            <DocField label="Ditandatangani Oleh"><Inp type="text" name="signed_by" value={formData.signed_by} onChange={hChange} placeholder="Nama penandatangan" isMobile={isMobile} /></DocField>
            <DocField label="Link Dokumen"><Inp type="text" name="link_document" value={formData.link_document} onChange={hChange} placeholder="https://..." isMobile={isMobile} /></DocField>
            <DocField label="Keterangan">
              <textarea name="keterangan" value={formData.keterangan} onChange={hChange} placeholder="Catatan opsional..." rows={2}
                style={{ ...baseInp, height: 'auto', padding: '0.65rem 0.85rem', resize: 'vertical', lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = FOCUS_COLOR; e.target.style.boxShadow = FOCUS_SHADOW; e.target.style.background = '#f0f4fa'; }}
                onBlur={e => { e.target.style.borderColor = FIELD_BORDER_COLOR; e.target.style.background = '#f1f5f9'; e.target.style.boxShadow = FIELD_SHADOW; }}
              />
            </DocField>
          </Grid>

          {generatedDoc ? (
            <ResultBanner doc={generatedDoc} isMobile={isMobile} loading={loading}
              onCopy={() => { navigator.clipboard.writeText(generatedDoc.doc_number); alert('Nomor disalin!'); }}
              onDownload={() => hDownload(generatedDoc)} onDuplicate={() => startDuplicate(generatedDoc)} onSave={hSubmit} onNew={resetForm}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'center', marginTop: '2rem' }}>
              <Btn type="submit" variant="primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem 2.5rem', fontSize: '0.9rem', borderRadius: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
                {loading ? <><RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</> : editingDoc ? <><Save size={17} /> Simpan Perubahan</> : <><Plus size={17} /> Generate Nomor Baru</>}
              </Btn>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
