import DataTableAction from '../DataTableAction.jsx'

const DEFAULT_PAGINATION_PAGE_SIZE = 25

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

const columnsDataTableActivityLogs = [
  {
    key: 'actor',
    header: 'Actor',
    accessor: 'actor_name',
    type: 'identity',
    subtitleAccessor: (log) => (log?.actor_username ? `@${log.actor_username}` : '-'),
    minWidth: 200,
  },
  {
    key: 'module',
    header: 'Module',
    accessor: 'module',
    nowrap: true,
    minWidth: 110,
  },
  {
    key: 'action',
    header: 'Action',
    accessor: 'action',
    nowrap: true,
    minWidth: 120,
  },
  {
    key: 'entityType',
    header: 'Entity',
    accessor: 'entity_type',
    minWidth: 150,
  },
  {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    cellClassName: 'frp-table__description-cell',
    minWidth: 260,
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

function DataTableActivityLogs({
  rows = [],
  columns = columnsDataTableActivityLogs,
  getRowId = (log, index) => log?.id ?? index,
  tableLabel = 'Activity logs table',
  emptyMessage = 'Belum ada data.',
  pagination,
  className,
  tableWrapperStyle,
  ...props
}) {
  const paginationConfig =
    pagination === undefined
      ? {
          summary: `${rows.length} activity log`,
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

export default DataTableActivityLogs
