import { useState } from 'react'
import Button from '@mui/material/Button'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'

import DialogImportBudgets from '../../Dialog/dialog-budgets/DialogImportBudgets.jsx'

function ButtonImportBudgets({
  children = 'Import',
  onClick,
  onImported,
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

  const handleImported = (result) => {
    setIsDialogOpen(false)
    onImported?.(result)
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileUploadOutlinedIcon />}
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
            bgcolor: 'common.white',
            color: 'var(--accent-teal-dark)',
            borderColor: 'var(--accent-teal)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(42, 157, 143, 0.06)',
              borderColor: 'var(--accent-teal-dark)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&:focus-visible': {
              boxShadow: '0 0 0 4px rgba(42, 157, 143, 0.18)',
            },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...buttonProps}
      >
        {children}
      </Button>

      {isDialogOpen && (
        <DialogImportBudgets
          onClose={() => setIsDialogOpen(false)}
          onImported={handleImported}
        />
      )}
    </>
  )
}

export default ButtonImportBudgets
