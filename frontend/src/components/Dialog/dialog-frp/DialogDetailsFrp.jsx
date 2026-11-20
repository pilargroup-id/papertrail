import { useEffect, useState } from 'react'

import api from '../../../services/api.js'
import DetailAttachmentList from '../details/DetailAttachmentList.jsx'
import DetailDrawer from '../details/DetailDrawer.jsx'
import DetailFields from '../details/DetailFields.jsx'
import DetailItemsTable from '../details/DetailItemsTable.jsx'
import DetailSection from '../details/DetailSection.jsx'

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

function formatQuantity(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
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

function getAttachmentUploadStatus(attachment) {
  const uploadStatus = String(attachment?.upload_status ?? '').toUpperCase()

  if (uploadStatus) {
    return uploadStatus
  }

  const fallbackStatus = String(attachment?.status ?? '').toUpperCase()

  return ['PENDING', 'UPLOADED', 'CANCELED'].includes(fallbackStatus) ? fallbackStatus : ''
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

function getAttachmentDownloadUrlFromResponse(response) {
  return (
    response?.data?.download_url ??
    response?.data?.data?.download_url ??
    response?.download_url ??
    response?.data?.url ??
    response?.url
  )
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

function getSafeAttachmentFileName(fileName) {
  const safeName = String(fileName || 'attachment')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim()

  return safeName || 'attachment'
}

function triggerAttachmentDownload(url, fileName, { openInNewTab = false } = {}) {
  const link = document.createElement('a')

  link.href = url
  link.download = getSafeAttachmentFileName(fileName)

  if (openInNewTab) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }

  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function downloadAttachmentFromUrl(downloadUrl, fileName) {
  try {
    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error('Gagal mengunduh attachment dari storage.')
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    triggerAttachmentDownload(objectUrl, fileName)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  } catch {
    triggerAttachmentDownload(downloadUrl, fileName, { openInNewTab: true })
  }
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
  const uploadStatus = getAttachmentUploadStatus(attachment)

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function isAttachmentVisible(attachment) {
  const uploadStatus = getAttachmentUploadStatus(attachment)

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
    align: 'right',
    accessor: 'quantity',
    format: formatQuantity,
    minWidth: 64,
    nowrap: true,
  },
  {
    key: 'unitPrice',
    header: 'Unit Price (IDR)',
    align: 'right',
    accessor: 'unit_price',
    format: formatRupiah,
    minWidth: 112,
    nowrap: true,
  },
  {
    key: 'amount',
    header: 'Amount (IDR)',
    align: 'right',
    accessor: 'amount',
    format: formatRupiah,
    minWidth: 112,
    nowrap: true,
  },
  {
    key: 'remainingBefore',
    header: 'Remaining Before',
    align: 'right',
    accessor: 'budget_remaining_before',
    format: formatRupiah,
    minWidth: 126,
    nowrap: true,
  },
  {
    key: 'remainingAfter',
    header: 'Remaining After',
    align: 'right',
    accessor: 'budget_remaining_after',
    format: formatRupiah,
    minWidth: 126,
    nowrap: true,
  },
]

function getFrpStatusValue(frpDetail) {
  return String(getFirstValue(frpDetail, ['status'], ''))
    .trim()
    .toUpperCase()
}

function DialogDetailsFrp({
  isOpen = false,
  eyebrow = 'FRP Detail',
  title = 'Detail FRP',
  frp = null,
  onClose,
  onDuplicate,
  onPrint,
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
        `Attachment belum siap di-download. Status upload: ${formatStatusLabel(
          getAttachmentUploadStatus(attachment) || 'PENDING',
        )}.`,
      )
      return
    }

    setDownloadingAttachmentId(attachmentId)
    setAttachmentErrorMessage('')

    try {
      const response = await api.frp.attachments.downloadUrl(frpId, attachmentId)
      const downloadUrl = getAttachmentDownloadUrlFromResponse(response)

      if (!downloadUrl) {
        throw new Error('URL attachment tidak tersedia.')
      }

      await downloadAttachmentFromUrl(downloadUrl, getAttachmentName(attachment))
    } catch (error) {
      setAttachmentErrorMessage(error.message || 'Gagal men-download attachment.')
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
      label: 'Request By',
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
    {
      label: 'Description',
      value: getFirstValue(resolvedFrpDetail, ['description']),
      fullWidth: true,
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
  const canPrint = getFrpStatusValue(resolvedFrpDetail) === 'APPROVED'

  return (
    <DetailDrawer
      isOpen={isOpen}
      titleId="dialog-details-frp-title"
      eyebrow={eyebrow}
      title={dialogTitle}
      totalLabel="Total FRP (IDR)"
      total={isLoading ? 'Memuat...' : formatRupiah(getFirstValue(resolvedFrpDetail, ['total_amount', 'totalAmount']))}
      isLoading={isLoading}
      errorMessage={errorMessage}
      canPrint={canPrint}
      onClose={onClose}
      onDuplicate={onDuplicate ? () => onDuplicate(resolvedFrpDetail) : undefined}
      onPrint={onPrint ? () => onPrint(resolvedFrpDetail) : undefined}
    >
      <DetailSection title="FRP Information">
        <DetailFields fields={summaryFields} />
      </DetailSection>
      <DetailSection title="Document Details">
        <DetailFields fields={documentFields} />
      </DetailSection>
      <DetailSection title="Payment Details">
        <DetailFields fields={paymentFields} />
      </DetailSection>
      <DetailSection title={`Item List (${items.length})`}>
        <DetailItemsTable
          items={items}
          columns={itemColumns}
          tableLabel={`FRP ${resolvedFrpDetail?.frp_number ?? frpId ?? ''} items`}
          emptyMessage={emptyMessage}
        />
      </DetailSection>
      <DetailSection title={`Attachment (${attachments.length})`}>
        <DetailFields fields={[
          {
            label: 'Required Documents',
            value: requiredDocumentLabels.length > 0 ? requiredDocumentLabels.join(', ') : '-',
          },
          {
            label: 'Attachment Document Type',
            value: attachmentDocumentTypeLabels.length > 0 ? attachmentDocumentTypeLabels.join(', ') : '-',
          },
        ]} />
        <DetailAttachmentList
          errorMessage={attachmentErrorMessage}
          attachments={attachments.map((attachment, index) => {
            const attachmentId = getAttachmentId(attachment) ?? index
            const attachmentStatus = getFirstValue(attachment, ['upload_status', 'status'], '')

            return {
              id: attachmentId,
              name: getAttachmentName(attachment),
              meta: [
                getAttachmentDocumentTypeName(attachment),
                attachmentStatus ? `Status: ${formatStatusLabel(attachmentStatus)}` : '',
                attachment?.mime_type,
                formatFileSize(attachment?.file_size),
              ].filter((value) => value && value !== '-').join(' · '),
              isDownloading: downloadingAttachmentId === attachmentId,
              onClick: (event) => handleAttachmentClick(attachment, event),
            }
          })}
        />
      </DetailSection>
    </DetailDrawer>
  )
}

export default DialogDetailsFrp
