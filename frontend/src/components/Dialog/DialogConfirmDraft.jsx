import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { XClose } from '../layoute/TemplateIcons.jsx'

const baseButtonSx = {
  height: 40,
  px: 2,
  borderRadius: '8px',
  textTransform: 'none',
  fontSize: '0.875rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: 'none',
}

function DialogConfirmDraft({
  open = false,
  eyebrow = 'Perubahan belum disimpan',
  title = 'Simpan sebagai draft?',
  message = 'Form ini belum disubmit. Simpan sebagai draft agar bisa dilanjutkan nanti?',
  note = '',
  onSaveDraft,
  onDiscard,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby="dialog-confirm-draft-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          py: 2,
          bgcolor: '#344968',
          color: '#fff',
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
            variant="h6"
            id="dialog-confirm-draft-title"
            sx={{ fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.3, color: '#fff' }}
          >
            {title}
          </Typography>
        </Box>

        <IconButton
          aria-label="Kembali ke form"
          onClick={onCancel}
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

      <Box sx={{ px: 3, pt: 2.5, pb: note ? 2 : 2.5 }}>
        <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.65 }}>
          {message}
        </Typography>

        {note ? (
          <Alert severity="warning" sx={{ mt: 2, py: 0.25, fontSize: '0.8125rem' }}>
            {note}
          </Alert>
        ) : null}
      </Box>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        sx={{
          gap: 1,
          alignItems: { xs: 'stretch', sm: 'center' },
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          color="error"
          onClick={onDiscard}
          sx={{ ...baseButtonSx, mr: { sm: 'auto' }, px: 1.5 }}
        >
          Jangan Simpan
        </Button>

        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            ...baseButtonSx,
            color: '#344968',
            borderColor: 'rgba(52, 73, 104, 0.32)',
            '&:hover': {
              borderColor: '#344968',
              bgcolor: 'rgba(52, 73, 104, 0.04)',
            },
          }}
        >
          Batal
        </Button>

        <Button
          variant="contained"
          onClick={onSaveDraft}
          autoFocus
          sx={{
            ...baseButtonSx,
            minWidth: 120,
            bgcolor: 'var(--accent-teal, #2a9d8f)',
            '&:hover': {
              bgcolor: 'var(--accent-teal-dark, #21867a)',
              boxShadow: 'none',
            },
          }}
        >
          Simpan Draft
        </Button>
      </Stack>
    </Dialog>
  )
}

export default DialogConfirmDraft
