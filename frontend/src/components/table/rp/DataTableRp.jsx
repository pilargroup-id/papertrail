import DataTableAction, { DataTableStatus } from '../DataTableAction.jsx'
import ButtonEditRp from '../../button/button-rp/ButtonEditRp.jsx'
import ButtonDetailsRp from '../../button/button-rp/ButtonDetailsRp.jsx'

import ButtonApprovalRp from '../../button/button-rp/ButtonApprovalRp.jsx'
import ButtonRejectRp from '../../button/button-rp/ButtonRejectRp.jsx'
import ButtonRevertRp from '../../button/button-rp/ButtonRevertRp.jsx'
import createMobileCardRp from '../../../mobile/frp-card/MobileCardFrp.jsx'
import MobileButtonApprovalRp from '../../../mobile/mobile-button/frp/MobileButtonApprovalFrp.jsx'
import MobileButtonEditRp from '../../../mobile/mobile-button/frp/MobileButtonEditFrp.jsx'
import MobileButtonRejectRp from '../../../mobile/mobile-button/frp/MobileButtonRejectFrp.jsx'
import MobileButtonRevert from '../../../mobile/mobile-button/frp/MobileButtonRevert.jsx'
import {
  canAccessFrpButton,
  canCurrentUserApproveFrp,
  canCurrentUserEditFrp,
  canCurrentUserRejectFrp,
  canCurrentUserRevertFrp,
} from './rp-button-access.js'

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

function getFrpStatusValue(rp) {
  return String(rp?.status ?? '').trim().toUpperCase()
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

function getFrpStatusVariant(rp) {
  switch (getFrpStatusValue(rp)) {
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
  const isPending = getFrpStatusValue(rp) === 'PENDING'

  return !(
    isPending &&
    canCurrentUserApproveFrp(rp, currentUser) &&
    (typeof canApproveAction !== 'function' || canApproveAction(rp, index))
  )
}

function isRejectActionHidden(rp, index, currentUser, canRejectAction) {
  const isPending = getFrpStatusValue(rp) === 'PENDING'

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

const columnsDataTableBanks = [{
    key: 'rpNumber',
    header: 'FRP Number',
    accessor: 'rp_number',
    type: 'identity',
    subtitleAccessor: (rp) => `Date: ${formatDateTime(rp?.created_at)}`,
    minWidth: 260,
  },
  {
    key: 'requestor',
    header: 'Request by',
    accessor: 'requested_by_name',
    type: 'identity',
    subtitleAccessor: (rp) => `Division  : ${rp?.department_name_snapshot ?? '-'}`,
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

function DataTableRp({
  rows = [],
  columns = columnsDataTableBanks,
  actions,
  getRowId = (rp, index) => rp?.id ?? index,
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
          label: 'Approval',
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
    typeof onEdit === 'function'
      ? {
          key: 'edit',
          label: 'Edit FRP',
          buttonComponent: ButtonEditRp,
          mobileButtonComponent: MobileButtonEditRp,
          mobilePlacement: 'header-start',
          hidden: (rp) => !canCurrentUserEditFrp(rp, currentUser),
          onClick: onEdit,
        }
      : null,
    typeof onDetails === 'function'
      ? {
          key: 'details',
          label: 'Details FRP',
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
