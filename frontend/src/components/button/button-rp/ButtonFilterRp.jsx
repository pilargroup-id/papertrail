import { useId } from 'react'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'

function ButtonFilterRp({
  label = 'Filter',
  dialogId,
  dialogLabel = 'Filter RP',
  isOpen = false,
  isActive = false,
  onClose,
  onClick,
  children,
  sx,
  ...buttonProps
}) {
  const generatedId = useId()
  const resolvedDialogId = dialogId || `rp-filter-drawer-${generatedId}`

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? resolvedDialogId : undefined}
          onClick={onClick}
          sx={[
            {
              width: 44,
              height: 44,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: isOpen || isActive ? 'var(--accent-teal)' : 'rgba(26, 42, 87, 0.16)',
              color: isOpen || isActive ? 'var(--accent-teal-dark)' : 'var(--primary-blue)',
              bgcolor: isOpen ? 'rgba(42, 157, 143, 0.08)' : '#fff',
              '&:hover': { bgcolor: 'rgba(42, 157, 143, 0.08)' },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          {...buttonProps}
        >
          <Badge color="primary" variant="dot" invisible={!isActive}>
            <FilterListRoundedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="left"
        open={isOpen}
        onClose={onClose}
        slotProps={{
          root: { keepMounted: true },
          paper: {
            id: resolvedDialogId,
            role: 'dialog',
            'aria-label': dialogLabel,
            sx: {
              width: 'min(340px, 100vw)',
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 2,
            py: 1.5,
          }}
        >
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {dialogLabel}
          </Typography>

          <IconButton aria-label="Tutup filter" size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 2, overflowY: 'auto' }}>{children}</Box>
      </Drawer>
    </>
  )
}

export default ButtonFilterRp
