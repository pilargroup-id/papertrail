import { SearchMd } from '../../components/layoute/TemplateIcons.jsx'

function SearchFrp({ children, searchProps }) {
  if (!searchProps) {
    return null
  }

  return (
    <div className="mobile-frp-search" role="search">
      <div className="mobile-frp-search__bar">
        <label
          className="mobile-frp-search__field"
          aria-label={searchProps.ariaLabel ?? 'Search FRP'}
        >
          <SearchMd size={16} className="mobile-frp-search__icon" />
          <input
            type="search"
            className="mobile-frp-search__input"
            value={searchProps.value ?? ''}
            placeholder={searchProps.placeholder ?? 'Search...'}
            onChange={searchProps.onChange}
            aria-label={searchProps.ariaLabel ?? 'Search FRP'}
            autoComplete="off"
          />
        </label>

        {children ? <div className="mobile-frp-search__action">{children}</div> : null}
      </div>
    </div>
  )
}

export default SearchFrp
