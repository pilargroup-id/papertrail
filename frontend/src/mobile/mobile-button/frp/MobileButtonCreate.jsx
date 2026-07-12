import { ExternalLink } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonCreate({
  label = 'Create',
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'dashboard-popup__button',
    'dashboard-popup__button--primary',
    'frp-mobile-create-fab',
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
      <span className="frp-mobile-create-fab__label">{label}</span>
      <ExternalLink size={16} aria-hidden="true" />
    </button>
  )
}

export default MobileButtonCreate
