import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditRpCheckerRules from '../../../button/button-rp-checker-rules/ButtonEditRpCheckerRules.jsx'

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

function getFrpDocumentTypeStatusLabel(RpCheckerRules) {
  return Number(RpCheckerRules?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(RpCheckerRules) {
  return Number(RpCheckerRules?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(RpCheckerRules) {
  return Number(RpCheckerRules?.is_active) === 1
}

function getShortFlowLabel(rpDestinationDepartment) {
  return Number(rpDestinationDepartment?.is_short_flow_allowed) === 1 ? 'Allowed' : 'Not Allowed'
}

function getShortFlowVariant(rpDestinationDepartment) {
  return Number(rpDestinationDepartment?.is_short_flow_allowed) === 1 ? 'active' : 'inactive'
}

function renderFrpDocumentTypeStatus(RpCheckerRules, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(RpCheckerRules)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(RpCheckerRules, index))
      : false
  const isDisabled = RpCheckerRules?.id === undefined || RpCheckerRules?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(RpCheckerRules)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(RpCheckerRules)}
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
          aria-label={`Ubah status RP checker rule ${RpCheckerRules?.department_name_snapshot ?? RpCheckerRules?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(RpCheckerRules, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsRpDestinationsDepartments = [
  {
    key: 'department_name_snapshot',
    header: 'Departments',
    accessor: 'department_name_snapshot',
    type: 'identity',
    subtitleAccessor: (rpDestinationDepartments) => `Class: ${rpDestinationDepartments?.department_class_snapshot ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'job_position',
    header: 'Job Position',
    accessor: 'job_position',
    type: 'identity',
    // subtitleAccessor: (rpDestinationDepartments) => `Class: ${rpDestinationDepartments?.department_class_snapshot ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getFrpDocumentTypeStatusLabel,
    type: 'status',
    variantAccessor: getFrpDocumentTypeStatusVariant,
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

function DataTableRpDestinationsDepartments({
  rows = [],
  columns = columnsRpDestinationsDepartments,
  actions,
  getRowId = (RpCheckerRules, index) => RpCheckerRules?.id ?? index,
  tableLabel = 'RP Destination Departments Table',
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
              render: (RpCheckerRules, index) =>
                renderFrpDocumentTypeStatus(RpCheckerRules, index, {
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
              label: (RpCheckerRules) => getFrpDocumentTypeStatusLabel(RpCheckerRules),
              variant: (RpCheckerRules) => getFrpDocumentTypeStatusVariant(RpCheckerRules),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit RP Checker Rule',
          buttonComponent: ButtonEditRpCheckerRules,
          onClick: onEdit,
        }
      : null,
  ].filter(Boolean)
  const resolvedActions = Array.isArray(actions) ? actions : defaultActions

  return (
    <DataTableAction
      rows={rows}
      columns={resolvedColumns}
      actions={resolvedActions}
      useDefaultActions={false}
      fitToRows
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      mobileCard={resolvedMobileCard}
      {...props}
    />
  )
}

export default DataTableRpDestinationsDepartments
