import { Edit03 } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonEditFrp({
  label = 'Edit',
  icon: Icon = Edit03,
  size = 13,
  className = '',
  type = 'button',
  bareIcon = 'true',
  ...buttonProps
}) {
  const buttonClassName = [
    'frp-bare-icon-button frp-icon-button--mobile-edit',
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

export default MobileButtonEditFrp
