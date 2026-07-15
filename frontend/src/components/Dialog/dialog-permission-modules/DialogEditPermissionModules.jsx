import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { Check } from '../../layoute/TemplateIcons.jsx'
import DropdownSearch from '../../forms/dropdown/DropdownSearch.jsx'
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
  optionMatchesPermissionModuleTab,
  permissionAccessOptions,
  permissionModuleTabs,
} from './permissionModuleFormUtils.js'

function getPermissionRecords(permissionModule) {
  if (Array.isArray(permissionModule?.permissions)) {
    return permissionModule.permissions
  }

  return permissionModule ? [permissionModule] : []
}

function getPermissionModuleId(permissionModule) {
  return (
    permissionModule?.module_id ??
    permissionModule?.module?.id ??
    permissionModule?.permission_module?.id ??
    permissionModule?.module?.module_id ??
    ''
  )
}

function getSelectedPermissionModuleEntries(moduleAccessMap) {
  return Object.entries(moduleAccessMap ?? {}).filter(
    ([, accessValues]) => Array.isArray(accessValues) && accessValues.length > 0,
  )
}

function getModuleAccessMap(permissionModule) {
  return getPermissionRecords(permissionModule).reduce((moduleAccessMap, permission) => {
    const moduleId = getPermissionModuleId(permission)

    if (moduleId === undefined || moduleId === null || moduleId === '') {
      return moduleAccessMap
    }

    moduleAccessMap[String(moduleId)] = getSelectedAccessValues(permission)
    return moduleAccessMap
  }, {})
}

function getExistingPermissionByModuleId(permissionModule) {
  return getPermissionRecords(permissionModule).reduce((permissionByModuleId, permission) => {
    const moduleId = getPermissionModuleId(permission)

    if (moduleId === undefined || moduleId === null || moduleId === '') {
      return permissionByModuleId
    }

    permissionByModuleId[String(moduleId)] = permission
    return permissionByModuleId
  }, {})
}

function getPermissionRecordField(permissionModule, fieldName, fallback = '') {
  const records = getPermissionRecords(permissionModule)
  const firstRecord = records[0]

  return permissionModule?.[fieldName] ?? firstRecord?.[fieldName] ?? fallback
}

