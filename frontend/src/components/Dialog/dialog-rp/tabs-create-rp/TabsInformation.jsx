import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import { Banks, Calendar01, Table01, Users01 } from '../../../layoute/TemplateIcons.jsx'

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
  )
}

export default TabsInformation
