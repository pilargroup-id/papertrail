import pnmPrintLogo from '../../images/print/pnm-print.svg'
import {
  formatDateTime,
  formatDateValue,
  formatNumber,
  formatStatusLabel,
  getFirstValue,
  isBlankValue,
} from '../../components/Dialog/dialog-rp/tabs-details-rp/detailRpUtils.jsx'

const MIN_ITEM_ROWS = 18

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
  const text = isBlankValue(value) || value === '-' ? fallback : value
  return escapeHtml(text)
}

function safeMultiline(value) {
  const text = isBlankValue(value) ? '-' : String(value)
  return escapeHtml(text).replace(/\n/g, '<br />')
}

function joinParts(parts) {
  return parts.filter((part) => !isBlankValue(part) && part !== '-').join(' - ')
}

function getLogoUrl() {
  try {
    return new URL(pnmPrintLogo, window.location.origin).toString()
  } catch {
    return pnmPrintLogo
  }
}

function buildInfoRowHtml(label, value) {
  return `
    <div class="rp-print__row">
      <div class="rp-print__label">${safe(label, '')}</div>
      <div class="rp-print__value">${safe(value)}</div>
    </div>
  `
}

function buildLeftInfoRows(rpDetail) {
  return [
    ['RP No.', getFirstValue(rpDetail, ['rp_number', 'rpNumber', 'id'])],
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
      'Division',
      joinParts([
        getFirstValue(rpDetail, ['department_code_snapshot', 'department_code'], ''),
        getFirstValue(rpDetail, ['department_name_snapshot', 'department_name'], ''),
      ]),
    ],
  ]
}

