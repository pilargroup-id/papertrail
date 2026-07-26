import { useMemo, useState } from 'react'

import CreateButton from '../button/ButtonCreate.jsx'
import ButtonDelete from '../button/ButtonDelete.jsx'
import ButtonEdit from '../button/ButtonEdit.jsx'
import DataTable from './DataTable.jsx'
import { ChevronDown, ChevronUp } from '../layoute/TemplateIcons.jsx'

export {
  DataTableChips,
  DataTableIdentity,
  DataTableStatus,
} from './DataTable.jsx'

const defaultActions = [
  {
    key: 'edit',
    label: 'Edit',
  },
  {
    key: 'delete',
    label: 'Delete',
    variant: 'danger',
  },
]

function isActionHidden(action, row, index) {
  return typeof action.hidden === 'function' ? action.hidden(row, index) : action.hidden
}

function isActionDisabled(action, row, index) {
  return typeof action.disabled === 'function' ? action.disabled(row, index) : action.disabled
}

function getActionButton(action) {
  if (typeof action.buttonComponent === 'function') {
    return action.buttonComponent
  }

  const actionKey = String(action.key ?? action.label ?? '').toLowerCase()

  if (actionKey === 'edit') {
    return ButtonEdit
  }

  if (actionKey === 'delete' || action.variant === 'danger') {
    return ButtonDelete
  }

  return null
}

function getMobileCardActions(mobileCard, resolvedActions) {
  if (mobileCard?.actions === undefined) {
    return resolvedActions
  }

  if (typeof mobileCard.actions === 'function') {
    return (row, index) => mobileCard.actions(row, index, resolvedActions)
  }

  return mobileCard.actions
}

function getPathValue(source, path) {
  if (!path || typeof path !== 'string') {
    return undefined
  }

  return path.split('.').reduce((currentValue, key) => currentValue?.[key], source)
}

function getComparableValue(column, row, index) {
  if (typeof column.sortAccessor === 'function') {
    return column.sortAccessor(row, index)
  }

  if (typeof column.sortAccessor === 'string') {
    return getPathValue(row, column.sortAccessor)
  }

  if (typeof column.accessor === 'function') {
    return column.accessor(row, index)
  }

  if (typeof column.accessor === 'string') {
    return getPathValue(row, column.accessor)
  }

  return getPathValue(row, column.key)
}

function normalizeComparableValue(value, sortType) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (sortType === 'number') {
    const numberValue = Number(value)

    return Number.isFinite(numberValue) ? numberValue : 0
  }

  if (sortType === 'date') {
    const dateValue = new Date(value).getTime()

    return Number.isNaN(dateValue) ? 0 : dateValue
  }

  return String(value).toLowerCase()
}

