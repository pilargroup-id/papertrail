import { useEffect, useState } from 'react'

import api from '../../../services/api.js'
import ButtonAttachmentsFrp from '../../../components/button/button-frp/ButtonAttachmentsFrp.jsx'
import { ChevronLeft, Eye } from '../../../components/layoute/TemplateIcons.jsx'

function isBlankValue(value) {
  return value === undefined || value === null || value === ''
}

function getFirstValue(source, keys, fallback = '-') {
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

function formatDisplayValue(value) {
  return isBlankValue(value) ? '-' : String(value)
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

function getRpDetailFromResponse(response) {
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

function getRpItemsFromResponse(response) {
  const detail = getRpDetailFromResponse(response)

  if (Array.isArray(detail?.items)) {
    return detail.items
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

function getRpAttachmentsFromResponse(response) {
  const detail = getRpDetailFromResponse(response)

  if (Array.isArray(detail?.attachments)) {
    return detail.attachments
  }

  if (Array.isArray(response?.attachments)) {
    return response.attachments
  }

  return []
}

function getAttachmentId(attachment) {
  return attachment?.attachment_id ?? attachment?.id
}

function getAttachmentName(attachment) {
  return (
    attachment?.original_file_name ??
    attachment?.file_name ??
    attachment?.name ??
    attachment?.document_name_snapshot ??
    attachment?.document_type_name_snapshot ??
    'Attachment'
  )
}

function getAttachmentDocumentTypeName(attachment) {
  return getFirstValue(
    attachment,
    [
      'document_name_snapshot',
      'document_name',
      'document_type_name_snapshot',
      'document_type_name',
      'type_name',
    ],
    '-',
  )
}

function formatFileSize(value) {
  const size = Number(value)

  if (!Number.isFinite(size) || size <= 0) {
    return null
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function isAttachmentReady(attachment) {
  const uploadStatus = String(attachment?.upload_status ?? attachment?.status ?? '').toUpperCase()

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function isAttachmentVisible(attachment) {
  const uploadStatus = String(attachment?.upload_status ?? attachment?.status ?? '').toUpperCase()

  return uploadStatus !== 'CANCELED'
}

function getUniqueLabels(labels) {
  return [...new Set(labels.filter((label) => !isBlankValue(label) && label !== '-'))]
}

function DetailRow({ label, value }) {
  return (
    <div className="frp-mobile-detail-page__row">
      <dt>{label}</dt>
      <dd>{formatDisplayValue(value)}</dd>
    </div>
  )
}

function DetailSection({ title, count, children }) {
  return (
    <section className="frp-mobile-detail-page__section" aria-label={title}>
      <div className="frp-mobile-detail-page__section-header">
        <h3>{title}</h3>
        {count !== undefined ? <span>{count}</span> : null}
      </div>
      {children}
    </section>
  )
}

function MobileScreenDetailRp({ rp, onBack }) {
  const rpId = rp?.id
  const hasValidRpId = !(rpId === undefined || rpId === null || rpId === '')
  const [rpDetail, setRpDetail] = useState(null)
  const [items, setItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null)

  useEffect(() => {
    if (!rp) {
      return undefined
    }

    if (!hasValidRpId) {
      return undefined
    }

    const controller = new AbortController()

    async function loadRpDetail() {
      setIsLoading(true)
      setErrorMessage('')
      setAttachmentErrorMessage('')
      setRpDetail(null)
      setItems([])
      setAttachments([])

      try {
        const response = await api.rp.detail(rpId, undefined, {
          signal: controller.signal,
        })

        setRpDetail(getRpDetailFromResponse(response))
        setItems(getRpItemsFromResponse(response))
        setAttachments(getRpAttachmentsFromResponse(response).filter(isAttachmentVisible))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setRpDetail(null)
        setItems([])
        setAttachments([])
        setErrorMessage(error.message || 'Gagal memuat item RP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadRpDetail()

    return () => controller.abort()
  }, [rp, rpId, hasValidRpId])

  if (!rp) {
    return null
  }

  const handleAttachmentClick = async (attachment, event) => {
    event.stopPropagation()

    const attachmentId = getAttachmentId(attachment)

    if (!attachmentId || !rpId) {
      setAttachmentErrorMessage('Attachment tidak dapat dibuka.')
      return
    }

    if (!isAttachmentReady(attachment)) {
      setAttachmentErrorMessage(
        `Attachment belum siap dipreview. Status upload: ${formatStatusLabel(
          getFirstValue(attachment, ['upload_status', 'status'], 'PENDING'),
        )}.`,
      )
      return
    }

    setDownloadingAttachmentId(attachmentId)
    setAttachmentErrorMessage('')

    try {
      const response = await api.rp.attachments.downloadUrl(rpId, attachmentId)
      const downloadUrl = response?.data?.download_url ?? response?.download_url

      if (!downloadUrl) {
        throw new Error('URL attachment tidak tersedia.')
      }

      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setAttachmentErrorMessage(error.message || 'Gagal membuka attachment.')
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  const displayedItems = hasValidRpId ? items : []
  const displayedAttachments = hasValidRpId ? attachments : []
  const effectiveErrorMessage = hasValidRpId
    ? errorMessage
    : 'ID RP tidak tersedia.'
  const resolvedRpDetail = hasValidRpId ? rpDetail ?? rp ?? {} : rp ?? {}
  const attachmentDocumentTypeLabels = getUniqueLabels(
    displayedAttachments.map(getAttachmentDocumentTypeName),
  )
  const summaryFields = [
    ['RP Number', getFirstValue(resolvedRpDetail, ['rp_number', 'rpNumber', 'id'])],
    [
      'Request by',
      getFirstValue(
        resolvedRpDetail,
        ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by'],
      ),
    ],
    [
      'Company',
      [
        getFirstValue(resolvedRpDetail, ['company_code_snapshot', 'company_code'], ''),
        getFirstValue(resolvedRpDetail, ['company_name_snapshot', 'company_name'], ''),
      ].filter(Boolean).join(' - ') || '-',
    ],
    [
      'Division',
      [
        getFirstValue(resolvedRpDetail, ['department_code_snapshot', 'department_code'], ''),
        getFirstValue(resolvedRpDetail, ['department_name_snapshot', 'department_name'], ''),
      ].filter(Boolean).join(' - ') || '-',
    ],
    ['RP Date', formatDateValue(getFirstValue(resolvedRpDetail, ['date_required', 'dateRequired'], ''))],
    ['Status', formatStatusLabel(getFirstValue(resolvedRpDetail, ['status'], ''))],
    ['Total Amount', formatRupiah(getFirstValue(resolvedRpDetail, ['total_amount', 'totalAmount'], ''))],
    ['Created At', formatDateTime(getFirstValue(resolvedRpDetail, ['created_at', 'createdAt'], ''))],
    ['Updated At', formatDateTime(getFirstValue(resolvedRpDetail, ['updated_at', 'updatedAt'], ''))],
  ]
  const vendorFields = [
    [
      'Vendor',
      [
        getFirstValue(resolvedRpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
        getFirstValue(resolvedRpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
      ].filter(Boolean).join(' - ') || getFirstValue(resolvedRpDetail, ['vendor_id', 'vendorId']),
    ],
    [
      'Payment Category',
      getFirstValue(resolvedRpDetail, ['payment_category_name_snapshot', 'payment_category_name'], '') ||
        getFirstValue(resolvedRpDetail, ['payment_category_id', 'paymentCategoryId']),
    ],
    [
      'Destination Division',
      [
        getFirstValue(resolvedRpDetail, ['destination_department_code_snapshot'], ''),
        getFirstValue(resolvedRpDetail, ['destination_department_name_snapshot'], ''),
        getFirstValue(resolvedRpDetail, ['destination_department_class_snapshot'], ''),
      ].filter(Boolean).join(' - ') ||
        getFirstValue(resolvedRpDetail, ['destination_department_id', 'destinationDepartmentId']),
    ],
    ['PIC', getFirstValue(resolvedRpDetail, ['pic_name', 'picName'])],
    ['Notes', getFirstValue(resolvedRpDetail, ['notes'])],
  ]

  return (
    <section
      className="frp-mobile-detail-page frp-mobile-create-page"
      aria-label={`Detail ${formatDisplayValue(rp?.rp_number ?? rpId)}`}
    >
      <header className="frp-mobile-create-page__header">
        <button
          className="frp-mobile-create-page__back"
          type="button"
          onClick={onBack}
          aria-label="Kembali ke daftar RP"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="frp-mobile-create-page__heading">
          <p className="frp-mobile-create-page__eyebrow">
            RP Detail - {formatStatusLabel(getFirstValue(resolvedRpDetail, ['status'], ''))}
          </p>
          <h2 className="frp-mobile-create-page__title">
            {formatDisplayValue(getFirstValue(resolvedRpDetail, ['rp_number', 'rpNumber', 'id']))}
          </h2>
        </div>
      </header>

      {effectiveErrorMessage ? (
        <p className="frp-mobile-detail-page__message">{effectiveErrorMessage}</p>
      ) : null}

      <dl className="frp-mobile-detail-page__list">
        {summaryFields.map(([label, value]) => (
          <DetailRow key={label} label={label} value={value} />
        ))}
      </dl>

      <section className="frp-mobile-detail-page__description">
        <p>Description</p>
        <div>{formatDisplayValue(getFirstValue(resolvedRpDetail, ['description']))}</div>
      </section>

      <DetailSection title="Items" count={isLoading ? '...' : displayedItems.length}>
        {displayedItems.length > 0 ? (
          <div className="frp-mobile-detail-page__items">
            {displayedItems.map((item, index) => (
              <article className="frp-mobile-detail-page__item" key={item?.id ?? index}>
                <div className="frp-mobile-detail-page__item-header">
                  <strong>{formatDisplayValue(item?.budget_code_snapshot)}</strong>
                  <span>{formatRupiah(item?.amount)}</span>
                </div>
                <dl className="frp-mobile-detail-page__item-list">
                  <DetailRow label="Project Name" value={item?.budget_project_name_snapshot} />
                  <DetailRow label="Memo" value={item?.memo} />
                  <DetailRow label="Qty" value={formatNumber(item?.quantity)} />
                  <DetailRow label="Unit Price" value={formatRupiah(item?.unit_price)} />
                  <DetailRow label="Purchase Link" value={item?.purchase_link} />
                  <DetailRow label="Budget Remaining" value={formatRupiah(item?.budget_remaining_after ?? item?.budget_remaining)} />
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="frp-mobile-detail-page__empty">
            {isLoading ? 'Memuat item RP...' : effectiveErrorMessage || 'Belum ada item RP.'}
          </p>
        )}
      </DetailSection>

      <DetailSection title="Vendor & Destination">
        <dl className="frp-mobile-detail-page__list frp-mobile-detail-page__list--section">
          {vendorFields.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </dl>
      </DetailSection>

      <DetailSection title="Attachment" count={displayedAttachments.length}>
        <dl className="frp-mobile-detail-page__list frp-mobile-detail-page__list--section">
          <DetailRow
            label="Attachment Document Type"
            value={
              attachmentDocumentTypeLabels.length > 0
                ? attachmentDocumentTypeLabels.join(', ')
                : '-'
            }
          />
        </dl>

        {displayedAttachments.length > 0 ? (
          <div className="frp-mobile-detail-page__attachments" aria-label="RP attachments">
            {displayedAttachments.map((attachment, index) => {
              const attachmentId = getAttachmentId(attachment) ?? index
              const attachmentName = getAttachmentName(attachment)
              const attachmentStatus = getFirstValue(attachment, ['upload_status', 'status'], '')
              const attachmentMeta = [
                getAttachmentDocumentTypeName(attachment),
                attachmentStatus ? `Status: ${formatStatusLabel(attachmentStatus)}` : '',
                attachment?.mime_type,
                formatFileSize(attachment?.file_size),
              ].filter((value) => value && value !== '-')
              const isReady = isAttachmentReady(attachment)
              const isDownloading = downloadingAttachmentId === attachmentId

              return (
                <ButtonAttachmentsFrp
                  key={attachmentId}
                  className="frp-mobile-detail-page__attachment-button"
                  icon={Eye}
                  label={`Preview attachment ${attachmentName}`}
                  disabled={isDownloading || !isReady}
                  onClick={(event) => handleAttachmentClick(attachment, event)}
                >
                  <span className="frp-mobile-detail-page__attachment-copy">
                    <strong>{attachmentName}</strong>
                    {attachmentMeta.length > 0 ? <span>{attachmentMeta.join(' - ')}</span> : null}
                  </span>
                </ButtonAttachmentsFrp>
              )
            })}
          </div>
        ) : (
          <p className="frp-mobile-detail-page__empty">Belum ada attachment.</p>
        )}

        {attachmentErrorMessage ? (
          <p className="frp-mobile-detail-page__message">{attachmentErrorMessage}</p>
        ) : null}
      </DetailSection>
    </section>
  )
}

export default MobileScreenDetailRp
