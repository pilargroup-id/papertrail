import { Edit03 } from '../../layoute/TemplateIcons.jsx'

function ButtonEditRp({
  label = 'Edit',
  showLabel = false,
  icon: Icon = Edit03,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--edit',
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

export default ButtonEditRp
