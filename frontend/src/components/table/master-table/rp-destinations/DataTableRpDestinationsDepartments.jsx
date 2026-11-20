import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditRpDestinationsDepartments from '../../../button/button-rp-destinations-departments/ButtonEditRpDestinationsDepartments.jsx'

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

function getFrpDocumentTypeStatusLabel(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1
}

function getShortFlowLabel(rpDestinationDepartment) {
  return Number(rpDestinationDepartment?.is_short_flow_allowed) === 1 ? 'Allowed' : 'Not Allowed'
}

function getShortFlowVariant(rpDestinationDepartment) {
  return Number(rpDestinationDepartment?.is_short_flow_allowed) === 1 ? 'active' : 'inactive'
}

function renderFrpDocumentTypeStatus(paymentMethods, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(paymentMethods)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(paymentMethods, index))
      : false
  const isDisabled = paymentMethods?.id === undefined || paymentMethods?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(paymentMethods)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(paymentMethods)}
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
          aria-label={`Ubah status RP destination department ${paymentMethods?.department_name_snapshot ?? paymentMethods?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(paymentMethods, event.target.checked ? 1 : 0, index)
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
    key: 'status',
    header: 'Status',
    accessor: getFrpDocumentTypeStatusLabel,
    type: 'status',
    variantAccessor: getFrpDocumentTypeStatusVariant,
    nowrap: true,
  },
  {
    key: 'is_short_flow_allowed',
    header: 'Short Flow',
    accessor: getShortFlowLabel,
    type: 'status',
    variantAccessor: getShortFlowVariant,
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
  getRowId = (paymentMethods, index) => paymentMethods?.id ?? index,
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
              render: (paymentMethods, index) =>
                renderFrpDocumentTypeStatus(paymentMethods, index, {
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
              label: (paymentMethods) => getFrpDocumentTypeStatusLabel(paymentMethods),
              variant: (paymentMethods) => getFrpDocumentTypeStatusVariant(paymentMethods),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit RP Destination Department',
          buttonComponent: ButtonEditRpDestinationsDepartments,
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
