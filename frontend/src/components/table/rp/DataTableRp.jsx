import DataTableAction, { DataTableStatus } from '../DataTableAction.jsx'
import ButtonEditRp from '../../button/button-rp/ButtonEditRp.jsx'
import ButtonDetailsRp from '../../button/button-rp/ButtonDetailsRp.jsx'

// Button Action Dekstop
import ButtonApprovalRp from '../../button/button-rp/ButtonApprovalRp.jsx'
import ButtonRejectRp from '../../button/button-rp/ButtonRejectRp.jsx'
import ButtonRevertRp from '../../button/button-rp/ButtonRevertRp.jsx'
import ButtonCheckDataRp from '../../button/button-rp/ButtonCheckDataRp.jsx'

// MOBILE
import createMobileCardRp from '../../../mobile/card/MobileCardRp.jsx'
import MobileButtonApprovalRp from '../../../mobile/mobile-button/frp/MobileButtonApprovalFrp.jsx'
import MobileButtonEditRp from '../../../mobile/mobile-button/frp/MobileButtonEditFrp.jsx'
import MobileButtonRejectRp from '../../../mobile/mobile-button/frp/MobileButtonRejectFrp.jsx'
import MobileButtonRevert from '../../../mobile/mobile-button/frp/MobileButtonRevert.jsx'
import {
  canAccessFrpButton,
  canCurrentUserApproveRp,
  canCurrentUserEditFrp,
  canCurrentUserRejectFrp,
  canCurrentUserRevertFrp,
} from './rp-button-access.js'

const AUTO_FIT_BASE_COLUMN_COUNT = 5
const AUTO_FIT_MIN_SCALE = 0.58
const DEFAULT_PAGINATION_PAGE_SIZE = 10

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

  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isFrpPendingStatus(rp) {
  return getFrpStatusValue(rp).startsWith('PENDING')
}

