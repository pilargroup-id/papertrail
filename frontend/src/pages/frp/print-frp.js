import pnmPrintLogo from '../../images/print/pnm-print.svg'

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

function isBlankValue(value) {
  return value === undefined || value === null || value === ''
}

function getFirstValue(source, keys, fallback = '') {
  if (!source || typeof source !== 'object') {
    return fallback
  }

  for (const key of keys) {
    const value = source[key]

    if (!isBlankValue(value)) {
      return value
    }
  }

  return fallback
}

function safe(value, fallback = '-') {
  const text = isBlankValue(value) || value === '-' ? fallback : value
  return escapeHtml(text)
}

function safeMultiline(value) {
  const text = isBlankValue(value) ? '-' : String(value)
  return escapeHtml(text).replace(/\n/g, '<br />')
}

function formatNumber(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)
}

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${formatNumber(numberValue)}`
}

function formatExchangeRate(value) {
  if (isBlankValue(value)) {
    return '-'
  }

  return formatNumber(value)
}

function formatDateValue(value) {
  if (isBlankValue(value)) {
    return '-'
  }

  const dateValue = String(value).slice(0, 10)
  const [year, month, day] = dateValue.split('-')

  if (!year || !month || !day) {
    return String(value)
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const monthIndex = Number(month) - 1

  if (!monthNames[monthIndex]) {
    return String(value)
  }

  return `${day} ${monthNames[monthIndex]} ${year}`
}

function formatDateTime(value) {
  if (isBlankValue(value)) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatStatusLabel(value) {
  if (isBlankValue(value)) {
    return '-'
  }

  return String(value)
    .trim()
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getLogoUrl() {
  try {
    return new URL(pnmPrintLogo, window.location.origin).toString()
  } catch {
    return pnmPrintLogo
  }
}

export function getFrpDetailFromResponse(response) {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ]

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate),
  ) ?? null
}

export function getFrpItemsFromResponse(response) {
  const detail = getFrpDetailFromResponse(response)

  if (Array.isArray(detail?.items)) {
    return detail.items
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

function buildSummaryRows(frpDetail) {
  return [
    ['FRP Number', getFirstValue(frpDetail, ['frp_number', 'frpNumber', 'id'])],
    ['Status', formatStatusLabel(getFirstValue(frpDetail, ['status'], ''))],
    [
      'Request By',
      getFirstValue(frpDetail, [
        'requested_by_name',
        'request_by_name',
        'request_by',
        'created_by_name',
        'created_by',
      ]),
    ],
    [
      'Vendor',
      getFirstValue(frpDetail, [
        'vendor_name_snapshot',
        'vendor_name',
        'vendor_code_snapshot',
        'vendor_code',
        'vendor_id',
      ]),
    ],
    ['Created At', formatDateTime(getFirstValue(frpDetail, ['created_at', 'createdAt'], ''))],
    ['Updated At', formatDateTime(getFirstValue(frpDetail, ['updated_at', 'updatedAt'], ''))],
    ['Total Amount', formatRupiah(getFirstValue(frpDetail, ['total_amount', 'totalAmount'], ''))],
  ]
}

function buildDocumentPaymentRows(frpDetail) {
  return [
    [
      'Internal PO Number',
      getFirstValue(frpDetail, ['internal_po_number', 'internal_po_number_snapshot']),
    ],
    [
      'External Document Type',
      getFirstValue(frpDetail, [
        'external_document_type_name_snapshot',
        'external_document_type_name',
        'external_document_type_code_snapshot',
        'external_document_type_code',
        'external_document_type_id',
      ]),
    ],
    [
      'External Document Number',
      getFirstValue(frpDetail, ['external_document_number', 'external_document_number_snapshot']),
    ],
    [
      'Destination Bank',
      getFirstValue(frpDetail, [
        'destination_bank_name',
        'destination_bank_name_snapshot',
        'bank_name_snapshot',
      ]),
    ],
    [
      'Destination Account',
      getFirstValue(frpDetail, [
        'destination_bank_account',
        'destination_bank_account_snapshot',
        'account_number_snapshot',
      ]),
    ],
    [
      'Destination Account Name',
      getFirstValue(frpDetail, [
        'destination_bank_account_name',
        'destination_bank_account_name_snapshot',
        'account_name_snapshot',
      ]),
    ],
    [
      'Payment Method',
      getFirstValue(frpDetail, [
        'payment_method_name_snapshot',
        'payment_method_name',
        'payment_method_code_snapshot',
        'payment_method_code',
        'payment_method_id',
      ]),
    ],
    ['Payment Date', formatDateValue(getFirstValue(frpDetail, ['payment_date'], ''))],
    ['Currency', getFirstValue(frpDetail, ['currency_code', 'currency'], '')],
    ['Exchange Rate', formatExchangeRate(getFirstValue(frpDetail, ['exchange_rate'], ''))],
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
    return '<tr><td class="frp-print__empty" colspan="7">Belum ada item FRP.</td></tr>'
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
      const quantity = formatNumber(getFirstValue(item, ['quantity'], ''))
      const unitPrice = formatRupiah(getFirstValue(item, ['unit_price'], ''))
      const amount = formatRupiah(getFirstValue(item, ['amount'], ''))

      return `
        <tr>
          <td class="frp-print__num">${index + 1}</td>
          <td>${safe(budgetCode)}${budgetLabel ? `<br /><span class="frp-print__muted">${safe(budgetLabel)}</span>` : ''}</td>
          <td>${safe(projectName)}</td>
          <td>${safe(memo)}</td>
          <td class="frp-print__num">${safe(quantity)}</td>
          <td class="frp-print__num">${safe(unitPrice)}</td>
          <td class="frp-print__num">${safe(amount)}</td>
        </tr>
      `
    })
    .join('')
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { size: A5 landscape; margin: 8mm; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .frp-print__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 1.5px solid #1a1a1a;
  }
  .frp-print__header-left { display: flex; align-items: center; gap: 8px; }
  .frp-print__logo { height: 30px; width: auto; object-fit: contain; }
  .frp-print__heading h1 { margin: 0; font-size: 12.5px; letter-spacing: 0.3px; text-transform: uppercase; }
  .frp-print__heading p { margin: 1px 0 0; font-size: 9px; color: #444; }
  .frp-print__header-right { text-align: right; font-size: 8px; color: #555; }
  .frp-print__section { margin-bottom: 8px; }
  .frp-print__section h2 {
    margin: 0 0 4px;
    padding-bottom: 2px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #333;
    border-bottom: 1px solid #cfd4da;
  }
  .frp-print__paragraph { margin: 0; font-size: 9px; line-height: 1.4; white-space: pre-wrap; }
  table.frp-print__kv {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    table-layout: fixed;
  }
  .frp-print__kv th, .frp-print__kv td {
    border: 1px solid #cfd4da;
    padding: 2.5px 5px;
    font-size: 8px;
    vertical-align: top;
    text-align: left;
    word-wrap: break-word;
  }
  .frp-print__kv th {
    width: 13%;
    background: #f4f5f7;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    font-size: 7px;
  }
  .frp-print__kv td { width: 20.33%; font-weight: 500; color: #111; font-size: 8px; }
  table.frp-print__table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .frp-print__table th, .frp-print__table td {
    border: 1px solid #cfd4da;
    padding: 3px 4px;
    font-size: 8px;
    word-wrap: break-word;
    vertical-align: top;
  }
  .frp-print__table thead { display: table-header-group; }
  .frp-print__table th {
    background: #f4f5f7;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    font-size: 7px;
    text-align: left;
  }
  .frp-print__table tr { page-break-inside: avoid; }
  .frp-print__num { text-align: right; }
  .frp-print__muted { color: #666; font-size: 7px; }
  .frp-print__empty { text-align: center; color: #777; padding: 8px; }
  .frp-print__table tfoot td {
    font-weight: 700;
    background: #f4f5f7;
  }
  .frp-print__footer {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid #cfd4da;
    font-size: 7px;
    color: #666;
    text-align: right;
  }
`

