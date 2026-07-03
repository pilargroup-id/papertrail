import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditVendorBanks from '../../../button/button-vendor-banks/ButtonEditVendorBanks.jsx'

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

function getBanksStatusLabel(vendorBanks) {
  return Number(vendorBanks?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBanksStatusVariant(vendorBanks) {
  return Number(vendorBanks?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBanksActive(vendorBanks) {
  return Number(vendorBanks?.is_active) === 1
}

function getVendorBankPrimaryLabel(vendorBanks) {
  return Number(vendorBanks?.is_primary) === 1 ? 'Primary' : 'Secondary'
}

function getVendorBankPrimaryVariant(vendorBanks) {
  return Number(vendorBanks?.is_primary) === 1 ? 'active' : 'inactive'
}

function renderBanksStatus(vendorBanks, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBanksActive(vendorBanks)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(vendorBanks, index))
      : false
  const isDisabled = vendorBanks?.id === undefined || vendorBanks?.id === null || isUpdating
  const statusLabel = getBanksStatusLabel(vendorBanks)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBanksStatusVariant(vendorBanks)}
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
          aria-label={`Ubah status banks ${vendorBanks?.name ?? vendorBanks?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(vendorBanks, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableBanks = [{
    key: 'vendor_name',
    header: 'Vendor',
    accessor: 'vendor_name',
    type: 'identity',
    subtitleAccessor: (vendorBanks) => `Vendor ID: ${vendorBanks?.vendor_id ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'bank_name',
    header: 'Bank',
    accessor: 'bank_name',
    type: 'identity',
    subtitleAccessor: (vendorBanks) => `Code: ${vendorBanks?.bank_code ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'account_number',
    header: 'Account Number',
    accessor: 'account_number',
    nowrap: true,
    minWidth: 180,
  },
  {
    key: 'account_name',
    header: 'Account Name',
    accessor: 'account_name',
    minWidth: 220,
  },
  {
    key: 'is_primary',
    header: 'Primary',
    accessor: getVendorBankPrimaryLabel,
    type: 'status',
    variantAccessor: getVendorBankPrimaryVariant,
    nowrap: true,
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

function DataTableVendorBanks({
  rows = [],
  columns = columnsDataTableBanks,
  actions,
  getRowId = (vendorBanks, index) => vendorBanks?.id ?? index,
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
              render: (vendorBanks, index) =>
                renderBanksStatus(vendorBanks, index, {
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
              label: (vendorBanks) => getBanksStatusLabel(vendorBanks),
              variant: (vendorBanks) => getBanksStatusVariant(vendorBanks),
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
          buttonComponent: ButtonEditVendorBanks,
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

export default DataTableVendorBanks
