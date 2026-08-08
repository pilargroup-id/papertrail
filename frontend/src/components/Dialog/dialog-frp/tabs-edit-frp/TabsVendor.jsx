import TextField from '../../../forms/TextField.jsx'
import Dropdown from '../../../forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  CreditCard,
  TrendingUp,
  UserBank,
} from '../../../layoute/TemplateIcons.jsx'

const currencyOptions = [
  { value: 'IDR', label: 'IDR' },
  { value: 'USD', label: 'USD' },
  { value: 'SGD', label: 'SGD' },
  { value: 'EUR', label: 'EUR' },
]

function TabsVendor({
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
    <>
      <section className="frp-dialog__section">
        <div className="frp-dialog__section-header">
          <span className="frp-dialog__section-icon" aria-hidden="true">
            <Banks size={18} />
          </span>
          <div className="frp-dialog__section-copy">
            <p className="frp-dialog__section-title">Vendor &amp; Bank Account</p>
            <p className="frp-dialog__section-desc">
              Pilih vendor dan rekening bank vendor yang akan menerima pembayaran.
            </p>
          </div>
        </div>

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
        </div>
      </section>

      <section className="frp-dialog__section">
        <div className="frp-dialog__section-header">
          <span className="frp-dialog__section-icon" aria-hidden="true">
            <CreditCard size={18} />
          </span>
          <div className="frp-dialog__section-copy">
            <p className="frp-dialog__section-title">Destination &amp; Payment</p>
            <p className="frp-dialog__section-desc">
              Tujuan transfer, jadwal pembayaran, dan mata uang yang berlaku untuk FRP ini.
            </p>
          </div>
        </div>

        <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-inline">
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
              onChange={(event) =>
                updateValue('destination_bank_account_name', event.target.value)
              }
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
          <div className="register-user-popup__field">
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
      </section>
    </>
  )
}

export default TabsVendor
