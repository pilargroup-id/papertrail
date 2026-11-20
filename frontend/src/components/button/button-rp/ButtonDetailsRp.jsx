import { Eye } from '../../layoute/TemplateIcons.jsx'

function ButtonDetailsRp({
  label = 'Detail',
  showLabel = false,
  icon: Icon = Eye,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--details',
    showLabel && 'frp-icon-button--with-label',
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
      {showLabel ? <span>{label}</span> : null}
    </button>
  )
}

export default ButtonDetailsRp
