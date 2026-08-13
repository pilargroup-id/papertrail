import DataTableAction from '../DataTableAction.jsx'
import ButtonCreateFrpRp from '../../button/button-rp/ButtonCreateFrpRp.jsx'
import ButtonPrintRp from '../../button/button-rp/ButtonPrintRp.jsx'
import ButtonVoidedRp from '../../button/button-rp/ButtonVoidedRp.jsx'

// MOBILE
import createMobileCardRp from '../../../mobile/card/MobileCardRp.jsx'
import {
  canCurrentUserCreateFrpFromRp,
  canCurrentUserVoidRpFromRp,
  getRpFrpConversionStatus,
  isGeneralProcurementUser,
} from '../rp/rp-button-access.js'

const AUTO_FIT_BASE_COLUMN_COUNT = 5
const AUTO_FIT_MIN_SCALE = 0.58
const DEFAULT_PAGINATION_PAGE_SIZE = 25

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

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)}`
}

function getFrpStatusValue(rp) {
  return String(rp?.status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase()
}

function getFrpStatusLabel(rp) {
  const status = getFrpStatusValue(rp)

  if (!status) {
    return '-'
  }

  if (status === 'APPROVED') {
    return getRpFrpConversionStatus(rp) === 'CREATED' ? 'Create FRP' : 'Approved'
  }

  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getFrpStatusVariant(rp) {
  const status = getFrpStatusValue(rp)

  switch (status) {
    case 'APPROVED':
      return getRpFrpConversionStatus(rp) === 'CREATED' ? 'active' : 'default'
    case 'REJECTED':
      return 'inactive'
    case 'VOIDED':
      return 'default'
    default:
      return status.startsWith('PENDING') ? 'pending' : 'default'
  }
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
    '--data-table-action-min-height': 'min(52dvh, 520px)',
    '--users-table-wrapper-max-height': 'min(64dvh, 640px)',
    '--vendor-banks-table-cell-padding-block': getScaledRem(0.86, scale),
    '--vendor-banks-table-cell-padding-inline': getScaledRem(0.92, scale),
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
    marginTop: '0.75rem',
    ...tableWrapperStyle,
  }
}

function isCreateFrpActionHidden(rp, index, currentUser, canCreateFrpAction) {
  return !(
    canCurrentUserCreateFrpFromRp(rp, currentUser) &&
    (typeof canCreateFrpAction !== 'function' || canCreateFrpAction(rp, index))
  )
}

function isPrintActionHidden(rp, currentUser) {
  return getFrpStatusValue(rp) !== 'APPROVED' || !isGeneralProcurementUser(currentUser)
}

function isVoidActionHidden(rp, index, currentUser, canVoidAction) {
  return !(
    canCurrentUserVoidRpFromRp(rp, currentUser) &&
    (typeof canVoidAction !== 'function' || canVoidAction(rp, index))
  )
}

const columnsDataTableConvertFrpFromRp = [{
    key: 'rpNumber',
    header: 'RP Number',
    accessor: 'rp_number',
    type: 'identity',
    subtitleAccessor: (rp) => `Date: ${formatDateTime(rp?.created_at)}`,
    sortAccessor: 'rp_number',
    minWidth: 220,
  },
  {
    key: 'requestor',
    header: 'Request by',
    accessor: 'requested_by_name',
    type: 'identity',
    subtitleAccessor: (rp) => `Division  : ${rp?.department_name_snapshot ?? '-'}`,
    sortAccessor: 'requested_by_name',
    minWidth: 220,
  },
  {
    key: 'destination',
    header: 'Destination',
    accessor: 'destination_department_name_snapshot',
    type: 'identity',
    sortAccessor: 'destination_department_name_snapshot',
    minWidth: 180,
  },
  {
    key: 'vendor',
    header: 'Vendor',
    accessor: 'vendor_name_snapshot',
    nowrap: true,
    type: 'identity',
    sortAccessor: 'vendor_name_snapshot',
    minWidth: 180,
  },
  {
    key: 'totalAmount',
    header: 'Total Amount',
    accessor: 'total_amount',
    format: formatRupiah,
    sortAccessor: 'total_amount',
    sortType: 'number',
    align: 'right',
    cellClassName: 'frp-table__amount-cell',
    minWidth: 160,
  },
  {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    sortAccessor: 'description',
    cellClassName: 'frp-table__description-cell',
    minWidth: 200,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getFrpStatusLabel,
    type: 'status',
    variantAccessor: getFrpStatusVariant,
    nowrap: true,
    sortAccessor: getFrpStatusLabel,
    align: 'center',
    minWidth: 120,
  },
  {
    key: 'updatedAt',
    header: 'Updated At',
    accessor: 'updated_at',
    format: formatDateTime,
    nowrap: true,
    sortAccessor: 'updated_at',
    sortType: 'date',
    align: 'right',
    minWidth: 160,
  },
]

function DataTableConvertFrpFromRp({
  rows = [],
  columns = columnsDataTableConvertFrpFromRp,
  actions,
  getRowId = (rp, index) => rp?.id ?? index,
  tableLabel = 'Convert FRP from RP table',
  emptyMessage = 'Belum ada RP yang siap dibuatkan FRP.',
  onCreateFrp,
  canCreateFrp,
  onPrint,
  onVoid,
  canVoid,
  currentUser,
  mobileCard,
  pagination,
  className,
  tableWrapperStyle,
  ...props
}) {
  const defaultMobileCard = createMobileCardRp({
    formatDateTime,
    formatRupiah,
    getFrpStatusLabel,
    getFrpStatusVariant,
    onMoreInfo: mobileCard?.onMoreInfo,
  })
  const resolvedMobileCard =
    mobileCard === false
      ? false
      : {
          ...defaultMobileCard,
          ...(mobileCard ?? {}),
          header: {
            ...(defaultMobileCard.header ?? {}),
            ...(mobileCard?.header ?? {}),
            status: {
              ...(defaultMobileCard.header?.status ?? {}),
              ...(mobileCard?.header?.status ?? {}),
            },
          },
          rows: mobileCard?.rows ?? defaultMobileCard.rows,
          sections: mobileCard?.sections ?? defaultMobileCard.sections,
          metadata: mobileCard?.metadata ?? defaultMobileCard.metadata,
        }

  const defaultActions = [
    typeof onCreateFrp === 'function'
      ? {
          key: 'createFrp',
          label: 'Create FRP',
          buttonComponent: ButtonCreateFrpRp,
          mobileHidden: true,
          hidden: (rp, index) => isCreateFrpActionHidden(rp, index, currentUser, canCreateFrp),
          onClick: onCreateFrp,
        }
      : null,
    typeof onVoid === 'function'
      ? {
          key: 'voided',
          label: 'Voided',
          buttonComponent: ButtonVoidedRp,
          mobileHidden: true,
          hidden: (rp, index) => isVoidActionHidden(rp, index, currentUser, canVoid),
          onClick: onVoid,
        }
      : null,
    typeof onPrint === 'function'
      ? {
          key: 'print',
          label: 'Print',
          buttonComponent: ButtonPrintRp,
          mobileHidden: true,
          hidden: (rp) => isPrintActionHidden(rp, currentUser),
          onClick: onPrint,
        }
      : null,
  ].filter(Boolean)

  //For Action
  const resolvedActions = Array.isArray(actions) ? actions : defaultActions
  const autoFitColumnCount = columns.length + (resolvedActions.length > 0 ? 1 : 0)
  const autoFitScale = getAutoFitScale(autoFitColumnCount)
  const autoFitColumns = columns.map((column) => scaleTableColumn(column, autoFitScale))
  const paginationConfig =
    pagination === undefined
      ? {
          summary: `${rows.length} data RP`,
          pageSize: DEFAULT_PAGINATION_PAGE_SIZE,
          pageSizeOptions: [10, 25, 50, 100],
        }
      : pagination

  return (
    <DataTableAction
      rows={rows}
      columns={autoFitColumns}
      actions={resolvedActions}
      useDefaultActions={false}
      getRowId={getRowId}
      tableLabel={tableLabel}
      emptyMessage={emptyMessage}
      pagination={paginationConfig}
      enableSorting
      compactForSparseRows
      mobileCard={resolvedMobileCard}
      actionCellClassName="users-table__action-cell rp-table__action-cell"
      actionCellStyle={{
        width: '1%',
        minWidth: Math.max(118, Math.round(146 * autoFitScale)),
        whiteSpace: 'nowrap',
      }}
      className={joinClassNames('vendor-banks-table--auto-fit rp-table--actions', className)}
      tableWrapperStyle={getAutoFitWrapperStyle(autoFitScale, tableWrapperStyle)}
      {...props}
    />
  )
}

export default DataTableConvertFrpFromRp
