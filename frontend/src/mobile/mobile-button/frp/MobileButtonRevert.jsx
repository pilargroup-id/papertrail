import { Revert } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonRevert({
  label = 'Revert',
  icon: Icon = Revert,
  size = 16,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'detail-card-mobile__action frp-mobile-action-button frp-mobile-action-button--revert',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClassName}
      {...buttonProps}
    >
      <span className="frp-mobile-action-button__icon" aria-hidden="true">
        <Icon size={size} />
      </span>
      <span className="frp-mobile-action-button__copy">
        <span className="frp-mobile-action-button__label">{label}</span>
      </span>
    </button>
  )
}

export default MobileButtonRevert
