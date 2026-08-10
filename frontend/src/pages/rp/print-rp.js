import pnmPrintLogo from '../../images/print/pnm-print.svg'
import {
  formatDateTime,
  formatDateValue,
  formatNumber,
  formatRupiah,
  formatStatusLabel,
  getFirstValue,
} from '../../components/Dialog/dialog-rp/tabs-details-rp/detailRpUtils.jsx'

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character])
}

function safe(value, fallback = '-') {
  const text = value === undefined || value === null || value === '' ? fallback : value
  return escapeHtml(text)
}

function safeMultiline(value) {
  const text = value === undefined || value === null || value === '' ? '-' : String(value)
  return escapeHtml(text).replace(/\n/g, '<br />')
}

function getLogoUrl() {
  try {
    return new URL(pnmPrintLogo, window.location.origin).toString()
  } catch {
    return pnmPrintLogo
  }
}

function buildSummaryRows(rpDetail) {
  return [
    ['RP Number', getFirstValue(rpDetail, ['rp_number', 'rpNumber', 'id'])],
    ['Status', formatStatusLabel(getFirstValue(rpDetail, ['status'], ''))],
    ['RP Date', formatDateValue(getFirstValue(rpDetail, ['date_required', 'dateRequired'], ''))],
    [
      'Request By',
      getFirstValue(rpDetail, [
        'requested_by_name',
        'request_by_name',
        'request_by',
        'created_by_name',
        'created_by',
      ]),
    ],
    [
      'Company',
      [
        getFirstValue(rpDetail, ['company_code_snapshot', 'company_code'], ''),
        getFirstValue(rpDetail, ['company_name_snapshot', 'company_name'], ''),
      ]
        .filter(Boolean)
        .join(' - ') || '-',
    ],
    [
      'Division',
      [
        getFirstValue(rpDetail, ['department_code_snapshot', 'department_code'], ''),
        getFirstValue(rpDetail, ['department_name_snapshot', 'department_name'], ''),
      ]
        .filter(Boolean)
        .join(' - ') || '-',
    ],
    ['Total Amount', formatRupiah(getFirstValue(rpDetail, ['total_amount', 'totalAmount'], ''))],
    ['Created At', formatDateTime(getFirstValue(rpDetail, ['created_at', 'createdAt'], ''))],
  ]
}

