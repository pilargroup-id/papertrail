import TextField from '../../../../../components/forms/TextField.jsx'
import Dropdown from '../../../../../components/forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../../../../components/forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  CreditCard,
  TrendingUp,
  UserBank,
} from '../../../../../components/layoute/TemplateIcons.jsx'

const currencyOptions = [
  { value: 'IDR', label: 'IDR' },
  { value: 'USD', label: 'USD' },
  { value: 'SGD', label: 'SGD' },
  { value: 'EUR', label: 'EUR' },
]

function MobileTabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  filteredVendorBankOptions,
  paymentMethodOptions,
  updateValue,
  handleVendorBankChange,
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
          onChange={(value) => {
            updateValue('vendor_id', value)
            updateValue('vendor_bank_account_id', '')
          }}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-half">
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
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
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
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
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
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
        <Dropdown
          label="Currency"
          value={formValues.currency_code}
          options={currencyOptions}
          placeholder="Pilih currency"
          required
          disabled={isFormDisabled}
          error={fieldErrors.currency_code}
          onChange={(value) => updateValue('currency_code', value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
        <TextField
          label="Exchange Rate"
          value={formValues.exchange_rate}
          placeholder="Input exchange rate"
          leftIcon={TrendingUp}
          type="number"
          min="0"
          step="0.0001"
          required
          disabled={isFormDisabled}
          error={fieldErrors.exchange_rate}
          onChange={(event) => updateValue('exchange_rate', event.target.value)}
        />
      </div>
    </div>
  )
}

export default MobileTabsVendor

