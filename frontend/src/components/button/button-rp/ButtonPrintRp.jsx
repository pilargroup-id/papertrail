import { Printer } from '../../layoute/TemplateIcons.jsx'

function ButtonPrintRp({
  label = 'Print',
  icon: Icon = Printer,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--print',
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

export default ButtonPrintRp
