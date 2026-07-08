import { useEffect, useState } from 'react'

import api from '../../../services/api.js'
import DataTable from '../DataTable.jsx'

import ButtonAttachmentsFrp from '../../button/button-frp/ButtonAttachmentsFrp.jsx'
import { FileText01 } from '../../layoute/TemplateIcons.jsx'

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
    attachment?.document_type_name_snapshot ??
    'Attachment'
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

const itemColumns = [
  {
    key: 'budgetCode',
    header: 'Budget Code',
    accessor: 'budget_code_snapshot',
    type: 'identity',
    subtitleAccessor: (item) => item?.budget_type_name_snapshot ?? item?.budget_type_code_snapshot,
    minWidth: 180,
  },
  {
    key: 'projectName',
    header: 'Project Name',
    accessor: 'budget_project_name_snapshot',
    minWidth: 280,
  },
  {
    key: 'memo',
    header: 'Memo',
    accessor: 'memo',
    minWidth: 180,
  },
  {
    key: 'quantity',
    header: 'Qty',
    accessor: 'quantity',
    format: formatNumber,
    minWidth: 90,
    nowrap: true,
  },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    accessor: 'unit_price',
    format: formatRupiah,
    minWidth: 150,
    nowrap: true,
  },
  {
    key: 'amount',
    header: 'Amount',
    accessor: 'amount',
    format: formatRupiah,
    minWidth: 150,
    nowrap: true,
  },
  {
    key: 'remainingBefore',
    header: 'Remaining Before',
    accessor: 'budget_remaining_before',
    format: formatRupiah,
    minWidth: 180,
    nowrap: true,
  },
  {
    key: 'remainingAfter',
    header: 'Remaining After',
    accessor: 'budget_remaining_after',
    format: formatRupiah,
    minWidth: 180,
    nowrap: true,
  },
]

function DetailAccordionFrp({ frp }) {
  const frpId = frp?.id
  const [items, setItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState('')
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null)

  useEffect(() => {
    if (frpId === undefined || frpId === null || frpId === '') {
      setItems([])
      setAttachments([])
      setErrorMessage('ID FRP tidak tersedia.')
      return undefined
    }

    const controller = new AbortController()

    async function loadFrpDetail() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.frp.detail(frpId, undefined, {
          signal: controller.signal,
        })

        setItems(getFrpItemsFromResponse(response))
        setAttachments(getFrpAttachmentsFromResponse(response).filter(isAttachmentReady))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

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
  }, [frpId])

  const handleAttachmentClick = async (attachment, event) => {
    event.stopPropagation()

    const attachmentId = getAttachmentId(attachment)

    if (!attachmentId || !frpId) {
      setAttachmentErrorMessage('Attachment tidak dapat dibuka.')
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

  const emptyMessage = isLoading
    ? 'Memuat item FRP...'
    : errorMessage || 'Belum ada item FRP.'

  return (
    <div className="frp-accordion-detail">
      {attachments.length > 0 || attachmentErrorMessage ? (
        <div className="frp-accordion-detail__attachments" aria-label="FRP attachments">
          {attachments.length > 0 ? (
            <div className="frp-accordion-detail__attachment-list">
              {attachments.map((attachment, index) => {
                const attachmentId = getAttachmentId(attachment) ?? index
                const attachmentName = getAttachmentName(attachment)
                const attachmentMeta = [
                  attachment?.document_type_name_snapshot ?? attachment?.document_type_name,
                  attachment?.mime_type,
                  formatFileSize(attachment?.file_size),
                ].filter(Boolean)
                const isDownloading = downloadingAttachmentId === attachmentId

                return (
                  <ButtonAttachmentsFrp
                    key={attachmentId}
                    className="frp-accordion-detail__attachment-button"
                    icon={FileText01}
                    label={`Buka attachment ${attachmentName}`}
                    disabled={isDownloading}
                    onClick={(event) => handleAttachmentClick(attachment, event)}
                  >
                    <span className="frp-accordion-detail__attachment-copy">
                      <strong>{attachmentName}</strong>
                      {attachmentMeta.length > 0 ? <span>{attachmentMeta.join(' - ')}</span> : null}
                    </span>
                  </ButtonAttachmentsFrp>
                )
              })}
            </div>
          ) : null}

        {attachmentErrorMessage ? (
          <p className="frp-accordion-detail__attachment-error">{attachmentErrorMessage}</p>
        ) : null}
        </div>
      ) : null}

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
    </div>
  )
}

export const frpAccordionDetail = {
  columnLabel: 'Items',
  eyebrow: 'FRP items',
  title: (frp) => frp?.frp_number ?? frp?.id ?? 'FRP Detail',
  description: null,
  render: (frp) => <DetailAccordionFrp frp={frp} />,
  sections: [],
}

export default DetailAccordionFrp
