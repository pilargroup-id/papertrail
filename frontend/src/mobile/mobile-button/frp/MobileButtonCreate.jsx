import ButtonCreateFrp from '../../../components/button/button-frp/ButtonCreateFrp.jsx'
import { ExternalLink } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonCreate({
  label = 'Create',
  className = '',
  dialogProps = {},
  ...buttonProps
}) {
  const buttonClassName = [
    'frp-mobile-create-fab',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ButtonCreateFrp
      variant="create"
      className={buttonClassName}
      aria-label={label}
      title={label}
      dialogProps={dialogProps}
      {...buttonProps}
    >
      <span className="frp-mobile-create-fab__label">{label}</span>
      <ExternalLink size={16} aria-hidden="true" />
    </ButtonCreateFrp>
  )
}

export default MobileButtonCreate
