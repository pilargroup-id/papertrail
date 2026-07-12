// import TextArea from '../../../forms/TextArea.jsx'
import TextArea  from '../../../../components/forms/TextArea.jsx'
import TextField from '../../../../components/forms/TextField.jsx'
import DropdownSearch from '../../../../components/forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  Code,
  FileText01,
  Table01,
  Users01,
} from '../../../../components/layoute/TemplateIcons.jsx'

function MobileTabsInformation({
  requesterInfo,
  isOptionsLoading,
  isFormDisabled,
  formValues,
  fieldErrors,
  externalDocumentTypeOptions,
  updateValue,
}) {
  return (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-information">
      <div className="register-user-popup__field">
        <TextField
          label="Company"
          value={requesterInfo.company}
          placeholder={isOptionsLoading ? 'Memuat company...' : '-'}
          leftIcon={Banks}
          readOnly
          tabIndex={-1}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Division"
          value={requesterInfo.division}
          placeholder={isOptionsLoading ? 'Memuat division...' : '-'}
          leftIcon={Table01}
          readOnly
          tabIndex={-1}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Request By"
          value={requesterInfo.request_by}
          placeholder={isOptionsLoading ? 'Memuat requester...' : '-'}
          leftIcon={Users01}
          readOnly
          tabIndex={-1}
        />
      </div>
      <div className="register-user-popup__field">
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
      <div className="register-user-popup__field register-user-popup__field--frp-third">
        <TextField
          label="Internal PO Number"
          value={formValues.internal_po_number}
          placeholder="PO-TEST-001"
          leftIcon={Code}
          disabled={isFormDisabled}
          error={fieldErrors.internal_po_number}
          onChange={(event) => updateValue('internal_po_number', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-third">
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
      <div className="register-user-popup__field register-user-popup__field--frp-third">
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
      <div className="register-user-popup__field register-user-popup__field--full">
        <TextArea
          label="Description"
          value={formValues.description}
          placeholder="Pembayaran invoice vendor"
          rows={4}
          required
          disabled={isFormDisabled}
          error={fieldErrors.description}
          onChange={(event) => updateValue('description', event.target.value)}
        />
      </div>
    </div>
  )
}

export default MobileTabsInformation
