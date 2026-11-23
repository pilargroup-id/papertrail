import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBudgets from '../../../button/button-budgets/ButtonEditBudgets.jsx'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { SwitchHorizontal01 } from '../../../layoute/TemplateIcons.jsx'

function EditActionButton(props) {
  return <ButtonEditBudgets {...props} showLabel />
}

function AdjustIcon({ size = 16 }) {
  return <TuneRoundedIcon aria-hidden="true" sx={{ fontSize: size }} />
}

function HistoryIcon({ size = 16 }) {
  return <HistoryRoundedIcon aria-hidden="true" sx={{ fontSize: size }} />
}

function LabeledActionButton({ label, icon: Icon, disabled, onClick }) {
  return (
    <button
      type="button"
      className="users-table__icon-button frp-icon-button frp-icon-button--with-label"
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

function MobileLabeledActionButton({ label, disabled, onClick }) {
  return (
    <button type="button" className="detail-card-mobile__action" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
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

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatRupiah(value) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  const number = Number(value)

  return Number.isFinite(number) ? rupiahFormatter.format(number) : String(value)
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
    subtitleAccessor: (budget) => `Budget Code: ${budget?.budget_code ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'budget_amount',
    header: 'Budget Amount',
    accessor: (budget) => Number(budget?.budget_amount) || 0,
    type: 'identity',
    showAvatar: false,
    titleAccessor: (budget) => formatRupiah(budget?.budget_amount),
    subtitleAccessor: (budget) => `Remaining: ${formatRupiah(budget?.budget_remaining)}`,
    minWidth: 220,
  },
  {
    key: 'budget_type_name',
    header: 'Budget Type',
    accessor: 'budget_type_name',
    type: 'identity',
    subtitleAccessor: (budget) => `Code: ${budget?.budget_type_code ?? '-'}`,
    minWidth: 220,
  },
  {
    key: 'company_name_snapshot',
    header: 'Company',
    accessor: 'company_name_snapshot',
    minWidth: 220,
  },
  {
    key: 'department_name_snapshot',
    header: 'Departments',
    accessor: 'department_name_snapshot',
    type: 'identity',
    subtitleAccessor: (budget) => `Class: ${budget?.department_class_snapshot ?? '-'}`,
    minWidth: 220,
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
]

const defaultMobileCard = {
  subtitle: (budget) => `Budget Code: ${budget?.budget_code ?? '-'}`,
  rows: [
    { key: 'budget_amount', label: 'Budget Amount', value: (budget) => formatRupiah(budget?.budget_amount) },
    { key: 'budget_remaining', label: 'Remaining', value: (budget) => formatRupiah(budget?.budget_remaining) },
    { key: 'budget_reserved', label: 'Reserved', value: (budget) => formatRupiah(budget?.budget_reserved) },
    { key: 'budget_used', label: 'Used', value: (budget) => formatRupiah(budget?.budget_used) },
    { key: 'budget_type_name', label: 'Budget Type', value: (budget) => budget?.budget_type_name ?? '-' },
    { key: 'company_name_snapshot', label: 'Company', value: (budget) => budget?.company_name_snapshot ?? '-' },
    {
      key: 'department_name_snapshot',
      label: 'Department',
      value: (budget) => [budget?.department_name_snapshot, budget?.department_class_snapshot]
        .filter(Boolean)
        .join(' · ') || '-',
    },
    { key: 'created_at', label: 'Created At', value: (budget) => formatDateTime(budget?.created_at) },
  ],
}

function DataTableBudgetType({
  rows = [],
  columns = columnsDataTableBudgetType,
  actions,
  getRowId = (budgets, index) => budgets?.id ?? index,
  tableLabel = 'Budget table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onTransfer,
  onAdjust,
  onHistory,
  onStatusChange,
  SwitchComponent,
  mobileCard = defaultMobileCard,
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
    typeof onTransfer === 'function'
      ? {
          key: 'transfer',
          label: 'Transfer',
          icon: SwitchHorizontal01,
          buttonComponent: LabeledActionButton,
          mobileButtonComponent: MobileLabeledActionButton,
          hidden: (budget) => !getIsBanksActive(budget),
          disabled: (budget) => !budget?.id || !(Number(budget.budget_remaining) > 0),
          onClick: onTransfer,
        }
      : null,
    typeof onAdjust === 'function'
      ? {
          key: 'adjust',
          label: 'Adjust',
          icon: AdjustIcon,
          buttonComponent: LabeledActionButton,
          mobileButtonComponent: MobileLabeledActionButton,
          hidden: (budget) => !getIsBanksActive(budget),
          disabled: (budget) => !budget?.id,
          onClick: onAdjust,
        }
      : null,
    typeof onHistory === 'function'
      ? {
          key: 'history',
          label: 'History',
          icon: HistoryIcon,
          buttonComponent: LabeledActionButton,
          mobileButtonComponent: MobileLabeledActionButton,
          disabled: (budget) => !budget?.id,
          onClick: onHistory,
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