function buildPrintHtml({ frpDetail, items }) {
  const frpNumber = getFirstValue(frpDetail, ['frp_number', 'frpNumber', 'id'])
  const statusLabel = formatStatusLabel(getFirstValue(frpDetail, ['status'], ''))
  const description = getFirstValue(frpDetail, ['description'], '')
  const printedAt = formatDateTime(new Date().toISOString())
  const itemsTotal = formatRupiah(sumItemsAmount(Array.isArray(items) ? items : []))

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>FRP ${escapeHtml(frpNumber)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <div class="frp-print">
      <header class="frp-print__header">
        <div class="frp-print__header-left">
          <img class="frp-print__logo" src="${escapeHtml(getLogoUrl())}" alt="Logo" />
          <div class="frp-print__heading">
            <h1>Financial Request Payment (FRP)</h1>
            <p>No. ${safe(frpNumber)} &bull; ${safe(statusLabel)}</p>
          </div>
        </div>
        <div class="frp-print__header-right">
          <div>Dicetak pada</div>
          <div>${escapeHtml(printedAt)}</div>
        </div>
      </header>

      <section class="frp-print__section">
        <h2>Ringkasan FRP</h2>
        <table class="frp-print__kv">
          <tbody>${buildKeyValueTableHtml(buildSummaryRows(frpDetail), 3)}</tbody>
        </table>
      </section>

      <section class="frp-print__section">
        <h2>Description</h2>
        <p class="frp-print__paragraph">${safeMultiline(description)}</p>
      </section>

      <section class="frp-print__section">
        <h2>Document &amp; Payment</h2>
        <table class="frp-print__kv">
          <tbody>${buildKeyValueTableHtml(buildDocumentPaymentRows(frpDetail), 3)}</tbody>
        </table>
      </section>

      <section class="frp-print__section">
        <h2>Items</h2>
        <table class="frp-print__table">
          <thead>
            <tr>
              <th style="width:4%;">No</th>
              <th style="width:16%;">Budget Code</th>
              <th style="width:20%;">Project Name</th>
              <th style="width:24%;">Memo</th>
              <th style="width:9%;">Qty</th>
              <th style="width:13%;">Unit Price</th>
              <th style="width:14%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsTableRowsHtml(items)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" class="frp-print__num">Total</td>
              <td class="frp-print__num">${escapeHtml(itemsTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <footer class="frp-print__footer">
        Papertrail &bull; Dokumen ini dihasilkan otomatis oleh sistem
      </footer>
    </div>
  </body>
</html>`
}

export function printFrpDocument(printWindow, { frpDetail, items = [] } = {}) {
  if (!printWindow || printWindow.closed || !frpDetail) {
    return false
  }

  const html = buildPrintHtml({ frpDetail, items })

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

  const logoImage = printWindow.document.querySelector('.frp-print__logo')

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
    '<!doctype html><html><head><meta charset="utf-8" /><title>Memuat...</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#444;">Memuat data FRP...</body></html>',
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
      message || 'Gagal memuat data FRP untuk print.',
    )}</body></html>`,
  )
  printWindow.document.close()
}
