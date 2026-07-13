import { XClose } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonRejectFrp({
  label = 'Reject',
  description = '',
  icon: Icon = XClose,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'detail-card-mobile__action frp-mobile-action-button frp-mobile-action-button--reject',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClassName}
      aria-label={description || label}
      title={description || label}
      {...buttonProps}
    >
      <span className="frp-mobile-action-button__icon" aria-hidden="true">
        <Icon size={size} />
      </span>
      <span className="frp-mobile-action-button__copy">
        <span className="frp-mobile-action-button__label">{label}</span>
        {description ? (
          <span className="frp-mobile-action-button__description">{description}</span>
        ) : null}
      </span>
    </button>
  )
}

export default MobileButtonRejectFrp
