import { useState } from 'react'

import DialogCreateFrpDocumentsType from '../../Dialog/dialog-frp-documents-type/DialogCreateFrpDocumentsType.jsx'

const buttonClassNames = {
  create: 'dashboard-popup__button dashboard-popup__button--primary',
  detail: 'users-table__detail-button',
  accordion: 'users-table__accordion-button',
  icon: 'users-table__icon-button',
  pagination: 'users-table-pagination__button',
}

function ButtonCreateFrpDocumentsType({
  children = 'Create FRP Document Type',
  className = '',
  variant = 'accordion',
  tone = 'default',
  active = false,
  type = 'button',
  onClick,
  dialogProps = {},
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleOpenDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
  }

  const buttonClassName = [
    buttonClassNames[variant] ?? buttonClassNames.accordion,
    variant === 'accordion' && tone === 'danger' ? 'users-table__accordion-button--danger' : '',
    variant === 'icon' && tone === 'danger' ? 'users-table__icon-button--danger' : '',
    variant === 'pagination' && active ? 'users-table-pagination__button--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <button
        type={type}
        className={buttonClassName}
        onClick={handleOpenDialog}
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        {...buttonProps}
      >
        {children}
      </button>

      <DialogCreateFrpDocumentsType
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  )
}

export default ButtonCreateFrpDocumentsType
