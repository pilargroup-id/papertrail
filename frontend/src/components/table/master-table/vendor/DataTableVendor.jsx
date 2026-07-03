import DataTable from '../../DataTable.jsx'

const columnsDataTableVendor = [
  {
    key: 'user',
    header: 'User',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: 'email',
    minWidth: 260,
  },
  {
    key: 'department',
    header: 'Department',
    accessor: 'department',
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    type: 'status',
    variantAccessor: 'statusKey',
    nowrap: true,
  },
  {
    key: 'apps',
    header: 'Apps',
    accessor: 'apps',
    type: 'chips',
    minWidth: 220,
  },
]

function columnsDataTableVendor({
  rows = [],
  columns = columnsDataTableVendor,
  getRowId = (row, index) => row?.id ?? row?.userId ?? index,
  tableLabel = 'Vendor',
  emptyMessage = 'Belum ada data.',
  ...props
}) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      {...props}
    />
  )
}

export default columnsDataTableVendor
