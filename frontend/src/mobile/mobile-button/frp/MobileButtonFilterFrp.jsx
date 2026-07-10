import { Filter } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonFilterFrp({
  label = 'Filter',
  icon: Icon = Filter,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'header-icon-button header-icon-button--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClassName}
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  )
}

export default MobileButtonFilterFrp
