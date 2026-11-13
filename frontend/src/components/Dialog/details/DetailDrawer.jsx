import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { Copy, Printer, XClose } from '../../layoute/TemplateIcons.jsx'

function DetailDrawer({
  isOpen,
  titleId,
  eyebrow,
  title,
  totalLabel,
  total,
  isLoading,
  errorMessage,
  canPrint,
  onClose,
  onDuplicate,
  onPrint,
  children,
}) {
  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          sx: {
            width: { xs: '100%', sm: 640, md: 960, lg: 1180 },
            maxWidth: '100%',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: 2,
            bgcolor: '#344968',
            color: '#fff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.16)',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                lineHeight: 1.6,
                letterSpacing: 0.5,
                color: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              {eyebrow}
            </Typography>
            <Typography
              component="h2"
              variant="h6"
              id={titleId}
              sx={{ fontWeight: 700, lineHeight: 1.3, color: '#fff', overflowWrap: 'anywhere' }}
            >
              {title}
            </Typography>
          </Box>
          <IconButton
            aria-label="Tutup dialog"
            onClick={onClose}
            sx={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '5px',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            <XClose size={20} />
          </IconButton>
        </Stack>

        {isLoading ? (
          <LinearProgress
            aria-label="Memuat detail"
            color="inherit"
            sx={{ flexShrink: 0, color: '#2a9d8f' }}
          />
        ) : null}

        <Box
          aria-busy={isLoading}
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}
        >
          {errorMessage ? (
            <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>
          ) : null}
          <Stack spacing={4}>{children}</Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            flexShrink: 0,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {totalLabel}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
              {total}
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              '& .MuiButton-root': {
                height: 44,
                px: 2.25,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                flex: { xs: 1, sm: 'initial' },
              },
            }}
          >
            {canPrint ? (
              <Button
                variant="outlined"
                startIcon={<Printer size={16} aria-hidden="true" />}
                disabled={isLoading || Boolean(errorMessage) || !onPrint}
                onClick={onPrint}
                sx={{
                  color: 'var(--accent-teal, #2a9d8f)',
                  borderColor: 'var(--accent-teal, #2a9d8f)',
                  '&:hover': {
                    bgcolor: 'rgba(42, 157, 143, 0.06)',
                    borderColor: 'var(--accent-teal-dark, #21867a)',
                  },
                }}
              >
                Print
              </Button>
            ) : null}
            <Button
              variant="contained"
              startIcon={<Copy size={16} aria-hidden="true" />}
              disabled={isLoading || Boolean(errorMessage) || !onDuplicate}
              onClick={onDuplicate}
              sx={{
                minWidth: 140,
                bgcolor: 'var(--accent-teal, #2a9d8f)',
                boxShadow: '0 10px 22px rgba(42, 157, 143, 0.26)',
                '&:hover': {
                  bgcolor: 'var(--accent-teal-dark, #21867a)',
                  boxShadow: '0 14px 28px rgba(42, 157, 143, 0.32)',
                },
              }}
            >
              Duplicate
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default DetailDrawer
