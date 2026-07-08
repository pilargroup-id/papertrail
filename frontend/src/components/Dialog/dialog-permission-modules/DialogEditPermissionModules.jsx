import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
import DropdownCheckBox from '../../forms/dropdown/DropdownCheckbox.jsx'
import {
  getAccessErrorMessage,
  getPermissionPayloadFromAccess,
  getRowsFromResponse,
  getSelectedAccessValues,
  initialPermissionModuleFormValues,
  makeUserOptionFromPermissionRecord,
  mapPermissionModuleOptions,
  mapUserOptions,
  mergeUniqueOptions,
  permissionAccessOptions,
} from './permissionModuleFormUtils.js'

function DialogEditPermissionModules({
  isOpen = false,
  eyebrow = 'Permission Management',
  title = 'Edit User Module Permission',
  user = null,
  permissionModule = null,
  onClose,
  onUpdated,
}) {
  const [formValues, setFormValues] = useState(initialPermissionModuleFormValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userOptions, setUserOptions] = useState([])
  const [permissionModuleOptions, setPermissionModuleOptions] = useState([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')
  const resolvedPermissionModule = permissionModule ?? user

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
      setFormValues(initialPermissionModuleFormValues)
      setFieldErrors({})
      setSubmitError('')
      setIsSubmitting(false)
      setUserOptions([])
      setPermissionModuleOptions([])
      setIsOptionsLoading(false)
      setOptionsError('')
      return undefined
    }

    setFormValues({
      user_id: resolvedPermissionModule?.user_id ?? '',
      username_snapshot: resolvedPermissionModule?.username_snapshot ?? '',
      name_snapshot: resolvedPermissionModule?.name_snapshot ?? '',
      module_id: resolvedPermissionModule?.module_id ?? '',
      access: getSelectedAccessValues(resolvedPermissionModule),
    })
    setFieldErrors({})
    setSubmitError('')

    const controller = new AbortController()

    async function loadOptions() {
      setIsOptionsLoading(true)
      setOptionsError('')

      try {
        const [permissionModuleResponse, userResponse] = await Promise.all([
          api.permissionModules.list(
            {
              is_active: 1,
            },
            {
              signal: controller.signal,
            },
          ),
          api.directory.users.list(undefined, {
            signal: controller.signal,
          }),
        ])
        const currentUserOption = makeUserOptionFromPermissionRecord(resolvedPermissionModule)

        setPermissionModuleOptions(
          mapPermissionModuleOptions(getRowsFromResponse(permissionModuleResponse)),
        )
        setUserOptions(
          mergeUniqueOptions(mapUserOptions(getRowsFromResponse(userResponse)), currentUserOption),
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setUserOptions([])
        setPermissionModuleOptions([])
        setOptionsError(error.message || 'Gagal memuat pilihan user atau permission module.')
      } finally {
        if (!controller.signal.aborted) {
          setIsOptionsLoading(false)
        }
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, resolvedPermissionModule])

  const updateUserSelection = (value, option) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      user_id: value ?? '',
      username_snapshot: option?.meta?.username ?? '',
      name_snapshot: option?.meta?.name ?? '',
    }))

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      user_id: '',
      username_snapshot: '',
      name_snapshot: '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const userModulePermissionId = resolvedPermissionModule?.id
    const normalizedUserId = String(formValues.user_id ?? '').trim()
    const normalizedUsername = String(formValues.username_snapshot ?? '').trim()
    const normalizedName = String(formValues.name_snapshot ?? '').trim()
    const normalizedModuleId = Number(formValues.module_id)
    const normalizedAccess = Array.isArray(formValues.access) ? formValues.access : []
    const nextFieldErrors = {}

    if (userModulePermissionId === undefined || userModulePermissionId === null) {
      setSubmitError('Data user module permission tidak ditemukan.')
      return
    }

    if (!normalizedUserId) {
      nextFieldErrors.user_id = 'User wajib dipilih.'
    } else if (normalizedUserId.length > 36) {
      nextFieldErrors.user_id = 'User ID maksimal 36 karakter.'
    }

    if (normalizedUsername.length > 100) {
      nextFieldErrors.username_snapshot = 'Username maksimal 100 karakter.'
    }

    if (normalizedName.length > 255) {
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
      const response = await api.userModulePermissions.update(userModulePermissionId, {
        user_id: normalizedUserId,
        username_snapshot: normalizedUsername,
        name_snapshot: normalizedName,
        module_id: normalizedModuleId,
        ...getPermissionPayloadFromAccess(normalizedAccess),
      })

      await onUpdated?.(response)
      onClose?.()
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

      setSubmitError(error.message || 'Gagal memperbarui user module permission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const isFormDisabled = isSubmitting || isOptionsLoading

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup register-user-popup entity-form-popup entity-form-popup--budget-type entity-form-popup--permission-modules"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-permission-module-title"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="dashboard-popup__header">
            <div>
              <p className="dashboard-popup__eyebrow">{eyebrow}</p>
              <h2 className="dashboard-popup__title" id="dialog-edit-permission-module-title">
                {title}
              </h2>
            </div>
          </div>

          <div className="dashboard-popup__body">
            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__form">
                  <div className="register-user-popup__grid register-user-popup__grid--permission-modules">
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <DropdownSearch
                        label="User"
                        value={formValues.user_id}
                        options={userOptions}
                        placeholder={isOptionsLoading ? 'Memuat user...' : 'Pilih user'}
                        searchPlaceholder="Cari user..."
                        emptyMessage="User tidak ditemukan."
                        required
                        disabled={isFormDisabled}
                        error={
                          fieldErrors.user_id ||
                          fieldErrors.username_snapshot ||
                          fieldErrors.name_snapshot
                        }
                        onChange={updateUserSelection}
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
                    <div className="register-user-popup__field">
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
              onClick={onClose}
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

export default DialogEditPermissionModules
