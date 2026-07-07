import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import Switch from '../../forms/Switch.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import {
  findOption,
  getRowsFromResponse,
  initialRpDestinationDepartmentFormValues,
  makeRpDestinationDepartmentOption,
  mapDepartmentOptions,
  mapRpDestinationDepartmentToFormValues,
  mergeUniqueOptions,
} from './rpDestinationDepartmentFormUtils.js'

function DialogEditRpDestinationsDepartments({
  isOpen = false,
  eyebrow = 'RP Destination Departments',
  title = 'Edit RP Destination Department',
  user = null,
  vendor = null,
  budgetType = null,
  rpDestinationDepartment = null,
  onClose,
  onUpdated,
}) {
  const resolvedRpDestinationDepartment = rpDestinationDepartment ?? budgetType ?? vendor ?? user
  const [formValues, setFormValues] = useState(() =>
    mapRpDestinationDepartmentToFormValues(resolvedRpDestinationDepartment),
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialRpDestinationDepartmentFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setDepartmentOptions([])
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
      setFormValues(mapRpDestinationDepartmentToFormValues(resolvedRpDestinationDepartment))
      setFieldErrors({})
      setSubmitError('')
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const departmentResponse = await api.directory.departments.list(undefined, {
          signal: controller.signal,
        })
        const nextDepartmentOptions = mapDepartmentOptions(
          getRowsFromResponse(departmentResponse),
        )

        setDepartmentOptions(
          mergeUniqueOptions(
            nextDepartmentOptions,
            makeRpDestinationDepartmentOption(resolvedRpDestinationDepartment),
          ),
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setDepartmentOptions(
          mergeUniqueOptions(
            [],
            makeRpDestinationDepartmentOption(resolvedRpDestinationDepartment),
          ),
        )
        setOptionsError(error.message || 'Gagal memuat data department.')
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
  }, [handleClose, isOpen, resolvedRpDestinationDepartment])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const rpDestinationDepartmentId = resolvedRpDestinationDepartment?.id
    const selectedDepartment = findOption(departmentOptions, formValues.department_id)
    const nextFieldErrors = {}

    if (rpDestinationDepartmentId === undefined || rpDestinationDepartmentId === null) {
      setSubmitError('Data RP destination department tidak ditemukan.')
      return
    }

    if (!formValues.department_id) {
      nextFieldErrors.department_id = 'Department wajib dipilih.'
    }

    if (!selectedDepartment) {
      nextFieldErrors.department_id = 'Department tidak valid.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.rpDestinationDepartments.update(rpDestinationDepartmentId, {
        department_id: formValues.department_id,
        department_name_snapshot:
          selectedDepartment?.meta?.name ??
          resolvedRpDestinationDepartment?.department_name_snapshot ??
          selectedDepartment?.label ??
          '',
        department_class_snapshot:
          selectedDepartment?.meta?.className ??
          resolvedRpDestinationDepartment?.department_class_snapshot ??
          selectedDepartment?.meta?.name ??
          '',
        department_code_snapshot:
          selectedDepartment?.meta?.code ??
          resolvedRpDestinationDepartment?.department_code_snapshot ??
          '',
        is_short_flow_allowed: Number(formValues.is_short_flow_allowed) === 1 ? 1 : 0,
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          department_id: error.data.errors.department_id || '',
          department_name_snapshot: error.data.errors.department_name_snapshot || '',
          department_class_snapshot: error.data.errors.department_class_snapshot || '',
          department_code_snapshot: error.data.errors.department_code_snapshot || '',
          is_short_flow_allowed: error.data.errors.is_short_flow_allowed || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui RP destination department.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isInitialFormDisabled = isSubmitting || isOptionsLoading
  const isFormDisabled = isInitialFormDisabled

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-rp-destination-department-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2
                className="dashboard-popup__title"
                id="dialog-edit-rp-destination-department-title"
              >
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
                        label="Department"
                        value={formValues.department_id}
                        options={departmentOptions}
                        placeholder={isOptionsLoading ? 'Memuat department...' : 'Pilih department'}
                        searchPlaceholder="Cari department..."
                        emptyMessage="Department tidak ditemukan."
                        required
                        disabled={isInitialFormDisabled}
                        error={
                          fieldErrors.department_id ||
                          fieldErrors.department_name_snapshot ||
                          fieldErrors.department_class_snapshot ||
                          fieldErrors.department_code_snapshot
                        }
                        onChange={(value) => updateValue('department_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <Switch
                        label="Allow Short Flow"
                        checked={Number(formValues.is_short_flow_allowed) === 1}
                        disabled={isFormDisabled}
                        onChange={(event) =>
                          updateValue(
                            'is_short_flow_allowed',
                            event.target.checked ? 1 : 0,
                          )
                        }
                      />
                      {fieldErrors.is_short_flow_allowed ? (
                        <p className="form-control__message">
                          {fieldErrors.is_short_flow_allowed}
                        </p>
                      ) : null}
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
              {isSubmitting ? 'Saving...' : isOptionsLoading ? 'Loading...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditRpDestinationsDepartments
