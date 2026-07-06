import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import { FileText01 } from '../../layoute/TemplateIcons.jsx'
import {
  findOption,
  getRowsFromResponse,
  initialRpCheckerRuleFormValues,
  mapDestinationRuleOptions,
} from './rpCheckerRuleFormUtils.js'

function DialogCreateRpCheckerRules({
  isOpen = false,
  eyebrow = 'RP Checker Rules',
  title = 'Create RP Checker Rule',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialRpCheckerRuleFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [destinationRuleOptions, setDestinationRuleOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialRpCheckerRuleFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setDestinationRuleOptions([])
    setIsOptionsLoading(false)
    setOptionsError('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const updateValue = (fieldName, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))

    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [fieldName]: '',
      }
    })
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const response = await api.rpDestinationDepartments.list(
          {
            page: 1,
            limit: 100,
            is_active: 1,
          },
          {
            signal: controller.signal,
          },
        )
        const nextOptions = mapDestinationRuleOptions(getRowsFromResponse(response))

        setDestinationRuleOptions(nextOptions)
        setFormValues((currentValues) => ({
          ...currentValues,
          destination_department_rule_id:
            currentValues.destination_department_rule_id || nextOptions[0]?.value || '',
        }))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setDestinationRuleOptions([])
        setOptionsError(error.message || 'Gagal memuat RP destination departments.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedJobPosition = formValues.job_position.trim()
    const selectedDestinationRule = findOption(
      destinationRuleOptions,
      formValues.destination_department_rule_id,
    )
    const nextFieldErrors = {}

    if (!formValues.destination_department_rule_id) {
      nextFieldErrors.destination_department_rule_id = 'Destination department wajib dipilih.'
    } else if (!selectedDestinationRule) {
      nextFieldErrors.destination_department_rule_id = 'Destination department tidak valid.'
    }

    if (!normalizedJobPosition) {
      nextFieldErrors.job_position = 'Job position wajib diisi.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.rpCheckerRules.create({
        destination_department_rule_id: formValues.destination_department_rule_id,
        job_position: normalizedJobPosition,
      })

      await onCreated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          destination_department_rule_id: error.data.errors.destination_department_rule_id || '',
          job_position: error.data.errors.job_position || '',
        })
      }

      setSubmitError(error.message || 'Gagal membuat RP checker rule.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isOptionsLoading

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-rp-checker-rule-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-rp-checker-rule-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--vendor-banks">
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <DropdownSearch
                        label="Destination Department"
                        value={formValues.destination_department_rule_id}
                        options={destinationRuleOptions}
                        placeholder={
                          isOptionsLoading
                            ? 'Memuat destination department...'
                            : 'Pilih destination department'
                        }
                        searchPlaceholder="Cari destination department..."
                        emptyMessage="Destination department tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.destination_department_rule_id}
                        onChange={(value) => updateValue('destination_department_rule_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <TextField
                        label="Job Position"
                        value={formValues.job_position}
                        placeholder="Input job position"
                        leftIcon={FileText01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.job_position}
                        onChange={(event) => updateValue('job_position', event.target.value)}
                      />
                    </div>
                  </div>

                  {optionsError ? <p className="form-control__message">{optionsError}</p> : null}
                  {submitError ? <p className="form-control__message">{submitError}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isFormDisabled}
            >
              {isSubmitting ? 'Creating...' : isOptionsLoading ? 'Loading...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateRpCheckerRules
