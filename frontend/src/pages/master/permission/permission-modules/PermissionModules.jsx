import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import api from '../../../../services/api.js'

import Switch from '../../../../components/forms/Switch.jsx'
import DataTablePermissionModules from '../../../../components/table/master-table/permission-modules/DataTablePermissionModules.jsx'
import DialogEditPermissionModules from '../../../../components/Dialog/dialog-permission-modules/DialogEditPermissionModules.jsx'

import ButtonCreatePermissionModule from '../../../../components/button/button-permission-modules/ButtonCreatePermissionModules.jsx'

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

function getRuleFromResponse(response) {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ]

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      ('id' in candidate || 'is_active' in candidate),
  ) ?? null
}

function getRuleLabel(rule) {
  const userLabel =
    rule?.name_snapshot ??
    rule?.username_snapshot ??
    rule?.user_id ??
    'user module permission ini'
  const moduleLabel = [
    rule?.module_code,
    rule?.module_name,
  ].filter(Boolean).join(' - ')

  return moduleLabel ? `${userLabel} / ${moduleLabel}` : userLabel
}

function updateRuleStatus(permissionModules, permissionModulesId, isActive, updatedRule) {
  const permissionModulesIdKey = String(permissionModulesId)

  return permissionModules.map((permissionModule) => {
    if (String(permissionModule?.id) === permissionModulesIdKey) {
      return {
        ...permissionModule,
        ...(updatedRule ?? {}),
        is_active: updatedRule?.is_active ?? isActive,
      }
    }

    if (!Array.isArray(permissionModule?.permissions)) {
      return permissionModule
    }

    return {
      ...permissionModule,
      permissions: permissionModule.permissions.map((permission) =>
        String(permission?.id) === permissionModulesIdKey
          ? {
              ...permission,
              ...(updatedRule ?? {}),
              is_active: updatedRule?.is_active ?? isActive,
            }
          : permission,
      ),
    }
  })
}

function updateRuleRecord(permissionModules, permissionModulesId, updatedRule) {
  const permissionModulesIdKey = String(permissionModulesId)

  return permissionModules.map((permissionModule) => {
    if (String(permissionModule?.id) === permissionModulesIdKey) {
      return {
        ...permissionModule,
        ...updatedRule,
      }
    }

    if (!Array.isArray(permissionModule?.permissions)) {
      return permissionModule
    }

    return {
      ...permissionModule,
      permissions: permissionModule.permissions.map((permission) =>
        String(permission?.id) === permissionModulesIdKey
          ? {
              ...permission,
              ...updatedRule,
            }
          : permission,
      ),
    }
  })
}

function PermissionModules(props) {
  const outletContext = useOutletContext() ?? {}
  const activePage = props.activePage ?? outletContext.activePage
  const searchQuery = props.searchQuery ?? outletContext.searchQuery ?? ''
  const pageTitle =
    activePage?.title && activePage.title !== 'Modules'
      ? activePage.title
      : 'User Module Permissions'
  const pageEyebrow = activePage?.eyebrow ?? 'Permission Management'
  const [permissionModules, setPermissionModules] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [updatingStatusIds, setUpdatingStatusIds] = useState(() => new Set())
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedPermissionModule, setSelectedPermissionModule] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPermissionModules() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.userModulePermissionsGroupByUser.list(
          {
            page: 1,
            limit: 100,
            q: searchQuery,
          },
          {
            signal: controller.signal,
          },
        )

        setPermissionModules(getRowsFromResponse(response))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setPermissionModules([])
        setErrorMessage(error.message || 'Gagal memuat data user module permissions.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadPermissionModules()

    return () => controller.abort()
  }, [searchQuery, reloadToken])

  const openEditDialog = (permissionModule) => {
    setSelectedPermissionModule(permissionModule)
    setIsEditDialogOpen(true)
  }

  const handleRuleCreated = () => {
    setReloadToken((currentValue) => currentValue + 1)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedPermissionModule(null)
  }

  const handleRuleUpdated = async (response) => {
    const updatedRule = getRuleFromResponse(response)

    if (Array.isArray(response)) {
      setReloadToken((currentValue) => currentValue + 1)
    } else if (updatedRule?.id !== undefined && updatedRule?.id !== null) {
      setPermissionModules((currentRules) =>
        updateRuleRecord(currentRules, updatedRule.id, updatedRule),
      )
    } else if (selectedPermissionModule?.id !== undefined && selectedPermissionModule?.id !== null) {
      setReloadToken((currentValue) => currentValue + 1)
    } else {
      setReloadToken((currentValue) => currentValue + 1)
    }

    closeEditDialog()
  }

  const handleRuleStatusChange = async (permissionModule, nextIsActive) => {
    const permissionModulesId = permissionModule?.id

    if (permissionModulesId === undefined || permissionModulesId === null) {
      return
    }

    const permissionModulesIdKey = String(permissionModulesId)
    const normalizedIsActive = nextIsActive ? 1 : 0

    setErrorMessage('')
    setUpdatingStatusIds((currentIds) => new Set(currentIds).add(permissionModulesIdKey))
    setPermissionModules((currentRules) =>
      updateRuleStatus(currentRules, permissionModulesId, normalizedIsActive),
    )

    try {
      const response = await api.userModulePermissions.updateStatus(
        permissionModulesId,
        normalizedIsActive,
      )
      const updatedRule = getRuleFromResponse(response)

      if (updatedRule) {
        setPermissionModules((currentRules) =>
          updateRuleStatus(currentRules, permissionModulesId, normalizedIsActive, updatedRule),
        )
      }
    } catch (error) {
      setPermissionModules((currentRules) =>
        updateRuleRecord(currentRules, permissionModulesId, permissionModule),
      )
      setErrorMessage(error.message || 'Gagal memperbarui status user module permission.')
    } finally {
      setUpdatingStatusIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(permissionModulesIdKey)

        return nextIds
      })
    }
  }

  const emptyMessage = isLoading
    ? 'Memuat data user module permissions...'
    : errorMessage || (searchQuery ? 'Data tidak ditemukan. Coba pakai kata kunci lain.' : 'Belum ada data.')

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card"
      aria-label={pageTitle}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{pageEyebrow}</p>
          <h1 className="dashboard-panel__title">{pageTitle}</h1>
        </div>

        <div className="users-table-card__actions">
          <ButtonCreatePermissionModule
            variant="create"
            dialogProps={{
              onCreated: handleRuleCreated,
            }}
          >
            Create
          </ButtonCreatePermissionModule>
        </div>
      </div>

      <DataTablePermissionModules
        rows={permissionModules}
        tableLabel={`${pageTitle} table`}
        emptyMessage={emptyMessage}
        SwitchComponent={Switch}
        onEdit={openEditDialog}
        isStatusUpdating={(permissionModule) =>
          updatingStatusIds.has(String(permissionModule?.id))
        }
        onStatusChange={handleRuleStatusChange}
      />

      <DialogEditPermissionModules
        key={selectedPermissionModule?.id ?? 'permission-module-edit-dialog'}
        isOpen={isEditDialogOpen}
        title={`Edit ${getRuleLabel(selectedPermissionModule)}`}
        permissionModule={selectedPermissionModule}
        onClose={closeEditDialog}
        onUpdated={handleRuleUpdated}
      />
    </section>
  )
}

export default PermissionModules
