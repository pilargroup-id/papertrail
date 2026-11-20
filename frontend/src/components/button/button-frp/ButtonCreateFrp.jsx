import { useState } from 'react'
import Button from '@mui/material/Button'
import AddRoundedIcon from '@mui/icons-material/AddRounded'

import DialogCreateFrp from '../../Dialog/dialog-frp/DialogCreateFrp.jsx'

function ButtonCreateFrp({
  children = 'Create',
  onClick,
  dialogProps = {},
  sx,
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleOpenDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsDialogOpen(true)
    }
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddRoundedIcon />}
        onClick={handleOpenDialog}
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        sx={[
          {
            height: 44,
            minWidth: 118,
            px: 2.25,
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            bgcolor: 'var(--accent-teal)',
            boxShadow: '0 10px 22px rgba(42, 157, 143, 0.26)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
            '&:hover': {
              bgcolor: 'var(--accent-teal-dark)',
              boxShadow: '0 14px 28px rgba(42, 157, 143, 0.32)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:focus-visible': {
              boxShadow: '0 0 0 4px rgba(42, 157, 143, 0.18), 0 14px 28px rgba(42, 157, 143, 0.32)',
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...buttonProps}
      >
        {children}
      </Button>

      <DialogCreateFrp
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  )
}

export default ButtonCreateFrp
