import { Revert } from '../../layoute/TemplateIcons.jsx'

function ButtonRevertFrp({
  label = 'Revert',
  showLabel = true,
  icon: Icon = Revert,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--revert',
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

export default ButtonRevertFrp
