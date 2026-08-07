import TextField from '../../../../../components/forms/TextField.jsx'
import DropdownSearch from '../../../../../components/forms/dropdown/DropdownSearch.jsx'
import { UserBank } from '../../../../../components/layoute/TemplateIcons.jsx'

function MobileTabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  updateValue,
}) {
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
        <TextField
          label="Pic"
          value={formValues.pic_name}
          placeholder="Nama PIC"
          leftIcon={UserBank}
          required
          disabled={isFormDisabled}
          error={fieldErrors.pic_name}
          onChange={(event) => updateValue('pic_name', event.target.value)}
        />
      </div>
    </div>
  )
}

export default MobileTabsVendor
