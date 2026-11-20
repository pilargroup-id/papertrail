import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditCurrencies from '../../../button/button-currencies/ButtonEditCurrencies.jsx'

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

function getCurrencyStatusLabel(currencies) {
  return Number(currencies?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getCurrencyStatusVariant(currencies) {
  return Number(currencies?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsCurrencyActive(currencies) {
  return Number(currencies?.is_active) === 1
}

function getBaseCurrencyLabel(currencies) {
  return Number(currencies?.is_base_currency) === 1 ? 'Base' : 'Foreign'
}

function renderCurrencyStatus(currencies, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsCurrencyActive(currencies)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(currencies, index))
      : false
  const isDisabled = currencies?.id === undefined || currencies?.id === null || isUpdating
  const statusLabel = getCurrencyStatusLabel(currencies)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getCurrencyStatusVariant(currencies)}
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
          aria-label={`Ubah status currency ${currencies?.name ?? currencies?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(currencies, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableCurrencies = [{
    key: 'code',
    header: 'Code',
    accessor: 'code',
    type: 'identity',
    subtitleAccessor: (currencies) => currencies?.symbol ? `Symbol: ${currencies.symbol}` : '',
    minWidth: 260,
  },
  {
    key: 'name',
    header: 'Currency Name',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: (currencies) => `Code: ${currencies?.code ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'symbol',
    header: 'Symbol',
    accessor: 'symbol',
    nowrap: true,
    minWidth: 120,
  },
  {
    key: 'base_currency',
    header: 'Type',
    accessor: getBaseCurrencyLabel,
    nowrap: true,
    minWidth: 130,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getCurrencyStatusLabel,
    type: 'status',
    variantAccessor: getCurrencyStatusVariant,
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

function DataTableCurrencies({
  rows = [],
  columns = columnsDataTableCurrencies,
  actions,
  getRowId = (currencies, index) => currencies?.id ?? index,
  tableLabel = 'Currencies table',
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
              render: (currencies, index) =>
                renderCurrencyStatus(currencies, index, {
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
              label: (currencies) => getCurrencyStatusLabel(currencies),
              variant: (currencies) => getCurrencyStatusVariant(currencies),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit Currencies',
          buttonComponent: ButtonEditCurrencies,
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

export default DataTableCurrencies
