import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TabsAttachment from './tabs-details-rp/TabsAttachment.jsx'
import TabsInformation from './tabs-details-rp/TabsInformation.jsx'
import TabsItems from './tabs-details-rp/TabsItems.jsx'
import TabsVendor from './tabs-details-rp/TabsVendor.jsx'
import {
  formatStatusLabel,
  getRpAttachmentsFromResponse,
  getRpDetailFromResponse,
  getRpItemsFromResponse,
} from './tabs-details-rp/detailRpUtils.jsx'
import { getAttachmentId, getAttachmentName } from './tabs-details-rp/TabsAttachment.jsx'

function getAttachmentUploadStatus(attachment) {
  const uploadStatus = String(attachment?.upload_status ?? '').toUpperCase()

  if (uploadStatus) {
    return uploadStatus
  }

  const fallbackStatus = String(attachment?.status ?? '').toUpperCase()

  return ['PENDING', 'UPLOADED', 'CANCELED'].includes(fallbackStatus) ? fallbackStatus : ''
}

function isAttachmentReady(attachment) {
  const uploadStatus = getAttachmentUploadStatus(attachment)

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function isAttachmentVisible(attachment) {
  return getAttachmentUploadStatus(attachment) !== 'CANCELED'
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

function DialogDetailsRp({
  isOpen = false,
  eyebrow = 'RP Detail',
  title = 'Detail RP',
  rp = null,
  onClose,
}) {
  const rpId = rp?.id
  const [rpDetail, setRpDetail] = useState(null)
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

    if (rpId === undefined || rpId === null || rpId === '') {
      setRpDetail(null)
      setItems([])
      setAttachments([])
      setErrorMessage('ID RP tidak tersedia.')
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
        setErrorMessage(error.message || 'Gagal memuat detail RP.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadRpDetail()

    return () => controller.abort()
  }, [rpId, isOpen])

  if (!isOpen || typeof document === 'undefined') {
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
        `Attachment belum siap di-download. Status upload: ${formatStatusLabel(
          getAttachmentUploadStatus(attachment) || 'PENDING',
        )}.`,
      )
      return
    }

    setDownloadingAttachmentId(attachmentId)
    setAttachmentErrorMessage('')

    try {
      const response = await api.rp.attachments.downloadUrl(rpId, attachmentId)
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

  const resolvedRpDetail = rpDetail ?? rp ?? {}
  const emptyMessage = isLoading
    ? 'Memuat item RP...'
    : errorMessage || 'Belum ada item RP.'
  const dialogTitle = title || `Detail ${rp?.rp_number ?? rpId ?? 'RP'}`

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--frp frp-details-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-details-rp-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-details-rp-title">
              {dialogTitle}
            </h2>
          </div>
        </div>

        <div className="dashboard-popup__body">
          <div className="frp-detail-dialog frp-accordion-detail">
            <TabsInformation rpDetail={resolvedRpDetail} />

            <TabsItems
              items={items}
              rpId={rpId}
              rpNumber={resolvedRpDetail?.rp_number}
              emptyMessage={emptyMessage}
            />

            <div className="frp-accordion-detail__cards">
              <TabsVendor rpDetail={resolvedRpDetail} />

              <TabsAttachment
                attachments={attachments}
                attachmentErrorMessage={attachmentErrorMessage}
                downloadingAttachmentId={downloadingAttachmentId}
                onAttachmentClick={handleAttachmentClick}
              />
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

export default DialogDetailsRp
