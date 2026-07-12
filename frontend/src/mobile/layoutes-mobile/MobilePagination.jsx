import { ChevronLeft, ChevronRight } from '../../components/layoute/TemplateIcons.jsx'

function normalizePositiveInteger(value, fallback) {
  const numberValue = Number(value)

  if (Number.isInteger(numberValue) && numberValue > 0) {
    return numberValue
  }

  return fallback
}

function getPaginationSummary({ summary, totalRows, currentPage, pageSize }) {
  if (summary) {
    return summary
  }

  const resolvedTotalRows = Math.max(0, Number(totalRows) || 0)
  const resolvedPageSize = normalizePositiveInteger(pageSize, 25)
  const firstItem = resolvedTotalRows === 0 ? 0 : (currentPage - 1) * resolvedPageSize + 1
  const lastItem = Math.min(currentPage * resolvedPageSize, resolvedTotalRows)

  return `${firstItem}-${lastItem} dari ${resolvedTotalRows} data`
}

function MobilePagination({
  summary,
  totalRows = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  previousLabel = 'Prev',
  nextLabel = 'Next',
  ariaLabel = 'Mobile pagination',
  onPrevious,
  onNext,
}) {
  const resolvedTotalPages = normalizePositiveInteger(totalPages, 1)
  const resolvedCurrentPage = Math.min(
    Math.max(normalizePositiveInteger(currentPage, 1), 1),
    resolvedTotalPages,
  )
  const resolvedSummary = getPaginationSummary({
    summary,
    totalRows,
    currentPage: resolvedCurrentPage,
    pageSize,
  })
  const isFirstPage = resolvedCurrentPage <= 1
  const isLastPage = resolvedCurrentPage >= resolvedTotalPages

  return (
    <nav className="mobile-pagination" aria-label={ariaLabel}>
      <p className="mobile-pagination__summary">{resolvedSummary}</p>

      <div className="mobile-pagination__controls">
        <button
          className="mobile-pagination__button"
          type="button"
          onClick={onPrevious}
          disabled={isFirstPage}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span>{previousLabel}</span>
        </button>

        <span className="mobile-pagination__page" aria-current="page">
          {resolvedCurrentPage} / {resolvedTotalPages}
        </span>

        <button
          className="mobile-pagination__button"
          type="button"
          onClick={onNext}
          disabled={isLastPage}
          aria-label="Halaman berikutnya"
        >
          <span>{nextLabel}</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

export default MobilePagination
