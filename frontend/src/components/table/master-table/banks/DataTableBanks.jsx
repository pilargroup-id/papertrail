import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBanks from '../../../button/button-banks/ButtonEditBanks.jsx'

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

function getBanksStatusLabel(banks) {
  return Number(banks?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getBanksStatusVariant(banks) {
  return Number(banks?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsBanksActive(banks) {
  return Number(banks?.is_active) === 1
}

function renderBanksStatus(banks, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsBanksActive(banks)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(banks, index))
      : false
  const isDisabled = banks?.id === undefined || banks?.id === null || isUpdating
  const statusLabel = getBanksStatusLabel(banks)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getBanksStatusVariant(banks)}
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
          aria-label={`Ubah status banks ${banks?.name ?? banks?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(banks, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsDataTableBanks = [{
    key: 'code',
    header: 'Banks Code',
    accessor: 'code',
    type: 'identity',
    subtitleAccessor: (banks) => `ID: ${banks?.id ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'name',
    header: 'Banks',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: (banks) => `ID: ${banks?.id ?? '-'}`,
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

function DataTableBanks({
  rows = [],
  columns = columnsDataTableBanks,
  actions,
  getRowId = (banks, index) => banks?.id ?? index,
  tableLabel = 'Banks table',
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
              render: (banks, index) =>
                renderBanksStatus(banks, index, {
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
              label: (banks) => getBanksStatusLabel(banks),
              variant: (banks) => getBanksStatusVariant(banks),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit banks',
          buttonComponent: ButtonEditBanks,
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

export default DataTableBanks
