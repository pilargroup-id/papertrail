import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditRpPaymentCategories from '../../../button/button-rp-payment-categories/ButtonEditRpPaymentCategories.jsx'

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

function getFrpDocumentTypeStatusLabel(RpPaymentCategories) {
  return Number(RpPaymentCategories?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(RpPaymentCategories) {
  return Number(RpPaymentCategories?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(RpPaymentCategories) {
  return Number(RpPaymentCategories?.is_active) === 1
}

function renderFrpDocumentTypeStatus(RpPaymentCategories, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(RpPaymentCategories)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(RpPaymentCategories, index))
      : false
  const isDisabled = RpPaymentCategories?.id === undefined || RpPaymentCategories?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(RpPaymentCategories)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(RpPaymentCategories)}
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
          aria-label={`Ubah status RP payment category ${RpPaymentCategories?.code ?? RpPaymentCategories?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(RpPaymentCategories, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsRpPaymentCategories = [
  {
    key: 'name',
    header: 'Name Payment Categories',
    accessor: 'name',
    type: 'identity',
    subtitleAccessor: (rpPaymentCategory) => `Code: ${rpPaymentCategory?.code ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'sort_order',
    header: 'Sort Order',
    accessor: 'sort_order',
    type: 'status',
    minWidth: 260,
  },
    {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    minWidth: 260,
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

function DataTableRpPaymentCategories({
  rows = [],
  columns = columnsRpPaymentCategories,
  actions,
  getRowId = (RpPaymentCategories, index) => RpPaymentCategories?.id ?? index,
  tableLabel = 'RP Payment Categories Table',
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
              render: (RpPaymentCategories, index) =>
                renderFrpDocumentTypeStatus(RpPaymentCategories, index, {
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
              label: (RpPaymentCategories) => getFrpDocumentTypeStatusLabel(RpPaymentCategories),
              variant: (RpPaymentCategories) => getFrpDocumentTypeStatusVariant(RpPaymentCategories),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit RP Payment Category',
          buttonComponent: ButtonEditRpPaymentCategories,
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

export default DataTableRpPaymentCategories
