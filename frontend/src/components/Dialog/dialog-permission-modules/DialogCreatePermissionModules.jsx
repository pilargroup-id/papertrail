import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import TextField from '../../forms/TextField.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import DropdownCheckBox from '../../forms/dropdown/DropdownCheckbox.jsx'
import { FileText01, Users01 } from '../../layoute/TemplateIcons.jsx'

const initialFormValues = {
  user_id: '',
  username_snapshot: '',
  name_snapshot: '',
  module_id: '',
  access: [],
}

const permissionAccessOptions = [
  {
    value: 'can_view',
    label: 'View',
    description: 'Izinkan user melihat data pada module ini.',
  },
  {
    value: 'can_create',
    label: 'Create',
    description: 'Izinkan user membuat data baru pada module ini.',
  },
  {
    value: 'can_update',
    label: 'Update',
    description: 'Izinkan user mengubah data pada module ini.',
  },
  {
    value: 'can_deactivate',
    label: 'Deactivate',
    description: 'Izinkan user menonaktifkan data pada module ini.',
  },
]

function getPermissionPayloadFromAccess(selectedAccessValues) {
  return permissionAccessOptions.reduce((payload, option) => {
    payload[option.value] = selectedAccessValues.includes(option.value) ? 1 : 0
    return payload
  }, {})
}

function getAccessErrorMessage(errors) {
  return (
    errors?.can_view ||
    errors?.can_create ||
    errors?.can_update ||
    errors?.can_deactivate ||
    ''
  )
}

function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  return []
}

function mapPermissionModuleOptions(permissionModules) {
  return permissionModules.map((permissionModule) => ({
    value: permissionModule?.id,
    label:
      [permissionModule?.module_code, permissionModule?.module_name]
        .filter(Boolean)
        .join(' - ') || `Permission Module #${permissionModule?.id ?? '-'}`,
    meta: permissionModule,
  }))
}

function DialogCreatePermissionModule({
  isOpen = false,
  eyebrow = 'Permission Management',
  title = 'Create User Module Permission',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [permissionModuleOptions, setPermissionModuleOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setPermissionModuleOptions([])
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
        const response = await api.permissionModules.list(
          {
            is_active: 1,
          },
          {
            signal: controller.signal,
          },
        )

        setPermissionModuleOptions(mapPermissionModuleOptions(getRowsFromResponse(response)))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setPermissionModuleOptions([])
        setOptionsError(error.message || 'Gagal memuat daftar permission module.')
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

    const normalizedUserId = formValues.user_id.trim()
    const normalizedUsername = formValues.username_snapshot.trim()
    const normalizedName = formValues.name_snapshot.trim()
    const normalizedModuleId = Number(formValues.module_id)
    const normalizedAccess = Array.isArray(formValues.access) ? formValues.access : []
    const nextFieldErrors = {}

    if (!normalizedUserId) {
      nextFieldErrors.user_id = 'User ID wajib diisi.'
    }

    if (!normalizedUsername) {
      nextFieldErrors.username_snapshot = 'Username wajib diisi.'
    } else if (normalizedUsername.length > 100) {
      nextFieldErrors.username_snapshot = 'Username maksimal 100 karakter.'
    }

    if (!normalizedName) {
      nextFieldErrors.name_snapshot = 'Nama wajib diisi.'
    } else if (normalizedName.length > 255) {
      nextFieldErrors.name_snapshot = 'Nama maksimal 255 karakter.'
    }

    if (!Number.isInteger(normalizedModuleId) || normalizedModuleId <= 0) {
      nextFieldErrors.module_id = 'Permission module wajib dipilih.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await api.userModulePermissions.create({
        user_id: normalizedUserId,
        username_snapshot: normalizedUsername,
        name_snapshot: normalizedName,
        module_id: normalizedModuleId,
        ...getPermissionPayloadFromAccess(normalizedAccess),
      })

      await onCreated?.(response)
      handleClose()
    } catch (error) {
      if (error?.data?.errors) {
        setFieldErrors({
          user_id: error.data.errors.user_id || '',
          username_snapshot: error.data.errors.username_snapshot || '',
          name_snapshot: error.data.errors.name_snapshot || '',
          module_id: error.data.errors.module_id || '',
          access: getAccessErrorMessage(error.data.errors),
        })
      }

      setSubmitError(error.message || 'Gagal membuat user module permission.')
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
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--permission-modules"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-permission-module-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-create-permission-module-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--permission-modules">
                    <div className="register-user-popup__field">
                      <TextField
                        label="User ID"
                        value={formValues.user_id}
                        placeholder="Input user ID"
                        leftIcon={Users01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.user_id}
                        onChange={(event) => updateValue('user_id', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Username"
                        value={formValues.username_snapshot}
                        placeholder="Input username"
                        leftIcon={Users01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.username_snapshot}
                        onChange={(event) => updateValue('username_snapshot', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <TextField
                        label="Full Name"
                        value={formValues.name_snapshot}
                        placeholder="Input full name"
                        leftIcon={FileText01}
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.name_snapshot}
                        onChange={(event) => updateValue('name_snapshot', event.target.value)}
                      />
                    </div>
                    <div className="register-user-popup__field">
                      <DropdownSearch
                        label="Permission Module"
                        value={formValues.module_id}
                        options={permissionModuleOptions}
                        placeholder={
                          isOptionsLoading ? 'Memuat permission module...' : 'Pilih permission module'
                        }
                        searchPlaceholder="Cari permission module..."
                        emptyMessage="Permission module aktif tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={fieldErrors.module_id}
                        onChange={(value) => updateValue('module_id', value)}
                      />
                    </div>
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <DropdownCheckBox
                        label="Access"
                        options={permissionAccessOptions}
                        value={formValues.access}
                        placeholder="Pilih access"
                        disabled={isFormDisabled}
                        error={fieldErrors.access}
                        onChange={(value) => updateValue('access', value)}
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

export default DialogCreatePermissionModule
