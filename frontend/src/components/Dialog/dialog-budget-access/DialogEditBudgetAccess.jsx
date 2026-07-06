import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import Dropdown from '../../forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import {
  accessTypeOptions,
  findOption,
  getAuthUser,
  initialBudgetAccessRuleFormValues,
  makeRuleDepartmentOption,
  mapBudgetAccessRuleToFormValues,
  mapDepartmentOptions,
  mergeUniqueOptions,
  moduleOptions,
} from './budgetAccessRuleFormUtils.js'

function DialogEditBudgetAccesRules({
  isOpen = false,
  eyebrow = 'Budget Access',
  title = 'Edit Budget Access Rule',
  user = null,
  vendor = null,
  budgetType = null,
  budgetAccessRule = null,
  onClose,
  onUpdated,
}) {
  const resolvedBudgetAccessRule = budgetAccessRule ?? budgetType ?? vendor ?? user
  const [formValues, setFormValues] = useState(() =>
    mapBudgetAccessRuleToFormValues(resolvedBudgetAccessRule),
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departmentOptions, setDepartmentOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialBudgetAccessRuleFormValues)
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
      setFormValues(mapBudgetAccessRuleToFormValues(resolvedBudgetAccessRule))
      setFieldErrors({})
      setSubmitError('')
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const authResponse = await api.auth.me({
          signal: controller.signal,
        })
        const authUser = getAuthUser(authResponse)
        const nextDepartmentOptions = mapDepartmentOptions(
          Array.isArray(authUser?.departments)
            ? authUser.departments
            : [
                {
                  id: authUser?.department_id,
                  name: authUser?.department,
                  class: authUser?.department_class,
                  code: authUser?.department_code,
                  is_primary: 1,
                },
              ].filter((department) => department.id || department.name),
        )

        setDepartmentOptions(
          mergeUniqueOptions(
            nextDepartmentOptions,
            makeRuleDepartmentOption(resolvedBudgetAccessRule),
          ),
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setDepartmentOptions(
          mergeUniqueOptions([], makeRuleDepartmentOption(resolvedBudgetAccessRule)),
        )
        setOptionsError(error.message || 'Gagal memuat department user.')
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
  }, [handleClose, isOpen, resolvedBudgetAccessRule])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const budgetAccessRuleId = resolvedBudgetAccessRule?.id
    const normalizedModule = String(formValues.module || '').trim().toUpperCase()
    const normalizedAccessType = String(formValues.access_type || 'CROSS_BUDGET').trim().toUpperCase()
    const selectedDepartment = findOption(departmentOptions, formValues.department_id)
    const nextFieldErrors = {}

    if (budgetAccessRuleId === undefined || budgetAccessRuleId === null) {
      setSubmitError('Data budget access rule tidak ditemukan.')
      return
    }

    if (!normalizedModule) {
      nextFieldErrors.module = 'Module wajib dipilih.'
    }

    if (!normalizedAccessType) {
      nextFieldErrors.access_type = 'Access type wajib dipilih.'
    }

    if (!formValues.department_id) {
      nextFieldErrors.department_id = 'Department wajib dipilih.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.budgetAccessRules.update(budgetAccessRuleId, {
        module: normalizedModule,
        access_type: normalizedAccessType,
        department_id: formValues.department_id,
        department_name_snapshot:
          selectedDepartment?.meta?.name ??
          resolvedBudgetAccessRule?.department_name_snapshot ??
          selectedDepartment?.label ??
          '',
        department_class_snapshot:
          selectedDepartment?.meta?.className ??
          resolvedBudgetAccessRule?.department_class_snapshot ??
          selectedDepartment?.meta?.name ??
          '',
        department_code_snapshot:
          selectedDepartment?.meta?.code ??
          resolvedBudgetAccessRule?.department_code_snapshot ??
          '',
      })

      await onUpdated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          module: error.data.errors.module || '',
          access_type: error.data.errors.access_type || '',
          department_id: error.data.errors.department_id || '',
          department_name_snapshot: error.data.errors.department_name_snapshot || '',
          department_class_snapshot: error.data.errors.department_class_snapshot || '',
          department_code_snapshot: error.data.errors.department_code_snapshot || '',
        })
      }

      setSubmitError(error.message || 'Gagal memperbarui budget access rule.')
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
        aria-labelledby="dialog-edit-budget-access-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-budget-access-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--vendor-banks">
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Module"
                        value={formValues.module}
                        options={moduleOptions}
                        placeholder="Pilih module"
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.module}
                        onChange={(value) => updateValue('module', value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <Dropdown
                        label="Access Type"
                        value={formValues.access_type}
                        options={accessTypeOptions}
                        placeholder="Pilih access type"
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.access_type}
                        onChange={(value) => updateValue('access_type', value)}
                      />
                    </div>
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

export default DialogEditBudgetAccesRules
