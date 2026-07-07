import TextField from '../../../forms/TextField.jsx'
import DropdownCheckBox from '../../../forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  CreditCard,
  Eye,
  FileText01,
  Trash03,
  Upload,
  UserBank,
} from '../../../layoute/TemplateIcons.jsx'

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

function TabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  filteredVendorBankOptions,
  externalDocumentTypeOptions,
  paymentMethodOptions,
  frpDocumentTypeDropdownOptions,
  attachmentDocumentTypeOptions,
  attachmentDraft,
  updateValue,
  updateDocumentTypeIds,
  updateAttachmentDocumentType,
  updateAttachmentFile,
  removeAttachmentDraft,
  previewAttachmentDraft,
  handleVendorBankChange,
}) {
  const attachmentPreviewType = getAttachmentPreviewType(attachmentDraft.file)

  return (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-three">
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Vendor"
          value={formValues.vendor_id}
          options={vendorOptions}
          placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Pilih vendor'}
          searchPlaceholder="Cari vendor..."
          emptyMessage="Vendor aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.vendor_id}
          onChange={(value) => {
            updateValue('vendor_id', value)
            updateValue('vendor_bank_account_id', '')
          }}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Vendor Bank Account"
          value={formValues.vendor_bank_account_id}
          options={filteredVendorBankOptions}
          placeholder={isOptionsLoading ? 'Memuat rekening...' : 'Pilih rekening vendor'}
          searchPlaceholder="Cari rekening vendor..."
          emptyMessage="Rekening vendor aktif tidak ditemukan."
          disabled={isFormDisabled}
          error={fieldErrors.vendor_bank_account_id}
          onChange={handleVendorBankChange}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="External Document Type"
          value={formValues.external_document_type_id}
          options={externalDocumentTypeOptions}
          placeholder={isOptionsLoading ? 'Memuat document type...' : 'Pilih document type'}
          searchPlaceholder="Cari document type..."
          emptyMessage="External document type aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.external_document_type_id}
          onChange={(value) => updateValue('external_document_type_id', value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="External Document Number"
          value={formValues.external_document_number}
          placeholder="INV-TEST-001"
          leftIcon={FileText01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.external_document_number}
          onChange={(event) => updateValue('external_document_number', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Payment Method"
          value={formValues.payment_method_id}
          options={paymentMethodOptions}
          placeholder={isOptionsLoading ? 'Memuat payment method...' : 'Pilih payment method'}
          searchPlaceholder="Cari payment method..."
          emptyMessage="Payment method aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_method_id}
          onChange={(value) => updateValue('payment_method_id', value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Payment Date"
          type="date"
          value={formValues.payment_date}
          leftIcon={Calendar01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_date}
          onChange={(event) => updateValue('payment_date', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Bank"
          value={formValues.destination_bank_name}
          placeholder="BCA"
          leftIcon={Banks}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_name}
          onChange={(event) => updateValue('destination_bank_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account"
          value={formValues.destination_bank_account}
          placeholder="1234567890"
          leftIcon={CreditCard}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account}
          onChange={(event) => updateValue('destination_bank_account', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account Name"
          value={formValues.destination_bank_account_name}
          placeholder="PT Vendor Testing"
          leftIcon={UserBank}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account_name}
          onChange={(event) => updateValue('destination_bank_account_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
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
      <div className="register-user-popup__field">
        <DropdownSearch
          label="Attachment Document Type"
          value={attachmentDraft.documentTypeId}
          options={attachmentDocumentTypeOptions}
          placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih document type'}
          searchPlaceholder="Cari document type..."
          emptyMessage="FRP document type aktif tidak ditemukan."
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
            <span>Attachment</span>
          </div>

          <label className="form-upload__dropzone" htmlFor="frp-attachment-file">
            <input
              id="frp-attachment-file"
              className="form-upload__input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              disabled={isFormDisabled}
              onClick={(event) => {
                event.currentTarget.value = ''
              }}
              onChange={(event) => updateAttachmentFile(event.target.files?.[0] ?? null)}
            />
            <span className="form-upload__icon" aria-hidden="true">
              <Upload size={22} />
            </span>
            <span className="form-upload__title">
              {attachmentDraft.file?.name || 'Klik untuk memilih file attachment'}
            </span>
            <span className="form-upload__meta">
              {fieldErrors.attachment_file ||
                'PDF, image, Word, atau Excel maksimal 10 MB. File akan diupload setelah FRP dibuat.'}
            </span>
          </label>
        </div>

        {attachmentDraft.file ? (
          <div className="frp-dialog__attachment-preview">
            <div className="frp-dialog__attachment-preview-header">
              <div className="frp-dialog__attachment-file">
                <span className="frp-dialog__attachment-file-icon" aria-hidden="true">
                  <FileText01 size={18} />
                </span>
                <div>
                  <strong>{attachmentDraft.file.name}</strong>
                  <span>
                    {[attachmentDraft.file.type || 'Unknown type', formatFileSize(attachmentDraft.file.size)]
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
                  onClick={previewAttachmentDraft}
                >
                  <Eye size={16} />
                  Preview
                </button>
                <button
                  type="button"
                  className="frp-dialog__icon-button"
                  aria-label="Hapus attachment"
                  disabled={isFormDisabled}
                  onClick={removeAttachmentDraft}
                >
                  <Trash03 size={16} />
                </button>
              </div>
            </div>

            {attachmentPreviewType === 'image' ? (
              <img
                className="frp-dialog__attachment-media"
                src={attachmentDraft.previewUrl}
                alt={attachmentDraft.file.name}
              />
            ) : null}
            {attachmentPreviewType === 'pdf' ? (
              <iframe
                className="frp-dialog__attachment-media frp-dialog__attachment-media--pdf"
                src={attachmentDraft.previewUrl}
                title={`Preview ${attachmentDraft.file.name}`}
              />
            ) : null}
            {attachmentPreviewType === 'file' ? (
              <div className="frp-dialog__attachment-fallback">
                <FileText01 size={22} />
                <span>Preview tersedia lewat tombol Preview.</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TabsVendor
