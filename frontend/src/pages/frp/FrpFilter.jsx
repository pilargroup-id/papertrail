function FrpFilter({
  filters,
  requestByOptions,
  vendorOptions,
  onFilterChange,
  id,
}) {
  return (
    <div className="frp-page__filters" id={id} aria-label="Filter FRP">
      <label className="frp-page__filter-field">
        <span>Request By</span>
        <select
          value={filters.requestBy}
          onChange={(event) => onFilterChange('requestBy', event.target.value)}
        >
          <option value="">All Request By</option>
          {requestByOptions.map((requestBy) => (
            <option key={requestBy} value={requestBy}>
              {requestBy}
            </option>
          ))}
        </select>
      </label>

      <label className="frp-page__filter-field">
        <span>Vendor</span>
        <select
          value={filters.vendor}
          onChange={(event) => onFilterChange('vendor', event.target.value)}
        >
          <option value="">All Vendor</option>
          {vendorOptions.map((vendor) => (
            <option key={vendor} value={vendor}>
              {vendor}
            </option>
          ))}
        </select>
      </label>

      <label className="frp-page__filter-field frp-page__filter-field--date">
        <span>Created At</span>
        <input
          type="date"
          value={filters.createdAt}
          onChange={(event) => onFilterChange('createdAt', event.target.value)}
        />
      </label>
    </div>
  )
}

export default FrpFilter
