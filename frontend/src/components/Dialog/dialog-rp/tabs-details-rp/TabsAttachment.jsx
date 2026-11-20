import DetailAttachmentList from '../../details/DetailAttachmentList.jsx'
import DetailFields from '../../details/DetailFields.jsx'
import DetailSection from '../../details/DetailSection.jsx'
import {
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
  downloadingAttachmentId = null,
  onAttachmentClick,
}) {
  const attachmentDocumentTypeLabels = getUniqueLabels(
    attachments.map(getAttachmentDocumentTypeName),
  )

  return (
    <DetailSection title={`Attachment (${attachments.length})`}>
      <DetailFields fields={[
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
            onClick: (event) => onAttachmentClick?.(attachment, event),
          }
        })}
      />
    </DetailSection>
  )
}

export { getAttachmentId, getAttachmentName }
export default TabsAttachment
