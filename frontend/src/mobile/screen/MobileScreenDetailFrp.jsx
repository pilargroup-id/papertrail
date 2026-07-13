import { useEffect, useState } from 'react'

import api from '../../services/api.js'
import ButtonAttachmentsFrp from '../../components/button/button-frp/ButtonAttachmentsFrp.jsx'
import { ChevronLeft, Eye } from '../../components/layoute/TemplateIcons.jsx'

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

function formatExchangeRate(value) {
  return isBlankValue(value) ? '-' : formatNumber(value)
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

function getFrpDetailFromResponse(response) {
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

function getFrpItemsFromResponse(response) {
  const detail = getFrpDetailFromResponse(response)

  if (Array.isArray(detail?.items)) {
    return detail.items
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

function getFrpAttachmentsFromResponse(response) {
  const detail = getFrpDetailFromResponse(response)

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

function getDocumentName(document) {
  if (typeof document === 'string' || typeof document === 'number') {
    return String(document)
  }

  return getFirstValue(
    document,
    [
      'document_name_snapshot',
      'document_name',
      'document_type_name_snapshot',
      'document_type_name',
      'name',
      'label',
      'code',
      'document_type_id',
      'frp_document_type_id',
      'id',
    ],
    '',
  )
}

function getRequiredDocumentLabels(frpDetail) {
  const documentCandidates = [
    frpDetail?.required_documents,
    frpDetail?.document_types,
    frpDetail?.documents,
    frpDetail?.frp_document_types,
    frpDetail?.document_type_names,
    frpDetail?.document_type_ids,
  ]

  for (const candidate of documentCandidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map(getDocumentName).filter(Boolean)
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      return [candidate]
    }
  }

  return []
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

function MobileScreenDetailFrp({ frp, onBack }) {
  const frpId = frp?.id
  const hasValidFrpId = !(frpId === undefined || frpId === null || frpId === '')
  const [frpDetail, setFrpDetail] = useState(null)
  const [items, setItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null)

  useEffect(() => {
    if (!frp) {
      return undefined
    }

    if (!hasValidFrpId) {
      return undefined
    }

    const controller = new AbortController()

    async function loadFrpDetail() {
      setIsLoading(true)
      setErrorMessage('')
      setAttachmentErrorMessage('')
      setFrpDetail(null)
      setItems([])
      setAttachments([])

      try {
        const response = await api.frp.detail(frpId, undefined, {
          signal: controller.signal,
        })

        setFrpDetail(getFrpDetailFromResponse(response))
        setItems(getFrpItemsFromResponse(response))
        setAttachments(getFrpAttachmentsFromResponse(response).filter(isAttachmentVisible))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setFrpDetail(null)
        setItems([])
        setAttachments([])
        setErrorMessage(error.message || 'Gagal memuat item FRP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadFrpDetail()

    return () => controller.abort()
  }, [frp, frpId, hasValidFrpId])

  if (!frp) {
    return null
  }

  const handleAttachmentClick = async (attachment, event) => {
    event.stopPropagation()

    const attachmentId = getAttachmentId(attachment)

    if (!attachmentId || !frpId) {
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
      const response = await api.frp.attachments.downloadUrl(frpId, attachmentId)
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

  const displayedItems = hasValidFrpId ? items : []
  const displayedAttachments = hasValidFrpId ? attachments : []
  const effectiveErrorMessage = hasValidFrpId
    ? errorMessage
    : 'ID FRP tidak tersedia.'
  const resolvedFrpDetail = hasValidFrpId ? frpDetail ?? frp ?? {} : frp ?? {}
  const requiredDocumentLabels = getRequiredDocumentLabels(resolvedFrpDetail)
  const attachmentDocumentTypeLabels = getUniqueLabels(
    displayedAttachments.map(getAttachmentDocumentTypeName),
  )
  const summaryFields = [
    ['FRP Number', getFirstValue(resolvedFrpDetail, ['frp_number', 'frpNumber', 'id'])],
    [
      'Request by',
      getFirstValue(
        resolvedFrpDetail,
        ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by'],
      ),
    ],
    [
      'Vendor',
      getFirstValue(
        resolvedFrpDetail,
        ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id'],
      ),
    ],
    ['Created At', formatDateTime(getFirstValue(resolvedFrpDetail, ['created_at', 'createdAt'], ''))],
    ['Status', formatStatusLabel(getFirstValue(resolvedFrpDetail, ['status'], ''))],
    ['Updated At', formatDateTime(getFirstValue(resolvedFrpDetail, ['updated_at', 'updatedAt'], ''))],
    ['Total Amount', formatRupiah(getFirstValue(resolvedFrpDetail, ['total_amount', 'totalAmount'], ''))],
  ]
  const documentFields = [
    [
      'Internal PO Number',
      getFirstValue(resolvedFrpDetail, ['internal_po_number', 'internal_po_number_snapshot']),
    ],
    [
      'External Document Type',
      getFirstValue(
        resolvedFrpDetail,
        [
          'external_document_type_name_snapshot',
          'external_document_type_name',
          'external_document_type_code_snapshot',
          'external_document_type_code',
          'external_document_type_id',
          'externalDocumentTypeId',
        ],
      ),
    ],
    [
      'External Document Number',
      getFirstValue(
        resolvedFrpDetail,
        ['external_document_number', 'external_document_number_snapshot'],
      ),
    ],
  ]
  const paymentFields = [
    [
      'Destination Bank',
      getFirstValue(
        resolvedFrpDetail,
        ['destination_bank_name', 'destination_bank_name_snapshot', 'bank_name_snapshot'],
      ),
    ],
    [
      'Destination Account',
      getFirstValue(
        resolvedFrpDetail,
        ['destination_bank_account', 'destination_bank_account_snapshot', 'account_number_snapshot'],
      ),
    ],
    [
      'Destination Account Name',
      getFirstValue(
        resolvedFrpDetail,
        [
          'destination_bank_account_name',
          'destination_bank_account_name_snapshot',
          'account_name_snapshot',
        ],
      ),
    ],
    [
      'Payment Method',
      getFirstValue(
        resolvedFrpDetail,
        [
          'payment_method_name_snapshot',
          'payment_method_name',
          'payment_method_code_snapshot',
          'payment_method_code',
          'payment_method_id',
        ],
      ),
    ],
    ['Payment Date', formatDateValue(getFirstValue(resolvedFrpDetail, ['payment_date'], ''))],
    ['Currency', getFirstValue(resolvedFrpDetail, ['currency_code', 'currency'], '-')],
    ['Exchange Rate', formatExchangeRate(getFirstValue(resolvedFrpDetail, ['exchange_rate'], ''))],
  ]

  return (
    <section
      className="frp-mobile-detail-page frp-mobile-create-page"
      aria-label={`Detail ${formatDisplayValue(frp?.frp_number ?? frpId)}`}
    >
      <header className="frp-mobile-create-page__header">
        <button
          className="frp-mobile-create-page__back"
          type="button"
          onClick={onBack}
          aria-label="Kembali ke daftar FRP"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="frp-mobile-create-page__heading">
          <p className="frp-mobile-create-page__eyebrow">
            FRP Detail - {formatStatusLabel(getFirstValue(resolvedFrpDetail, ['status'], ''))}
          </p>
          <h2 className="frp-mobile-create-page__title">
            {formatDisplayValue(getFirstValue(resolvedFrpDetail, ['frp_number', 'frpNumber', 'id']))}
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
        <div>{formatDisplayValue(getFirstValue(resolvedFrpDetail, ['description']))}</div>
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
                  <DetailRow label="Remaining Before" value={formatRupiah(item?.budget_remaining_before)} />
                  <DetailRow label="Remaining After" value={formatRupiah(item?.budget_remaining_after)} />
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="frp-mobile-detail-page__empty">
            {isLoading ? 'Memuat item FRP...' : effectiveErrorMessage || 'Belum ada item FRP.'}
          </p>
        )}
      </DetailSection>

      <DetailSection title="Document">
        <dl className="frp-mobile-detail-page__list frp-mobile-detail-page__list--section">
          {documentFields.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </dl>
      </DetailSection>

      <DetailSection title="Payment Details">
        <dl className="frp-mobile-detail-page__list frp-mobile-detail-page__list--section">
          {paymentFields.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </dl>
      </DetailSection>

      <DetailSection title="Attachment" count={displayedAttachments.length}>
        <dl className="frp-mobile-detail-page__list frp-mobile-detail-page__list--section">
          <DetailRow
            label="Required Documents"
            value={requiredDocumentLabels.length > 0 ? requiredDocumentLabels.join(', ') : '-'}
          />
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
          <div className="frp-mobile-detail-page__attachments" aria-label="FRP attachments">
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

export default MobileScreenDetailFrp
