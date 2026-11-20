import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBudgetType from '../../../button/button-budget-type/ButtonEditBudgetType.jsx'

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

function getBanksStatusLabel(budgetTypes) {
  return Number(budgetTypes?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBanksStatusVariant(budgetTypes) {
  return Number(budgetTypes?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBanksActive(budgetTypes) {
  return Number(budgetTypes?.is_active) === 1
}

function getVendorBankPrimaryLabel(budgetTypes) {
  return Number(budgetTypes?.is_primary) === 1 ? 'Primary' : 'Secondary'
}

function getVendorBankPrimaryVariant(budgetTypes) {
  return Number(budgetTypes?.is_primary) === 1 ? 'active' : 'inactive'
}

function renderBanksStatus(budgetTypes, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBanksActive(budgetTypes)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(budgetTypes, index))
      : false
  const isDisabled = budgetTypes?.id === undefined || budgetTypes?.id === null || isUpdating
  const statusLabel = getBanksStatusLabel(budgetTypes)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBanksStatusVariant(budgetTypes)}
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
          aria-label={`Ubah status banks ${budgetTypes?.name ?? budgetTypes?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(budgetTypes, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableBudgetType = [{
    key: 'code',
    header: 'Code',
    accessor: 'code',
    type: 'identity',
    subtitleAccessor: (budgetTypes) => `Vendor ID: ${budgetTypes?.vendor_id ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'name',
    header: 'Name Budget Type',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: (budgetTypes) => `Code: ${budgetTypes?.bank_code ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    nowrap: true,
    minWidth: 180,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getBanksStatusLabel,
    type: 'status',
    variantAccessor: getBanksStatusVariant,
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

function DataTableBudgetType({
  rows = [],
  columns = columnsDataTableBudgetType,
  actions,
  getRowId = (budgetTypes, index) => budgetTypes?.id ?? index,
  tableLabel = 'Vendor bank accounts table',
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
              render: (budgetTypes, index) =>
                renderBanksStatus(budgetTypes, index, {
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
              label: (budgetTypes) => getBanksStatusLabel(budgetTypes),
              variant: (budgetTypes) => getBanksStatusVariant(budgetTypes),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit Vendor Banks',
          buttonComponent: ButtonEditBudgetType,
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

export default DataTableBudgetType