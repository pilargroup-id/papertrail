import DropdownCheckBox from '../../../../../components/forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../../../../components/forms/dropdown/DropdownSearch.jsx'
import { Eye, FileText01, Trash03, Upload } from '../../../../../components/layoute/TemplateIcons.jsx'

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return '-'
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

function getAttachmentPreviewType(file) {
  if (!file?.type) {
    return 'file'
  }

  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type === 'application/pdf') {
    return 'pdf'
  }

  return 'file'
}

function getExistingAttachmentId(attachment) {
  return attachment?.attachment_id ?? attachment?.id
}

function getExistingAttachmentName(attachment) {
  return (
    attachment?.original_file_name ??
    attachment?.file_name ??
    attachment?.name ??
    attachment?.document_name_snapshot ??
    'Attachment'
  )
}

function getExistingAttachmentPreviewType(attachment) {
  const mimeType = String(attachment?.mime_type ?? attachment?.type ?? '').toLowerCase()

  if (mimeType.startsWith('image/')) {
    return 'image'
  }

  if (mimeType === 'application/pdf') {
    return 'pdf'
  }

  return 'file'
}

function getExistingAttachmentStatus(attachment) {
  return String(attachment?.upload_status ?? attachment?.status ?? '').toUpperCase()
}

function isExistingAttachmentUploaded(attachment) {
  const uploadStatus = getExistingAttachmentStatus(attachment)

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function MobileTabsAttachment({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  frpDocumentTypeDropdownOptions,
  attachmentDocumentTypeOptions,
  attachmentDraft,
  existingAttachments = [],
  attachmentActionError = '',
  updateDocumentTypeIds,
  updateAttachmentDocumentType,
  updateAttachmentFile,
  removeAttachmentDraft,
  previewAttachmentDraft,
  previewExistingAttachment,
  removeExistingAttachment,
}) {
  const attachmentFiles = attachmentDraft.files ?? []
  const attachmentTitle =
    attachmentFiles.length > 0
      ? `${attachmentFiles.length} file attachment baru dipilih`
      : 'Klik untuk memilih file attachment'

  return (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-attachment">
      <div className="register-user-popup__field register-user-popup__field--frp-half">
        <DropdownCheckBox
          label="Required Documents"
          options={frpDocumentTypeDropdownOptions}
          value={formValues.document_type_ids.map(String)}
          placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih required documents'}
          searchPlaceholder="Cari required documents..."
          emptyMessage="FRP document type aktif tidak ditemukan."
          disabled={isFormDisabled}
          error={fieldErrors.document_type_ids}
          onChange={(value) => updateDocumentTypeIds(value.map(String))}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-half">
        <DropdownSearch
          label="Attachment Document Type"
          value={attachmentDraft.documentTypeId}
          options={attachmentDocumentTypeOptions}
          placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih document type'}
          searchPlaceholder="Cari document type..."
          emptyMessage="FRP document type aktif tidak ditemukan."
          required={attachmentFiles.length > 0}
          disabled={isFormDisabled}
          error={fieldErrors.attachment_document_type_id}
          onChange={updateAttachmentDocumentType}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--full register-user-popup__field--frp-attachment">
        <div
          className={`form-upload frp-dialog__attachment-upload${
            fieldErrors.attachment_file ? ' form-upload--error' : ''
          }${isFormDisabled ? ' form-upload--disabled' : ''}`}
        >
          <div className="form-control__label">
            <span>Upload Attachment</span>
          </div>

          <label className="form-upload__dropzone" htmlFor="frp-edit-attachment-file">
            <input
              id="frp-edit-attachment-file"
              className="form-upload__input"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              disabled={isFormDisabled}
              onClick={(event) => {
                event.currentTarget.value = ''
              }}
              onChange={(event) => updateAttachmentFile(event.target.files)}
            />
            <span className="form-upload__icon" aria-hidden="true">
              <Upload size={22} />
            </span>
            <span className="form-upload__title">{attachmentTitle}</span>
            <span className="form-upload__meta">
              {fieldErrors.attachment_file ||
                'PDF, image, Word, atau Excel maksimal 10 MB per file. File baru akan diupload setelah FRP diperbarui.'}
            </span>
          </label>
        </div>

        {attachmentFiles.length > 0 ? (
          <div className="frp-dialog__attachment-preview-list">
            {attachmentFiles.map((attachment) => {
              const attachmentPreviewType = getAttachmentPreviewType(attachment.file)

              return (
                <div className="frp-dialog__attachment-preview" key={attachment.id}>
                  <div className="frp-dialog__attachment-preview-header">
                    <div className="frp-dialog__attachment-file">
                      <span className="frp-dialog__attachment-file-icon" aria-hidden="true">
                        <FileText01 size={18} />
                      </span>
                      <div>
                        <strong>{attachment.file.name}</strong>
                        <span>
                          {[
                            attachment.file.type || 'Unknown type',
                            formatFileSize(attachment.file.size),
                          ]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      </div>
                    </div>
                    <div className="frp-dialog__attachment-actions">
                      <button
                        type="button"
                        className="frp-dialog__preview-button"
                        disabled={isFormDisabled}
                        onClick={() => previewAttachmentDraft(attachment.previewUrl)}
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="frp-dialog__icon-button"
                        aria-label={`Hapus attachment ${attachment.file.name}`}
                        disabled={isFormDisabled}
                        onClick={() => removeAttachmentDraft(attachment.id)}
                      >
                        <Trash03 size={16} />
                      </button>
                    </div>
                  </div>

                  {attachmentPreviewType === 'image' ? (
                    <img
                      className="frp-dialog__attachment-media"
                      src={attachment.previewUrl}
                      alt={attachment.file.name}
                    />
                  ) : null}
                  {attachmentPreviewType === 'pdf' ? (
                    <iframe
                      className="frp-dialog__attachment-media frp-dialog__attachment-media--pdf"
                      src={attachment.previewUrl}
                      title={`Preview ${attachment.file.name}`}
                    />
                  ) : null}
                  {attachmentPreviewType === 'file' ? (
                    <div className="frp-dialog__attachment-fallback">
                      <FileText01 size={22} />
                      <span>Preview tersedia lewat tombol Preview.</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        {existingAttachments.length > 0 ? (
          <div className="frp-dialog__attachment-preview-list">
            {existingAttachments.map((attachment, index) => {
              const attachmentId = getExistingAttachmentId(attachment) ?? index
              const attachmentName = getExistingAttachmentName(attachment)
              const attachmentPreviewType = getExistingAttachmentPreviewType(attachment)
              const attachmentStatus = getExistingAttachmentStatus(attachment)
              const isAttachmentUploaded = isExistingAttachmentUploaded(attachment)
              const attachmentMeta = [
                attachment.document_name_snapshot ?? attachment.document_type_name_snapshot,
                attachment.mime_type || 'Unknown type',
                formatFileSize(Number(attachment.file_size)),
                attachmentStatus || 'UPLOADED',
              ]
                .filter(Boolean)
                .join(' - ')

              return (
                <div className="frp-dialog__attachment-preview" key={attachmentId}>
                  <div className="frp-dialog__attachment-preview-header">
                    <div className="frp-dialog__attachment-file">
                      <span className="frp-dialog__attachment-file-icon" aria-hidden="true">
                        <FileText01 size={18} />
                      </span>
                      <div>
                        <strong>{attachmentName}</strong>
                        <span>{attachmentMeta}</span>
                      </div>
                    </div>
                    <div className="frp-dialog__attachment-actions">
                      <button
                        type="button"
                        className="frp-dialog__preview-button"
                        disabled={isFormDisabled || !isAttachmentUploaded}
                        onClick={() => previewExistingAttachment?.(attachment)}
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="frp-dialog__icon-button"
                        aria-label={`Hapus attachment ${attachmentName}`}
                        disabled={isFormDisabled}
                        onClick={() => removeExistingAttachment?.(attachment)}
                      >
                        <Trash03 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="frp-dialog__attachment-fallback">
                    <FileText01 size={22} />
                    <span>
                      {!isAttachmentUploaded
                        ? 'Attachment belum selesai diupload.'
                        : attachmentPreviewType === 'pdf' || attachmentPreviewType === 'image'
                        ? 'Preview tersedia lewat tombol Preview.'
                        : 'File attachment tersimpan.'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {attachmentActionError ? (
          <p className="form-control__message">{attachmentActionError}</p>
        ) : null}
      </div>
    </div>
  )
}

export default MobileTabsAttachment

