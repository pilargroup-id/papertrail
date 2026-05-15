function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeItems(items) {
  if (Array.isArray(items)) return items
  if (items && typeof items === 'object') return Object.keys(items).map((key) => items[key])
  return []
}

function normalizeCheckDocs(checkDocs) {
  if (Array.isArray(checkDocs)) return checkDocs
  if (!checkDocs) return []
  return [checkDocs]
}

function parseAmount(value) {
  const rawAmount = String(value || '0').replace(/\./g, '').replace(/[^0-9]/g, '')
  return parseInt(rawAmount, 10) || 0
}

function renderPdfDocument(formData = {}, preview = false) {
  const items = normalizeItems(formData.items)
  const checkDocs = normalizeCheckDocs(formData.checkDocs)
  const totalAmount = items.reduce((sum, item) => sum + parseAmount(item.amount), 0)
  const allDocs = [
    { name: 'Form Request Payment', required: true },
    { name: 'Tanda Terima Asli', required: false },
    { name: 'Invoice / Kontrak', required: true },
    { name: 'Surat Jalan Asli / Berita Acara', required: true },
    { name: 'Faktur Pajak', required: false },
    { name: 'Purchase Order', required: true },
  ]

  const itemsRows = items.map((item, idx) => {
    const amount = parseAmount(item.amount)
    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${escapeHtml(item.memo || '-')}</td>
        <td>${escapeHtml(item.budgetId || '-')}</td>
        <td class="amount-col">${amount.toLocaleString('id-ID')}</td>
      </tr>
    `
  }).join('')

  const checklistRows = allDocs.map((doc, idx) => {
    const isChecked = checkDocs.includes(doc.name)
    return `
      <div class="checklist-item">
        <span class="check-box ${isChecked ? 'checked' : ''}">${isChecked ? '&#10003;' : ''}</span>
        <span>${idx + 1}. ${escapeHtml(doc.name)}${doc.required ? ' *' : ''}</span>
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>FRP - ${escapeHtml(formData.frpNo || 'DRAFT')}</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #000; background: #f1f5f9; }
    .print-toolbar { background: #1e293b; color: white; padding: 10px 20px; display: ${preview ? 'flex' : 'none'}; justify-content: center; align-items: center; gap: 20px; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .toolbar-btn { display: flex; align-items: center; gap: 8px; background: #4f46e5; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; }
    .page { background: white; width: 210mm; min-height: 297mm; margin: 10px auto; padding: 12mm; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    @media print { body { background: white; } .print-toolbar { display: none !important; } .page { margin: 0; box-shadow: none; padding: 10mm; width: 100%; } @page { size: A4; margin: 0; } }
    .header-title { text-align: center; font-size: 18px; font-weight: 800; margin-bottom: 5px; border-bottom: 1.5px solid #333; padding-bottom: 5px; text-transform: uppercase; }
    .frp-number-box { border: 1.5px solid #000; padding: 4px 15px; display: inline-block; border-radius: 4px; font-weight: 800; font-size: 15px; }
    .info-row { display: flex; gap: 20px; margin-bottom: 10px; }
    .info-col { flex: 1; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .info-table td { padding: 3px 6px; vertical-align: top; font-size: 14px; }
    .info-table .label { font-weight: 700; width: 140px; color: #333; }
    .info-table .separator { width: 10px; text-align: center; }
    .checklist-section { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
    .checklist-title { font-weight: 800; font-size: 13px; margin-bottom: 5px; text-decoration: underline; }
    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .checklist-item { font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .check-box { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; text-align: center; line-height: 12px; font-size: 11px; font-weight: 900; }
    .check-box.checked { background: #444; color: #fff; }
    .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .items-table th { background: #f8fafc; color: #000; padding: 8px 10px; font-size: 13px; text-align: left; font-weight: 700; border: 1px solid #ddd; }
    .items-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 14px; }
    .items-table .amount-col { text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: 700; }
    .items-table .total-row td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #333; font-size: 15px; }
    .keterangan { border: 1px solid #ddd; padding: 8px 12px; margin: 10px 0; border-radius: 4px; }
    .keterangan-label { font-weight: 800; font-size: 12px; margin-bottom: 2px; }
    .keterangan-text { font-size: 14px; line-height: 1.4; }
    .pdf-footer { margin-top: 20px; text-align: center; font-size: 10px; font-weight: 600; color: #666; border-top: 1px solid #ddd; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div style="font-weight: 800; font-size: 16px; margin-right: auto; letter-spacing: 0.5px;">PRINT PREVIEW (A4)</div>
    <button class="toolbar-btn" onclick="window.print()">
      <span class="material-icons-round">print</span> CETAK SEKARANG
    </button>
  </div>

  <div class="page">
    <div class="header-title">Form Request Payment</div>
    <div style="text-align: center; margin-bottom: 10px; margin-top: 5px;">
      <div class="frp-number-box">FRP No: ${escapeHtml(formData.frpNo || 'DRAFT')}</div>
    </div>

    <div class="info-row">
      <div class="info-col">
        <table class="info-table">
          <tr><td class="label">Vendor</td><td class="separator">:</td><td>${escapeHtml(formData.vendor || '-')}</td></tr>
          <tr><td class="label">Tanggal FRP</td><td class="separator">:</td><td>${escapeHtml(formData.tanggalFrp || '-')}</td></tr>
          <tr><td class="label">Company Name</td><td class="separator">:</td><td>${escapeHtml(formData.companyName || '-')}</td></tr>
          ${formData.companyName === 'PT PILAR NIAGA MAKMUR' ? `<tr><td class="label">Divisi</td><td class="separator">:</td><td>${escapeHtml(formData.divisi || '-')}</td></tr>` : ''}
          <tr><td class="label">Diminta oleh</td><td class="separator">:</td><td>${escapeHtml(formData.dimintaOleh || '-')}</td></tr>
        </table>
      </div>
      <div class="info-col">
        <table class="info-table">
          <tr><td class="label">Internal PO No</td><td class="separator">:</td><td>${escapeHtml(formData.internalPoNumber || '-')}</td></tr>
          <tr><td class="label">Ext Doc Type</td><td class="separator">:</td><td>${escapeHtml(formData.extDocType || '-')}</td></tr>
          <tr><td class="label">Ext Doc Number</td><td class="separator">:</td><td>${escapeHtml(formData.extDocNumber || '-')}</td></tr>
          <tr><td class="label">Payment Method</td><td class="separator">:</td><td>${escapeHtml(formData.paymentMethod || '-')}</td></tr>
          <tr><td class="label">Payment Date</td><td class="separator">:</td><td>${escapeHtml(formData.paymentDate || '-')}</td></tr>
        </table>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #ddd; border-radius: 6px; padding: 12px 15px; margin-bottom: 12px; display: flex; gap: 40px; border-left: 4px solid #333;">
      <div>
        <div style="font-size: 11px; color: #666; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">Bank Tujuan</div>
        <div style="font-size: 15px; font-weight: 800; color: #000;">${escapeHtml(formData.bankTujuan || '-')}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: #666; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">Nomor Rekening</div>
        <div style="font-size: 15px; font-weight: 800; color: #000; font-family: 'Courier New', Courier, monospace;">${escapeHtml(formData.rekBankTujuan || '-')}</div>
      </div>
    </div>

    <div class="checklist-section">
      <div class="checklist-title">Checklist Documents</div>
      <div class="checklist-grid">${checklistRows}</div>
      <div style="font-size:8px; color:#888; margin-top:3px;">* Wajib dilampirkan</div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">No</th>
          <th>Memo / Keterangan</th>
          <th style="width:100px;">Budget ID</th>
          <th style="width:130px; text-align:right;">Amount (IDR)</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" style="text-align:right; padding-right:12px;">Total</td>
          <td class="amount-col">${totalAmount.toLocaleString('id-ID')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="keterangan">
      <div class="keterangan-label">Keterangan FRP:</div>
      <div class="keterangan-text">${escapeHtml(formData.keteranganFrp || '-')}</div>
    </div>

    <div style="margin-top: 15px; background: #fefce8; border: 1.5px solid #fde68a; border-radius: 8px; padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">&#9432;</span>
      <span style="font-size: 12px; color: #92400e; line-height: 1.4; font-weight: 600;">
        <strong>INFORMASI PENTING:</strong> Dokumen ini tidak memerlukan tanda tangan basah. Dicetak secara otomatis oleh Sistem FRP dan telah melalui proses persetujuan digital.
      </span>
    </div>

    <div class="pdf-footer">
      Generated by FRP Payment System - ${escapeHtml(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))}
    </div>
  </div>
</body>
</html>
  `
}

module.exports = {
  renderPdfDocument,
}
