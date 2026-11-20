import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditPaymentMethods from '../../../button/button-payment-methods/ButtonEditPaymentMethods.jsx'

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

function getFrpDocumentTypeStatusLabel(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(paymentMethods) {
  return Number(paymentMethods?.is_active) === 1
}

function renderFrpDocumentTypeStatus(paymentMethods, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(paymentMethods)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(paymentMethods, index))
      : false
  const isDisabled = paymentMethods?.id === undefined || paymentMethods?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(paymentMethods)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(paymentMethods)}
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
          aria-label={`Ubah status FRP document type ${paymentMethods?.code ?? paymentMethods?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(paymentMethods, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsPaymentMethods = [
  {
    key: 'code',
    header: 'Code',
    accessor: 'code',
    type: 'identity',
    minWidth: 260,
  },
  {
    key: 'name',
    header: 'Name',
    accessor: 'name',
    type: 'identity',
    minWidth: 260,
  },
  {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    minWidth: 260,
  },
  {
    key: 'sort_order',
    header: 'Sort Order',
    accessor: 'sort_order',
    nowrap: true,
    minWidth: 110,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getFrpDocumentTypeStatusLabel,
    type: 'status',
    variantAccessor: getFrpDocumentTypeStatusVariant,
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

function DataTablePaymentMethod({
  rows = [],
  columns = columnsPaymentMethods,
  actions,
  getRowId = (paymentMethods, index) => paymentMethods?.id ?? index,
  tableLabel = 'Payment Methods Table',
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
              render: (paymentMethods, index) =>
                renderFrpDocumentTypeStatus(paymentMethods, index, {
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
              label: (paymentMethods) => getFrpDocumentTypeStatusLabel(paymentMethods),
              variant: (paymentMethods) => getFrpDocumentTypeStatusVariant(paymentMethods),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit Edit Payment Methods',
          buttonComponent: ButtonEditPaymentMethods,
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

export default DataTablePaymentMethod
