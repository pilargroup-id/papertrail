import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditPermissionModules from '../../../button/button-permission-modules/ButtonEditPermissionModules.jsx'


const AUTO_FIT_BASE_COLUMN_COUNT = 5
const AUTO_FIT_MIN_SCALE = 0.58

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
  return Number(permissionModule?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getUserModulePermissionStatusVariant(permissionModule) {
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

function getUserPermissionSubtitle(permissionModule) {
  return [
    permissionModule?.username_snapshot,
    permissionModule?.user_id,
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

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function getAutoFitScale(columnCount) {
  const extraColumnCount = Math.max(0, columnCount - AUTO_FIT_BASE_COLUMN_COUNT)
  const scale = 1 - extraColumnCount * 0.08

  return Math.max(AUTO_FIT_MIN_SCALE, Number(scale.toFixed(2)))
}

function getScaledRem(value, scale, minValue = value * AUTO_FIT_MIN_SCALE) {
  return `${Math.max(value * scale, minValue).toFixed(2)}rem`
}

function getScaledPx(value, scale, minValue) {
  return `${Math.max(value * scale, minValue).toFixed(0)}px`
}

function getScaledWidth(value, scale) {
  if (typeof value === 'number') {
    return Math.max(1, Math.round(value * scale))
  }

  if (typeof value === 'string') {
    const pixelValue = Number.parseFloat(value)

    if (value.trim().endsWith('px') && Number.isFinite(pixelValue)) {
      return `${Math.max(1, Math.round(pixelValue * scale))}px`
    }
  }

  return value
}

function scaleTableColumn(column, scale) {
  return {
    ...column,
    width: getScaledWidth(column.width, scale),
    minWidth: getScaledWidth(column.minWidth, scale),
    maxWidth: getScaledWidth(column.maxWidth, scale),
  }
}

function getAutoFitWrapperStyle(scale, tableWrapperStyle) {
  return {
    '--vendor-banks-table-cell-padding-block': getScaledRem(1, scale),
    '--vendor-banks-table-cell-padding-inline': getScaledRem(1, scale),
    '--vendor-banks-table-header-font-size': getScaledRem(0.76, scale, 0.62),
    '--vendor-banks-table-body-font-size': getScaledRem(0.92, scale, 0.72),
    '--vendor-banks-table-name-font-size': getScaledRem(0.98, scale, 0.74),
    '--vendor-banks-table-meta-font-size': getScaledRem(0.74, scale, 0.58),
    '--vendor-banks-table-avatar-size': getScaledPx(40, scale, 28),
    '--vendor-banks-table-identity-min-width': getScaledPx(220, scale, 128),
    '--vendor-banks-table-status-min-width': getScaledPx(86, scale, 56),
    '--vendor-banks-table-icon-size': getScaledPx(36, scale, 28),
    '--vendor-banks-table-switch-width': getScaledPx(42, scale, 32),
    '--vendor-banks-table-switch-height': getScaledPx(24, scale, 18),
    '--vendor-banks-table-switch-thumb': getScaledPx(18, scale, 14),
    '--vendor-banks-table-switch-thumb-translate': getScaledPx(18, scale, 14),
    ...tableWrapperStyle,
  }
}

function renderUserModulePermissionStatus(permissionModule, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsUserModulePermissionActive(permissionModule)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(permissionModule, index))
      : false
  const isDisabled = permissionModule?.id === undefined || permissionModule?.id === null || isUpdating
  const statusLabel = getUserModulePermissionStatusLabel(permissionModule)
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

const columnsPermissionModules = [
  {
    key: 'user',
    header: 'User',
    accessor: (permissionModule) =>
      permissionModule?.name_snapshot ??
      permissionModule?.username_snapshot ??
      permissionModule?.user_id,
    type: 'identity',
    minWidth: 260,
    subtitleAccessor: getUserPermissionSubtitle,
  },
  {
    key: 'module',
    header: 'Module',
    accessor: getPermissionModuleName,
    type: 'identity',
    minWidth: 260,
    subtitleAccessor: getPermissionModuleSubtitle,
  },
  {
    key: 'access',
    header: 'Access',
    accessor: getPermissionActions,
    type: 'chips',
    minWidth: 240,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getUserModulePermissionStatusLabel,
    type: 'status',
    variantAccessor: getUserModulePermissionStatusVariant,
    nowrap: true,
  },
  {
    key: 'created_at',
    header: 'Created At',
    accessor: 'created_at',
    format: formatDateTime,
    nowrap: true,
    minWidth: 170,
  },
  {
    key: 'updated_at',
    header: 'Updated At',
    accessor: 'updated_at',
    format: formatDateTime,
    nowrap: true,
    minWidth: 170,
  },
]

function DataTablePermissionModules({
  rows = [],
  columns = columnsPermissionModules,
  actions,
  getRowId = (permissionModule, index) => permissionModule?.id ?? index,
  tableLabel = 'User Module Permissions Table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onStatusChange,
  SwitchComponent,
  mobileCard,
  className,
  tableWrapperStyle,
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
    shouldRenderStatusSwitch && mobileCard !== false
      ? {
          ...(mobileCard ?? {}),
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
  const autoFitColumnCount = resolvedColumns.length + (resolvedActions.length > 0 ? 1 : 0)
  const autoFitScale = getAutoFitScale(autoFitColumnCount)
  const autoFitColumns = resolvedColumns.map((column) => scaleTableColumn(column, autoFitScale))

  return (
    <DataTableAction
      rows={rows}
      columns={autoFitColumns}
      actions={resolvedActions}
      useDefaultActions={false}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      mobileCard={resolvedMobileCard}
      actionCellStyle={{
        width: '1%',
        minWidth: Math.max(32, Math.round(48 * autoFitScale)),
        whiteSpace: 'nowrap',
      }}
      className={joinClassNames('vendor-banks-table--auto-fit', className)}
      tableWrapperStyle={getAutoFitWrapperStyle(autoFitScale, tableWrapperStyle)}
      {...props}
    />
  )
}

export default DataTablePermissionModules