function sortRows(rows, columns, sortConfig) {
  if (!sortConfig?.key) {
    return rows
  }

  const sortColumn = columns.find((column) => column.key === sortConfig.key)

  if (!sortColumn) {
    return rows
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((firstItem, secondItem) => {
      const firstValue = normalizeComparableValue(
        getComparableValue(sortColumn, firstItem.row, firstItem.index),
        sortColumn.sortType,
      )
      const secondValue = normalizeComparableValue(
        getComparableValue(sortColumn, secondItem.row, secondItem.index),
        sortColumn.sortType,
      )

      if (firstValue < secondValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }

      if (firstValue > secondValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }

      return firstItem.index - secondItem.index
    })
    .map((item) => item.row)
}

function SortableHeader({
  label,
  columnKey,
  align,
  sortConfig,
  onSortChange,
}) {
  const isActive = sortConfig?.key === columnKey
  const nextDirection = isActive && sortConfig.direction === 'asc' ? 'desc' : 'asc'
  const tooltipDirection = nextDirection === 'asc' ? 'ascending' : 'descending'

  return (
    <button
      type="button"
      className="data-table-action__sort-button"
      title={`Sort ${label} ${tooltipDirection}`}
      aria-label={`Sort ${label} ${tooltipDirection}`}
      data-align={align || 'left'}
      data-sort-direction={isActive ? sortConfig.direction : 'none'}
      onClick={() =>
        onSortChange({
          key: columnKey,
          direction: nextDirection,
        })
      }
    >
      <span className="data-table-action__sort-label">{label}</span>
      <span className="data-table-action__sort-indicator" aria-hidden="true">
        {isActive && sortConfig.direction === 'asc' ? (
          <ChevronUp size={13} />
        ) : isActive ? (
          <ChevronDown size={13} />
        ) : (
          <>
            <ChevronUp size={10} />
            <ChevronDown size={10} />
          </>
        )}
      </span>
    </button>
  )
}

function getSortableColumns(columns, sortConfig, setSortConfig) {
  return columns.map((column) => {
    if (column.sortable === false || column.key === undefined || column.key === null) {
      return column
    }

    const label = column.headerLabel ?? (typeof column.header === 'string' ? column.header : column.key)

    return {
      ...column,
      mobileLabel: column.mobileLabel ?? label,
      header: (
        <SortableHeader
          label={label}
          columnKey={column.key}
          align={column.align}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
        />
      ),
    }
  })
}

function getTableWrapperStyle(
  pagination,
  tableWrapperStyle,
  rows,
  compactForSparseRows,
  sparseRowThreshold,
) {
  if (pagination === false || pagination === null) {
    return tableWrapperStyle
  }

  const rowCount = Array.isArray(rows) ? rows.length : 0
  const isSparse = compactForSparseRows && rowCount <= sparseRowThreshold
  const compactStyle = isSparse
    ? {
        flex: '0 0 auto',
        minHeight: rowCount === 0 ? '180px' : 'auto',
        '--users-table-wrapper-max-height': 'none',
      }
    : {}

  return {
    minHeight: 'var(--data-table-action-min-height, min(56dvh, 560px))',
    ...compactStyle,
    ...tableWrapperStyle,
  }
}

function DataTableAction({
  columns = [],
  actions = [],
  useDefaultActions = true,
  mobileCard,
  pagination = true,
  tableWrapperStyle,
  enableSorting = false,
  defaultSort,
  compactForSparseRows = false,
  sparseRowThreshold = 5,
  actionColumnLabel = 'Action',
  actionColumnKey = 'action',
  actionCellClassName = 'users-table__action-cell',
  actionCellStyle = { width: '1%', whiteSpace: 'nowrap' },
  ...props
}) {
  const [sortConfig, setSortConfig] = useState(defaultSort ?? null)
  const resolvedActions = actions.length > 0 ? actions : useDefaultActions ? defaultActions : []
  const actionColumn =
    resolvedActions.length > 0
      ? {
          key: actionColumnKey,
          header: actionColumnLabel,
          headerClassName: 'users-table__action-header',
          sortable: false,
          cellClassName: actionCellClassName,
          cellStyle: actionCellStyle,
          render: (row, index) => (
            <>
              {resolvedActions.map((action, actionIndex) => {
                if (isActionHidden(action, row, index)) {
                  return null
                }

                const Icon = action.icon
                const buttonLabel = action.label ?? action.key ?? 'Action'
                const ActionButton = getActionButton(action)
                const buttonKey = action.key ?? `${buttonLabel}-${actionIndex}`
                const isDisabled = isActionDisabled(action, row, index)
                const handleClick = (event) => {
                  event.stopPropagation()
                  action.onClick?.(row, index, event)
                }

                return ActionButton ? (
                  <ActionButton
                    key={buttonKey}
                    icon={Icon}
                    disabled={isDisabled}
                    label={buttonLabel}
                    onClick={handleClick}
                  />
                ) : (
                  <CreateButton
                    key={buttonKey}
                    variant="icon"
                    tone={action.variant === 'danger' ? 'danger' : 'default'}
                    type="button"
                    disabled={isDisabled}
                    aria-label={buttonLabel}
                    title={buttonLabel}
                    onClick={handleClick}
                  >
                    {Icon ? <Icon size={16} aria-hidden="true" /> : buttonLabel}
                  </CreateButton>
                )
              })}
            </>
          ),
        }
      : null
  const resolvedColumns = actionColumn ? [...columns, actionColumn] : columns
  const displayColumns = enableSorting
    ? getSortableColumns(resolvedColumns, sortConfig, setSortConfig)
    : resolvedColumns
  const displayRows = useMemo(
    () => (enableSorting ? sortRows(props.rows ?? [], resolvedColumns, sortConfig) : props.rows),
    [enableSorting, props.rows, resolvedColumns, sortConfig],
  )

  return (
    <DataTable
      {...props}
      rows={displayRows}
      pagination={pagination}
      tableWrapperStyle={getTableWrapperStyle(
        pagination,
        tableWrapperStyle,
        displayRows,
        compactForSparseRows,
        sparseRowThreshold,
      )}
      mobileCard={
        mobileCard === false
          ? false
          : {
              ...(mobileCard ?? {}),
              actions: getMobileCardActions(mobileCard, resolvedActions),
            }
      }
      columns={displayColumns}
    />
  )
}

export default DataTableAction
