import DataTableAction, { DataTableStatus } from '../DataTableAction.jsx'
import ButtonEditFrp from '../../button/button-frp/ButtonEditFrp.jsx'
import ButtonDetailsFrp from '../../button/button-frp/ButtonDetailsFrp.jsx'

import ButtonApprovalFrp from '../../button/button-frp/ButtonApprovalFrp.jsx'
import ButtonRejectFrp from '../../button/button-frp/ButtonRejectFrp.jsx'
import ButtonRevertFrp from '../../button/button-frp/ButtonRevertFrp.jsx'
import createMobileCardFrp from '../../../mobile/frp-card/MobileCardFrp.jsx'
import MobileButtonEditFrp from '../../../mobile/mobile-button/frp/MobileButtonEditFrp.jsx'
import {
  canAccessFrpButton,
  canCurrentUserApproveFrp,
  canCurrentUserEditFrp,
  canCurrentUserRejectFrp,
  canCurrentUserRevertFrp,
} from './frp-button-access.js'

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

function getFrpStatusValue(frp) {
  return String(frp?.status ?? '').trim().toUpperCase()
}

function getFrpStatusLabel(frp) {
  const status = getFrpStatusValue(frp)

  if (!status) {
    return '-'
  }

  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getFrpStatusVariant(frp) {
  switch (getFrpStatusValue(frp)) {
    case 'PENDING':
      return 'pending'
    case 'APPROVED':
      return 'active'
    case 'REJECTED':
      return 'inactive'
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
  const isActive = getFrpStatusValue(frp) === 'APPROVED'
  const isUpdating =
    typeof isStatusUpdating === 'function'
      ? Boolean(isStatusUpdating(frp, index))
      : false
  const isDisabled = frp?.id === undefined || frp?.id === null || isUpdating
  const statusLabel = getFrpStatusLabel(frp)
  const statusPill = (
    <DataTableStatus
      className="banks-status-toggle__pill"
      variant={getFrpStatusVariant(frp)}
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
          aria-label={`Ubah status FRP ${frp?.frp_number ?? frp?.id ?? index}`}
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

function isApproveActionHidden(frp, index, currentUser, canApproveAction) {
  const isPending = getFrpStatusValue(frp) === 'PENDING'

  return !(
    isPending &&
    canCurrentUserApproveFrp(frp, currentUser) &&
    (typeof canApproveAction !== 'function' || canApproveAction(frp, index))
  )
}

function isRejectActionHidden(frp, index, currentUser, canRejectAction) {
  const isPending = getFrpStatusValue(frp) === 'PENDING'

  return !(
    isPending &&
    canCurrentUserRejectFrp(frp, currentUser) &&
    (typeof canRejectAction !== 'function' || canRejectAction(frp, index))
  )
}

function isRevertActionHidden(frp, index, currentUser, canRevertAction) {
  return !(
    getFrpStatusValue(frp) === 'APPROVED' &&
    canCurrentUserRevertFrp(frp, currentUser) &&
    (typeof canRevertAction !== 'function' || canRevertAction(frp, index))
  )
}

const columnsDataTableBanks = [{
    key: 'frpNumber',
    header: 'FRP Number',
    accessor: 'frp_number',
    type: 'identity',
    subtitleAccessor: (frp) => `Date: ${formatDateTime(frp?.created_at)}`,
    minWidth: 260,
  },
  {
    key: 'requestor',
    header: 'Request by',
    accessor: 'requested_by_name',
    type: 'identity',
    subtitleAccessor: (frp) => `Division  : ${frp?.department_name_snapshot ?? '-'}`,
    minWidth: 260,
  },
  {
    key: 'vendor',
    header: 'Vendor',
    accessor: 'vendor_name_snapshot',
    nowrap: true,
    type: 'identity',
    minWidth: 180,
  },
  {
    key: 'totalAmount',
    header: 'Total Amount',
    accessor: 'total_amount',
    format: formatRupiah,
    minWidth: 180,
  },
  {
    key: 'description',
    header: 'Description',
    accessor: 'description',
    minWidth: 220,
  },
  {
    key: 'status',
    header: 'Status',
    accessor: getFrpStatusLabel,
    type: 'status',
    variantAccessor: getFrpStatusVariant,
    nowrap: true,
  },
  {
    key: 'updatedAt',
    header: 'Updated At',
    accessor: 'updated_at',
    format: formatDateTime,
    nowrap: true,
    minWidth: 170,
  },
]

function DataTableFrp({
  rows = [],
  columns = columnsDataTableBanks,
  actions,
  getRowId = (frp, index) => frp?.id ?? index,
  tableLabel = 'FRP table',
  emptyMessage = 'Belum ada data.',
  isStatusUpdating,
  onEdit,
  onDetails,
  onApproval,
  onReject,
  onRevert,
  canApprove,
  canReject,
  canRevert,
  currentUser,
  onStatusChange,
  SwitchComponent,
  enableStatusSwitch = false,
  mobileCard,
  className,
  tableWrapperStyle,
  ...props
}) {
  const shouldRenderStatusSwitch =
    enableStatusSwitch && typeof onStatusChange === 'function' && typeof SwitchComponent === 'function'
  const defaultMobileCard = createMobileCardFrp({
    formatDateTime,
    formatRupiah,
    getFrpStatusLabel,
    getFrpStatusVariant,
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
    shouldRenderStatusSwitch && baseMobileCard !== false
      ? {
          ...(baseMobileCard ?? {}),
          header: {
            ...(baseMobileCard?.header ?? {}),
            status: {
              label: (frp) => getFrpStatusLabel(frp),
              variant: (frp) => getFrpStatusVariant(frp),
              ...(baseMobileCard?.header?.status ?? {}),
            },
          },
        }
      : baseMobileCard

  const defaultActions = [
    typeof onApproval === 'function'
      ? {
          key: 'approval',
          label: 'Approval',
          buttonComponent: ButtonApprovalFrp,
          hidden: (frp, index) => isApproveActionHidden(frp, index, currentUser, canApprove),
          onClick: onApproval,
        }
      : null,
    typeof onReject === 'function'
      ? {
          key: 'reject',
          label: 'Reject',
          buttonComponent: ButtonRejectFrp,
          hidden: (frp, index) => isRejectActionHidden(frp, index, currentUser, canReject),
          onClick: onReject,
        }
      : null,
    typeof onRevert === 'function'
      ? {
          key: 'revert',
          label: 'Revert',
          buttonComponent: ButtonRevertFrp,
          hidden: (frp, index) => isRevertActionHidden(frp, index, currentUser, canRevert),
          onClick: onRevert,
        }
      : null,
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit FRP',
          buttonComponent: ButtonEditFrp,
          mobileButtonComponent: MobileButtonEditFrp,
          mobilePlacement: 'header-start',
          hidden: (frp) => !canCurrentUserEditFrp(frp, currentUser),
          onClick: onEdit,
        }
      : null,
    typeof onDetails === 'function'
      ? {
          key: 'details',
          label: 'Details FRP',
          buttonComponent: ButtonDetailsFrp,
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
      actionCellClassName="users-table__action-cell frp-table__action-cell"
      actionCellStyle={{
        width: '1%',
        minWidth: Math.max(118, Math.round(146 * autoFitScale)),
        whiteSpace: 'nowrap',
      }}
      className={joinClassNames('vendor-banks-table--auto-fit frp-table--actions', className)}
      tableWrapperStyle={getAutoFitWrapperStyle(autoFitScale, tableWrapperStyle)}
      {...props}
    />
  )
}

export default DataTableFrp
