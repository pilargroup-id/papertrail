import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import DropdownSearchCreate from '../../../forms/dropdown/DropdownSearchCreate.jsx'
import { Banks, Calendar01 } from '../../../layoute/TemplateIcons.jsx'

function TabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  onSearchVendors,
  onCreateVendor,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  picOptions,
  updateValue,
}) {
  const hasDestinationDepartment = Boolean(formValues.destination_department_id)

  return (
    <section className="frp-dialog__section">
      <div className="frp-dialog__section-header">
        <span className="frp-dialog__section-icon" aria-hidden="true">
          <Banks size={18} />
        </span>
        <div className="frp-dialog__section-copy">
          <p className="frp-dialog__section-title">Vendor &amp; Process Information</p>
          <p className="frp-dialog__section-desc">
            Pilih vendor, kategori pembayaran, serta pihak yang akan memproses RP ini.
          </p>
        </div>
      </div>

      <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-vendor">
        <div className="register-user-popup__field register-user-popup__field--frp-half">
          <DropdownSearchCreate
            label="Vendor"
            value={formValues.vendor_id}
            options={vendorOptions}
            placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Cari atau tambah vendor...'}
            emptyMessage="Vendor tidak ditemukan."
            required
            disabled={isFormDisabled}
            error={fieldErrors.vendor_id}
            onChange={(value) => updateValue('vendor_id', value)}
            onSearch={onSearchVendors}
            onCreate={onCreateVendor}
            createLabel={(query) => `Tambah vendor baru "${query}"`}
          />
        </div>
        <div className="register-user-popup__field register-user-popup__field--frp-half">
          <DropdownSearch
            label="Category Payment"
            value={formValues.payment_category_id}
            options={paymentCategoryOptions}
            placeholder={isOptionsLoading ? 'Memuat category...' : 'Pilih category payment'}
            searchPlaceholder="Cari category payment..."
            emptyMessage="Category payment aktif tidak ditemukan."
            required
            disabled={isFormDisabled}
            error={fieldErrors.payment_category_id}
            onChange={(value) => updateValue('payment_category_id', value)}
          />
        </div>
        <div className="register-user-popup__field">
          <DropdownSearch
            label="Division To Process"
            value={formValues.destination_department_id}
            options={destinationDepartmentOptions}
            placeholder={isOptionsLoading ? 'Memuat division...' : 'Pilih division'}
            searchPlaceholder="Cari division..."
            emptyMessage="Division tujuan aktif tidak ditemukan."
            required
            disabled={isFormDisabled}
            error={fieldErrors.destination_department_id}
            onChange={(value) => updateValue('destination_department_id', value)}
          />
        </div>
        <div className="register-user-popup__field">
          <DropdownSearch
            label="Pic"
            value={formValues.pic_name}
            options={picOptions}
            placeholder={
              !hasDestinationDepartment
                ? 'Pilih division to process terlebih dahulu'
                : isOptionsLoading
                  ? 'Memuat PIC...'
                  : 'Pilih PIC'
            }
            searchPlaceholder="Cari PIC..."
            emptyMessage={
              !hasDestinationDepartment
                ? 'Pilih division to process terlebih dahulu.'
                : 'PIC untuk division ini tidak ditemukan.'
            }
            required
            disabled={isFormDisabled || !hasDestinationDepartment}
            error={fieldErrors.pic_name}
            onChange={(value) => updateValue('pic_name', value)}
          />
        </div>
        <div className="register-user-popup__field">
          <TextField
            label="RP Date"
            type="date"
            value={formValues.date_required}
            leftIcon={Calendar01}
            required
            disabled={isFormDisabled}
            error={fieldErrors.date_required}
            onChange={(event) => updateValue('date_required', event.target.value)}
          />
        </div>
        <div className="register-user-popup__field register-user-popup__field--full">
          <TextArea
            label="Description"
            value={formValues.description}
            placeholder="Request pembelian kebutuhan department"
            rows={4}
            required
            disabled={isFormDisabled}
            error={fieldErrors.description}
            onChange={(event) => updateValue('description', event.target.value)}
          />
        </div>
      </div>
    </section>
  )
}

export default TabsVendor
