import { useState } from 'react'

import { Filter } from '../../../components/layoute/TemplateIcons.jsx'
import DrawerFilterFrp from '../../drawer/DrawerFilterFrp.jsx'

function MobileButtonFilterFrp({
  label = 'Filter',
  icon: Icon = Filter,
  size = 16,
  className = '',
  type = 'button',
  drawerProps,
  onClick,
  ...buttonProps
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const buttonClassName = [
    'header-icon-button header-icon-button--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = (event) => {
    setIsDrawerOpen(true)
    onClick?.(event)
  }

  const handleClose = () => {
    setIsDrawerOpen(false)
    drawerProps?.onClose?.()
  }

  const handleOpen = () => {
    setIsDrawerOpen(true)
    drawerProps?.onOpen?.()
  }

  return (
    <>
      <button
        type={type}
        className={buttonClassName}
        aria-label={label}
        title={label}
        onClick={handleClick}
        {...buttonProps}
      >
        <Icon size={size} aria-hidden="true" />
      </button>

      <DrawerFilterFrp
        {...drawerProps}
        open={drawerProps?.open ?? isDrawerOpen}
        onClose={handleClose}
        onOpen={handleOpen}
      />
    </>
  )
}

export default MobileButtonFilterFrp
