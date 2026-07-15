import ButtonAttachmentsFrp from '../../../button/button-frp/ButtonAttachmentsFrp.jsx'
import { Download } from '../../../layoute/TemplateIcons.jsx'
import {
  DetailCard,
  DetailField,
  formatStatusLabel,
  getFirstValue,
} from './detailRpUtils.jsx'

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

function getUniqueLabels(labels) {
  return [...new Set(labels.filter((label) => label && label !== '-'))]
}

function TabsAttachment({
  attachments = [],
  attachmentErrorMessage = '',
  className = '',
  downloadingAttachmentId = null,
  onAttachmentClick,
}) {
  const attachmentDocumentTypeLabels = getUniqueLabels(
    attachments.map(getAttachmentDocumentTypeName),
  )

  return (
    <DetailCard title={`Attachment (${attachments.length})`} className={className}>
      <div className="frp-accordion-detail__field-grid frp-accordion-detail__field-grid--attachment">
        <DetailField
          label="Attachment Document Type"
          value={
            attachmentDocumentTypeLabels.length > 0
              ? attachmentDocumentTypeLabels.join(', ')
              : '-'
          }
        />
      </div>

      <div className="frp-accordion-detail__attachments" aria-label="RP attachments">
        <span className="frp-accordion-detail__attachment-label">Download Attachment</span>
        {attachments.length > 0 ? (
          <div className="frp-accordion-detail__attachment-list">
            {attachments.map((attachment, index) => {
              const attachmentId = getAttachmentId(attachment) ?? index
              const attachmentName = getAttachmentName(attachment)
              const attachmentStatus = getFirstValue(attachment, ['upload_status', 'status'], '')
              const attachmentMeta = [
                getAttachmentDocumentTypeName(attachment),
                attachmentStatus ? `Status: ${formatStatusLabel(attachmentStatus)}` : '',
                attachment?.mime_type,
                formatFileSize(attachment?.file_size),
              ].filter((value) => value && value !== '-')
              const isDownloading = downloadingAttachmentId === attachmentId

              return (
                <ButtonAttachmentsFrp
                  key={attachmentId}
                  className="frp-accordion-detail__attachment-button"
                  icon={Download}
                  label={`Download attachment ${attachmentName}`}
                  disabled={isDownloading}
                  onClick={(event) => onAttachmentClick?.(attachment, event)}
                >
                  <span className="frp-accordion-detail__attachment-copy">
                    <strong>{attachmentName}</strong>
                    {attachmentMeta.length > 0 ? <span>{attachmentMeta.join(' - ')}</span> : null}
                  </span>
                </ButtonAttachmentsFrp>
              )
            })}
          </div>
        ) : (
          <p className="frp-accordion-detail__attachment-empty">Belum ada attachment.</p>
        )}

        {attachmentErrorMessage ? (
          <p className="frp-accordion-detail__attachment-error">{attachmentErrorMessage}</p>
        ) : null}
      </div>
    </DetailCard>
  )
}

export { getAttachmentId, getAttachmentName }
export default TabsAttachment
