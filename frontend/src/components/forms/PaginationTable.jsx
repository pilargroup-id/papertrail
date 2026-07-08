import { useState } from 'react'

import CreateButton from '../button/ButtonCreate.jsx'
import { ChevronDown, ChevronUp } from '../layoute/TemplateIcons.jsx'

function joinClassNames(...classNames) {
  return classNames.flat().filter(Boolean).join(' ')
}

function sanitizeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-') || 'pagination'
}

function normalizePageSizeOptions(options, pageSize) {
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map((option) => Number(option))
    .filter((option) => Number.isInteger(option) && option > 0)
  const normalizedPageSize = Number(pageSize)

  if (
    Number.isInteger(normalizedPageSize) &&
    normalizedPageSize > 0 &&
    !normalizedOptions.includes(normalizedPageSize)
  ) {
    return [normalizedPageSize, ...normalizedOptions]
  }

  return normalizedOptions
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'end-ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages]
}

function PaginationTable({
  id = 'data-table-pagination',
  summary,
  totalRows = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  pageSizeOptions = [25, 50, 100, 250],
  pageSizeLabel = 'Rows per page',
  pageSizeAriaLabel = 'Jumlah baris per halaman',
  pageSizeSuffix,
  ariaLabel = 'Data table pagination',
  items,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  onPageSizeChange,
  onPrevious,
  onNext,
  onSelectPage,
}) {
  const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false)
  const currentPageSize = Number(pageSize)
  const normalizedPageSizeOptions = normalizePageSizeOptions(pageSizeOptions, currentPageSize)
  const canChangePageSize =
    Number.isInteger(currentPageSize) &&
    currentPageSize > 0 &&
    normalizedPageSizeOptions.length > 0 &&
    typeof onPageSizeChange === 'function'
  const firstItem = totalRows === 0 ? 0 : (currentPage - 1) * currentPageSize + 1
  const lastItem = Math.min(currentPage * currentPageSize, totalRows)
  const resolvedSummary = summary ?? `${firstItem}-${lastItem} dari ${totalRows} data`
  const paginationItems = items ?? getPaginationItems(currentPage, totalPages)
  const pageSizeMenuId = `${sanitizeId(id)}-page-size-options`

  const handlePageSizeChange = (value) => {
    const nextPageSize = Number(value)

    if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) {
      return
    }

    setIsPageSizeMenuOpen(false)
    onPageSizeChange?.(nextPageSize)
  }

  const handlePageSizeBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsPageSizeMenuOpen(false)
    }
  }

  const handlePageSizeKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsPageSizeMenuOpen(false)
    }
  }

  return (
    <div className="users-table-pagination">
      <div className="users-table-pagination__meta">
        <p className="users-table-pagination__summary">{resolvedSummary}</p>

        {canChangePageSize ? (
          <div
            className="users-table-pagination__page-size"
            onBlur={handlePageSizeBlur}
            onKeyDown={handlePageSizeKeyDown}
          >
            <span className="users-table-pagination__page-size-label">{pageSizeLabel}</span>

            <div className="users-table-pagination__page-size-menu">
              <button
                className="users-table-pagination__select"
                type="button"
                onClick={() => setIsPageSizeMenuOpen((isOpen) => !isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isPageSizeMenuOpen}
                aria-controls={pageSizeMenuId}
                aria-label={pageSizeAriaLabel}
              >
                <span>{currentPageSize}</span>
                {isPageSizeMenuOpen ? (
                  <ChevronUp size={16} aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} aria-hidden="true" />
                )}
              </button>

              {isPageSizeMenuOpen ? (
                <div
                  className="users-table-pagination__page-size-options"
                  id={pageSizeMenuId}
                  role="listbox"
                  aria-label={pageSizeAriaLabel}
                >
                  {normalizedPageSizeOptions.map((option) => (
                    <button
                      key={option}
                      className={joinClassNames(
                        'users-table-pagination__page-size-option',
                        option === currentPageSize
                          ? 'users-table-pagination__page-size-option--active'
                          : '',
                      )}
                      type="button"
                      role="option"
                      aria-selected={option === currentPageSize}
                      onClick={() => handlePageSizeChange(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {pageSizeSuffix ? (
              <span className="users-table-pagination__page-size-suffix">
                {pageSizeSuffix}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="users-table-pagination__controls" aria-label={ariaLabel}>
        <CreateButton
          variant="pagination"
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
        >
          {previousLabel}
        </CreateButton>

        {paginationItems.map((item, index) =>
          typeof item === 'number' ? (
            <CreateButton
              key={item}
              variant="pagination"
              active={item === currentPage}
              type="button"
              onClick={() => onSelectPage?.(item)}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </CreateButton>
          ) : (
            <span
              key={`${item}-${index}`}
              className="users-table-pagination__ellipsis"
              aria-hidden="true"
            >
              ...
            </span>
          ),
        )}

        <CreateButton
          variant="pagination"
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages}
        >
          {nextLabel}
        </CreateButton>
      </div>
    </div>
  )
}

export default PaginationTable
