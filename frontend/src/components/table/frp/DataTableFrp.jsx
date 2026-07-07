import DataTableAction, { DataTableStatus } from '../DataTableAction.jsx'
import ButtonEditFrp from '../../button/button-frp/ButtonEditFrp.jsx'

const AUTO_FIT_BASE_COLUMN_COUNT = 5
const AUTO_FIT_MIN_SCALE = 0.58

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

function getBanksStatusLabel(frp) {
  return Number(frp?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBanksStatusVariant(frp) {
  return Number(frp?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBanksActive(frp) {
  return Number(frp?.is_active) === 1
}

function getVendorBankPrimaryLabel(frp) {
  return Number(frp?.is_primary) === 1 ? 'Primary' : 'Secondary'
}

function getVendorBankPrimaryVariant(frp) {
  return Number(frp?.is_primary) === 1 ? 'active' : 'inactive'
}

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function getAutoFitScale(columnCount) {
  const extraColumnCount = Math.max(0, columnCount - AUTO_FIT_BASE_COLUMN_COUNT)
  const scale = 1 - extraColumnCount * 0.08

  return Math.max(AUTO_FIT_MIN_SCALE, Number(scale.toFixed(2)))
}

function getScaledRem(value, scale, minValue = value * AUTO_FIT_MIN_SCALE) {
  return `${Math.max(value * scale, minValue).toFixed(2)}rem`
}

function getScaledPx(value, scale, minValue) {
  return `${Math.max(value * scale, minValue).toFixed(0)}px`
}

function getScaledWidth(value, scale) {
  if (typeof value === 'number') {
    return Math.max(1, Math.round(value * scale))
  }

  if (typeof value === 'string') {
    const pixelValue = Number.parseFloat(value)

    if (value.trim().endsWith('px') && Number.isFinite(pixelValue)) {
      return `${Math.max(1, Math.round(pixelValue * scale))}px`
    }
  }

  return value
}

function scaleTableColumn(column, scale) {
  return {
    ...column,
    width: getScaledWidth(column.width, scale),
    minWidth: getScaledWidth(column.minWidth, scale),
    maxWidth: getScaledWidth(column.maxWidth, scale),
  }
}

function getAutoFitWrapperStyle(scale, tableWrapperStyle) {
  return {
    '--vendor-banks-table-cell-padding-block': getScaledRem(1, scale),
    '--vendor-banks-table-cell-padding-inline': getScaledRem(1, scale),
    '--vendor-banks-table-header-font-size': getScaledRem(0.76, scale, 0.62),
    '--vendor-banks-table-body-font-size': getScaledRem(0.92, scale, 0.72),
    '--vendor-banks-table-name-font-size': getScaledRem(0.98, scale, 0.74),
    '--vendor-banks-table-meta-font-size': getScaledRem(0.74, scale, 0.58),
    '--vendor-banks-table-avatar-size': getScaledPx(40, scale, 28),
    '--vendor-banks-table-identity-min-width': getScaledPx(220, scale, 128),
    '--vendor-banks-table-status-min-width': getScaledPx(86, scale, 56),
    '--vendor-banks-table-icon-size': getScaledPx(36, scale, 28),
    '--vendor-banks-table-switch-width': getScaledPx(42, scale, 32),
    '--vendor-banks-table-switch-height': getScaledPx(24, scale, 18),
    '--vendor-banks-table-switch-thumb': getScaledPx(18, scale, 14),
    '--vendor-banks-table-switch-thumb-translate': getScaledPx(18, scale, 14),
    ...tableWrapperStyle,
  }
}

function renderBanksStatus(frp, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBanksActive(frp)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(frp, index))
      : false
  const isDisabled = frp?.id === undefined || frp?.id === null || isUpdating
  const statusLabel = getBanksStatusLabel(frp)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBanksStatusVariant(frp)}
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
          aria-label={`Ubah status banks ${frp?.name ?? frp?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(frp, event.target.checked ? 1 : 0, index)
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
    subtitleAccessor: (frp) => `Vendor ID: ${frp?.vendor_id ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'bank_name',
    header: 'Bank',
    accessor: 'bank_name',
    type: 'identity',
    subtitleAccessor: (frp) => `Code: ${frp?.bank_code ?? '-'}`,
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
  getRowId = (frp, index) => frp?.id ?? index,
  tableLabel = 'Vendor bank accounts table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onStatusChange,
  SwitchComponent,
  mobileCard,
  className,
  tableWrapperStyle,
  ...props
}) {
  const shouldRenderStatusSwitch =
    typeof onStatusChange === 'function' && typeof SwitchComponent === 'function'
  const resolvedColumns = shouldRenderStatusSwitch
    ? columns.map((column) =>
        column.key === 'status'
          ? {
              ...column,
              render: (frp, index) =>
                renderBanksStatus(frp, index, {
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
              label: (frp) => getBanksStatusLabel(frp),
              variant: (frp) => getBanksStatusVariant(frp),
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
          buttonComponent: ButtonEditFrp,
          onClick: onEdit,
        }
      : null,
  ].filter(Boolean)
  const resolvedActions = Array.isArray(actions) ? actions : defaultActions
  const autoFitColumnCount = resolvedColumns.length + (resolvedActions.length > 0 ? 1 : 0)
  const autoFitScale = getAutoFitScale(autoFitColumnCount)
  const autoFitColumns = resolvedColumns.map((column) => scaleTableColumn(column, autoFitScale))

  return (
    <DataTableAction
      rows={rows}
      columns={autoFitColumns}
      actions={resolvedActions}
      useDefaultActions={false}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      mobileCard={resolvedMobileCard}
      actionCellStyle={{
        width: '1%',
        minWidth: Math.max(32, Math.round(48 * autoFitScale)),
        whiteSpace: 'nowrap',
      }}
      className={joinClassNames('vendor-banks-table--auto-fit', className)}
      tableWrapperStyle={getAutoFitWrapperStyle(autoFitScale, tableWrapperStyle)}
      {...props}
    />
  )
}

export default DataTableVendorBanks