function buildRightInfoRows(rpDetail) {
  return [
    [
      'Vendor',
      joinParts([
        getFirstValue(rpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
        getFirstValue(rpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
      ]),
    ],
    [
      'Payment Category',
      getFirstValue(rpDetail, ['payment_category_name_snapshot', 'payment_category_name'], ''),
    ],
    [
      'Destination Division',
      joinParts([
        getFirstValue(rpDetail, ['destination_department_code_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_name_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_class_snapshot'], ''),
      ]),
    ],
    ['PIC', getFirstValue(rpDetail, ['pic_name', 'picName'], '')],
  ]
}

function buildApprovalColumns(rpDetail) {
  return [
    ['Dibuat', getFirstValue(rpDetail, ['requested_by_name', 'request_by_name', 'created_by_name'], '')],
    ['Mengetahui', getFirstValue(rpDetail, ['requester_manager_approved_by_name'], '')],
    ['Checker', getFirstValue(rpDetail, ['destination_checked_by_name'], '')],
    ['Disetujui', getFirstValue(rpDetail, ['destination_manager_approved_by_name'], '')],
  ]
}

function buildApprovalHtml(columns) {
  const cellsHtml = columns
    .map(
      ([label, name]) => `
        <div class="rp-print__approval-cell">
          <div class="rp-print__approval-label">${safe(label)}</div>
          <div class="rp-print__approval-name">${safe(name)}</div>
        </div>
      `,
    )
    .join('')

  return `<div class="rp-print__approval">${cellsHtml}</div>`
}

function sumItemsAmount(items) {
  return items.reduce((total, item) => {
    const amount = Number(getFirstValue(item, ['amount'], 0))
    return total + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function formatCellNumber(value) {
  return isBlankValue(value) || value === '-' ? '' : escapeHtml(formatNumber(value))
}

function buildItemsRowsHtml(items) {
  const itemRows = items.map((item, index) => {
    const projectName = getFirstValue(item, ['budget_project_name_snapshot'], '')
    const budgetCode = getFirstValue(item, ['budget_code_snapshot'], '')
    const memo = getFirstValue(item, ['memo'], '')
    const purchaseLink = getFirstValue(item, ['purchase_link', 'purchaseLink'], '')

    return `
      <tr>
        <td class="rp-print__center">${index + 1}</td>
        <td>${safe(budgetCode, '')}</td>
        <td>${safe(projectName, '')}</td>
        <td>${safe(memo, '')}</td>
        <td class="rp-print__break">${safe(purchaseLink, '')}</td>
        <td class="rp-print__num">${formatCellNumber(getFirstValue(item, ['quantity'], ''))}</td>
        <td class="rp-print__num">${formatCellNumber(getFirstValue(item, ['unit_price'], ''))}</td>
        <td class="rp-print__num">${formatCellNumber(getFirstValue(item, ['amount'], ''))}</td>
      </tr>
    `
  })

  const fillerCount = Math.max(MIN_ITEM_ROWS - items.length, 0)
  const fillerRows = Array.from(
    { length: fillerCount },
    () => `<tr class="rp-print__filler">${'<td></td>'.repeat(8)}</tr>`,
  )

  return [...itemRows, ...fillerRows].join('')
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
  }
  body {
    padding: 8mm 10mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rp-print {
    border: 1px solid #1a1a1a;
    padding: 10px 12px;
    font-size: 10.5px;
  }

  .rp-print__header {
    margin: -10px -12px 12px;
    border-bottom: 1px solid #1a1a1a;
  }
  .rp-print__brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 6px 12px 5px;
  }
  .rp-print__logo { height: 24px; width: auto; object-fit: contain; flex: 0 0 auto; }
  .rp-print__heading { display: flex; flex-direction: column; line-height: 1.25; text-align: right; }
  .rp-print__heading-name {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .rp-print__heading-meta { font-size: 8px; color: #555; }

  .rp-print__info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .rp-print__row {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: stretch;
  }
  .rp-print__label { padding: 1px 0; line-height: 1.5; }
  .rp-print__value {
    border: 1px solid #1a1a1a;
    margin-top: -1px;
    padding: 1px 4px;
    line-height: 1.5;
    min-height: 18px;
    word-break: break-word;
  }
  .rp-print__notes { margin-top: 8px; }
  .rp-print__notes .rp-print__value { white-space: pre-wrap; }

  .rp-print__items { margin-top: 12px; }
  table.rp-print__table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .rp-print__table th, .rp-print__table td {
    border: 1px solid #1a1a1a;
    padding: 1px 4px;
    line-height: 1.45;
    height: 18px;
    word-wrap: break-word;
    vertical-align: top;
  }
  .rp-print__table th { font-weight: 400; text-align: center; }
  .rp-print__table thead { display: table-header-group; }
  .rp-print__table tr { page-break-inside: avoid; }
  .rp-print__table tfoot td { border-left: 0; border-right: 0; }
  .rp-print__table tfoot td:first-child { border-left: 1px solid #1a1a1a; }
  .rp-print__table tfoot td:last-child { border-left: 1px solid #1a1a1a; border-right: 1px solid #1a1a1a; }
  .rp-print__table tfoot .rp-print__currency { text-align: center; }
  .rp-print__num { text-align: right; }
  .rp-print__center { text-align: center; }
  .rp-print__break { word-break: break-all; }

  .rp-print__approval-section {
    margin-top: 12px;
    page-break-inside: avoid;
  }
  .rp-print__approval {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
    border-top: 1px solid #1a1a1a;
    border-left: 1px solid #1a1a1a;
  }
  .rp-print__approval-cell {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-right: 1px solid #1a1a1a;
    border-bottom: 1px solid #1a1a1a;
  }
  .rp-print__approval-label {
    padding: 1px 4px;
    line-height: 1.5;
    text-align: center;
    border-bottom: 1px solid #1a1a1a;
  }
  .rp-print__approval-name {
    flex: 1 1 auto;
    padding: 1px 4px;
    line-height: 1.5;
    min-height: 18px;
    text-align: center;
    word-break: break-word;
  }

  .rp-print__footer {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    padding-top: 4px;
    border-top: 1px solid #cfd4da;
    font-size: 8px;
    font-weight: 700;
    color: #666;
  }
`

function buildPrintHtml({ rpDetail, items }) {
  const itemList = Array.isArray(items) ? items : []
  const rpNumber = getFirstValue(rpDetail, ['rp_number', 'rpNumber', 'id'])
  const statusLabel = formatStatusLabel(getFirstValue(rpDetail, ['status'], ''))
  const description = getFirstValue(rpDetail, ['description'], '')
  const notes = getFirstValue(rpDetail, ['notes'], '')
  const currencyCode = getFirstValue(rpDetail, ['currency_code', 'currency'], 'IDR')
  const printedAt = formatDateTime(new Date().toISOString())
  const itemsTotal = formatNumber(sumItemsAmount(itemList))

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
        <div class="rp-print__brand">
          <img class="rp-print__logo" src="${escapeHtml(getLogoUrl())}" alt="Logo" />
          <div class="rp-print__heading">
            <div class="rp-print__heading-name">Request Payment (RP)</div>
            <div class="rp-print__heading-meta">No. ${safe(rpNumber)} &bull; ${safe(statusLabel)}</div>
          </div>
        </div>
      </header>

      <section class="rp-print__info">
        <div>
          ${buildLeftInfoRows(rpDetail).map(([label, value]) => buildInfoRowHtml(label, value)).join('')}
        </div>
        <div>
          ${buildRightInfoRows(rpDetail).map(([label, value]) => buildInfoRowHtml(label, value)).join('')}
        </div>
      </section>

      <section class="rp-print__notes">
        <div class="rp-print__row">
          <div class="rp-print__label">Description</div>
          <div class="rp-print__value">${safeMultiline(description)}</div>
        </div>
        <div class="rp-print__row">
          <div class="rp-print__label">Notes</div>
          <div class="rp-print__value">${safeMultiline(notes)}</div>
        </div>
      </section>

      <section class="rp-print__items">
        <table class="rp-print__table">
          <colgroup>
            <col style="width:4%;" />
            <col style="width:10%;" />
            <col style="width:18%;" />
            <col style="width:23%;" />
            <col style="width:17%;" />
            <col style="width:6%;" />
            <col style="width:10%;" />
            <col style="width:12%;" />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>Budget ID</th>
              <th>Project Name</th>
              <th>Memo</th>
              <th>Purchase Link</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRowsHtml(itemList)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6">Total</td>
              <td class="rp-print__currency">${safe(currencyCode)}</td>
              <td class="rp-print__num">${escapeHtml(itemsTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section class="rp-print__approval-section">
        ${buildApprovalHtml(buildApprovalColumns(rpDetail))}
      </section>

      <footer class="rp-print__footer">
        <div>Dicetak pada ${escapeHtml(printedAt)}</div>
        <div>Papertrail &bull; Dokumen ini dihasilkan otomatis oleh sistem</div>
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
