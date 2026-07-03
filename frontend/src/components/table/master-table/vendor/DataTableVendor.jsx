import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditVendor from '../../../button/button-vendor/ButtonEditVendor.jsx'

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

function getVendorStatusLabel(vendor) {
  return Number(vendor?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getVendorStatusVariant(vendor) {
  return Number(vendor?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsVendorActive(vendor) {
  return Number(vendor?.is_active) === 1
}

function renderVendorStatus(vendor, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsVendorActive(vendor)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(vendor, index))
      : false
  const isDisabled = vendor?.id === undefined || vendor?.id === null || isUpdating
  const statusLabel = getVendorStatusLabel(vendor)
  const statusPill = (
    <DataTableStatus
      className="vendor-status-toggle__pill"
      variant={getVendorStatusVariant(vendor)}
    >
      {statusLabel}
    </DataTableStatus>
  )

  return (
    <>
      {SwitchComponent ? (
        <SwitchComponent
          className="vendor-status-toggle__switch"
          label={statusPill}
          checked={isActive}
          disabled={isDisabled}
          aria-label={`Ubah status vendor ${vendor?.name ?? vendor?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(vendor, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableVendor = [
  {
    key: 'name',
    header: 'Vendor',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: (vendor) => `ID: ${vendor?.id ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getVendorStatusLabel,
    type: 'status',
    variantAccessor: getVendorStatusVariant,
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

function DataTableVendor({
  rows = [],
  columns = columnsDataTableVendor,
  actions,
  getRowId = (vendor, index) => vendor?.id ?? index,
  tableLabel = 'Vendor table',
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
              render: (vendor, index) =>
                renderVendorStatus(vendor, index, {
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
              label: (vendor) => getVendorStatusLabel(vendor),
              variant: (vendor) => getVendorStatusVariant(vendor),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit vendor',
          buttonComponent: ButtonEditVendor,
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
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      mobileCard={resolvedMobileCard}
      {...props}
    />
  )
}

export default DataTableVendor
