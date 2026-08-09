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
            <Calendar01 size={18} />
          </span>
          <div className="frp-dialog__section-copy">
            <p className="frp-dialog__section-title">RP Details</p>
            <p className="frp-dialog__section-desc">Tentukan tanggal RP diajukan.</p>
          </div>
        </div>

        <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-information">
          <div className="register-user-popup__field register-user-popup__field--frp-quarter">
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
        </div>
      </section>
    </>
  )
}

export default TabsInformation
