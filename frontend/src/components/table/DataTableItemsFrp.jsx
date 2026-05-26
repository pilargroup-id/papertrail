import React from 'react'
import SearchableSelect from '../template/SearchableSelect.jsx'

const normalizeNumber = v => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

const formatCurrency = v => new Intl.NumberFormat('id-ID').format(normalizeNumber(v))

const formatNumberInput = v => {
  if (v === undefined || v === null || v === '') return ''
  const clean = String(v).replace(/\D/g, '')
  if (!clean) return ''
  return new Intl.NumberFormat('en-US').format(parseInt(clean, 10))
}

export default function DataTableItemsFrp({
  items,
  isMobile,
  budgetSelectOptions,
  updateItem,
  handleAddRow,
  handleRemoveRow,
  getBudgetAmount,
  totalAmount,
  calculateRowAmount,
  budgets,
  kurs
}) {
  const getBudgetObj = budgetId => {
    return (budgets || []).find(b => b.id === budgetId)
  }

  const getSisaBudget = budgetId => {
    const b = getBudgetObj(budgetId)
    if (!b) return 0
    return b.budget_remaining !== undefined ? b.budget_remaining : (b.sisa_budget !== undefined ? b.sisa_budget : (b.sisaBudget !== undefined ? b.sisaBudget : (b.remainingAmount !== undefined ? b.remainingAmount : 0)))
  }

  const isHargaSatuanExceeded = (item) => {
    if (!item.budgetId || !item.hargaSatuan) return false
    const budgetRemaining = getSisaBudget(item.budgetId)
    const unitPriceIdr = normalizeNumber(item.hargaSatuan) * (normalizeNumber(kurs) || 1)
    return unitPriceIdr > budgetRemaining
  }

  const isTotalAmountExceeded = (item) => {
    if (!item.budgetId || !item.hargaSatuan) return false
    const budgetRemaining = getSisaBudget(item.budgetId)
    const totalAmountIdr = calculateRowAmount ? calculateRowAmount(item) : (normalizeNumber(item.qty) * normalizeNumber(item.hargaSatuan) * (normalizeNumber(kurs) || 1))
    return totalAmountIdr > budgetRemaining
  }

  return (
    <div>
      <h3 className="frp-section-title">
        <span className="material-icons-round" style={{ color: '#1f4e8c', fontSize: '20px' }}>table_rows</span>
        Line Items
      </h3>
      {isMobile ? (
        <div>
          {items.map((item, idx) => (
            <div key={idx} className="frp-item-card">
              <div className="frp-item-card-header">
                <div className="frp-item-card-title">Item {idx + 1}</div>
                <button type="button" className="frp-btn-del" onClick={() => handleRemoveRow(idx)}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                </button>
              </div>
              <div className="frp-grid-2">
                <div className="frp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="frp-label">Memo</label>
                  <input name={`items[${idx}][memo]`} className="frp-input" value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi..." />
                </div>
                <div className="frp-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="frp-label">Budget</label>
                  <SearchableSelect
                    name={`items[${idx}][budgetId]`}
                    value={item.budgetId}
                    onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                    options={budgetSelectOptions}
                    placeholder="Pilih Budget"
                    className="frp-select"
                  />
                </div>
                <div className="frp-form-group">
                  <label className="frp-label">Qty</label>
                  <input type="number" name={`items[${idx}][qty]`} className="frp-input" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                </div>
                <div className="frp-form-group">
                  <label className="frp-label">Harga Satuan</label>
                  <input
                    type="text"
                    name={`items[${idx}][hargaSatuan]`}
                    className={`frp-input ${isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? 'frp-input-error' : ''}`}
                    style={isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                    value={formatNumberInput(item.hargaSatuan)}
                    onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/\D/g, ''))}
                  />
                  {isHargaSatuanExceeded(item) && (
                    <span style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500 }}>
                      Harga Satuan melebihi sisa budget
                    </span>
                  )}
                  {!isHargaSatuanExceeded(item) && isTotalAmountExceeded(item) && (
                    <span style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500 }}>
                      Total amount melebihi sisa budget
                    </span>
                  )}
                </div>
              </div>
              <div className="frp-item-card-amount" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                  <span className="frp-total-label" style={{ fontSize: '0.8rem' }}>Sisa Budget</span>
                  <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#16a34a' }}>
                    {item.budgetId ? `Rp ${formatCurrency(getSisaBudget(item.budgetId))}` : '-'}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 10px', borderRadius: '10px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                  <span className="frp-total-label" style={{ fontSize: '0.8rem' }}>Amount (IDR)</span>
                  <strong style={{ minWidth: 0, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem', color: '#1f4e8c' }}>
                    Rp {formatCurrency(calculateRowAmount ? calculateRowAmount(item) : 0)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="frp-table">
            <thead>
              <tr>
                <th className="frp-th" style={{ width: "25%" }}>Memo</th>
                <th className="frp-th" style={{ width: "25%" }}>Budget</th>
                <th className="frp-th" style={{ width: "15%" }}>Sisa Budget</th>
                <th className="frp-th" style={{ width: "8%" }}>Qty</th>
                <th className="frp-th" style={{ width: "13%" }}>Harga Satuan</th>
                <th className="frp-th" style={{ width: "12%" }}>Amount (IDR)</th>
                <th className="frp-th" style={{ width: "2%" }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="frp-td">
                    <input name={`items[${idx}][memo]`} className="frp-td-input" value={item.memo} onChange={e => updateItem(idx, 'memo', e.target.value)} placeholder="Deskripsi..." />
                  </td>
                  <td className="frp-td">
                    <SearchableSelect
                      name={`items[${idx}][budgetId]`}
                      value={item.budgetId}
                      onChange={selectedValue => updateItem(idx, 'budgetId', selectedValue)}
                      options={budgetSelectOptions}
                      placeholder="Pilih Budget"
                      className="frp-td-select"
                      menuPosition="fixed"
                    />
                  </td>
                  <td className="frp-td">
                    <input
                      className="frp-td-input" style={{ background: "#f8fafc", color: "#475569", fontWeight: 600 }}
                      value={item.budgetId ? formatCurrency(getSisaBudget(item.budgetId)) : '-'}
                      readOnly
                    />
                  </td>
                  <td className="frp-td">
                    <input type="number" name={`items[${idx}][qty]`} className="frp-td-input" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                  </td>
                  <td className="frp-td">
                    <input
                      type="text"
                      name={`items[${idx}][hargaSatuan]`}
                      className="frp-td-input"
                      style={isHargaSatuanExceeded(item) || isTotalAmountExceeded(item) ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', outline: 'none' } : {}}
                      value={formatNumberInput(item.hargaSatuan)}
                      onChange={e => updateItem(idx, 'hargaSatuan', e.target.value.replace(/\D/g, ''))}
                    />
                    {isHargaSatuanExceeded(item) && (
                      <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500, lineHeight: '1.2' }}>
                        Harga Satuan melebihi sisa budget
                      </div>
                    )}
                    {!isHargaSatuanExceeded(item) && isTotalAmountExceeded(item) && (
                      <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px', fontWeight: 500, lineHeight: '1.2' }}>
                        Total amount melebihi sisa budget
                      </div>
                    )}
                  </td>
                  <td className="frp-td">
                    <input
                      className="frp-td-input" style={{ background: "#f8fafc", color: "#475569", fontWeight: 600 }}
                      value={formatCurrency(calculateRowAmount ? calculateRowAmount(item) : 0)}
                      readOnly
                    />
                  </td>
                  <td className="frp-td">
                    <button type="button" className="frp-btn-del" onClick={() => handleRemoveRow(idx)}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="frp-total-row">
        <button type="button" className="frp-btn-add" onClick={handleAddRow}>
          <span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>
          Tambah Baris
        </button>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <span className="frp-total-label">Total Pembayaran</span>
          <div className="frp-total-value">Rp {formatCurrency(totalAmount)}</div>
        </div>
      </div>
    </div>
  )
}
