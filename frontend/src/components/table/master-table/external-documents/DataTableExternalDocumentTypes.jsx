import DataTableAction, { DataTableStatus } from '../../DataTableAction.jsx'
import ButtonEditExternalDocumentTypes from '../../../button/button-external-document-types/ButtonEditExternalDocumentTypes.jsx'

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

function getFrpDocumentTypeStatusLabel(externalDocumentTypes) {
  return Number(externalDocumentTypes?.is_active) === 1 ? 'Aktif' : 'Nonaktif'
}

function getFrpDocumentTypeStatusVariant(externalDocumentTypes) {
  return Number(externalDocumentTypes?.is_active) === 1 ? 'active' : 'inactive'
}

function getIsFrpDocumentTypeActive(externalDocumentTypes) {
  return Number(externalDocumentTypes?.is_active) === 1
}

function renderFrpDocumentTypeStatus(externalDocumentTypes, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getIsFrpDocumentTypeActive(externalDocumentTypes)
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(externalDocumentTypes, index))
      : false
  const isDisabled = externalDocumentTypes?.id === undefined || externalDocumentTypes?.id === null || isUpdating
  const statusLabel = getFrpDocumentTypeStatusLabel(externalDocumentTypes)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpDocumentTypeStatusVariant(externalDocumentTypes)}
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
          aria-label={`Ubah status FRP document type ${externalDocumentTypes?.code ?? externalDocumentTypes?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(externalDocumentTypes, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

const columnsExternalDocumentTypes = [
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

function DataTableExternalDocumentTypes({
  rows = [],
  columns = columnsExternalDocumentTypes,
  actions,
  getRowId = (externalDocumentTypes, index) => externalDocumentTypes?.id ?? index,
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
              render: (externalDocumentTypes, index) =>
                renderFrpDocumentTypeStatus(externalDocumentTypes, index, {
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
              label: (externalDocumentTypes) => getFrpDocumentTypeStatusLabel(externalDocumentTypes),
              variant: (externalDocumentTypes) => getFrpDocumentTypeStatusVariant(externalDocumentTypes),
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
          buttonComponent: ButtonEditExternalDocumentTypes,
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

export default DataTableExternalDocumentTypes
