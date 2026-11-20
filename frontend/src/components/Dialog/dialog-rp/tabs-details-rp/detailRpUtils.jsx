export function isBlankValue(value) {
  return value === undefined || value === null || value === ''
}

export function getFirstValue(source, keys, fallback = '-') {
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

export function formatDisplayValue(value) {
  return isBlankValue(value) ? '-' : String(value)
}

function openPurchaseLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function PurchaseLinkButton({ url }) {
  const normalizedUrl = String(url ?? '').trim()

  if (!normalizedUrl) {
    return <span className="frp-accordion-detail__purchase-link-empty" aria-hidden="true" />
  }

  return (
    <button
      type="button"
      className="users-table__detail-button frp-accordion-detail__purchase-link-button"
      title={normalizedUrl}
      onClick={() => openPurchaseLink(normalizedUrl)}
    >
      Open Link
    </button>
  )
}

export function formatNumber(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)
}

export function formatQuantity(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numberValue)
}

export function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${formatNumber(numberValue)}`
}

export function formatDateValue(value) {
  if (isBlankValue(value)) {
    return '-'
  }

  const dateValue = String(value).slice(0, 10)
  const [year, month, day] = dateValue.split('-')

  if (!year || !month || !day) {
    return String(value)
  }

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const monthIndex = Number(month) - 1

  if (!monthNames[monthIndex]) {
    return String(value)
  }

  return `${day} ${monthNames[monthIndex]} ${year}`
}

export function formatDateTime(value) {
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

export function formatStatusLabel(value) {
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

export function getRpDetailFromResponse(response) {
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

export function getRpItemsFromResponse(response) {
  const detail = getRpDetailFromResponse(response)

  if (Array.isArray(detail?.items)) {
    return detail.items
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

export function getRpAttachmentsFromResponse(response) {
  const detail = getRpDetailFromResponse(response)

  if (Array.isArray(detail?.attachments)) {
    return detail.attachments
  }

  if (Array.isArray(response?.attachments)) {
    return response.attachments
  }

  return []
}

export function DetailField({ label, value, className = '' }) {
  const fieldClassName = ['frp-accordion-detail__field', className].filter(Boolean).join(' ')

  return (
    <div className={fieldClassName}>
      <span>{label}</span>
      <strong>{formatDisplayValue(value)}</strong>
    </div>
  )
}

export function DetailCard({ title, className = '', children }) {
  const cardClassName = ['frp-accordion-detail__card', className].filter(Boolean).join(' ')

  return (
    <section className={cardClassName} aria-label={title}>
      <div className="frp-accordion-detail__card-header">
        <h4>{title}</h4>
      </div>
      {children}
    </section>
  )
}

export function DetailSectionHeader({ title, count }) {
  return (
    <div className="frp-accordion-detail__section-header">
      <h4>
        {title} <span>({count})</span>
      </h4>
    </div>
  )
}

export const rpItemColumns = [
  {
    key: 'budgetCode',
    header: 'Budget Code',
    accessor: 'budget_code_snapshot',
    type: 'identity',
    subtitleAccessor: (item) => item?.budget_type_name_snapshot ?? item?.budget_type_code_snapshot,
    minWidth: 130,
  },
  {
    key: 'projectName',
    header: 'Project Name',
    accessor: 'budget_project_name_snapshot',
    minWidth: 170,
    truncate: true,
  },
  {
    key: 'memo',
    header: 'Memo',
    accessor: 'memo',
    minWidth: 140,
    truncate: true,
  },
  {
    key: 'purchaseLink',
    header: 'Purchase Link',
    render: (item) => <PurchaseLinkButton url={getFirstValue(item, ['purchase_link', 'purchaseLink'], '')} />,
    minWidth: 160,
  },
  {
    key: 'quantity',
    header: 'Qty',
    accessor: 'quantity',
    format: formatQuantity,
    minWidth: 64,
    nowrap: true,
  },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    accessor: 'unit_price',
    format: formatRupiah,
    minWidth: 112,
    nowrap: true,
  },
  {
    key: 'amount',
    header: 'Amount',
    accessor: 'amount',
    format: formatRupiah,
    minWidth: 112,
    nowrap: true,
  },
]