function buildVendorRows(rpDetail) {
  return [
    [
      'Vendor',
      [
        getFirstValue(rpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
        getFirstValue(rpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
      ]
        .filter(Boolean)
        .join(' - ') || getFirstValue(rpDetail, ['vendor_id', 'vendorId']),
    ],
    [
      'Payment Category',
      getFirstValue(rpDetail, ['payment_category_name_snapshot', 'payment_category_name'], '') ||
        getFirstValue(rpDetail, ['payment_category_id', 'paymentCategoryId']),
    ],
    [
      'Destination Division',
      [
        getFirstValue(rpDetail, ['destination_department_code_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_name_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_class_snapshot'], ''),
      ]
        .filter(Boolean)
        .join(' - ') || getFirstValue(rpDetail, ['destination_department_id', 'destinationDepartmentId']),
    ],
    ['PIC', getFirstValue(rpDetail, ['pic_name', 'picName'])],
    ['Vendor Source', getFirstValue(rpDetail, ['vendor_source', 'vendorSource'])],
  ]
}

function buildKeyValueTableHtml(rows, columnsPerRow = 3) {
  const rowsHtml = []

  for (let index = 0; index < rows.length; index += columnsPerRow) {
    const rowItems = rows.slice(index, index + columnsPerRow)
    const cellsHtml = rowItems
      .map(([label, value]) => `<th>${safe(label)}</th><td>${safe(value)}</td>`)
      .join('')
    const paddingCount = columnsPerRow - rowItems.length
    const paddingHtml = paddingCount > 0 ? '<th></th><td></td>'.repeat(paddingCount) : ''

    rowsHtml.push(`<tr>${cellsHtml}${paddingHtml}</tr>`)
  }

  return rowsHtml.join('')
}

function sumItemsAmount(items) {
  return items.reduce((total, item) => {
    const amount = Number(getFirstValue(item, ['amount'], 0))
    return total + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function buildItemsTableRowsHtml(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<tr><td class="rp-print__empty" colspan="8">Belum ada item RP.</td></tr>'
  }

  return items
    .map((item, index) => {
      const budgetCode = getFirstValue(item, ['budget_code_snapshot'], '-')
      const budgetLabel = getFirstValue(
        item,
        ['budget_type_name_snapshot', 'budget_type_code_snapshot'],
        '',
      )
      const projectName = getFirstValue(item, ['budget_project_name_snapshot'], '-')
      const memo = getFirstValue(item, ['memo'], '-')
      const purchaseLink = getFirstValue(item, ['purchase_link', 'purchaseLink'], '')
      const quantity = formatNumber(getFirstValue(item, ['quantity'], ''))
      const unitPrice = formatRupiah(getFirstValue(item, ['unit_price'], ''))
      const amount = formatRupiah(getFirstValue(item, ['amount'], ''))

      return `
        <tr>
          <td class="rp-print__num">${index + 1}</td>
          <td>${safe(budgetCode)}${budgetLabel ? `<br /><span class="rp-print__muted">${safe(budgetLabel)}</span>` : ''}</td>
          <td>${safe(projectName)}</td>
          <td>${safe(memo)}</td>
          <td class="rp-print__break">${purchaseLink ? safe(purchaseLink) : '-'}</td>
          <td class="rp-print__num">${safe(quantity)}</td>
          <td class="rp-print__num">${safe(unitPrice)}</td>
          <td class="rp-print__num">${safe(amount)}</td>
        </tr>
      `
    })
    .join('')
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 12mm; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rp-print__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 10px;
    margin-bottom: 14px;
    border-bottom: 2px solid #1a1a1a;
  }
  .rp-print__header-left { display: flex; align-items: center; gap: 14px; }
  .rp-print__logo { height: 48px; width: auto; object-fit: contain; }
  .rp-print__heading h1 { margin: 0; font-size: 18px; letter-spacing: 0.4px; text-transform: uppercase; }
  .rp-print__heading p { margin: 2px 0 0; font-size: 12px; color: #444; }
  .rp-print__header-right { text-align: right; font-size: 11px; color: #555; }
  .rp-print__section { margin-bottom: 14px; }
  .rp-print__section h2 {
    margin: 0 0 6px;
    padding-bottom: 4px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #333;
    border-bottom: 1px solid #cfd4da;
  }
  .rp-print__paragraph { margin: 0; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
  table.rp-print__kv {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    table-layout: fixed;
  }
  .rp-print__kv th, .rp-print__kv td {
    border: 1px solid #cfd4da;
    padding: 5px 10px;
    font-size: 11px;
    vertical-align: top;
    text-align: left;
    word-wrap: break-word;
  }
  .rp-print__kv th {
    width: 13%;
    background: #f4f5f7;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-size: 9.5px;
  }
  .rp-print__kv td { width: 20.33%; font-weight: 500; color: #111; }
  table.rp-print__table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .rp-print__table th, .rp-print__table td {
    border: 1px solid #cfd4da;
    padding: 6px 8px;
    font-size: 11px;
    word-wrap: break-word;
    vertical-align: top;
  }
  .rp-print__table thead { display: table-header-group; }
  .rp-print__table th {
    background: #f4f5f7;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-size: 9.5px;
    text-align: left;
  }
  .rp-print__table tr { page-break-inside: avoid; }
  .rp-print__num { text-align: right; }
  .rp-print__break { word-break: break-all; }
  .rp-print__muted { color: #666; font-size: 10px; }
  .rp-print__empty { text-align: center; color: #777; padding: 14px; }
  .rp-print__table tfoot td {
    font-weight: 700;
    background: #f4f5f7;
  }
  .rp-print__footer {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #cfd4da;
    font-size: 10px;
    color: #666;
    text-align: right;
  }
`

function buildPrintHtml({ rpDetail, items }) {
  const rpNumber = getFirstValue(rpDetail, ['rp_number', 'rpNumber', 'id'])
  const statusLabel = formatStatusLabel(getFirstValue(rpDetail, ['status'], ''))
  const description = getFirstValue(rpDetail, ['description'], '')
  const notes = getFirstValue(rpDetail, ['notes'], '')
  const printedAt = formatDateTime(new Date().toISOString())
  const itemsTotal = formatRupiah(sumItemsAmount(Array.isArray(items) ? items : []))

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>RP ${escapeHtml(rpNumber)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="rp-print">
      <header class="rp-print__header">
        <div class="rp-print__header-left">
          <img class="rp-print__logo" src="${escapeHtml(getLogoUrl())}" alt="Logo" />
          <div class="rp-print__heading">
            <h1>Request Payment (RP)</h1>
            <p>No. ${safe(rpNumber)} &bull; ${safe(statusLabel)}</p>
          </div>
        </div>
        <div class="rp-print__header-right">
          <div>Dicetak pada</div>
          <div>${escapeHtml(printedAt)}</div>
        </div>
      </header>

      <section class="rp-print__section">
        <h2>Ringkasan RP</h2>
        <table class="rp-print__kv">
          <tbody>${buildKeyValueTableHtml(buildSummaryRows(rpDetail), 3)}</tbody>
        </table>
      </section>

      <section class="rp-print__section">
        <h2>Description</h2>
        <p class="rp-print__paragraph">${safeMultiline(description)}</p>
      </section>

      <section class="rp-print__section">
        <h2>Vendor &amp; Destination</h2>
        <table class="rp-print__kv">
          <tbody>${buildKeyValueTableHtml(buildVendorRows(rpDetail), 3)}</tbody>
        </table>
      </section>

      <section class="rp-print__section">
        <h2>Notes</h2>
        <p class="rp-print__paragraph">${safeMultiline(notes)}</p>
      </section>

      <section class="rp-print__section">
        <h2>Items</h2>
        <table class="rp-print__table">
          <thead>
            <tr>
              <th style="width:4%;">No</th>
              <th style="width:14%;">Budget Code</th>
              <th style="width:17%;">Project Name</th>
              <th style="width:19%;">Memo</th>
              <th style="width:15%;">Purchase Link</th>
              <th style="width:6%;">Qty</th>
              <th style="width:12%;">Unit Price</th>
              <th style="width:13%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsTableRowsHtml(items)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" class="rp-print__num">Total</td>
              <td class="rp-print__num">${escapeHtml(itemsTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer class="rp-print__footer">
        Papertrail &bull; Dokumen ini dihasilkan otomatis oleh sistem
      </footer>
    </div>
  </body>
</html>`
}

export function printRpDocument(printWindow, { rpDetail, items = [] } = {}) {
  if (!printWindow || printWindow.closed || !rpDetail) {
    return false
  }

  const html = buildPrintHtml({ rpDetail, items })

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  let hasPrinted = false

  const triggerPrint = () => {
    if (hasPrinted || printWindow.closed) {
      return
    }

    hasPrinted = true
    printWindow.focus()
    printWindow.print()
  }

  printWindow.addEventListener('afterprint', () => {
    printWindow.close()
  })

  const logoImage = printWindow.document.querySelector('.rp-print__logo')

  if (logoImage && !logoImage.complete) {
    logoImage.addEventListener('load', triggerPrint, { once: true })
    logoImage.addEventListener('error', triggerPrint, { once: true })
    window.setTimeout(triggerPrint, 1200)
  } else {
    window.setTimeout(triggerPrint, 150)
  }

  return true
}

export function showPrintLoading(printWindow) {
  if (!printWindow || printWindow.closed) {
    return
  }

  printWindow.document.open()
  printWindow.document.write(
    '<!doctype html><html><head><meta charset="utf-8" /><title>Memuat...</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#444;">Memuat data RP...</body></html>',
  )
  printWindow.document.close()
}

export function showPrintError(printWindow, message) {
  if (!printWindow || printWindow.closed) {
    return
  }

  printWindow.document.open()
  printWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8" /><title>Gagal</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#b91c1c;">${escapeHtml(
      message || 'Gagal memuat data RP untuk print.',
    )}</body></html>`,
  )
  printWindow.document.close()
}