function getFrpStatusVariant(rp) {
  const status = getFrpStatusValue(rp)

  if (status.startsWith('PENDING')) {
    return 'pending'
  }

  switch (status) {
    case 'APPROVED':
      return 'active'
    case 'REJECTED':
      return 'inactive'
    case 'VOIDED':
      return 'default'
    default:
      return 'default'
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

function renderBanksStatus(rp, index, {
  isStatusUpdating,
  onStatusChange,
  SwitchComponent,
}) {
  const isActive = getFrpStatusValue(rp) === 'APPROVED'
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(rp, index))
      : false
  const isDisabled = rp?.id === undefined || rp?.id === null || isUpdating
  const statusLabel = getFrpStatusLabel(rp)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpStatusVariant(rp)}
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
          aria-label={`Ubah status FRP ${rp?.rp_number ?? rp?.id ?? index}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation()
            onStatusChange?.(rp, event.target.checked ? 1 : 0, index)
          }}
        />
      ) : (
        statusPill
      )}
    </>
  )
}

function isApproveActionHidden(rp, index, currentUser, canApproveAction) {
  const isPending = isFrpPendingStatus(rp)

  return !(
    isPending &&
    canCurrentUserApproveRp(rp, currentUser) &&
    (typeof canApproveAction !== 'function' || canApproveAction(rp, index))
  )
}

function isRejectActionHidden(rp, index, currentUser, canRejectAction) {
  const isPending = isFrpPendingStatus(rp)

  return !(
    isPending &&
    canCurrentUserRejectFrp(rp, currentUser) &&
    (typeof canRejectAction !== 'function' || canRejectAction(rp, index))
  )
}

function isRevertActionHidden(rp, index, currentUser, canRevertAction) {
  return !(
    getFrpStatusValue(rp) === 'APPROVED' &&
    canCurrentUserRevertFrp(rp, currentUser) &&
    (typeof canRevertAction !== 'function' || canRevertAction(rp, index))
  )
}

const columnsDataTableRp = [{
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
    key: 'picName',
    header: 'Destination',
    accessor: 'pic_name',
    type: 'identity',
    subtitleAccessor: (rp) => `Division  : ${rp?.destination_department_name_snapshot ?? '-'}`,
    sortAccessor: 'pic_name',
    minWidth: 220,
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

function DataTableRp({
  rows = [],
  columns = columnsDataTableRp,
  actions,
  getRowId = (rp, index) => rp?.id ?? index,
  tableLabel = 'RP table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onDetails,
  onApproval,
  onReject,
  onRevert,
  onCheckData,
  canApprove,
  canReject,
  canRevert,
  canCheckData,
  useCheckDataAction = false,
  currentUser,
  onStatusChange,
  SwitchComponent,
  enableStatusSwitch = false,
  mobileCard,
  pagination,
  className,
  tableWrapperStyle,
  ...props
}) {
  const shouldRenderStatusSwitch =
    enableStatusSwitch && typeof onStatusChange === 'function' && typeof SwitchComponent === 'function'
  const defaultMobileCard = createMobileCardRp({
    formatDateTime,
    formatRupiah,
    getFrpStatusLabel,
    getFrpStatusVariant,
    onMoreInfo: mobileCard?.onMoreInfo,
  })
  const baseMobileCard =
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
  const resolvedColumns = shouldRenderStatusSwitch
    ? columns.map((column) =>
        column.key === 'status'
          ? {
              ...column,
              render: (rp, index) =>
                renderBanksStatus(rp, index, {
                  isStatusUpdating,
                  onStatusChange,
                  SwitchComponent,
                }),
            }
          : column,
      )
    : columns
  const resolvedMobileCard =
    shouldRenderStatusSwitch && baseMobileCard !== false
      ? {
          ...(baseMobileCard ?? {}),
          header: {
            ...(baseMobileCard?.header ?? {}),
            status: {
              label: (rp) => getFrpStatusLabel(rp),
              variant: (rp) => getFrpStatusVariant(rp),
              ...(baseMobileCard?.header?.status ?? {}),
            },
          },
        }
      : baseMobileCard

  const defaultActions = [
    typeof onApproval === 'function'
      ? {
          key: 'approval',
          label: 'Approve',
          buttonComponent: ButtonApprovalRp,
          mobileButtonComponent: MobileButtonApprovalRp,
          hidden: (rp, index) => isApproveActionHidden(rp, index, currentUser, canApprove),
          onClick: onApproval,
        }
      : null,
    typeof onReject === 'function'
      ? {
          key: 'reject',
          label: 'Reject',
          buttonComponent: ButtonRejectRp,
          mobileButtonComponent: MobileButtonRejectRp,
          hidden: (rp, index) => isRejectActionHidden(rp, index, currentUser, canReject),
          onClick: onReject,
        }
      : null,
    typeof onRevert === 'function'
      ? {
          key: 'revert',
          label: 'Revert',
          buttonComponent: ButtonRevertRp,
          mobileButtonComponent: MobileButtonRevert,
          hidden: (rp, index) => isRevertActionHidden(rp, index, currentUser, canRevert),
          onClick: onRevert,
        }
      : null,
    typeof onEdit === 'function' || (useCheckDataAction && typeof onCheckData === 'function')
      ? {
          key: 'edit',
          label: useCheckDataAction ? 'Check Data' : 'Edit RP',
          buttonComponent: useCheckDataAction ? ButtonCheckDataRp : ButtonEditRp,
          mobileButtonComponent: MobileButtonEditRp,
          mobilePlacement: 'header-start',
          hidden: (rp, index) =>
            useCheckDataAction
              ? typeof canCheckData === 'function' && !canCheckData(rp, index)
              : !canCurrentUserEditFrp(rp, currentUser),
          onClick: useCheckDataAction ? onCheckData : onEdit,
        }
      : null,
    typeof onDetails === 'function'
      ? {
          key: 'details',
          label: 'Details RP',
          buttonComponent: ButtonDetailsRp,
          mobileHidden: true,
          hidden: () => !canAccessFrpButton(currentUser, 'details'),
          onClick: onDetails,
        }
      : null,
  ].filter(Boolean)

  //For Action
  const resolvedActions = Array.isArray(actions) ? actions : defaultActions
  const autoFitColumnCount =
    resolvedColumns.length + (resolvedActions.length > 0 ? 1 : 0)
  const autoFitScale = getAutoFitScale(autoFitColumnCount)
  const autoFitColumns = resolvedColumns.map((column) =>
    scaleTableColumn(column, autoFitScale),
  )
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

export default DataTableRp
