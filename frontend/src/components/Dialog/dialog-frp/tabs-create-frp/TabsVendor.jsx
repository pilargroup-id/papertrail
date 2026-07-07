import TextField from '../../../forms/TextField.jsx'
import DropdownCheckBox from '../../../forms/dropdown/DropdownCheckBox.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import { Banks, Calendar01, CreditCard, FileText01, UserBank } from '../../../layoute/TemplateIcons.jsx'

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
  updateValue,
  handleVendorBankChange,
}) {
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
          onChange={(value) => updateValue('document_type_ids', value.map(String))}
        />
      </div>
    </div>
  )
}

export default TabsVendor
