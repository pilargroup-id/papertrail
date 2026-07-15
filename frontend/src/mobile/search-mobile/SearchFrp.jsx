import { SearchMd } from '../../components/layoute/TemplateIcons.jsx'

function SearchFrp({ children, searchProps, variant = 'mobile' }) {
  if (!searchProps) {
    return null
  }

  const searchClassName = [
    'mobile-frp-search',
    variant === 'desktop' ? 'mobile-frp-search--desktop' : 'mobile-frp-search--mobile',
  ].join(' ')

  return (
    <div className={searchClassName} role="search">
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
