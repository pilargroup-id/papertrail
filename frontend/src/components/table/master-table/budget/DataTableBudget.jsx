import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBudgets from '../../../button/button-budgets/ButtonEditBudgets.jsx'

function EditActionButton(props) {
  return <ButtonEditBudgets {...props} showLabel />
}

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

function getBanksStatusLabel(budgets) {
  return Number(budgets?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBanksStatusVariant(budgets) {
  return Number(budgets?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBanksActive(budgets) {
  return Number(budgets?.is_active) === 1
}

function getVendorBankPrimaryLabel(budgets) {
  return Number(budgets?.is_primary) === 1 ? 'Primary' : 'Secondary'
}

function getVendorBankPrimaryVariant(budgets) {
  return Number(budgets?.is_primary) === 1 ? 'active' : 'inactive'
}

function renderBanksStatus(budgets, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBanksActive(budgets)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(budgets, index))
      : false
  const isDisabled = budgets?.id === undefined || budgets?.id === null || isUpdating
  const statusLabel = getBanksStatusLabel(budgets)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBanksStatusVariant(budgets)}
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
          aria-label={`Ubah status banks ${budgets?.name ?? budgets?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(budgets, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableBudgetType = [
        {
            key: 'project_name',
            header: 'Budget Name',
            accessor: 'project_name',
            type: 'identity',
            subtitleAccessor: (budgets) => `Budget Code: ${budgets?.budget_code ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'budget_amount',
            header: 'Budget Name',
            accessor: 'budget_amount',
            type: 'identity',
            subtitleAccessor: (budgets) => `Remaining: ${budgets?.budget_remaining ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'budget_type_name',
            header: 'Budget Type',
            accessor: 'budget_type_name',
            type: 'identity',
            subtitleAccessor: (budgets) => `Code ${budgets?.budget_type_code ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'company_name_snapshot',
            header: 'Company',
            accessor: 'company_name_snapshot',
            // subtitleAccessor: (budgets) => `Code: ${budgets?.bank_code ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'department_name_snapshot',
            header: 'Departments',
            accessor: 'department_name_snapshot',
            type: 'identity',
            subtitleAccessor: (budgets) => `Class: ${budgets?.department_class_snapshot ?? '-'}`,
            minWidth: 260,
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
            subtitleAccessor: (budgets) => `Code: ${budgets?.updated_at ?? '-'}`,
            nowrap: true,
            minWidth: 170,
        },
    ]

function DataTableBudgetType({
  rows = [],
  columns = columnsDataTableBudgetType,
  actions,
  getRowId = (budgets, index) => budgets?.id ?? index,
  tableLabel = 'Vendor bank accounts table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onStatusChange,
  SwitchComponent,
  mobileCard,
  className,
  ...props
}) {
  const shouldRenderStatusSwitch =
    typeof onStatusChange === 'function' && typeof SwitchComponent === 'function'
  const resolvedColumns = shouldRenderStatusSwitch
    ? columns.map((column) =>
        column.key === 'status'
          ? {
              ...column,
              render: (budgets, index) =>
                renderBanksStatus(budgets, index, {
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
              label: (budgets) => getBanksStatusLabel(budgets),
              variant: (budgets) => getBanksStatusVariant(budgets),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit',
          buttonComponent: EditActionButton,
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
      actionColumnPosition="start"
      actionCellClassName="users-table__action-cell frp-table__action-cell"
      className={['frp-table--actions', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export default DataTableBudgetType
