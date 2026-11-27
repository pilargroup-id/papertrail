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

const MIN_ITEM_ROWS = 18

function buildInfoRowHtml(label, value, modifier = '') {
  return `
    <div class="frp-print__row${modifier ? ` frp-print__row--${modifier}` : ''}">
      <div class="frp-print__label">${safe(label, '')}</div>
      <div class="frp-print__value">${safe(value)}</div>
    </div>
  `
}

function buildDestinationAccountText(frpDetail) {
  const accountNumber = getFirstValue(frpDetail, [
    'destination_bank_account',
    'destination_bank_account_snapshot',
    'vendor_account_number_snapshot',
    'account_number_snapshot',
  ])
  const accountName = getFirstValue(frpDetail, [
    'destination_bank_account_name',
    'destination_bank_account_name_snapshot',
    'vendor_account_name_snapshot',
    'account_name_snapshot',
  ])

  if (!accountNumber && !accountName) {
    return ''
  }

  return [accountNumber, accountName].filter(Boolean).join(' an ')
}

const CHECKLIST_TWO_COLUMN_THRESHOLD = 10

function getSelectedDocumentTypeIds(frpDetail) {
  const selectedIds = new Set()
  const documents = Array.isArray(frpDetail?.documents) ? frpDetail.documents : []
  const documentTypeIds = Array.isArray(frpDetail?.document_type_ids) ? frpDetail.document_type_ids : []

  documents.forEach((document) => {
    const id = getFirstValue(document, ['document_type_id', 'frp_document_type_id'], '')

    if (!isBlankValue(id)) {
      selectedIds.add(String(id))
    }
  })

  documentTypeIds.forEach((id) => {
    if (!isBlankValue(id)) {
      selectedIds.add(String(id))
    }
  })

  return selectedIds
}

function buildChecklistEntries(frpDetail, documentTypes) {
  const selectedIds = getSelectedDocumentTypeIds(frpDetail)
  const masterTypes = (Array.isArray(documentTypes) ? documentTypes : [])
    .filter((type) => !isBlankValue(type?.id))
    .map((type, index) => ({ type, index }))
    .sort((a, b) => {
      const orderA = Number(a.type?.sort_order)
      const orderB = Number(b.type?.sort_order)
      const safeA = Number.isFinite(orderA) ? orderA : Number.MAX_SAFE_INTEGER
      const safeB = Number.isFinite(orderB) ? orderB : Number.MAX_SAFE_INTEGER

      return safeA - safeB || a.index - b.index
    })
    .map(({ type }) => type)

  const entries = new Map()

  masterTypes.forEach((type) => {
    const id = String(type.id)

    if (entries.has(id)) {
      return
    }

    entries.set(id, {
      name: getFirstValue(type, ['name', 'code'], '-'),
      checked: selectedIds.has(id),
    })
  })

  // Dokumen yang dipilih user tapi tidak ada di master aktif (mis. sudah dinonaktifkan)
  const documents = Array.isArray(frpDetail?.documents) ? frpDetail.documents : []

  documents.forEach((document) => {
    const id = String(getFirstValue(document, ['document_type_id', 'frp_document_type_id'], ''))

    if (!id || entries.has(id)) {
      return
    }

    entries.set(id, {
      name: getFirstValue(
        document,
        ['document_name_snapshot', 'document_type_name', 'name', 'document_code_snapshot'],
        '-',
      ),
      checked: true,
    })
  })

  return Array.from(entries.values())
}

