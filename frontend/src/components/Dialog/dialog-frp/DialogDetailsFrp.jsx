import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import DataTable from '../../table/DataTable.jsx'

import ButtonAttachmentsFrp from '../../button/button-frp/ButtonAttachmentsFrp.jsx'
import { Eye } from '../../layoute/TemplateIcons.jsx'

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

function DetailField({ label, value, className = '' }) {
  const fieldClassName = ['frp-accordion-detail__field', className].filter(Boolean).join(' ')

  return (
    <div className={fieldClassName}>
      <span>{label}</span>
      <strong>{formatDisplayValue(value)}</strong>
    </div>
  )
}

function DetailCard({ title, className = '', children }) {
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

function DetailSectionHeader({ title, count }) {
  return (
    <div className="frp-accordion-detail__section-header">
      <h4>
        {title} <span>({count})</span>
      </h4>
    </div>
  )
}

const itemColumns = [
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
    key: 'quantity',
    header: 'Qty',
    accessor: 'quantity',
    format: formatNumber,
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
  {
    key: 'remainingBefore',
    header: 'Remaining Before',
    accessor: 'budget_remaining_before',
    format: formatRupiah,
    minWidth: 126,
    nowrap: true,
  },
  {
    key: 'remainingAfter',
    header: 'Remaining After',
    accessor: 'budget_remaining_after',
    format: formatRupiah,
    minWidth: 126,
    nowrap: true,
  },
]

function DialogDetailsFrp({
  isOpen = false,
  eyebrow = 'FRP Detail',
  title = 'Detail FRP',
  frp = null,
  onClose,
}) {
  const frpId = frp?.id
  const [frpDetail, setFrpDetail] = useState(null)
  const [items, setItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    if (frpId === undefined || frpId === null || frpId === '') {
      setFrpDetail(null)
      setItems([])
      setAttachments([])
      setErrorMessage('ID FRP tidak tersedia.')
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
  }, [frpId, isOpen])

  if (!isOpen || typeof document === 'undefined') {
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

  const resolvedFrpDetail = frpDetail ?? frp ?? {}
  const requiredDocumentLabels = getRequiredDocumentLabels(resolvedFrpDetail)
  const attachmentDocumentTypeLabels = getUniqueLabels(
    attachments.map(getAttachmentDocumentTypeName),
  )
  const summaryFields = [
    {
      label: 'FRP Number',
      value: getFirstValue(resolvedFrpDetail, ['frp_number', 'frpNumber', 'id']),
    },
    {
      label: 'Request by',
      value: getFirstValue(
        resolvedFrpDetail,
        ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by'],
      ),
    },
    {
      label: 'Vendor',
      value: getFirstValue(
        resolvedFrpDetail,
        ['vendor_name_snapshot', 'vendor_name', 'vendor_code_snapshot', 'vendor_code', 'vendor_id'],
      ),
    },
    {
      label: 'Created At',
      value: formatDateTime(getFirstValue(resolvedFrpDetail, ['created_at', 'createdAt'], '')),
    },
    {
      label: 'Description',
      value: getFirstValue(resolvedFrpDetail, ['description']),
      className: 'frp-accordion-detail__field--wide',
    },
    {
      label: 'Status',
      value: formatStatusLabel(getFirstValue(resolvedFrpDetail, ['status'], '')),
    },
    {
      label: 'Updated At',
      value: formatDateTime(getFirstValue(resolvedFrpDetail, ['updated_at', 'updatedAt'], '')),
    },
    {
      label: 'Total Amount',
      value: formatRupiah(getFirstValue(resolvedFrpDetail, ['total_amount', 'totalAmount'], '')),
    },
  ]
  const documentFields = [
    {
      label: 'Internal PO Number',
      value: getFirstValue(resolvedFrpDetail, ['internal_po_number', 'internal_po_number_snapshot']),
    },
    {
      label: 'External Document Type',
      value: getFirstValue(
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
    },
    {
      label: 'External Document Number',
      value: getFirstValue(
        resolvedFrpDetail,
        ['external_document_number', 'external_document_number_snapshot'],
      ),
    },
  ]
  const paymentFields = [
    {
      label: 'Destination Bank',
      value: getFirstValue(
        resolvedFrpDetail,
        ['destination_bank_name', 'destination_bank_name_snapshot', 'bank_name_snapshot'],
      ),
    },
    {
      label: 'Destination Account',
      value: getFirstValue(
        resolvedFrpDetail,
        ['destination_bank_account', 'destination_bank_account_snapshot', 'account_number_snapshot'],
      ),
    },
    {
      label: 'Destination Account Name',
      value: getFirstValue(
        resolvedFrpDetail,
        [
          'destination_bank_account_name',
          'destination_bank_account_name_snapshot',
          'account_name_snapshot',
        ],
      ),
    },
    {
      label: 'Payment Method',
      value: getFirstValue(
        resolvedFrpDetail,
        [
          'payment_method_name_snapshot',
          'payment_method_name',
          'payment_method_code_snapshot',
          'payment_method_code',
          'payment_method_id',
        ],
      ),
    },
    {
      label: 'Payment Date',
      value: formatDateValue(getFirstValue(resolvedFrpDetail, ['payment_date'], '')),
    },
    {
      label: 'Currency',
      value: getFirstValue(resolvedFrpDetail, ['currency_code', 'currency'], '-'),
    },
    {
      label: 'Exchange Rate',
      value: formatExchangeRate(getFirstValue(resolvedFrpDetail, ['exchange_rate'], '')),
    },
  ]
  const emptyMessage = isLoading
    ? 'Memuat item FRP...'
    : errorMessage || 'Belum ada item FRP.'
  const dialogTitle = title || `Detail ${frp?.frp_number ?? frpId ?? 'FRP'}`

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp frp-details-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-details-frp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-details-frp-title">
              {dialogTitle}
            </h2>
          </div>
        </div>

        <div className="dashboard-popup__body">
          <div className="frp-detail-dialog frp-accordion-detail">
            <DetailCard title="FRP Summary" className="frp-accordion-detail__card--wide">
              <div className="frp-accordion-detail__field-grid frp-accordion-detail__field-grid--summary">
                {summaryFields.map((field) => (
                  <DetailField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    className={field.className}
                  />
                ))}
              </div>
            </DetailCard>

            <section className="frp-accordion-detail__items" aria-label="FRP items">
              <DetailSectionHeader title="Items" count={items.length} />
              <DataTable
                rows={items}
                columns={itemColumns}
                getRowId={(item, index) => item?.id ?? index}
                tableLabel={`FRP ${frp?.frp_number ?? frpId ?? ''} items`}
                emptyMessage={emptyMessage}
                pagination={false}
                mobileCard={false}
                className="frp-accordion-detail__table"
              />
            </section>

            <DetailCard title="Document" className="frp-accordion-detail__card--wide">
              <div className="frp-accordion-detail__field-grid frp-accordion-detail__field-grid--document">
                {documentFields.map((field) => (
                  <DetailField key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            </DetailCard>

            <div className="frp-accordion-detail__cards">
              <DetailCard title="Payment Details">
                <div className="frp-accordion-detail__field-grid">
                  {paymentFields.map((field) => (
                    <DetailField key={field.label} label={field.label} value={field.value} />
                  ))}
                </div>
              </DetailCard>

              <DetailCard title={`Attachment (${attachments.length})`}>
                <div className="frp-accordion-detail__field-grid frp-accordion-detail__field-grid--attachment">
                  <DetailField
                    label="Required Documents"
                    value={
                      requiredDocumentLabels.length > 0
                        ? requiredDocumentLabels.join(', ')
                        : '-'
                    }
                  />
                  <DetailField
                    label="Attachment Document Type"
                    value={
                      attachmentDocumentTypeLabels.length > 0
                        ? attachmentDocumentTypeLabels.join(', ')
                        : '-'
                    }
                  />
                </div>

                <div className="frp-accordion-detail__attachments" aria-label="FRP attachments">
                  <span className="frp-accordion-detail__attachment-label">
                    Preview Attachment
                  </span>
                  {attachments.length > 0 ? (
                    <div className="frp-accordion-detail__attachment-list">
                      {attachments.map((attachment, index) => {
                        const attachmentId = getAttachmentId(attachment) ?? index
                        const attachmentName = getAttachmentName(attachment)
                        const attachmentStatus = getFirstValue(
                          attachment,
                          ['upload_status', 'status'],
                          '',
                        )
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
                            className="frp-accordion-detail__attachment-button"
                            icon={Eye}
                            label={`Preview attachment ${attachmentName}`}
                            disabled={isDownloading || !isReady}
                            onClick={(event) => handleAttachmentClick(attachment, event)}
                          >
                            <span className="frp-accordion-detail__attachment-copy">
                              <strong>{attachmentName}</strong>
                              {attachmentMeta.length > 0 ? (
                                <span>{attachmentMeta.join(' - ')}</span>
                              ) : null}
                            </span>
                          </ButtonAttachmentsFrp>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="frp-accordion-detail__attachment-empty">
                      Belum ada attachment.
                    </p>
                  )}

                  {attachmentErrorMessage ? (
                    <p className="frp-accordion-detail__attachment-error">
                      {attachmentErrorMessage}
                    </p>
                  ) : null}
                </div>
              </DetailCard>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDetailsFrp
