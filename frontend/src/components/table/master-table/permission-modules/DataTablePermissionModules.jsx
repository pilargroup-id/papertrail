import DataTableAccordion, { DataTableStatus } from '../../DataTableAccordion.jsx'
import DataTable from '../../DataTable.jsx'
import ButtonEditPermissionModules from '../../../button/button-permission-modules/ButtonEditPermissionModules.jsx'

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getUserModulePermissionStatusLabel(permissionModule) {
  const permissions = getPermissionItems(permissionModule)

  if (permissions.length > 0) {
    const activeCount = permissions.filter(getIsUserModulePermissionActive).length

    return `${activeCount}/${permissions.length} Aktif`
  }

  return Number(permissionModule?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getUserModulePermissionStatusVariant(permissionModule) {
  const permissions = getPermissionItems(permissionModule)

  if (permissions.length > 0) {
    return permissions.some(getIsUserModulePermissionActive) ? 'active' : 'inactive'
  }

  return Number(permissionModule?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsUserModulePermissionActive(permissionModule) {
  return Number(permissionModule?.is_active) === 1
}

function getPermissionModuleCode(permissionModule) {
  return (
    permissionModule?.module_code ??
    permissionModule?.module?.module_code ??
    permissionModule?.permission_module?.module_code ??
    permissionModule?.module?.code ??
    permissionModule?.module_code_snapshot ??
    permissionModule?.module_id ??
    '-'
  )
}

function getPermissionModuleName(permissionModule) {
  return (
    permissionModule?.module_name ??
    permissionModule?.module?.module_name ??
    permissionModule?.permission_module?.module_name ??
    permissionModule?.module?.name ??
    permissionModule?.module_name_snapshot ??
    `Module ${permissionModule?.module_id ?? '-'}`
  )
}

function getPermissionModuleSubtitle(permissionModule) {
  return [
    getPermissionModuleCode(permissionModule),
    permissionModule?.module_group ??
      permissionModule?.module?.module_group ??
      permissionModule?.permission_module?.module_group,
  ].filter(Boolean).join(' | ')
}

function getPermissionModuleGroup(permissionModule) {
  return (
    permissionModule?.module_group ??
    permissionModule?.module?.module_group ??
    permissionModule?.permission_module?.module_group ??
    '-'
  )
}

function getPermissionItems(permissionModule) {
  return Array.isArray(permissionModule?.permissions) ? permissionModule.permissions : []
}

function getPermissionUserName(permissionModule) {
  return (
    permissionModule?.name_snapshot ??
    permissionModule?.user?.name_snapshot ??
    permissionModule?.user?.name ??
    permissionModule?.username_snapshot ??
    permissionModule?.user_id
  )
}

function getFirstPermissionValue(permissionModule, keys) {
  const permissions = getPermissionItems(permissionModule)
  const candidates = [permissionModule, ...permissions]

  for (const candidate of candidates) {
    const matchedKey = keys.find(
      (key) => candidate?.[key] !== undefined && candidate?.[key] !== null && candidate?.[key] !== '',
    )

    if (matchedKey) {
      return candidate[matchedKey]
    }
  }

  return undefined
}

function getPermissionCreatedBy(permissionModule) {
  return getFirstPermissionValue(permissionModule, ['created_by_name', 'created_by_user_id']) ?? '-'
}

function getPermissionCreatedAt(permissionModule) {
  return getFirstPermissionValue(permissionModule, ['created_at'])
}

function getPermissionUpdatedAt(permissionModule) {
  return getFirstPermissionValue(permissionModule, ['updated_at'])
}

function getUserPermissionSubtitle(permissionModule) {
  const permissions = getPermissionItems(permissionModule)

  return [
    permissionModule?.username_snapshot,
    permissions.length > 0 ? `${permissions.length} permissions` : null,
    // permissionModule?.user_id,
  ].filter(Boolean).join(' | ')
}

function getPermissionActions(permissionModule) {
  const actions = [
    permissionModule?.can_view ? 'View' : null,
    permissionModule?.can_create ? 'Create' : null,
    permissionModule?.can_update ? 'Update' : null,
    permissionModule?.can_deactivate ? 'Deactivate' : null,
  ].filter(Boolean)

  return actions.length > 0 ? actions : ['No Access']
}

function renderUserModulePermissionStatus(permissionModule, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const permissions = getPermissionItems(permissionModule)
  const statusLabel = getUserModulePermissionStatusLabel(permissionModule)

  if (permissions.length > 0) {
    return (
      <DataTableStatus variant={getUserModulePermissionStatusVariant(permissionModule)}>
        {statusLabel}
      </DataTableStatus>
    )
  }

  const isActive = getIsUserModulePermissionActive(permissionModule)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(permissionModule, index))
      : false
  const isDisabled = permissionModule?.id === undefined || permissionModule?.id === null || isUpdating
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getUserModulePermissionStatusVariant(permissionModule)}
    >
      {statusLabel}
    </DataTableStatus>
  )

  return (
    <>
      {SwitchComponent ? (
        <SwitchComponent
          className="banks-status-toggle__switch"
          label={statusPill}
          checked={isActive}
          disabled={isDisabled}
          aria-label={`Ubah status permission ${getPermissionModuleCode(permissionModule)} untuk ${permissionModule?.username_snapshot ?? permissionModule?.user_id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(permissionModule, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

function renderPermissionModulesTable(permissionModule, {
  isStatusUpdating,
  onStatusChange,
  shouldRenderStatusSwitch,
  SwitchComponent,
}) {
  const permissions = getPermissionItems(permissionModule)
  const rows = permissions.length > 0 ? permissions : [permissionModule]
  const columns = [
    {
      key: 'module',
      header: 'Module',
      accessor: getPermissionModuleName,
      type: 'identity',
      minWidth: 230,
      subtitleAccessor: getPermissionModuleSubtitle,
    },
    {
      key: 'group',
      header: 'Group',
      accessor: getPermissionModuleGroup,
      minWidth: 120,
      nowrap: true,
    },
    {
      key: 'access',
      header: 'Access',
      accessor: getPermissionActions,
      type: 'chips',
      minWidth: 220,
    },
    {
      key: 'active_status',
      header: 'Active Status',
      render: (permission, index) =>
        shouldRenderStatusSwitch
          ? renderUserModulePermissionStatus(permission, index, {
              isStatusUpdating,
              onStatusChange,
              SwitchComponent,
            })
          : (
              <DataTableStatus variant={getUserModulePermissionStatusVariant(permission)}>
                {getIsUserModulePermissionActive(permission) ? 'Active' : 'Inactive'}
              </DataTableStatus>
            ),
      minWidth: 140,
      nowrap: true,
    },
  ]

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(permission, index) => permission?.id ?? permission?.module_id ?? index}
      tableLabel={`${getPermissionUserName(permissionModule) ?? 'User'} permissions`}
      emptyMessage="Belum ada permission."
      pagination={false}
      mobileCard={false}
      className="permission-modules-accordion-table"
    />
  )
}

function getPermissionModulesDetail({
  isStatusUpdating,
  onStatusChange,
  shouldRenderStatusSwitch,
  SwitchComponent,
}) {
  return {
    columnLabel: 'Permissions',
    eyebrow: 'User permissions',
    title: (permissionModule) => getPermissionUserName(permissionModule) ?? 'User Permission',
    description: (permissionModule) => {
      const permissions = getPermissionItems(permissionModule)

      if (permissions.length === 0) {
        return getPermissionModuleSubtitle(permissionModule)
      }

      const activeCount = permissions.filter(getIsUserModulePermissionActive).length

      return `${permissions.length} module permissions, ${activeCount} aktif`
    },
    render: (permissionModule) =>
      renderPermissionModulesTable(permissionModule, {
        isStatusUpdating,
        onStatusChange,
        shouldRenderStatusSwitch,
        SwitchComponent,
      }),
  }
}

const columnsPermissionModules = [
  {
    key: 'user',
    header: 'User',
    accessor: getPermissionUserName,
    type: 'identity',
    minWidth: 260,
    subtitleAccessor: getUserPermissionSubtitle,
  },
  // {
  //   key: 'module',
  //   header: 'Module',
  //   accessor: getPermissionModuleName,
  //   type: 'identity',
  //   minWidth: 260,
  //   subtitleAccessor: getPermissionModuleSubtitle,
  // },
  // {
  //   key: 'access',
  //   header: 'Access',
  //   accessor: getPermissionActions,
  //   type: 'chips',
  //   minWidth: 240,
  // },
  {
    key: 'status',
    header: 'Status',
    accessor: getUserModulePermissionStatusLabel,
    type: 'status',
    variantAccessor: getUserModulePermissionStatusVariant,
    nowrap: true,
  },
  {
    key: 'created_by',
    header: 'Created By',
    accessor: getPermissionCreatedBy,
    minWidth: 170,
  },
  {
    key: 'created_at',
    header: 'Created At',
    accessor: getPermissionCreatedAt,
    format: formatDateTime,
    nowrap: true,
    minWidth: 170,
  },
  {
    key: 'updated_at',
    header: 'Updated At',
    accessor: getPermissionUpdatedAt,
    format: formatDateTime,
    nowrap: true,
    minWidth: 170,
  },
]

function DataTablePermissionModules({
  rows = [],
  columns = columnsPermissionModules,
  actions,
  detail,
  getRowId = (permissionModule, index) =>
    permissionModule?.id ?? permissionModule?.user_id ?? permissionModule?.username_snapshot ?? index,
  tableLabel = 'User Module Permissions Table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onStatusChange,
  SwitchComponent,
  mobileCard,
  ...props
}) {
  const shouldRenderStatusSwitch =
    typeof onStatusChange === 'function' && typeof SwitchComponent === 'function'
  const resolvedColumns = shouldRenderStatusSwitch
    ? columns.map((column) =>
        column.key === 'status'
          ? {
              ...column,
              render: (permissionModule, index) =>
                renderUserModulePermissionStatus(permissionModule, index, {
                  isStatusUpdating,
                  onStatusChange,
                  SwitchComponent,
                }),
            }
          : column,
      )
    : columns
  const resolvedMobileCard =
    mobileCard !== false
      ? {
          ...(mobileCard ?? {}),
          rows: mobileCard?.rows ?? [
            {
              key: 'created_at',
              label: 'Created At',
              value: (permissionModule) => formatDateTime(getPermissionCreatedAt(permissionModule)),
            },
            {
              key: 'updated_at',
              label: 'Updated At',
              value: (permissionModule) => formatDateTime(getPermissionUpdatedAt(permissionModule)),
            },
          ],
          sections: mobileCard?.sections ?? false,
          expandableTitle: mobileCard?.expandableTitle ?? 'Permissions',
          header: {
            ...(mobileCard?.header ?? {}),
            status: {
              label: (permissionModule) => getUserModulePermissionStatusLabel(permissionModule),
              variant: (permissionModule) => getUserModulePermissionStatusVariant(permissionModule),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    {
      key: 'edit',
      label: 'Edit User Module Permission',
      buttonComponent: ButtonEditPermissionModules,
      disabled: typeof onEdit !== 'function',
      onClick: (permissionModule, index, event) => {
        onEdit?.(permissionModule, index, event)
      },
    },
  ]
  const resolvedActions = Array.isArray(actions) ? actions : defaultActions
  const resolvedDetail = detail ?? getPermissionModulesDetail({
    isStatusUpdating,
    onStatusChange,
    shouldRenderStatusSwitch,
    SwitchComponent,
  })

  return (
    <DataTableAccordion
      rows={rows}
      columns={resolvedColumns}
      actions={resolvedActions}
      showAccordionActions={false}
      useDefaultActions={false}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      detail={resolvedDetail}
      mobileCard={resolvedMobileCard}
      {...props}
    />
  )
}

export default DataTablePermissionModules
