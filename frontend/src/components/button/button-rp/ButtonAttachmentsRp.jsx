import { Download } from '../../layoute/TemplateIcons.jsx'

function ButtonAttachmentsRp({
  label = 'Attachment',
  icon: Icon = Download,
  size = 16,
  className = '',
  children,
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table__icon-button users-table__icon-button--pagination-card frp-icon-button frp-icon-button--attachments',
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
      {children}
    </button>
  )
}

export default ButtonAttachmentsRp
