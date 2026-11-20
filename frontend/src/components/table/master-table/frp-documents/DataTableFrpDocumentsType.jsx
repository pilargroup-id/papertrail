import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditBudgetAccess from '../../../button/button-budget-access/ButtonEditBudgetAccess.jsx'

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

function getFrpDocumentTypeStatusLabel(frpDocumentType) {
  return Number(frpDocumentType?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(frpDocumentType) {
  return Number(frpDocumentType?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(frpDocumentType) {
  return Number(frpDocumentType?.is_active) === 1
}

function renderFrpDocumentTypeStatus(frpDocumentType, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(frpDocumentType)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(frpDocumentType, index))
      : false
  const isDisabled = frpDocumentType?.id === undefined || frpDocumentType?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(frpDocumentType)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(frpDocumentType)}
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
          aria-label={`Ubah status FRP document type ${frpDocumentType?.code ?? frpDocumentType?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(frpDocumentType, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsFrpDocumentsType = [
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

function DataTableFrpDocumentsType({
  rows = [],
  columns = columnsFrpDocumentsType,
  actions,
  getRowId = (frpDocumentType, index) => frpDocumentType?.id ?? index,
  tableLabel = 'FRP document types table',
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
              render: (frpDocumentType, index) =>
                renderFrpDocumentTypeStatus(frpDocumentType, index, {
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
              label: (frpDocumentType) => getFrpDocumentTypeStatusLabel(frpDocumentType),
              variant: (frpDocumentType) => getFrpDocumentTypeStatusVariant(frpDocumentType),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
        }
      : mobileCard
  const defaultActions = [
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit FRP Document Type',
          buttonComponent: ButtonEditBudgetAccess,
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

export default DataTableFrpDocumentsType
