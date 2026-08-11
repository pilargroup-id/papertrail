import DataTableAction from '../DataTableAction.jsx'

const DEFAULT_PAGINATION_PAGE_SIZE = 25
const TRANSACTION_TYPE_VARIANTS = {
  RESERVE: 'pending',
  RELEASE: 'inactive',
  FINALIZE: 'active',
  REVERT_FINALIZE: 'pending',
  ADJUST: 'default',
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

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)}`
}

function getTransactionTypeLabel(log) {
  const type = String(log?.transaction_type ?? '').trim()

  if (!type) {
    return '-'
  }

  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getTransactionTypeVariant(log) {
  return TRANSACTION_TYPE_VARIANTS[String(log?.transaction_type ?? '').toUpperCase()] ?? 'default'
}

const columnsDataTableLogBudget = [
  {
    key: 'budget',
    header: 'Budget',
    accessor: 'budget_code',
    type: 'identity',
    subtitleAccessor: 'budget_project_name',
    minWidth: 200,
  },
  {
    key: 'sourceModule',
    header: 'Source',
    accessor: 'source_module',
    nowrap: true,
    minWidth: 100,
  },
  {
    key: 'transactionType',
    header: 'Transaction',
    accessor: getTransactionTypeLabel,
    type: 'status',
    variantAccessor: getTransactionTypeVariant,
    nowrap: true,
    align: 'center',
    minWidth: 140,
  },
  {
    key: 'amount',
    header: 'Amount',
    accessor: 'amount',
    format: formatRupiah,
    align: 'right',
    minWidth: 150,
  },
  {
    key: 'balanceMovement',
    header: 'Balance (Before -> After)',
    render: (log) => `${formatRupiah(log?.balance_before)} -> ${formatRupiah(log?.balance_after)}`,
    align: 'right',
    minWidth: 260,
  },
  {
    key: 'createdBy',
    header: 'Created By',
    accessor: 'created_by_user_name',
    minWidth: 160,
  },
  {
    key: 'createdAt',
    header: 'Waktu',
    accessor: 'created_at',
    format: formatDateTime,
    nowrap: true,
    align: 'right',
    minWidth: 170,
  },
]

function DataTableLogBudget({
  rows = [],
  columns = columnsDataTableLogBudget,
  getRowId = (log, index) => log?.id ?? index,
  tableLabel = 'Budget usage logs table',
  emptyMessage = 'Belum ada data.',
  pagination,
  className,
  tableWrapperStyle,
  ...props
}) {
  const paginationConfig =
    pagination === undefined
      ? {
          summary: `${rows.length} budget usage log`,
          pageSize: DEFAULT_PAGINATION_PAGE_SIZE,
          pageSizeOptions: [10, 25, 50, 100],
        }
      : pagination

  return (
    <DataTableAction
      rows={rows}
      columns={columns}
      useDefaultActions={false}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      pagination={paginationConfig}
      className={className}
      tableWrapperStyle={{
        flex: '0 0 auto',
        minHeight: rows.length === 0 ? '180px' : 'auto',
        ...tableWrapperStyle,
      }}
      {...props}
    />
  )
}

export default DataTableLogBudget
