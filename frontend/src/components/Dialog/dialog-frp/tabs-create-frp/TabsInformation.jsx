import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import DropdownCheckBox from '../../../forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  Code,
  FileText01,
  Table01,
  Upload,
  Users01,
} from '../../../layoute/TemplateIcons.jsx'
import AttachmentListDropdown from './AttachmentListDropdown.jsx'

function TabsInformation({
  requesterInfo,
  isOptionsLoading,
  isFormDisabled,
  formValues,
  fieldErrors,
  externalDocumentTypeOptions,
  frpDocumentTypeDropdownOptions,
  attachmentDocumentTypeOptions,
  attachmentDraft,
  updateValue,
  updateDocumentTypeIds,
  updateAttachmentDocumentType,
  updateAttachmentFile,
  removeAttachmentDraft,
  previewAttachmentDraft,
}) {
  const attachmentFiles = attachmentDraft.files ?? []
  const attachmentTitle =
    attachmentFiles.length > 0 ? `${attachmentFiles.length} file dipilih` : 'Pilih file attachment'

  return (
    <>
      <section className="frp-dialog__section">
        <div className="frp-dialog__section-header">
          <span className="frp-dialog__section-icon" aria-hidden="true">
            <Users01 size={18} />
          </span>
          <div className="frp-dialog__section-copy">
            <p className="frp-dialog__section-title">Requester Information</p>
            <p className="frp-dialog__section-desc">
              Data pemohon terisi otomatis berdasarkan akun yang sedang login.
            </p>
          </div>
        </div>

        <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-information">
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <TextField
              label="Company"
              value={requesterInfo.company}
              placeholder={isOptionsLoading ? 'Memuat company...' : '-'}
              leftIcon={Banks}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <TextField
              label="Division"
              value={requesterInfo.division}
              placeholder={isOptionsLoading ? 'Memuat division...' : '-'}
              leftIcon={Table01}
              readOnly
              tabIndex={-1}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <TextField
              label="Request By"
              value={requesterInfo.request_by}
              placeholder={isOptionsLoading ? 'Memuat requester...' : '-'}
              leftIcon={Users01}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
      </section>

      <section className="frp-dialog__section">
        <div className="frp-dialog__section-header">
          <span className="frp-dialog__section-icon" aria-hidden="true">
            <FileText01 size={18} />
          </span>
          <div className="frp-dialog__section-copy">
            <p className="frp-dialog__section-title">Document Details</p>
            <p className="frp-dialog__section-desc">
              Lengkapi tanggal FRP dan referensi dokumen eksternal terkait.
            </p>
          </div>
        </div>

        <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-information">
          <div className="register-user-popup__field register-user-popup__field--frp-quarter">
            <TextField
              label="FRP Date"
              type="date"
              value={formValues.frp_date}
              leftIcon={Calendar01}
              required
              disabled={isFormDisabled}
              error={fieldErrors.frp_date}
              onChange={(event) => updateValue('frp_date', event.target.value)}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-quarter">
            <DropdownSearch
              label="External Document Type"
              value={formValues.external_document_type_id}
              options={externalDocumentTypeOptions}
              placeholder={isOptionsLoading ? 'Memuat document type...' : 'Pilih document type'}
              searchPlaceholder="Cari document type..."
              emptyMessage="External document type aktif tidak ditemukan."
              disabled={isFormDisabled}
              error={fieldErrors.external_document_type_id}
              onChange={(value) => updateValue('external_document_type_id', value)}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-quarter">
            <TextField
              label="External Document Number"
              value={formValues.external_document_number}
              placeholder="Input external document number"
              leftIcon={FileText01}
              disabled={isFormDisabled}
              error={fieldErrors.external_document_number}
              onChange={(event) => updateValue('external_document_number', event.target.value)}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-quarter">
            <TextField
              label="Internal PO Number"
              value={formValues.internal_po_number}
              placeholder="Input internal PO number"
              leftIcon={Code}
              disabled={isFormDisabled}
              error={fieldErrors.internal_po_number}
              onChange={(event) => updateValue('internal_po_number', event.target.value)}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <DropdownCheckBox
              label="Required Documents"
              options={frpDocumentTypeDropdownOptions}
              value={formValues.document_type_ids.map(String)}
              placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih required documents'}
              emptyMessage="FRP document type aktif tidak ditemukan."
              hideSearch
              disabled={isFormDisabled}
              error={fieldErrors.document_type_ids}
              onChange={(value) => updateDocumentTypeIds(value.map(String))}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <DropdownSearch
              label="Attachment Document Type"
              value={attachmentDraft.documentTypeId}
              options={attachmentDocumentTypeOptions}
              placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih document type'}
              emptyMessage="FRP document type aktif tidak ditemukan."
              hideSearch
              disabled={isFormDisabled}
              error={fieldErrors.attachment_document_type_id}
              onChange={updateAttachmentDocumentType}
            />
          </div>
          <div className="register-user-popup__field register-user-popup__field--frp-third">
            <div className="form-control__label">
              <span>Upload Attachment</span>
            </div>

            <div className="frp-dialog__upload-row">
              <div
                className={`form-upload form-upload--compact${
                  fieldErrors.attachment_file ? ' form-upload--error' : ''
                }${isFormDisabled ? ' form-upload--disabled' : ''}`}
              >
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
                    <Upload size={16} />
                  </span>
                  <span className="form-upload__title">{attachmentTitle}</span>
                </label>
              </div>

              <AttachmentListDropdown
                files={attachmentFiles}
                disabled={isFormDisabled}
                onPreview={previewAttachmentDraft}
                onRemove={removeAttachmentDraft}
              />
            </div>

            {fieldErrors.attachment_file ? (
              <p className="form-control__message">{fieldErrors.attachment_file}</p>
            ) : null}
          </div>
          <div className="register-user-popup__field register-user-popup__field--full">
            <TextArea
              label="Description"
              value={formValues.description}
              placeholder="Input description"
              rows={4}
              required
              disabled={isFormDisabled}
              error={fieldErrors.description}
              onChange={(event) => updateValue('description', event.target.value)}
            />
          </div>
        </div>
      </section>
    </>
  )
}

export default TabsInformation
