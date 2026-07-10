import ButtonCreateFrp from '../../../components/button/button-frp/ButtonCreateFrp.jsx'
import { Plus } from '../../../components/layoute/TemplateIcons.jsx'

function MobileButtonCreate({
  label = 'Create FRP',
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
      <Plus size={24} aria-hidden="true" />
      <span className="frp-mobile-create-fab__label">{label}</span>
    </ButtonCreateFrp>
  )
}

export default MobileButtonCreate