function buildChecklistHtml(frpDetail, documentTypes) {
  const entries = buildChecklistEntries(frpDetail, documentTypes)
  const isTwoColumn = entries.length > CHECKLIST_TWO_COLUMN_THRESHOLD

  const rowsHtml = entries.length
    ? `
      <div class="frp-print__check-list${isTwoColumn ? ' frp-print__check-list--two-col' : ''}">
        ${entries
          .map(
            (entry, index) => `
              <div class="frp-print__check-row">
                <span class="frp-print__checkbox${entry.checked ? ' is-checked' : ''}">${entry.checked ? '&#10003;' : ''}</span>
                <span class="frp-print__check-index">${index + 1}.</span>
                <span class="frp-print__check-name">${safe(entry.name)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    `
    : '<div class="frp-print__check-empty">Tidak ada dokumen.</div>'

  return `
    <div class="frp-print__checklist">
      <div class="frp-print__checklist-title">Checklist Documents</div>
      ${rowsHtml}
    </div>
  `
}

function buildItemsRowsHtml(items) {
  const list = Array.isArray(items) ? items : []

  const itemRows = list.map((item) => {
    const memo = getFirstValue(item, ['memo'], '')
    const budgetCode = getFirstValue(item, ['budget_code_snapshot', 'budget_id'], '')
    const amount = getFirstValue(item, ['amount'], '')

    return `
      <tr>
        <td>${safe(memo, '')}</td>
        <td>${safe(budgetCode, '')}</td>
        <td class="frp-print__num">${isBlankValue(amount) ? '' : escapeHtml(formatNumber(amount))}</td>
      </tr>
    `
  })

  const fillerCount = Math.max(MIN_ITEM_ROWS - list.length, 0)
  const fillerRows = Array.from(
    { length: fillerCount },
    () => '<tr class="frp-print__filler"><td></td><td></td><td></td></tr>',
  )

  return [...itemRows, ...fillerRows].join('')
}

function sumItemsAmount(items) {
  return items.reduce((total, item) => {
    const amount = Number(getFirstValue(item, ['amount'], 0))
    return total + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function buildSignatureHtml({ label, name, rightLabel }) {
  return `
    <div class="frp-print__sign">
      <div class="frp-print__label">${escapeHtml(label)}</div>
      <div class="frp-print__sign-box">
        <div class="frp-print__sign-space"></div>
        <div class="frp-print__sign-footer">
          <span class="frp-print__sign-name">${safe(name, '')}</span>
          <span class="frp-print__sign-right-label">${escapeHtml(rightLabel)}</span>
          <span class="frp-print__sign-blank">(<span></span>)</span>
        </div>
      </div>
    </div>
  `
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
  }
  body {
    padding: 10mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .frp-print {
    border: 1px solid #1a1a1a;
    padding: 10px 12px;
    font-size: 11px;
  }
  .frp-print__header {
    margin: -10px -12px 14px;
    border-bottom: 1px solid #1a1a1a;
  }
  .frp-print__brand {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 5px;
    border-bottom: 1px solid #cfd4da;
  }
  .frp-print__logo { height: 24px; width: auto; object-fit: contain; flex: 0 0 auto; }
  .frp-print__heading {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-left: auto;
    text-align: right;
    line-height: 1.25;
  }
  .frp-print__heading-name {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .frp-print__heading-meta { font-size: 8px; color: #555; }
  .frp-print__title {
    margin: 0;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }

  .frp-print__row {
    display: grid;
    grid-template-columns: 135px 1fr;
    align-items: stretch;
  }
  .frp-print__label { padding: 1px 0; line-height: 1.5; }
  .frp-print__value {
    border: 1px solid #1a1a1a;
    margin-top: -1px;
    padding: 1px 4px;
    line-height: 1.5;
    min-height: 18px;
    word-break: break-word;
  }
  .frp-print__info-half { width: 70%; }
  .frp-print__info-split {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .frp-print__info-split .frp-print__info-left { flex: 0 0 60%; }
  .frp-print__info-split .frp-print__checklist { flex: 1; margin-top: 10px; }
  .frp-print__info-bottom { margin-top: 0; }

  .frp-print__checklist {
    border: 1px solid #1a1a1a;
    padding: 4px 6px 5px;
    page-break-inside: avoid;
  }
  .frp-print__checklist-title {
    font-weight: 700;
    margin: 0 -6px 4px;
    padding: 0 6px 3px;
    border-bottom: 1px solid #cfd4da;
  }
  .frp-print__check-list {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 2px;
  }
  .frp-print__check-list--two-col {
    grid-template-columns: 1fr 1fr;
    column-gap: 8px;
  }
  .frp-print__check-row {
    display: grid;
    grid-template-columns: 12px 16px 1fr;
    align-items: start;
    column-gap: 4px;
    line-height: 1.35;
    page-break-inside: avoid;
  }
  .frp-print__checkbox {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    margin-top: 1px;
    border: 1px solid #1a1a1a;
    border-radius: 2px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  .frp-print__checkbox.is-checked { background: #1a1a1a; color: #fff; }
  .frp-print__check-index { text-align: right; color: #444; }
  .frp-print__check-name { word-break: break-word; }
  .frp-print__check-empty { color: #777; padding: 2px 0; }

  .frp-print__items { margin: 16px 0 0 135px; }
  table.frp-print__table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .frp-print__table th, .frp-print__table td {
    border: 1px solid #1a1a1a;
    padding: 1px 4px;
    line-height: 1.5;
    height: 19px;
    word-wrap: break-word;
    vertical-align: top;
  }
  .frp-print__table th { font-weight: 400; text-align: center; }
  .frp-print__table thead { display: table-header-group; }
  .frp-print__table tr { page-break-inside: avoid; }
  .frp-print__table tfoot td { border-left: 0; border-right: 0; }
  .frp-print__table tfoot td:first-child { border-left: 1px solid #1a1a1a; }
  .frp-print__table tfoot td:last-child { border-left: 1px solid #1a1a1a; border-right: 1px solid #1a1a1a; }
  .frp-print__table tfoot .frp-print__currency { text-align: center; }
  .frp-print__num { text-align: right; }

  .frp-print__description { margin-top: 20px; }
  .frp-print__description .frp-print__value { min-height: 56px; white-space: pre-wrap; }

  .frp-print__sign {
    display: grid;
    grid-template-columns: 135px 1fr;
    page-break-inside: avoid;
  }
  .frp-print__sign-box { border: 1px solid #1a1a1a; margin-top: -1px; }
  .frp-print__sign-space { height: 74px; }
  .frp-print__sign-footer {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    align-items: center;
    border-top: 1px solid #1a1a1a;
    padding: 1px 4px;
    line-height: 1.5;
  }
  .frp-print__sign-blank { display: inline-flex; align-items: flex-end; justify-content: flex-end; }
  .frp-print__sign-blank span {
    display: inline-block;
    flex: 1;
    max-width: 140px;
    border-bottom: 1px solid #1a1a1a;
    margin: 0 1px 3px;
  }
  .frp-print__signatures { margin-top: 16px; }
  .frp-print__approved { margin-top: 10px; page-break-inside: avoid; }
  .frp-print__approved .frp-print__value { margin-top: 0; }

  .frp-print__footer {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
    padding-top: 4px;
    border-top: 1px solid #cfd4da;
    font-size: 8px;
    color: #666;
  }
`

function buildPrintHtml({ frpDetail, items, documentTypes }) {
  const itemList = Array.isArray(items) ? items : []
  const frpNumber = getFirstValue(frpDetail, ['frp_number', 'frpNumber', 'id'])
  const statusLabel = formatStatusLabel(getFirstValue(frpDetail, ['status'], ''))
  const description = getFirstValue(frpDetail, ['description'], '')
  const printedAt = formatDateTime(new Date().toISOString())
  const currencyCode = getFirstValue(frpDetail, ['currency_code', 'currency'], 'IDR')
  const itemsTotal = formatNumber(sumItemsAmount(itemList))

  const vendorName = getFirstValue(frpDetail, [
    'vendor_name_snapshot',
    'vendor_name',
    'vendor_code_snapshot',
    'vendor_code',
  ])
  const requestedBy = getFirstValue(frpDetail, [
    'requested_by_name',
    'request_by_name',
    'request_by',
    'created_by_name',
  ])
  const approvedBy = getFirstValue(frpDetail, ['approved_by_name'], '')

  const leftRows = [
    ['Tanggal FRP', formatDateValue(getFirstValue(frpDetail, ['frp_date', 'created_at'], ''))],
    ['Company Name', getFirstValue(frpDetail, ['company_name_snapshot', 'company_name'])],
    ['Divisi', getFirstValue(frpDetail, ['department_name_snapshot', 'department_name'])],
    ['Diminta oleh', requestedBy],
    ['Untuk kebutuhan', getFirstValue(frpDetail, ['class_name_snapshot', 'class_name'])],
    ['Internal PO Number', getFirstValue(frpDetail, ['internal_po_number', 'internal_po_number_snapshot'])],
    [
      'Ext Doc Type',
      getFirstValue(frpDetail, [
        'external_document_type_name_snapshot',
        'external_document_type_name',
        'external_document_type_code_snapshot',
        'external_document_type_code',
      ]),
    ],
    ['Ext Doc Number', getFirstValue(frpDetail, ['external_document_number', 'external_document_number_snapshot'])],
    [
      'Payment Method',
      getFirstValue(frpDetail, [
        'payment_method_name_snapshot',
        'payment_method_name',
        'payment_method_code_snapshot',
        'payment_method_code',
      ]),
    ],
    ['Payment Date', formatDateValue(getFirstValue(frpDetail, ['payment_date'], ''))],
  ]

  const bankName = getFirstValue(frpDetail, [
    'destination_bank_name',
    'destination_bank_name_snapshot',
    'vendor_bank_name_snapshot',
    'bank_name_snapshot',
  ])

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
        <div class="frp-print__brand">
          <img class="frp-print__logo" src="${escapeHtml(getLogoUrl())}" alt="Logo" />
          <div class="frp-print__heading">
            <div class="frp-print__heading-name">Financial Request Payment (FRP)</div>
            <div class="frp-print__heading-meta">No. ${safe(frpNumber)} &bull; ${safe(statusLabel)}</div>
          </div>
        </div>
        <h1 class="frp-print__title">Form Request Payment (Cash in Advance / Payment / Settlement / Internal Transfer)</h1>
      </header>

      <section class="frp-print__info">
        <div class="frp-print__info-half">
          ${buildInfoRowHtml('FRP No.', frpNumber)}
        </div>
        ${buildInfoRowHtml('Vendor', vendorName)}
        <div class="frp-print__info-split">
          <div class="frp-print__info-left">
            ${leftRows.map(([label, value]) => buildInfoRowHtml(label, value)).join('')}
          </div>
          ${buildChecklistHtml(frpDetail, documentTypes)}
        </div>
        <div class="frp-print__info-bottom">
          ${buildInfoRowHtml('Bank Tujuan', bankName)}
          ${buildInfoRowHtml('Rek Bank Tujuan', buildDestinationAccountText(frpDetail))}
        </div>
      </section>

      <section class="frp-print__items">
        <table class="frp-print__table">
          <colgroup>
            <col style="width:68%;" />
            <col style="width:14%;" />
            <col style="width:18%;" />
          </colgroup>
          <thead>
            <tr>
              <th>Memo</th>
              <th>Budget ID</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsRowsHtml(itemList)}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td class="frp-print__currency">${safe(currencyCode)}</td>
              <td class="frp-print__num">${escapeHtml(itemsTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section class="frp-print__description">
        <div class="frp-print__row">
          <div class="frp-print__label">Keterangan FRP</div>
          <div class="frp-print__value">${safeMultiline(description)}</div>
        </div>
      </section>

      <section class="frp-print__signatures">
        ${buildSignatureHtml({ label: 'Request By:', name: requestedBy, rightLabel: 'Finance Approval By:' })}
        <div class="frp-print__row frp-print__approved">
          <div class="frp-print__label">Approved By:</div>
          <div class="frp-print__value">${safe(approvedBy)}</div>
        </div>
      </section>

      <footer class="frp-print__footer">
        <div>Dicetak pada ${escapeHtml(printedAt)}</div>
        <div>Papertrail &bull; Dokumen ini dihasilkan otomatis oleh sistem</div>
      </footer>
    </div>
  </body>
</html>`
}

export function printFrpDocument(printWindow, { frpDetail, items = [], documentTypes = [] } = {}) {
  if (!printWindow || printWindow.closed || !frpDetail) {
    return false
  }

  const html = buildPrintHtml({ frpDetail, items, documentTypes })

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
