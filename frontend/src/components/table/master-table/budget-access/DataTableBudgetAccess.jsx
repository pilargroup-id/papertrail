import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBudgetAccess from '../../../button/button-budget-access/ButtonEditBudgetAccess.jsx'

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

function getBudgetAccessRuleStatusLabel(budgetAccessRules) {
  return Number(budgetAccessRules?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBudgetAccessRuleStatusVariant(budgetAccessRules) {
  return Number(budgetAccessRules?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBudgetAccessRuleActive(budgetAccessRules) {
  return Number(budgetAccessRules?.is_active) === 1
}

function renderBudgetAccessRuleStatus(budgetAccessRules, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBudgetAccessRuleActive(budgetAccessRules)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(budgetAccessRules, index))
      : false
  const isDisabled = budgetAccessRules?.id === undefined || budgetAccessRules?.id === null || isUpdating
  const statusLabel = getBudgetAccessRuleStatusLabel(budgetAccessRules)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBudgetAccessRuleStatusVariant(budgetAccessRules)}
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
          aria-label={`Ubah status budget access rule ${budgetAccessRules?.module ?? budgetAccessRules?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(budgetAccessRules, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableBudgetAccess = [
        {
            key: 'module',
            header: 'Module',
            accessor: 'module',
            type: 'identity',
            // subtitleAccessor: (budgetAccessRules) => `Budget Code: ${budgetAccessRules?.budget_code ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'access_type',
            header: 'Access Type',
            accessor: 'access_type',
            type: 'identity',
            // subtitleAccessor: (budgetAccessRules) => `Remaining: ${budgetAccessRules?.budget_remaining ?? '-'}`,
            minWidth: 260,
        },
        {
            key: 'department_name_snapshot',
            header: 'Department',
            accessor: 'department_name_snapshot',
            type: 'identity',
            subtitleAccessor: (budgetAccessRules) => `Class: ${budgetAccessRules?.department_class_snapshot ?? '-'}`,
            minWidth: 260,
        },

        {
            key: 'status',
            header: 'Status',
            accessor: getBudgetAccessRuleStatusLabel,
            type: 'status',
            variantAccessor: getBudgetAccessRuleStatusVariant,
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

function DataTableBudgetAccessRules({
  rows = [],
  columns = columnsDataTableBudgetAccess,
  actions,
  getRowId = (budgetAccessRules, index) => budgetAccessRules?.id ?? index,
  tableLabel = 'Vendor bank accounts table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onDelete,
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
              render: (budgetAccessRules, index) =>
                renderBudgetAccessRuleStatus(budgetAccessRules, index, {
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
              label: (budgetAccessRules) => getBudgetAccessRuleStatusLabel(budgetAccessRules),
              variant: (budgetAccessRules) => getBudgetAccessRuleStatusVariant(budgetAccessRules),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit Budget Access Rule',
          buttonComponent: ButtonEditBudgetAccess,
          onClick: onEdit,
        }
      : null,
    typeof onDelete === 'function'
      ? {
          key: 'delete',
          label: 'Delete Budget Access Rule',
          variant: 'danger',
          onClick: onDelete,
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

export default DataTableBudgetAccessRules
