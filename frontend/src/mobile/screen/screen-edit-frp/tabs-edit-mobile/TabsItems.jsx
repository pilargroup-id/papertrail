import TextArea from '../../../../components/forms/TextArea.jsx'
import TextField from '../../../../components/forms/TextField.jsx'
import DropdownSearch from '../../../../components/forms/dropdown/DropdownSearch.jsx'
import { Eye, FileText01, Plus, Table01, Trash03, TrendingUp } from '../../../../components/layoute/TemplateIcons.jsx'

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function isIntegerInputValue(value) {
  return value === '' || /^\d+$/.test(value)
}

function preventNonIntegerInput(event) {
  if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
    event.preventDefault()
  }
}

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return ''
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function getSelectedBudgetOption(budgetOptions, budgetId) {
  return budgetOptions.find((option) => String(option.value) === String(budgetId))
}

function getBudgetMetaValue(option, metaKey) {
  const value = option?.meta?.[metaKey]

  return value === undefined || value === null || value === '' ? '' : value
}

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

function MobileTabsItems({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  budgetOptions,
  attachmentDraft,
  existingAttachments = [],
  attachmentActionError = '',
  updateItemValue,
  removeItem,
  addItem,
  removeAttachmentDraft,
  previewAttachmentDraft,
  previewExistingAttachment,
  removeExistingAttachment,
}) {
  const attachmentFiles = attachmentDraft?.files ?? []
  const hasAttachments = attachmentFiles.length > 0 || existingAttachments.length > 0

  return (
    <div className="frp-dialog__items">
      {formValues.items.map((item, index) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = toNumber(item.unit_price)
        const amount = quantity * unitPrice
        const selectedBudgetOption = getSelectedBudgetOption(budgetOptions, item.budget_id)
        const budgetAmount = formatRupiah(getBudgetMetaValue(selectedBudgetOption, 'budgetAmount'))
        const budgetRemaining = formatRupiah(
          getBudgetMetaValue(selectedBudgetOption, 'budgetRemaining'),
        )

        return (
          <div className="frp-dialog__item" key={`frp-item-${index}`}>
            <div className="frp-dialog__item-header">
              <strong>Item {index + 1}</strong>
              <button
                type="button"
                className="frp-dialog__icon-button"
                aria-label={`Hapus item ${index + 1}`}
                disabled={isFormDisabled || formValues.items.length === 1}
                onClick={() => removeItem(index)}
              >
                <Trash03 size={16} />
              </button>
            </div>

            <div className="register-user-popup__grid register-user-popup__grid--frp-three register-user-popup__grid--frp-budget-row">
              <div className="register-user-popup__field frp-dialog__budget-field">
                <DropdownSearch
                  label="Budget"
                  value={item.budget_id}
                  options={budgetOptions}
                  placeholder={isOptionsLoading ? 'Memuat budget...' : 'Pilih budget'}
                  searchPlaceholder="Cari budget..."
                  emptyMessage="Budget aktif tidak ditemukan."
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.budget_id`]}
                  onChange={(value) => updateItemValue(index, 'budget_id', value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Budget Amount"
                  value={budgetAmount}
                  placeholder="-"
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Budget Remaining"
                  value={budgetRemaining}
                  placeholder="-"
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="register-user-popup__grid register-user-popup__grid--frp-three">
              <div className="register-user-popup__field">
                <TextField
                  label="Quantity"
                  value={item.quantity}
                  placeholder="1"
                  leftIcon={Table01}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  step="1"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.quantity`]}
                  onKeyDown={preventNonIntegerInput}
                  onPaste={(event) => {
                    if (!isIntegerInputValue(event.clipboardData.getData('text'))) {
                      event.preventDefault()
                    }
                  }}
                  onChange={(event) => {
                    if (isIntegerInputValue(event.target.value)) {
                      updateItemValue(index, 'quantity', event.target.value)
                    }
                  }}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Unit Price"
                  value={item.unit_price}
                  placeholder="100000"
                  leftIcon={TrendingUp}
                  type="number"
                  min="0"
                  step="1"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.unit_price`]}
                  onChange={(event) => updateItemValue(index, 'unit_price', event.target.value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Amount"
                  value={Number.isFinite(amount) ? amount : 0}
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
              <div className="register-user-popup__field register-user-popup__field--full">
                <TextArea
                  label="Memo"
                  value={item.memo}
                  placeholder="Pembayaran invoice vendor"
                  rows={3}
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.memo`]}
                  onChange={(event) => updateItemValue(index, 'memo', event.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        className="dashboard-popup__button dashboard-popup__button--secondary frp-dialog__add-item"
        disabled={isFormDisabled}
        onClick={addItem}
      >
        <Plus size={16} />
        Add Item
      </button>
      {fieldErrors.items ? <p className="form-control__message">{fieldErrors.items}</p> : null}

      <div className="frp-dialog__items-attachments">
        <div className="frp-dialog__item-header">
          <strong>Attachments</strong>
        </div>

        {hasAttachments ? (
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
                        onClick={() => previewAttachmentDraft?.(attachment.previewUrl)}
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="frp-dialog__icon-button"
                        aria-label={`Hapus attachment ${attachment.file.name}`}
                        disabled={isFormDisabled}
                        onClick={() => removeAttachmentDraft?.(attachment.id)}
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
                <div className="frp-dialog__attachment-preview" key={`existing-${attachmentId}`}>
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
        ) : (
          <div className="frp-dialog__attachment-fallback">
            <FileText01 size={22} />
            <span>Belum ada attachment.</span>
          </div>
        )}

        {attachmentActionError ? (
          <p className="form-control__message">{attachmentActionError}</p>
        ) : null}
      </div>
    </div>
  )
}

export default MobileTabsItems

