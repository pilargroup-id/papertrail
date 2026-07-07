import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import Dropdown from '../../../forms/dropdown/Dropdown.jsx'
import { Banks, Calendar01, Code, Table01, TrendingUp, Users01 } from '../../../layoute/TemplateIcons.jsx'

const currencyOptions = [
  { value: 'IDR', label: 'IDR' },
  { value: 'USD', label: 'USD' },
  { value: 'SGD', label: 'SGD' },
  { value: 'EUR', label: 'EUR' },
]

function TabsInformation({
  requesterInfo,
  isOptionsLoading,
  isFormDisabled,
  formValues,
  fieldErrors,
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
      <div className="register-user-popup__field register-user-popup__field--frp-division-wide">
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
      <div className="register-user-popup__field">
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

export default TabsInformation
