import DropdownCheckBox from '../../../../components/forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../../../components/forms/dropdown/DropdownSearch.jsx'
import { Eye, FileText01, Trash03, Upload } from '../../../../components/layoute/TemplateIcons.jsx'

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

function MobileTabsAttachment({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  frpDocumentTypeDropdownOptions,
  attachmentDocumentTypeOptions,
  attachmentDraft,
  updateDocumentTypeIds,
  updateAttachmentDocumentType,
  updateAttachmentFile,
  removeAttachmentDraft,
  previewAttachmentDraft,
}) {
  const attachmentFiles = attachmentDraft.files ?? []
  const attachmentTitle =
    attachmentFiles.length > 0
      ? `${attachmentFiles.length} file attachment dipilih`
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

          <label className="form-upload__dropzone" htmlFor="frp-create-attachment-file">
            <input
              id="frp-create-attachment-file"
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
                'PDF, image, Word, atau Excel maksimal 10 MB per file. File akan diupload setelah FRP dibuat.'}
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
      </div>
    </div>
  )
}

export default MobileTabsAttachment