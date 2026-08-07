import TextArea from '../../../forms/TextArea.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'

function TabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  picOptions,
  updateValue,
}) {
  const hasDestinationDepartment = Boolean(formValues.destination_department_id)

  return (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-vendor">
      <div className="register-user-popup__field register-user-popup__field--frp-half">
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
          onChange={(value) => updateValue('vendor_id', value)}
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
      <div className="register-user-popup__field register-user-popup__field--frp-half">
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
      <div className="register-user-popup__field register-user-popup__field--frp-half">
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
  )
}

export default TabsVendor
