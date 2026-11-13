import { Voided } from '../../layoute/TemplateIcons.jsx'

function ButtonVoidedRp({
  label = 'Voided',
  showLabel = false,
  icon: Icon = Voided,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--voided',
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

export default ButtonVoidedRp
