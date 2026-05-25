import React from 'react'
import SearchableSelect from '../template/SearchableSelect.jsx'

const normalizeNumber = v => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isNaN(n) ? 0 : n }
const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))
const formatNumberInput = v => { if (!v && v !== 0) return ''; const c = String(v).replace(/\D/g, ''); return c ? new Intl.NumberFormat('en-US').format(parseInt(c, 10)) : '' }

const S = {
  sectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' },
  input: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)', transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s' },
  select: { width: '100%', minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  tdInput: { width: '100%', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc' },
  tdSelect: { width: '100%', minWidth: 0, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d7e0ea', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', cursor: 'pointer' },
  btnAdd: { display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  btnDel: { display: 'inline-flex', alignItems: 'center', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', fontFamily: 'inherit' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' },
  totalLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  totalValue: { fontSize: '1.1rem', fontWeight: 800, color: '#1f4e8c' },
  itemCard: { padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#fbfdff', marginBottom: '0.85rem', minWidth: 0, overflow: 'visible' },
  itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '0.9rem', flexWrap: 'wrap' },
  itemCardTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' },
  itemCardAmount: { marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #e2e8f0' },
}

export default function DataTableItemsRp({
  items,
  isMobile,
  budgetSelectOpts,
  updateItem,
  removeRow,
  addRow,
  getBudgetRemaining,
  totalAmount,
  mobileDropdownStyle
}) {
  return (
    <div>
      <h3 style={S.sectionTitle}>
        <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>
        Detail Item
      </h3>
      {isMobile ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {items.map((item, idx) => {
            const remaining = getBudgetRemaining(item.budgetId)
            const subtotal = normalizeNumber(item.qty) * normalizeNumber(item.estimatedValue)
            return (
              <div key={idx} style={S.itemCard}>
                <div style={S.itemCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                    <div style={{ ...S.itemCardTitle, minWidth: 0 }}>Item Request</div>
                  </div>
                  <button type="button" style={S.btnDel} onClick={() => removeRow(idx)}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Budget</label>
                    <SearchableSelect name={`items[${idx}][budgetId]`} value={item.budgetId} onChange={v => updateItem(idx, 'budgetId', v)} options={budgetSelectOpts} placeholder="Pilih Budget" style={S.select} dropdownStyle={mobileDropdownStyle} menuPosition="fixed" />
                  </div>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Memo</label>
                    <input name={`items[${idx}][memo]`} style={S.input} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi item..." />
                  </div>
                  <div style={{ ...S.formGroup, gridColumn: '1 / -1' }}>
                    <label style={S.label}>Link Pembelian</label>
                    <input name={`items[${idx}][linkPembelian]`} style={S.input} value={item.linkPembelian} onChange={e => updateItem(idx, 'linkPembelian', e.target.value)} placeholder="https://..." />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Qty</label>
                    <input type="number" name={`items[${idx}][qty]`} style={S.input} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Estimated Value</label>
                    <input type="text" name={`items[${idx}][estimatedValue]`} style={S.input} value={formatNumberInput(item.estimatedValue)} onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                <div style={{ ...S.itemCardAmount, display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                    <span style={S.totalLabel}>Budget Remaining</span>
                    <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: remaining !== null && remaining < 0 ? '#ef4444' : '#16a34a', overflowWrap: 'anywhere' }}>{remaining !== null ? `Rp ${formatCurrency(remaining)}` : '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                    <span style={S.totalLabel}>Subtotal Estimated</span>
                    <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#1f4e8c', overflowWrap: 'anywhere' }}>Rp {formatCurrency(subtotal)}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: '4%' }}>No</th>
              <th style={{ ...S.th, width: '22%' }}>Item Group (Budget)</th>
              <th style={{ ...S.th, width: '16%' }}>Memo</th>
              <th style={{ ...S.th, width: '18%' }}>Link Pembelian</th>
              <th style={{ ...S.th, width: '6%' }}>Qty</th>
              <th style={{ ...S.th, width: '14%' }}>Estimated Value</th>
              <th style={{ ...S.th, width: '14%' }}>Budget Remaining</th>
              <th style={{ ...S.th, width: '5%' }} />
            </tr></thead>
            <tbody>
              {items.map((item, idx) => {
                const remaining = getBudgetRemaining(item.budgetId)
                return (
                  <tr key={idx}>
                    <td style={S.td}><span style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</span></td>
                    <td style={S.td}><SearchableSelect name={`items[${idx}][budgetId]`} value={item.budgetId} onChange={v => updateItem(idx, 'budgetId', v)} options={budgetSelectOpts} placeholder="Pilih Budget" style={S.tdSelect} menuPosition="fixed" /></td>
                    <td style={S.td}><input name={`items[${idx}][memo]`} style={S.tdInput} value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi item..." /></td>
                    <td style={S.td}><input name={`items[${idx}][linkPembelian]`} style={S.tdInput} value={item.linkPembelian} onChange={e => updateItem(idx, 'linkPembelian', e.target.value)} placeholder="https://..." /></td>
                    <td style={S.td}><input type="number" name={`items[${idx}][qty]`} style={S.tdInput} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                    <td style={S.td}><input type="text" name={`items[${idx}][estimatedValue]`} style={S.tdInput} value={formatNumberInput(item.estimatedValue)} onChange={e => updateItem(idx, 'estimatedValue', e.target.value.replace(/\D/g, ''))} /></td>
                    <td style={S.td}><input style={{ ...S.tdInput, background: '#f0fdf4', color: remaining !== null && remaining < 0 ? '#ef4444' : '#16a34a', fontWeight: 600 }} value={remaining !== null ? formatCurrency(remaining) : '-'} readOnly /></td>
                    <td style={S.td}><button type="button" style={S.btnDel} onClick={() => removeRow(idx)}><span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ ...S.totalRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '0.85rem' : '1rem' }}>
        <button type="button" style={{ ...S.btnAdd, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={addRow}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
          Tambah Baris
        </button>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <span style={S.totalLabel}>Total Estimated Value</span>
          <div style={S.totalValue}>Rp {formatCurrency(totalAmount)}</div>
        </div>
      </div>
    </div>
  )
}