function makePermissionModuleOptionFromPermissionRecord(permission) {
  const moduleId = getPermissionModuleId(permission)

  if (moduleId === undefined || moduleId === null || moduleId === '') {
    return null
  }

  const module = permission?.module ?? permission?.permission_module ?? {}
  const moduleCode = permission?.module_code ?? module?.module_code ?? module?.code
  const moduleName =
    permission?.module_name ??
    module?.module_name ??
    module?.name ??
    `Permission Module #${moduleId}`
  const moduleGroup = permission?.module_group ?? module?.module_group

  return {
    value: moduleId,
    label: [moduleCode, moduleName].filter(Boolean).join(' - ') || `Permission Module #${moduleId}`,
    meta: {
      ...module,
      id: moduleId,
      module_code: moduleCode,
      module_name: moduleName,
      module_group: moduleGroup,
    },
  }
}

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
  const [activeModuleTab, setActiveModuleTab] = useState(permissionModuleTabs[0].id)
  const resolvedPermissionModule = permissionModule ?? user

  const resetDialogState = useCallback(() => {
    setFormValues(initialPermissionModuleFormValues)
    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setUserOptions([])
    setPermissionModuleOptions([])
    setIsOptionsLoading(false)
    setOptionsError('')
    setActiveModuleTab(permissionModuleTabs[0].id)
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const updatePermissionModuleAccess = (moduleId, accessValue, checked) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      module_access: {
        ...(currentValues.module_access ?? {}),
        [String(moduleId ?? '')]: checked
          ? [
              ...new Set([
                ...(
                  Array.isArray(currentValues.module_access?.[String(moduleId ?? '')])
                    ? currentValues.module_access[String(moduleId ?? '')]
                    : []
                ),
                accessValue,
              ]),
            ]
          : (
              Array.isArray(currentValues.module_access?.[String(moduleId ?? '')])
                ? currentValues.module_access[String(moduleId ?? '')].filter((value) => value !== accessValue)
                : []
            ),
      },
    }))

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      module_id: '',
      access: '',
    }))
  }

  const handleModuleTabChange = (tabId) => {
    const nextTab = permissionModuleTabs.find((tab) => tab.id === tabId)

    if (!nextTab) {
      return
    }

    setActiveModuleTab(tabId)
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      module_id: '',
      access: '',
    }))
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    setFormValues({
      ...initialPermissionModuleFormValues,
      user_id: getPermissionRecordField(resolvedPermissionModule, 'user_id'),
      username_snapshot: getPermissionRecordField(resolvedPermissionModule, 'username_snapshot'),
      name_snapshot: getPermissionRecordField(resolvedPermissionModule, 'name_snapshot'),
      module_access: getModuleAccessMap(resolvedPermissionModule),
    })
    setFieldErrors({})
    setSubmitError('')
    setActiveModuleTab(permissionModuleTabs[0].id)
    /* eslint-enable react-hooks/set-state-in-effect */

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
        const currentPermissionModuleOptions = getPermissionRecords(resolvedPermissionModule)
          .map(makePermissionModuleOptionFromPermissionRecord)
          .filter(Boolean)
        const activePermissionModuleOptions = mapPermissionModuleOptions(
          getRowsFromResponse(permissionModuleResponse),
        )

        setPermissionModuleOptions(
          currentPermissionModuleOptions.reduce(
            (options, option) => mergeUniqueOptions(options, option),
            activePermissionModuleOptions,
          ),
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
        handleClose()
      }
    }

    loadOptions()
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      controller.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, resolvedPermissionModule])

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

    const normalizedUserId = String(formValues.user_id ?? '').trim()
    const normalizedUsername = String(formValues.username_snapshot ?? '').trim()
    const normalizedName = String(formValues.name_snapshot ?? '').trim()
    const selectedPermissionModuleEntries = getSelectedPermissionModuleEntries(
      formValues.module_access,
    )
    const existingPermissionByModuleId = getExistingPermissionByModuleId(resolvedPermissionModule)
    const nextFieldErrors = {}

    if (!resolvedPermissionModule) {
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

    if (selectedPermissionModuleEntries.length === 0) {
      nextFieldErrors.module_id = 'Minimal satu permission module wajib dipilih.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setFieldErrors({})
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const responses = []
      const selectedModuleIds = new Set()

      for (const [moduleId, accessValues] of selectedPermissionModuleEntries) {
        const normalizedModuleId = Number(moduleId)

        if (!Number.isInteger(normalizedModuleId) || normalizedModuleId <= 0) {
          throw new Error('Permission module tidak valid.')
        }

        selectedModuleIds.add(String(moduleId))

        const payload = {
          user_id: normalizedUserId,
          username_snapshot: normalizedUsername,
          name_snapshot: normalizedName,
          module_id: normalizedModuleId,
          ...getPermissionPayloadFromAccess(accessValues),
        }
        const existingPermission = existingPermissionByModuleId[String(moduleId)]

        if (existingPermission?.id !== undefined && existingPermission?.id !== null) {
          responses.push(await api.userModulePermissions.update(existingPermission.id, payload))
        } else {
          responses.push(await api.userModulePermissions.create(payload))
        }
      }

      for (const [moduleId, existingPermission] of Object.entries(existingPermissionByModuleId)) {
        if (
          selectedModuleIds.has(moduleId) ||
          existingPermission?.id === undefined ||
          existingPermission?.id === null
        ) {
          continue
        }

        responses.push(
          await api.userModulePermissions.update(existingPermission.id, {
            user_id: normalizedUserId,
            username_snapshot: normalizedUsername,
            name_snapshot: normalizedName,
            module_id: Number(moduleId),
            ...getPermissionPayloadFromAccess([]),
          }),
        )
      }

      await onUpdated?.(responses)
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

      setSubmitError(error.message || 'Gagal memperbarui user module permission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormDisabled = isSubmitting || isOptionsLoading
  const selectedModuleAccess = formValues.module_access ?? {}
  const selectedPermissionModuleCount = getSelectedPermissionModuleEntries(selectedModuleAccess).length
  const activePermissionModuleTab =
    permissionModuleTabs.find((tab) => tab.id === activeModuleTab) ?? permissionModuleTabs[0]
  const permissionModuleTabCounts = useMemo(
    () =>
      permissionModuleTabs.reduce((counts, tab) => {
        counts[tab.id] = permissionModuleOptions.filter((option) =>
          optionMatchesPermissionModuleTab(option, tab),
        ).length
        return counts
      }, {}),
    [permissionModuleOptions],
  )
  const visiblePermissionModuleOptions = useMemo(
    () =>
      permissionModuleOptions.filter((option) =>
        optionMatchesPermissionModuleTab(option, activePermissionModuleTab),
      ),
    [activePermissionModuleTab, permissionModuleOptions],
  )

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
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
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <div
                        className={[
                          'permission-module-access-table',
                          fieldErrors.module_id || fieldErrors.access
                            ? 'permission-module-access-table--error'
                            : '',
                          isFormDisabled ? 'permission-module-access-table--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="permission-module-access-table__label-row">
                          <label className="form-control__label">
                            <span>Permission Module Access</span>
                            <span className="form-control__required">*</span>
                          </label>
                          <span className="permission-module-access-table__selection-count">
                            {selectedPermissionModuleCount} selected
                          </span>
                        </div>
                        <div
                          className="permission-module-access-table__tabs"
                          role="tablist"
                          aria-label="Klasifikasi permission module"
                        >
                          {permissionModuleTabs.map((tab) => {
                            const isActiveTab = tab.id === activeModuleTab

                            return (
                              <button
                                className={
                                  isActiveTab
                                    ? 'permission-module-access-table__tab permission-module-access-table__tab--active'
                                    : 'permission-module-access-table__tab'
                                }
                                type="button"
                                role="tab"
                                aria-selected={isActiveTab}
                                key={tab.id}
                                disabled={isFormDisabled}
                                onClick={() => handleModuleTabChange(tab.id)}
                              >
                                <span>{tab.label}</span>
                                <span className="permission-module-access-table__tab-count">
                                  {permissionModuleTabCounts[tab.id] ?? 0}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        <div className="permission-module-access-table__shell">
                          <table
                            className="permission-module-access-table__table"
                            aria-label="Permission module access"
                          >
                            <thead>
                              <tr>
                                <th scope="col">Permission Module</th>
                                {permissionAccessOptions.map((option) => (
                                  <th scope="col" key={option.value}>
                                    {option.value === 'can_deactivate' ? 'Deactive' : option.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {visiblePermissionModuleOptions.length > 0 ? (
                                visiblePermissionModuleOptions.map((option) => {
                                  const moduleId = String(option.value ?? '')
                                  const moduleAccessValues = Array.isArray(
                                    selectedModuleAccess[moduleId],
                                  )
                                    ? selectedModuleAccess[moduleId]
                                    : []
                                  const isSelected = moduleAccessValues.length > 0
                                  const moduleCode = option.meta?.module_code
                                  const moduleName = option.meta?.module_name
                                  const fallbackLabel = option.label || `Permission Module #${moduleId || '-'}`

                                  return (
                                    <tr
                                      className={
                                        isSelected
                                          ? 'permission-module-access-table__row permission-module-access-table__row--selected'
                                          : 'permission-module-access-table__row'
                                      }
                                      key={moduleId || fallbackLabel}
                                    >
                                      <th scope="row">
                                        <div className="permission-module-access-table__module-button">
                                          <span className="permission-module-access-table__module-name">
                                            {moduleName || fallbackLabel}
                                          </span>
                                          {moduleCode ? (
                                            <span className="permission-module-access-table__module-code">
                                              {moduleCode}
                                            </span>
                                          ) : null}
                                        </div>
                                      </th>
                                      {permissionAccessOptions.map((accessOption) => {
                                        const checked = moduleAccessValues.includes(accessOption.value)

                                        return (
                                          <td key={accessOption.value}>
                                            <label className="permission-module-access-table__checkbox">
                                              <input
                                                className="form-choice__input"
                                                type="checkbox"
                                                checked={checked}
                                                disabled={isFormDisabled}
                                                aria-label={`${accessOption.label} access untuk ${
                                                  moduleName || fallbackLabel
                                                }`}
                                                onChange={(event) => {
                                                  updatePermissionModuleAccess(
                                                    option.value,
                                                    accessOption.value,
                                                    event.target.checked,
                                                  )
                                                }}
                                                onClick={(event) => event.stopPropagation()}
                                              />
                                              <span className="form-choice__box" aria-hidden="true">
                                                <Check size={14} />
                                              </span>
                                            </label>
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  )
                                })
                              ) : (
                                <tr>
                                  <td
                                    className="permission-module-access-table__empty"
                                    colSpan={permissionAccessOptions.length + 1}
                                  >
                                    {isOptionsLoading
                                      ? 'Memuat permission module...'
                                      : `Permission module ${activePermissionModuleTab.label} tidak ditemukan.`}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {fieldErrors.module_id || fieldErrors.access ? (
                          <p className="form-control__message">
                            {fieldErrors.module_id || fieldErrors.access}
                          </p>
                        ) : null}
                      </div>
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

export default DialogEditPermissionModules
